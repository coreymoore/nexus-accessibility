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
    // Spacing between tooltip and focused element
    this._margin = 32;
    // Focus guard state
    this._acceptingFocus = false;
    this._onFocusInCapture = null;
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

  // Return tabbable elements inside a root container
  _getFocusableElements(root) {
    if (!root) return [];
    const candidates = root.querySelectorAll(
      [
        "a[href]",
        "area[href]",
        "button:not([disabled])",
        'input:not([disabled]):not([type="hidden"])',
        "select:not([disabled])",
        "textarea:not([disabled])",
        '[tabindex]:not([tabindex="-1"])',
      ].join(", ")
    );
    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none")
        return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    return Array.from(candidates).filter((el) => isVisible(el));
  }

  _setupFocusTrap({ onClose, enabled }) {
    // Remove any previous trap first to avoid duplicates
    this._removeFocusTrap();
    this._focusTrapKeydown = (e) => {
      if (!this.tooltip) return;
      // Only trap when focus is within the tooltip
      const active = document.activeElement;
      const isInside = active && this.tooltip.contains(active);
      if (!isInside) return;
      // Handle Escape to close
      if (e.key === "Escape" || e.key === "Esc" || e.keyCode === 27) {
        e.preventDefault();
        try {
          if (enabled && enabled()) onClose && onClose();
        } catch {}
        return;
      }
      // Trap Tab navigation inside the tooltip
      if (e.key === "Tab" || e.keyCode === 9) {
        const focusables = this._getFocusableElements(this.tooltip);
        if (focusables.length === 0) {
          // If nothing is focusable, do nothing (do not make tooltip itself focusable)
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        // If focus somehow left the list but is still inside, default to first
        let current = active && focusables.includes(active) ? active : first;
        const goingBack = !!e.shiftKey;
        if (!goingBack && current === last) {
          e.preventDefault();
          first.focus({ preventScroll: true });
        } else if (goingBack && current === first) {
          e.preventDefault();
          last.focus({ preventScroll: true });
        }
      }
    };
    // Use capture to catch early and be robust across shadow DOM boundaries
    document.addEventListener("keydown", this._focusTrapKeydown, true);
  }

  _removeFocusTrap() {
    if (this._focusTrapKeydown) {
      document.removeEventListener("keydown", this._focusTrapKeydown, true);
      this._focusTrapKeydown = null;
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
      <div class="chrome-ax-tooltip-body" inert>
        <div role="status" aria-live="polite" aria-atomic="true" style="display: flex; align-items: center; gap: 8px; color: #683ab7;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="animation: spin 1s linear infinite;" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
              <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
              <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
            </circle>
          </svg>
          <span>Loading Nexus Accessibility Info</span>
        </div>
      </div>
    `;
    document.body.appendChild(this.tooltip);
    // Keep content body out of the tab order until explicitly focused via shortcut
    this.tooltip.style.display = "block";

    // Compute placement once, without overlapping the element
    const rect = target.getBoundingClientRect();
    const margin = this._margin;
    const spaceAbove = rect.top - margin;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const placeBelow = spaceBelow >= spaceAbove;
    this.tooltip.style.maxHeight = `${Math.max(
      0,
      placeBelow ? spaceBelow : spaceAbove
    )}px`;
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const topAbs = placeBelow
      ? window.scrollY + rect.bottom + margin
      : window.scrollY + rect.top - tooltipRect.height - margin;
    let leftAbs = window.scrollX + rect.right + margin;
    if (leftAbs + tooltipRect.width > window.scrollX + window.innerWidth) {
      leftAbs = window.scrollX + rect.left - tooltipRect.width - margin;
    }
    leftAbs = Math.max(
      window.scrollX,
      Math.min(leftAbs, window.scrollX + window.innerWidth - tooltipRect.width)
    );
    this.tooltip.style.top = `${topAbs}px`;
    this.tooltip.style.left = `${leftAbs}px`;
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
    // Reset focus guard for new tooltip instance
    this._acceptingFocus = false;
    this.ensureStylesInjected();
    if (!info) return;
    if (this.tooltip) {
      // Clean up existing trap/listeners tied to current tooltip instance
      this._removeFocusTrap();
      this.tooltip.remove();
    }

    this.tooltip = document.createElement("div");
    this.tooltip.className = "chrome-ax-tooltip";
    this.tooltip.setAttribute("role", "tooltip");
    this.tooltip.setAttribute("id", "chrome-ax-tooltip");
    // Store scroll handler for cleanup
    this._scrollHandler = () => {
      if (this.tooltip && this.tooltip.style.display === "block" && target) {
        // Re-run the positioning logic
        this._repositionTooltipAndConnector(target);
      }
    };
    window.addEventListener("scroll", this._scrollHandler, true);

    // Split tooltip content into parts for flexible composition
    const closeButtonHtml = `
      <div class="chrome-ax-tooltip-close" aria-label="Close Nexus Inspector" aria-hidden="true" role="presentation">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
        </svg>
      </div>
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
    // Keep the close button outside an inert body so it remains clickable by mouse
    const bodyOpen = `<div class="chrome-ax-tooltip-body" inert style="pointer-events: none;">`;
    const bodyClose = `</div>`;
    let tooltipContent;
    if (this.miniMode) {
      tooltipContent = `
        ${closeButtonHtml}
        ${bodyOpen}
          ${screenReaderSection}
        ${bodyClose}
      `;
    } else {
      tooltipContent = `
        ${closeButtonHtml}
        ${bodyOpen}
          ${screenReaderSection}
          ${propertiesSection}
        ${bodyClose}
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
    // Hide from AT until user opts in via Alt+[
    this.tooltip.setAttribute("aria-hidden", "true");
    // Keep content body out of the tab order until explicitly focused via shortcut
    this.tooltip.style.display = "block";

    const closeButton = this.tooltip.querySelector(".chrome-ax-tooltip-close");
    if (closeButton) {
      // Prevent mouse click from moving focus into the tooltip
      closeButton.addEventListener("mousedown", (e) => {
        e.preventDefault();
      });
      closeButton.addEventListener("pointerdown", (e) => {
        e.preventDefault();
      });
      // Support keyboard activation when user has opted-in (Alt+[) and the control is focusable
      closeButton.addEventListener("keydown", (e) => {
        const isEnter = e.key === "Enter" || e.keyCode === 13;
        const isSpace =
          e.key === " " || e.key === "Spacebar" || e.keyCode === 32;
        if (isEnter || isSpace) {
          e.preventDefault();
          onClose && onClose();
        }
      });
      closeButton.addEventListener("click", (e) => {
        e.preventDefault();
        onClose && onClose();
      });
    }

    // Guard against accidental focus landing inside the tooltip when not opted-in
    if (this._onFocusInCapture) {
      document.removeEventListener("focusin", this._onFocusInCapture, true);
    }
    this._onFocusInCapture = (e) => {
      try {
        if (
          !this._acceptingFocus &&
          this.tooltip &&
          this.tooltip.style.display === "block" &&
          this.tooltip.contains(e.target)
        ) {
          e.stopPropagation();
          // Return focus to the inspected element if possible
          if (
            this._lastTarget &&
            typeof this._lastTarget.focus === "function"
          ) {
            try {
              this._lastTarget.focus({ preventScroll: true });
            } catch {}
          }
          // Blur the node inside tooltip to avoid sticky focus
          if (e.target && typeof e.target.blur === "function") {
            try {
              e.target.blur();
            } catch {}
          }
        }
      } catch {}
    };
    document.addEventListener("focusin", this._onFocusInCapture, true);

    // Remove old connector
    if (this.connector) {
      this.connector.remove();
      this.connector = null;
    }

    const rect = target.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const margin = this._margin;

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
    // Helper to reposition tooltip and connector
    this._repositionTooltipAndConnector = (target) => {
      if (!this.tooltip || !target) return;
      // Recalculate position and connector
      const rect = target.getBoundingClientRect();
      const tooltipRect = this.tooltip.getBoundingClientRect();
      const margin = 16;
      // Calculate available space above and below the element
      const spaceAbove = rect.top - margin;
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      let top, left;
      if (spaceBelow >= tooltipRect.height || spaceBelow > spaceAbove) {
        top = window.scrollY + rect.bottom + margin;
      } else {
        top = window.scrollY + rect.top - tooltipRect.height - margin;
      }
      left = window.scrollX + rect.right + margin;
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
      this.tooltip.style.top = `${top - window.scrollY}px`;
      this.tooltip.style.left = `${left - window.scrollX}px`;
      // Reposition connector
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
      let [tooltipEdge, elemEdge] = (
        typeof getClosestEdgePoint === "function"
          ? getClosestEdgePoint
          : window.getClosestEdgePoint
      )(tooltipRectAbs, elemRectAbs);
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
      // Update connector SVG lines
      if (this.connector) {
        const borderLine = this.connector.querySelector('line[stroke="white"]');
        const whiteLine = this.connector.querySelector(
          'line[stroke="#683ab7"]'
        );
        if (borderLine && whiteLine) {
          borderLine.setAttribute("x1", tooltipEdge.x);
          borderLine.setAttribute("y1", tooltipEdge.y);
          borderLine.setAttribute("x2", elemEdge.x);
          borderLine.setAttribute("y2", elemEdge.y);
          whiteLine.setAttribute("x1", tooltipEdge.x);
          whiteLine.setAttribute("y1", tooltipEdge.y);
          whiteLine.setAttribute("x2", elemEdge.x);
          whiteLine.setAttribute("y2", elemEdge.y);
        }
      }
    };

    // Install focus trap so tab focus is retained within the tooltip once entered
    this._setupFocusTrap({ onClose, enabled });
  }

  hideTooltip({ onRefocus } = {}) {
    this._isHiding = true;
    try {
      if (this._scrollHandler) {
        window.removeEventListener("scroll", this._scrollHandler, true);
        this._scrollHandler = null;
      }
      this._removeFocusTrap();
      if (this._onFocusInCapture) {
        document.removeEventListener("focusin", this._onFocusInCapture, true);
        this._onFocusInCapture = null;
      }
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
    this._acceptingFocus = false;
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
            // Allow focus into tooltip content only when user intentionally invokes the shortcut
            const body = this.tooltip.querySelector(".chrome-ax-tooltip-body");
            if (body) {
              body.removeAttribute("inert");
              body.style.pointerEvents = "";
            }
            const srNode = this.tooltip.querySelector(".chrome-ax-tooltip-sr");
            const closeButton = this.tooltip.querySelector(
              ".chrome-ax-tooltip-close"
            );
            if (closeButton) {
              // Upgrade close control to an accessible button
              closeButton.setAttribute("role", "button");
              closeButton.setAttribute("tabindex", "0");
              closeButton.setAttribute("aria-hidden", "false");
            }
            this.tooltip.removeAttribute("aria-hidden");
            this._acceptingFocus = true;
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
          // Note: runtime.onMessage is registered once in the constructor to avoid leaks
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
