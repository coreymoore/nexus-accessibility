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
    chrome.storage.sync.get({ miniMode: false }, (data) => {
      this.miniMode = !!data.miniMode;
    });
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

  ensureStylesInjected() {
    if (document.getElementById("chrome-ax-tooltip-style")) return;
    const link = document.createElement("link");
    link.id = "chrome-ax-tooltip-style";
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = chrome.runtime.getURL("src/components/tooltip/tooltip.css");
    document.head.appendChild(link);
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
        extras.push(
          `<span class=\"sr-state\">${
            info.ariaProperties["aria-expanded"] === "true"
              ? "expanded"
              : "collapsed"
          }</span>`
        );
      }
      if (info.ariaProperties && "aria-pressed" in info.ariaProperties) {
        extras.push(
          `<span class=\"sr-state\">${
            info.ariaProperties["aria-pressed"] === "true"
              ? "pressed"
              : "not pressed"
          }</span>`
        );
      }
      if (info.states && "checked" in info.states) {
        let checked = info.states.checked;
        if (checked && typeof checked === "object" && "value" in checked) {
          checked = checked.value;
        }
        if (checked === true || checked === "true") {
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
        if (info.states.disabled === true)
          extras.push(`<span class=\"sr-state\">disabled</span>`);
        const ariaReq =
          info.ariaProperties &&
          (info.ariaProperties["aria-required"] === true ||
            info.ariaProperties["aria-required"] === "true");
        if (info.states.required === true || ariaReq)
          extras.push(`<span class=\"sr-required\">required</span>`);
        if (info.states.invalid === true)
          extras.push(`<span class=\"sr-state\">invalid</span>`);
      }
    }
    // Value
    if (info.value && info.value !== "(no value)") {
      extras.push(`<span class=\"sr-value\">${String(info.value)}</span>`);
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
        pairs.push({ label: "Value", value: accessibilityInfo.value });
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

    let propertiesSection = "";
    const propertiesList = this.getPropertiesList(info);
    if (Array.isArray(propertiesList)) {
      propertiesSection =
        `<dl>` +
        propertiesList
          .map(({ label, value }) => `<dt>${label}</dt><dd>${value}</dd>`)
          .join("") +
        `</dl>`;
    } else {
      propertiesSection = propertiesList;
    }

    // Compose the tooltip content based on miniMode
    let tooltipContent;
    if (this.miniMode) {
      tooltipContent = `
        ${closeButtonHtml}
        ${screenReaderSection}
      `;
    } else {
      tooltipContent = `
        ${closeButtonHtml}
        ${screenReaderSection}
        ${propertiesSection}
      `;
    }
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
