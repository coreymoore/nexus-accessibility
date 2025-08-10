// Tooltip module: creates, positions, updates, and removes the tooltip and its connector line.
// Exposes window.chromeAxTooltip API used by content.js

class Tooltip {
  constructor() {
    this.logger =
      (window.axLogger &&
        window.axLogger.log.bind(window.axLogger, "tooltip")) ||
      (() => {});
    this.tooltip = null;
    this.connector = null;
    this.miniMode = false;
    this._mutObserver = null;
    this._isHiding = false;
    // Cache of valid anchors parsed from alerts.html
    this._validAnchors = null; // Set<string> once loaded
    this._anchorsLoadPromise = null;
    // Anchors that map to warning severity; defaults are danger
    this._warningAnchors = new Set([
      "unsupported_role_value",
      "too_many_scope_levels",
      "pres_table_not_have",
      "table_nontypical_role",
      "header_missing_role",
      "cells_not_contained_by_row_role",
      "ref_id_not_found",
      "ref_legend",
      "ref_has_ref",
      "ref_is_duplicate",
      "ref_is_direct_and_indirect",
      "headers_refs_no_text",
      "headers_ref_is_td",
      "headers_ref_external",
      "nested_label_for_no_match",
      "deprecated_html",
      "scope_value_invalid",
      "alt_only_for_images",
      "explicit_label_for_forms",
      "unreliable_component_combine",
      "role_tab_order",
      "iframe_contents_not_in_tab_order",
      "canvas_not_keyboard_accessible",
      "character_length",
      "ambiguous_link",
      "link_click_no_keyboard_access",
      "not_recognized_as_link",
      "image_alt_contains_file_name",
      "non_unique_button",
      "not_semantic_heading",
      "conflicting_heading_level",
      "role_heading_no_arialevel",
      "arialevel_not_gt_zero_integar",
      "pseudo_before_after",
      "manual_contrast_test_bgimage",
      "disabled_elements",
    ]);
    chrome.storage.sync.get({ miniMode: false }, (data) => {
      this.miniMode = !!data.miniMode;
    });
    // Load valid anchors in background so we can filter alerts
    this._loadValidAnchors();
    this._registerShortcut();
    // Listen for miniMode changes from popup once
    if (!window.chromeAxMiniModeListenerRegistered) {
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg && typeof msg.miniMode === "boolean") {
          this.miniMode = msg.miniMode;
          if (this.tooltip && this.tooltip.style.display === "block") {
            this.showTooltip(
              this._lastInfo,
              this._lastTarget,
              this._lastOptions
            );
          }
        }
      });
      window.chromeAxMiniModeListenerRegistered = true;
    }
  }

  _loadValidAnchors() {
    if (this._anchorsLoadPromise) return this._anchorsLoadPromise;
    const url = chrome.runtime.getURL("src/alerts.html");
    this._anchorsLoadPromise = fetch(url)
      .then((r) => r.text())
      .then((html) => {
        const ids = new Set();
        const re = /\bid\s*=\s*"([^"]+)"/g;
        let m;
        while ((m = re.exec(html))) ids.add(m[1]);
        // Remove non-alert structural ids if present
        ["skipnav", "pageTitle", "tableOfContents"].forEach((k) =>
          ids.delete(k)
        );
        this._validAnchors = ids;
        return ids;
      })
      .catch((e) => {
        console.warn("[AX Tooltip] Failed to load alerts.html anchors", e);
        this._validAnchors = new Set();
        return this._validAnchors;
      });
    return this._anchorsLoadPromise;
  }

  ensureStylesInjected() {
    if (document.getElementById("chrome-ax-tooltip-style")) return;
    const link = document.createElement("link");
    link.id = "chrome-ax-tooltip-style";
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = chrome.runtime.getURL("src/components/tooltip/tooltip.css");
    document.head.appendChild(link);
  }

  // Recursively unwrap CDP-shaped values and node lists to plain text/value
  _deepUnwrap(v) {
    if (v == null) return v;
    if (typeof v !== "object") return v;
    if (Array.isArray(v)) {
      return v
        .map((x) => this._deepUnwrap(x))
        .filter((x) => x != null && x !== "")
        .join(" ");
    }
    if ("value" in v) return this._deepUnwrap(v.value);
    if (v.type === "nodeList" && Array.isArray(v.relatedNodes)) {
      const texts = v.relatedNodes
        .map(
          (n) =>
            n && (n.text ?? n.name ?? n.label ?? n.innerText ?? n.nodeValue)
        )
        .filter((t) => t != null && t !== "");
      if (texts.length) return texts.join(" ");
    }
    if ("text" in v) return this._deepUnwrap(v.text);
    if ("name" in v) return this._deepUnwrap(v.name);
    if ("label" in v) return this._deepUnwrap(v.label);
    if ("innerText" in v) return this._deepUnwrap(v.innerText);
    if ("nodeValue" in v) return this._deepUnwrap(v.nodeValue);
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }

  _isTrue(v) {
    return v === true || v === "true" || v === 1 || v === "1";
  }

  getScreenReaderOutput(info) {
    // Base: role, name, description
    const base = [];
    if (info.role) base.push(`<span class=\"sr-role\">${info.role}</span>`);
    if (info.name && info.name !== "(no accessible name)")
      base.push(`<span class=\"sr-name\">${info.name}</span>`);
    if (info.description && info.description !== "(no description)")
      base.push(`<span class=\"sr-desc\">${info.description}</span>`);

    // Extras: states, aria-derived states, group, value, required
    const extras = [];
    if (info.ariaProperties || info.states) {
      if (info.ariaProperties && "aria-expanded" in info.ariaProperties) {
        const exp = this._deepUnwrap(info.ariaProperties["aria-expanded"]);
        extras.push(
          `<span class=\"sr-state\">${
            this._isTrue(exp) ? "expanded" : "collapsed"
          }</span>`
        );
      }
      if (info.ariaProperties && "aria-pressed" in info.ariaProperties) {
        const prs = this._deepUnwrap(info.ariaProperties["aria-pressed"]);
        extras.push(
          `<span class=\"sr-state\">${
            this._isTrue(prs) ? "pressed" : "not pressed"
          }</span>`
        );
      }
      if (info.states && "checked" in info.states) {
        const checked = this._deepUnwrap(info.states.checked);
        if (this._isTrue(checked)) {
          extras.push(`<span class=\"sr-state\">checked</span>`);
        } else if (checked === false || checked === "false") {
          extras.push(`<span class=\"sr-state\">unchecked</span>`);
        } else if (checked === "mixed") {
          extras.push(`<span class=\"sr-state\">mixed</span>`);
        } else {
          extras.push(`<span class=\"sr-state\">unchecked</span>`);
        }
      }
      if (info.states) {
        const dis = this._deepUnwrap(info.states.disabled);
        if (this._isTrue(dis))
          extras.push(`<span class=\"sr-state\">disabled</span>`);
        const ariaReq =
          info.ariaProperties &&
          this._isTrue(this._deepUnwrap(info.ariaProperties["aria-required"]));
        const req = this._deepUnwrap(info.states.required);
        if (this._isTrue(req) || ariaReq)
          extras.push(`<span class=\"sr-required\">required</span>`);
        // Do not include invalid in SR output
      }
    }
    // Value
    if (info.value && info.value !== "(no value)") {
      const v = this._deepUnwrap(info.value);
      extras.push(`<span class=\"sr-value\">${String(v)}</span>`);
    }
    // Group
    if (info.group && info.group.role) {
      if (info.group.label) {
        extras.push(
          `<span class=\"sr-group\">${info.group.role}, ${info.group.label}</span>`
        );
      } else {
        extras.push(`<span class=\"sr-group\">${info.group.role}</span>`);
      }
    }

    // Compose: base joined by space; if extras exist, add a comma, then extras joined by ", "
    const baseStr = base.join(" ");
    if (extras.length > 0) {
      return (baseStr ? baseStr + ", " : "") + extras.join(", ");
    }
    return baseStr;
  }

  getPropertiesList(accessibilityInfo) {
    if (!window.formatAccessibilityInfo) {
      const pairs = [
        { label: "Role", value: accessibilityInfo.role },
        { label: "Name", value: accessibilityInfo.name },
      ];
      const hasDesc =
        accessibilityInfo.description !== "(no description)" &&
        !String(accessibilityInfo.description).includes("Screen Reader Output");
      if (hasDesc) {
        pairs.push({
          label: "Description",
          value: accessibilityInfo.description,
        });
      }
      // Place Group immediately after Description (or at this position if no description)
      if (accessibilityInfo.group && accessibilityInfo.group.role) {
        let groupText = accessibilityInfo.group.role;
        if (accessibilityInfo.group.label) {
          groupText += ` (${accessibilityInfo.group.label})`;
        }
        pairs.push({ label: "Group", value: groupText });
      }
      // Value appears after Group
      if (accessibilityInfo.value && accessibilityInfo.value !== "(no value)") {
        const v = this._deepUnwrap(accessibilityInfo.value);
        pairs.push({ label: "Value", value: v });
      }
      return pairs;
    }
    // If custom formatter, fallback to HTML string, but append Group if present
    let html = window.formatAccessibilityInfo(accessibilityInfo);
    return html;
  }

  showLoadingTooltip(target) {
    this.ensureStylesInjected();
    if (this.tooltip) this.tooltip.remove();

    this.tooltip = document.createElement("div");
    this.tooltip.className = "chrome-ax-tooltip";
    this.tooltip.setAttribute("role", "tooltip");
    this.tooltip.setAttribute("id", "chrome-ax-tooltip");
    this.tooltip.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; color: #683ab7;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="animation: spin 1s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
            <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
            <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
          </circle>
        </svg>
        Loading accessibility info...
      </div>
    `;
    document.body.appendChild(this.tooltip);
    this.tooltip.style.display = "block";

    const rect = target.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const margin = 16;

    let top = window.scrollY + rect.bottom + margin;
    let left = window.scrollX + rect.right + margin;

    if (top + tooltipRect.height > window.scrollY + window.innerHeight) {
      top = window.scrollY + rect.top - tooltipRect.height - margin;
    }
    if (left + tooltipRect.width > window.scrollX + window.innerWidth) {
      left = window.scrollX + rect.left - tooltipRect.width - margin;
    }

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
  }

  showTooltip(info, target, { onClose, enabled }) {
    // Debug: log group information presence
    try {
      console.debug("[AX Tooltip] group info:", info && info.group);
    } catch {}
    // Store last info for mini mode toggle
    this._lastInfo = info;
    this._lastTarget = target;
    this._lastOptions = { onClose, enabled };
    this.ensureStylesInjected();
    if (!info) return;
    if (this.tooltip) this.tooltip.remove();

    this.tooltip = document.createElement("div");
    this.tooltip.className = "chrome-ax-tooltip";
    this.tooltip.setAttribute("role", "tooltip");
    this.tooltip.setAttribute("id", "chrome-ax-tooltip");

    // Split tooltip content into parts for flexible composition
    const closeButtonHtml = `
      <button class="chrome-ax-tooltip-close" aria-label="Close Nexus Inspector">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
        </svg>
      </button>
    `;

    const screenReaderSection = `
      <div class="chrome-ax-tooltip-sr" tabindex="-1">
        <svg width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="Screen Reader Output" focusable="false" style="vertical-align:middle;">
          <rect x="3" y="8" width="5" height="8" rx="1.5" fill="#7851a9"/>
          <polygon points="8,8 14,4 14,20 8,16" fill="#78551a9"/>
          <path d="M17 9a4 4 0 0 1 0 6" stroke="#7851a9" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M19.5 7a7 7 0 0 1 0 10" stroke="#78551a9" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        </svg>
        ${this.getScreenReaderOutput(info)}
      </div>
    `;

    // Build Focus Alerts entries to integrate with the DL
    const alertsHelpUrl = chrome.runtime.getURL("src/alerts.html");
    const iconDangerUrl = chrome.runtime.getURL("src/assets/icon-danger.svg");
    const iconWarningUrl = chrome.runtime.getURL("src/assets/icon-warning.svg");
    let focusAlertsEntries = "";
    if (Array.isArray(info.focusAlerts) && info.focusAlerts.length > 0) {
      const anchorsReady = !!this._validAnchors;
      if (!anchorsReady) {
        // Load anchors and re-render so we can filter accurately
        this._loadValidAnchors().then(() => {
          try {
            if (this.tooltip) {
              this.showTooltip(
                this._lastInfo,
                this._lastTarget,
                this._lastOptions
              );
            }
          } catch {}
        });
      }
      const items = info.focusAlerts
        .map((alertObj) => {
          let text = null;
          let anchor = null;
          if (alertObj && typeof alertObj === "object") {
            text = alertObj.text || null;
            anchor = alertObj.anchor || null;
          } else if (typeof alertObj === "string") {
            // Ignore plain strings without anchors; not linkable to help page
            text = null;
          }
          // Only include if the anchor exists in alerts.html
          if (
            !anchor ||
            !this._validAnchors ||
            !this._validAnchors.has(anchor)
          ) {
            return "";
          }
          const sev =
            anchor && this._warningAnchors.has(anchor) ? "warning" : "danger";
          const icon = sev === "warning" ? iconWarningUrl : iconDangerUrl;
          const cls =
            sev === "warning" ? "ax-alert-warning" : "ax-alert-danger";
          return `<li class="${cls}"><img class="ax-icon" alt="${sev} icon" src="${icon}"><a href="#" class="ax-focus-alert-link" data-anchor="${anchor}">${
            text || anchor
          }</a></li>`;
        })
        .join("");
      if (items) {
        focusAlertsEntries = `<dt>Alerts</dt><dd class="ax-focus-alerts"><ul>${items}</ul></dd>`;
      }
    }

    let propertiesSection = "";
    const propertiesList = this.getPropertiesList(info);
    if (Array.isArray(propertiesList)) {
      const basePairs = propertiesList
        .map(({ label, value }) => `<dt>${label}</dt><dd>${value}</dd>`)
        .join("");
      if (this.miniMode) {
        propertiesSection = focusAlertsEntries
          ? `<dl>${focusAlertsEntries}</dl>`
          : "";
      } else {
        propertiesSection = `<dl>${basePairs}${focusAlertsEntries}</dl>`;
      }
    } else {
      if (this.miniMode) {
        propertiesSection = focusAlertsEntries
          ? `<dl>${focusAlertsEntries}</dl>`
          : "";
      } else {
        propertiesSection =
          propertiesList +
          (focusAlertsEntries ? `<dl>${focusAlertsEntries}</dl>` : "");
      }
    }

    // Compose the tooltip content based on miniMode
    let tooltipContent =
      closeButtonHtml + screenReaderSection + propertiesSection;
    this.tooltip.innerHTML = tooltipContent;

    // Position offscreen to measure
    this.tooltip.style.position = "fixed";
    this.tooltip.style.left = "-9999px";
    this.tooltip.style.top = "-9999px";
    this.tooltip.style.setProperty("z-index", "2147483648", "important");
    this.tooltip.style.setProperty("display", "block", "important");
    document.body.appendChild(this.tooltip);
    this.tooltip.style.display = "block";

    const closeButton = this.tooltip.querySelector(".chrome-ax-tooltip-close");
    if (closeButton) {
      closeButton.removeAttribute("tabindex");
      closeButton.addEventListener("click", (e) => {
        e.preventDefault();
        if (enabled()) onClose();
      });
    }

    // Delegate focus alert link clicks to background to open extension page in new tab
    const alertsContainer = this.tooltip.querySelector(".ax-focus-alerts");
    if (alertsContainer) {
      alertsContainer.addEventListener("click", (e) => {
        const a =
          e.target &&
          e.target.closest &&
          e.target.closest("a.ax-focus-alert-link");
        if (a) {
          e.preventDefault();
          const anchor = a.getAttribute("data-anchor") || "";
          try {
            chrome.runtime.sendMessage({ action: "openFocusAlert", anchor });
          } catch (err) {
            // fallback: try window.open with extension URL if messaging fails
            const url = alertsHelpUrl + (anchor ? `#${anchor}` : "");
            window.open(url, "_blank", "noopener");
          }
        }
      });
    }

    // Remove old connector
    if (this.connector) {
      this.connector.remove();
      this.connector = null;
    }

    const rect = target.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const margin = 16;

    let top = window.scrollY + rect.bottom + margin;
    let left = window.scrollX + rect.right + margin;

    if (top + tooltipRect.height > window.scrollY + window.innerHeight) {
      top = window.scrollY + rect.top - tooltipRect.height - margin;
    }
    if (left + tooltipRect.width > window.scrollX + window.innerWidth) {
      left = window.scrollX + rect.left - tooltipRect.width - margin;
    }
    top = Math.max(
      window.scrollY,
      Math.min(top, window.scrollY + window.innerHeight - tooltipRect.height)
    );
    left = Math.max(
      window.scrollX,
      Math.min(left, window.scrollX + window.innerWidth - tooltipRect.width)
    );

    // Connector SVG
    this.connector = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    this.connector.style.position = "absolute";
    this.connector.style.pointerEvents = "none";
    this.connector.style.zIndex = "2147483649";
    this.connector.style.left = "0";
    this.connector.style.top = "0";
    this.connector.style.width = "100vw";
    this.connector.style.height = "100vh";
    this.connector.style.overflow = "visible";

    function getClosestEdgePoint(rect1, rect2) {
      const points1 = [
        { x: rect1.left, y: rect1.top },
        { x: rect1.right, y: rect1.top },
        { x: rect1.left, y: rect1.bottom },
        { x: rect1.right, y: rect1.bottom },
        { x: rect1.left + rect1.width / 2, y: rect1.top },
        { x: rect1.left + rect1.width / 2, y: rect1.bottom },
        { x: rect1.left, y: rect1.top + rect1.height / 2 },
        { x: rect1.right, y: rect1.top + rect1.height / 2 },
      ];
      const points2 = [
        { x: rect2.left, y: rect2.top },
        { x: rect2.right, y: rect2.top },
        { x: rect2.left, y: rect2.bottom },
        { x: rect2.right, y: rect2.bottom },
        { x: rect2.left + rect2.width / 2, y: rect2.top },
        { x: rect2.left + rect2.width / 2, y: rect2.bottom },
        { x: rect2.left, y: rect2.top + rect2.height / 2 },
        { x: rect2.right, y: rect2.top + rect2.height / 2 },
      ];
      let minDist = Infinity;
      let best1 = points1[0],
        best2 = points2[0];
      for (const p1 of points1) {
        for (const p2 of points2) {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = dx * dx + dy * dy;
          if (dist < minDist) {
            minDist = dist;
            best1 = p1;
            best2 = p2;
          }
        }
      }
      return [best1, best2];
    }

    const tooltipRectAbs = {
      left,
      right: left + tooltipRect.width,
      top,
      bottom: top + tooltipRect.height,
      width: tooltipRect.width,
      height: tooltipRect.height,
    };
    const elemRectAbs = {
      left: window.scrollX + rect.left,
      right: window.scrollX + rect.right,
      top: window.scrollY + rect.top,
      bottom: window.scrollY + rect.bottom,
      width: rect.width,
      height: rect.height,
    };

    let [tooltipEdge, elemEdge] = getClosestEdgePoint(
      tooltipRectAbs,
      elemRectAbs
    );

    const dx = elemEdge.x - tooltipEdge.x;
    const dy = elemEdge.y - tooltipEdge.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const extension = 4;
    tooltipEdge = {
      x: tooltipEdge.x - (dx / distance) * extension,
      y: tooltipEdge.y - (dy / distance) * extension,
    };
    elemEdge = {
      x: elemEdge.x + (dx / distance) * extension,
      y: elemEdge.y + (dy / distance) * extension,
    };

    const whiteLine = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    whiteLine.setAttribute("x1", tooltipEdge.x);
    whiteLine.setAttribute("y1", tooltipEdge.y);
    whiteLine.setAttribute("x2", elemEdge.x);
    whiteLine.setAttribute("y2", elemEdge.y);

    const borderLine = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    borderLine.setAttribute("x1", tooltipEdge.x);
    borderLine.setAttribute("y1", tooltipEdge.y);
    borderLine.setAttribute("x2", elemEdge.x);
    borderLine.setAttribute("y2", elemEdge.y);
    borderLine.setAttribute("stroke", "white");
    borderLine.setAttribute("stroke-width", "5");
    borderLine.setAttribute("stroke-linecap", "butt");
    this.connector.appendChild(borderLine);

    whiteLine.setAttribute("stroke", "#683ab7");
    whiteLine.setAttribute("stroke-width", "3");
    whiteLine.setAttribute("stroke-opacity", "1");
    whiteLine.setAttribute("stroke-linecap", "butt");
    this.connector.appendChild(whiteLine);

    document.body.appendChild(this.connector);

    this.tooltip.style.position = "fixed";
    this.tooltip.style.top = `${top - window.scrollY}px`;
    this.tooltip.style.left = `${left - window.scrollX}px`;

    // Start observing DOM to prevent external removals
    this._ensureObserver();
  }

  hideTooltip({ onRefocus } = {}) {
    this._isHiding = true;
    try {
      if (this.tooltip && this.tooltip.parentNode) {
        this.tooltip.parentNode.removeChild(this.tooltip);
        this.tooltip = null;
      }
      if (this.connector && this.connector.parentNode) {
        this.connector.parentNode.removeChild(this.connector);
        this.connector = null;
      }
    } finally {
      this._isHiding = false;
    }
    if (onRefocus) onRefocus();
  }

  _registerShortcut() {
    if (!window.chromeAxTooltipShortcutRegistered) {
      document.addEventListener(
        "keydown",
        (e) => {
          // Alt+[ shortcut for focusing screen reader section
          if (
            e.altKey &&
            !e.shiftKey &&
            !e.ctrlKey &&
            !e.metaKey &&
            e.code === "BracketLeft" &&
            this.tooltip &&
            this.tooltip.style.display === "block"
          ) {
            const srNode = this.tooltip.querySelector(".chrome-ax-tooltip-sr");
            if (srNode) {
              srNode.focus();
              e.preventDefault();
              e.stopPropagation();
            }
          }
          // Alt+M shortcut for toggling mini mode
          if (
            e.altKey &&
            !e.shiftKey &&
            !e.ctrlKey &&
            !e.metaKey &&
            e.code === "KeyM"
          ) {
            this.miniMode = !this.miniMode;
            chrome.storage.sync.set({ miniMode: this.miniMode });
            if (this.tooltip && this.tooltip.style.display === "block") {
              // Re-render tooltip in new mode
              if (this._lastInfo && this._lastTarget && this._lastOptions) {
                this.showTooltip(
                  this._lastInfo,
                  this._lastTarget,
                  this._lastOptions
                );
              }
            }
            e.preventDefault();
            e.stopPropagation();
          }
          // Listen for miniMode changes from popup
          chrome.runtime.onMessage.addListener((msg) => {
            if (msg && typeof msg.miniMode === "boolean") {
              this.miniMode = msg.miniMode;
              if (this.tooltip && this.tooltip.style.display === "block") {
                this.showTooltip(
                  this._lastInfo,
                  this._lastTarget,
                  this._lastOptions
                );
              }
            }
          });
        },
        true
      );
      window.chromeAxTooltipShortcutRegistered = true;
    }
  }

  _ensureObserver() {
    if (this._mutObserver) return;
    try {
      this._mutObserver = new MutationObserver(() => {
        if (this._isHiding) return; // do not auto-restore during intentional hide
        this._restoreIfDetached();
      });
      this._mutObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    } catch (e) {
      // ignore if observer can't start
    }
  }

  _restoreIfDetached() {
    if (this.tooltip && !document.documentElement.contains(this.tooltip)) {
      document.body.appendChild(this.tooltip);
      this.tooltip.style.setProperty("display", "block", "important");
      this.tooltip.style.zIndex = "2147483648";
    }
    if (this.connector && !document.documentElement.contains(this.connector)) {
      document.body.appendChild(this.connector);
    }
  }
}

window.chromeAxTooltip = new Tooltip();
