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
    this._registerShortcut();
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
    const parts = [];
    parts.push(info.role);
    if (info.name && info.name !== "(no accessible name)")
      parts.push(info.name);
    if (info.description && info.description !== "(no description)")
      parts.push(info.description);
    if (info.ariaProperties || info.states) {
      if (info.ariaProperties && "aria-expanded" in info.ariaProperties) {
        parts.push(
          info.ariaProperties["aria-expanded"] === "true"
            ? "expanded"
            : "collapsed"
        );
      }
      if (info.ariaProperties && "aria-pressed" in info.ariaProperties) {
        parts.push(
          info.ariaProperties["aria-pressed"] === "true"
            ? "pressed"
            : "not pressed"
        );
      }
      if (info.ariaProperties && "aria-checked" in info.ariaProperties) {
        parts.push(
          info.ariaProperties["aria-checked"] === "true"
            ? "checked"
            : "not checked"
        );
      }
      if (info.states) {
        if (info.states.disabled === true) parts.push("disabled");
        if (info.states.required === true) parts.push("required");
        if (info.states.invalid === true) parts.push("invalid");
      }
    }
    return parts.join(" ");
  }

  getPropertiesList(accessibilityInfo) {
    if (!window.formatAccessibilityInfo) {
      const pairs = [
        { label: "Role", value: accessibilityInfo.role },
        { label: "Name", value: accessibilityInfo.name },
      ];
      if (
        accessibilityInfo.description !== "(no description)" &&
        !String(accessibilityInfo.description).includes("Screen Reader Output")
      ) {
        pairs.push({
          label: "Description",
          value: accessibilityInfo.description,
        });
      }
      if (accessibilityInfo.value && accessibilityInfo.value !== "(no value)") {
        pairs.push({ label: "Value", value: accessibilityInfo.value });
      }
      return pairs;
    }
    // If custom formatter, fallback to HTML string
    return window.formatAccessibilityInfo(accessibilityInfo);
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

    const keysSection = `
      <div class="chrome-ax-tooltip-keys">
        <span><kbd>Esc</kbd> Close</span>
        <span><kbd>Shift</kbd>+<kbd>Esc</kbd> Reopen</span>
        <span><kbd>Alt</kbd>+<kbd>[</kbd> Inspector</span>
      </div>
    `;

    // Compose the full tooltip content (can be customized for mini mode)
    const tooltipContent = `
      ${closeButtonHtml}
      ${screenReaderSection}
      ${propertiesSection}
      ${keysSection}
    `;
    this.tooltip.innerHTML = tooltipContent;

    // Position offscreen to measure
    this.tooltip.style.position = "fixed";
    this.tooltip.style.left = "-9999px";
    this.tooltip.style.top = "-9999px";
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
  }

  hideTooltip({ onRefocus } = {}) {
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
      this.tooltip = null;
    }
    if (this.connector && this.connector.parentNode) {
      this.connector.parentNode.removeChild(this.connector);
      this.connector = null;
    }
    if (onRefocus) onRefocus();
  }

  _registerShortcut() {
    if (!window.chromeAxTooltipShortcutRegistered) {
      document.addEventListener(
        "keydown",
        (e) => {
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
        },
        true
      );
      window.chromeAxTooltipShortcutRegistered = true;
    }
  }
}

window.chromeAxTooltip = new Tooltip();
