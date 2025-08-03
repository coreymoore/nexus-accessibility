console.log("Content script loading...");

const logger = window.axLogger;

// Press F2 to fetch and log the accessibility tree for the current page
document.addEventListener("keydown", (e) => {
  if (e.key === "F2") {
    chrome.runtime.sendMessage(
      { action: "getAccessibilityTree" },
      (response) => {
        if (response && response.tree) {
          console.log("Accessibility Tree:", response.tree);
          alert("Accessibility tree fetched! See the console for details.");
        } else if (response && response.error) {
          console.error("Accessibility error:", response.error);
          alert("Error fetching accessibility tree: " + response.error);
        }
      }
    );
  }
});

// Inject high-contrast tooltip CSS
const style = document.createElement("style");
style.textContent = `
.chrome-ax-tooltip {
  position: absolute;
  background: linear-gradient(to bottom, rgba(255,255,255,0.99), rgba(249,245,255,0.97));
  color: #2d1958;
  padding: 12px 32px 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
  z-index: 2147483647 !important;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  border: none;
  white-space: normal;
  pointer-events: all;
  cursor: default;
  letter-spacing: -0.011em;
  min-width: 280px;
  max-width: 380px;
  overflow: visible;
}

.chrome-ax-tooltip-close {
  position: relative;
  float: right;
  margin-right: -2rem;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(104,58,183,0.1);
  color: #683ab7;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s ease;
}

.chrome-ax-tooltip-sr {
  background: linear-gradient(to bottom, rgba(245,241,255,0.9), rgba(237,231,254,0.9));
  color: #2d1958;
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 10px;
  font-family: ui-monospace, 'Cascadia Code', 'SF Mono', Menlo, monospace;
  font-weight: 500;
  word-break: break-word;
  box-shadow: inset 0 0 0 1px rgba(104,58,183,0.2);
  border-left: 3px solid #683ab7;
}

.chrome-ax-tooltip *:focus {
  outline: 2px solid #683ab7 !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 4px #fff!important;
}

.chrome-ax-tooltip *:hover {
  outline: none !important;
  box-shadow: none !important;
}

div.chrome-ax-tooltip[role="tooltip"] dl {
  margin: 0 !important;
  padding: 0 !important;
  display: grid !important;
  grid-template-columns: auto 1fr !important;
  gap: 8px 12px !important;
  align-items: baseline !important;
  direction: ltr !important;
}

div.chrome-ax-tooltip[role="tooltip"] dl dt {
  font-weight: 600 !important;
  color: #683ab7 !important;
  font-size: 12px !important;
  letter-spacing: 0.02em !important;
  font-family: inherit !important;
  text-transform: uppercase !important;
  text-align: left !important;
  margin: 0 !important;
  padding: 0 !important;
  float: none !important;
  display: block !important;
  grid-column: 1 !important;
}

div.chrome-ax-tooltip[role="tooltip"] dl dd {
  margin: 0 !important;
  font-size: 13px !important;
  color: #2d1958 !important;
  font-family: inherit !important;
  font-weight: 450 !important;
  background: rgba(245,241,255,0.7) !important;
  padding: 0px 8px!important;
  border-radius: 6px !important;
  word-break: break-word !important;
  box-shadow: inset 0 0 0 1px rgba(104,58,183,0.1) !important;
  float: none !important;
  display: block !important;
  grid-column: 2 !important;
}

.chrome-ax-tooltip dd:after {
  content: "";
  display: block;
  margin-bottom: 2px;
}

.chrome-ax-tooltip .states-list,
.chrome-ax-tooltip .aria-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chrome-ax-tooltip .state-badge,
.chrome-ax-tooltip .aria-badge {
  display: inline-block;
  padding: 0 2px !important;
  border-radius: 4px;
  font-size: 12px !important;
  font-weight: 500;
  background: none !important;
}

.chrome-ax-tooltip .state-badge {
  color: #683ab7;
  margin: 0.15rem 0.15rem 0 0.15rem;
}

.chrome-ax-tooltip .aria-badge {
  color: #2d8a30;
  margin: 0.15rem 0.15rem 0 0.15rem;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
`;
document.head.appendChild(style);

let tooltip = null;
let connector = null;

// Create mutation observer to watch for ARIA changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (
      mutation.type === "attributes" &&
      mutation.target === lastFocusedElement
    ) {
      console.log("Attribute changed:", mutation.attributeName);
      // Clear cache for this element to force fresh data
      accessibilityCache.delete(lastFocusedElement);

      // Re-fetch accessibility info when any ARIA attribute changes
      getAccessibleInfo(lastFocusedElement, true)
        .then((info) => {
          if (lastFocusedElement === mutation.target) {
            showTooltip(info, lastFocusedElement);
          }
        })
        .catch((error) => {
          console.error("Error updating tooltip:", error);
        });
    }
  });
});

function startObserving(element) {
  observer.observe(element, {
    attributes: true,
    attributeFilter: [
      // ARIA states and properties
      "aria-expanded",
      "aria-pressed",
      "aria-checked",
      "aria-selected",
      "aria-disabled",
      "aria-invalid",
      "aria-required",
      "aria-readonly",
      // HTML states
      "disabled",
      "checked",
      "selected",
      "required",
      "readonly",
      // Value
      "value",
    ],
  });
}

function stopObserving() {
  observer.disconnect();
}

function getScreenReaderOutput(info) {
  const parts = [];

  // Add role
  parts.push(info.role);

  // Add name if present
  if (info.name && info.name !== "(no accessible name)") {
    parts.push(info.name);
  }

  // Add description if present
  if (info.description && info.description !== "(no description)") {
    parts.push(info.description);
  }

  // Handle interactive states first
  if (info.ariaProperties || info.states) {
    // Always check expanded state first
    if (info.ariaProperties && "aria-expanded" in info.ariaProperties) {
      parts.push(
        info.ariaProperties["aria-expanded"] === "true"
          ? "expanded"
          : "collapsed"
      );
    }

    // Then pressed state
    if (info.ariaProperties && "aria-pressed" in info.ariaProperties) {
      parts.push(
        info.ariaProperties["aria-pressed"] === "true"
          ? "pressed"
          : "not pressed"
      );
    }

    // Then checked state
    if (info.ariaProperties && "aria-checked" in info.ariaProperties) {
      parts.push(
        info.ariaProperties["aria-checked"] === "true"
          ? "checked"
          : "not checked"
      );
    }

    // Finally other states in fixed order
    if (info.states) {
      if (info.states.disabled === true) parts.push("disabled");
      if (info.states.required === true) parts.push("required");
      if (info.states.invalid === true) parts.push("invalid");
    }
  }

  return parts.join(" ");
}

function getPropertiesList(accessibilityInfo) {
  if (!window.formatAccessibilityInfo) {
    let dl = "<dl>";
    dl += `<dt>Role</dt><dd>${accessibilityInfo.role}</dd>`;
    dl += `<dt>Name</dt><dd>${accessibilityInfo.name}</dd>`;
    if (
      accessibilityInfo.description !== "(no description)" &&
      !accessibilityInfo.description.includes("Screen Reader Output")
    ) {
      dl += `<dt>Description</dt><dd>${accessibilityInfo.description}</dd>`;
    }
    if (accessibilityInfo.value && accessibilityInfo.value !== "(no value)") {
      dl += `<dt>Value</dt><dd>${accessibilityInfo.value}</dd>`;
    }
    dl += "</dl>";
    return dl;
  }
  return formatAccessibilityInfo(accessibilityInfo);
}

function showLoadingTooltip(target) {
  // Remove existing tooltip if present
  if (tooltip) {
    tooltip.remove();
  }

  // Create loading tooltip
  tooltip = document.createElement("div");
  tooltip.className = "chrome-ax-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.setAttribute("id", "chrome-ax-tooltip");

  tooltip.innerHTML = `
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

  document.body.appendChild(tooltip);
  tooltip.style.display = "block";

  const rect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const margin = 16;

  let top = window.scrollY + rect.bottom + margin;
  let left = window.scrollX + rect.right + margin;

  if (top + tooltipRect.height > window.scrollY + window.innerHeight) {
    top = window.scrollY + rect.top - tooltipRect.height - margin;
  }
  if (left + tooltipRect.width > window.scrollX + window.innerWidth) {
    left = window.scrollX + rect.left - tooltipRect.width - margin;
  }

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}

function showTooltip(info, target) {
  console.log("showTooltip called with info:", info);
  console.log("showTooltip target:", target);
  console.log(
    "formatAccessibilityInfo available:",
    typeof window.formatAccessibilityInfo
  );

  if (!info) {
    console.error("showTooltip: info is undefined/null");
    return;
  }
  // Remove existing tooltip if present
  if (tooltip) {
    tooltip.remove();
  }

  // Create fresh tooltip
  tooltip = document.createElement("div");
  tooltip.className = "chrome-ax-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.setAttribute("id", "chrome-ax-tooltip");

  // Set tooltip content
  const tooltipContent = `
    <button class="chrome-ax-tooltip-close" aria-label="Close Nexus Inspector">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      </svg>
    </button>
    <div class="chrome-ax-tooltip-sr" tabindex="-1">
      <svg width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="Screen Reader Output" focusable="false" style="vertical-align:middle;">
        <rect x="3" y="8" width="5" height="8" rx="1.5" fill="#7851a9"/>
        <polygon points="8,8 14,4 14,20 8,16" fill="#78551a9"/>
        <path d="M17 9a4 4 0 0 1 0 6" stroke="#7851a9" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M19.5 7a7 7 0 0 1 0 10" stroke="#78551a9" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      </svg>
      ${getScreenReaderOutput(info)}
    </div>
    ${getPropertiesList(info)}
    <div class="chrome-ax-tooltip-keys">
      <span><kbd>Esc</kbd> Close</span>
      <span><kbd>Shift</kbd>+<kbd>Esc</kbd> Reopen</span>
      <span><kbd>Alt</kbd>+<kbd>[</kbd> Inspector</span>
    </div>
  `;
  tooltip.innerHTML = tooltipContent;

  // Register Alt+[ shortcut once
  if (!window.chromeAxTooltipShortcutRegistered) {
    document.addEventListener(
      "keydown",
      function (e) {
        if (
          e.altKey &&
          !e.shiftKey &&
          !e.ctrlKey &&
          !e.metaKey &&
          e.code === "BracketLeft" &&
          tooltip &&
          tooltip.style.display === "block"
        ) {
          const srNode = tooltip.querySelector(".chrome-ax-tooltip-sr");
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

  // Set initial position offscreen to measure size
  tooltip.style.position = "fixed";
  tooltip.style.left = "-9999px";
  tooltip.style.top = "-9999px";
  document.body.appendChild(tooltip);
  tooltip.style.display = "block";

  // Add click handler for close button - use same logic as Escape key
  const closeButton = tooltip.querySelector(".chrome-ax-tooltip-close");
  if (closeButton) {
    // Remove tabindex -1 so it can be focused
    closeButton.removeAttribute("tabindex");
    closeButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (extensionEnabled) {
        hideTooltip(lastFocusedElement);
      }
    });
  }

  // Remove old connector if present
  if (connector) {
    connector.remove();
    connector = null;
  }

  const rect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const margin = 16;

  // Default: below and to the right
  let top = window.scrollY + rect.bottom + margin;
  let left = window.scrollX + rect.right + margin;

  // Try to keep tooltip in viewport
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

  // Create connector line SVG with higher z-index than tooltip
  connector = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  connector.style.position = "absolute";
  connector.style.pointerEvents = "none";
  connector.style.zIndex = "2147483649"; // one level above tooltip
  connector.style.left = "0";
  connector.style.top = "0";
  connector.style.width = "100vw";
  connector.style.height = "100vh";
  connector.style.overflow = "visible";

  // Calculate the closest points between the tooltip and the element
  function getClosestEdgePoint(rect1, rect2) {
    const points1 = [
      { x: rect1.left, y: rect1.top }, // top-left
      { x: rect1.right, y: rect1.top }, // top-right
      { x: rect1.left, y: rect1.bottom }, // bottom-left
      { x: rect1.right, y: rect1.bottom }, // bottom-right
      { x: rect1.left + rect1.width / 2, y: rect1.top }, // top-center
      { x: rect1.left + rect1.width / 2, y: rect1.bottom }, // bottom-center
      { x: rect1.left, y: rect1.top + rect1.height / 2 }, // left-center
      { x: rect1.right, y: rect1.top + rect1.height / 2 }, // right-center
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

  // Get bounding rects relative to viewport
  const tooltipRectAbs = {
    left: left,
    right: left + tooltipRect.width,
    top: top,
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

  // Extend line by 4px in both directions
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

  // Draw thick white line for contrast
  const whiteLine = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line"
  );
  whiteLine.setAttribute("x1", tooltipEdge.x);
  whiteLine.setAttribute("y1", tooltipEdge.y);
  whiteLine.setAttribute("x2", elemEdge.x);
  whiteLine.setAttribute("y2", elemEdge.y);
  // Create gradient for the line
  const gradient = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "linearGradient"
  );
  gradient.id = "tooltipLineGradient";
  gradient.setAttribute("gradientUnits", "userSpaceOnUse");
  gradient.setAttribute("x1", tooltipEdge.x);
  gradient.setAttribute("y1", tooltipEdge.y);
  gradient.setAttribute("x2", elemEdge.x);
  gradient.setAttribute("y2", elemEdge.y);

  const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", "rgba(255,255,255,1)");
  gradient.appendChild(stop1);

  const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop2.setAttribute("offset", "100%");
  stop2.setAttribute("stop-color", "rgba(249,245,255,1)");
  gradient.appendChild(stop2);

  connector.appendChild(gradient);

  // Draw main thick line with tooltip gradient
  // Draw white border
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
  connector.appendChild(borderLine);

  // Draw dark center line
  whiteLine.setAttribute("stroke", "#683ab7");
  whiteLine.setAttribute("stroke-width", "3");
  whiteLine.setAttribute("stroke-opacity", "1");
  whiteLine.setAttribute("stroke-linecap", "butt");
  connector.appendChild(whiteLine);

  // Insert connector after tooltip so it's visually on top
  document.body.appendChild(connector);

  // Set final position
  tooltip.style.position = "fixed";
  tooltip.style.top = `${top - window.scrollY}px`;
  tooltip.style.left = `${left - window.scrollX}px`;
}

function hideTooltip() {
  if (tooltip && tooltip.parentNode) {
    tooltip.parentNode.removeChild(tooltip);
    tooltip = null;
  }
  if (connector && connector.parentNode) {
    connector.parentNode.removeChild(connector);
    connector = null;
  }
  // Suppress updating lastFocusedElement on next focusin
  if (inspectedElement) {
    suppressNextFocusIn = true;
    inspectedElement.focus();
  }
}

function getUniqueSelector(el) {
  if (el.id) return `#${CSS.escape(el.id)}`;
  let path = [];
  while (el && el.nodeType === 1 && el !== document.body) {
    let selector = el.nodeName.toLowerCase();
    if (el.classList && el.classList.length) {
      selector +=
        "." +
        Array.from(el.classList)
          .map((cls) => CSS.escape(cls))
          .join(".");
    }
    let sibling = el;
    let nth = 1;
    while ((sibling = sibling.previousElementSibling)) {
      if (sibling.nodeName === el.nodeName) nth++;
    }
    selector += `:nth-of-type(${nth})`;
    path.unshift(selector);
    el = el.parentElement;
  }
  return path.length ? path.join(" > ") : ":focus";
}

function getElementPath(el) {
  const path = [];
  while (el && el !== document.body) {
    let idx = 0;
    let sibling = el;
    while ((sibling = sibling.previousElementSibling)) idx++;
    path.unshift(idx);
    el = el.parentElement;
  }
  return path;
}

// Cache for successful accessibility info lookups
const accessibilityCache = new WeakMap();
let lastFocusedElement = null;
let inspectedElement = null;
let suppressNextFocusIn = false;

function markAndGetSelector(el) {
  const unique = "chrome-ax-marker-" + Math.random().toString(36).slice(2);
  el.setAttribute("data-chrome-ax-marker", unique);
  return `[data-chrome-ax-marker="${unique}"]`;
}

let extensionEnabled = true;
let listenersRegistered = false;

function registerEventListeners() {
  if (listenersRegistered) return;
  document.addEventListener("focusin", onFocusIn, true);
  document.addEventListener("focusout", onFocusOut, true);
  document.addEventListener("keydown", onKeyDown, true);
  listenersRegistered = true;
}

function unregisterEventListeners() {
  if (!listenersRegistered) return;
  document.removeEventListener("focusin", onFocusIn, true);
  document.removeEventListener("focusout", onFocusOut, true);
  document.removeEventListener("keydown", onKeyDown, true);
  listenersRegistered = false;
}

async function waitForAccessibilityUpdate(target, maxAttempts = 20) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const selector = getUniqueSelector(target);
      const info = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(
          () => reject(new Error("Message timeout")),
          5000
        );

        chrome.runtime.sendMessage(
          {
            action: "getBackendNodeIdAndAccessibleInfo",
            elementSelector: selector,
          },
          (response) => {
            clearTimeout(timeoutId);
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
              return;
            }
            resolve(response);
          }
        );
      });

      // Check if we have meaningful data
      const hasData =
        (info?.role && info.role !== "(no role)") ||
        (info?.name && info.name !== "(no accessible name)") ||
        (info?.states && Object.keys(info.states).length > 0) ||
        (info?.ariaProperties && Object.keys(info.ariaProperties).length > 0);

      if (hasData) {
        console.log(`Got accessibility data on attempt ${attempt + 1}:`, {
          role: info?.role,
          name: info?.name,
          statesCount: Object.keys(info?.states || {}).length,
          ariaCount: Object.keys(info?.ariaProperties || {}).length,
        });
        return info;
      }

      // Extended progressive delays: starts at 75ms, increases by 50ms each time
      // 75ms, 125ms, 175ms, 225ms, 275ms, 325ms, 375ms, 425ms, 475ms, 525ms...
      // Then after attempt 10, adds extra 100ms per attempt
      if (attempt < maxAttempts - 1) {
        const baseDelay = 75 + attempt * 50;
        const extraDelay = attempt > 9 ? (attempt - 9) * 100 : 0;
        const delay = baseDelay + extraDelay;
        console.log(
          `No meaningful data on attempt ${attempt + 1}, waiting ${delay}ms...`,
          { role: info?.role, name: info?.name }
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.log(`Attempt ${attempt + 1} failed:`, error);
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  }

  // Final attempt - return whatever we get
  console.log("Final attempt after all retries...");
  try {
    const selector = getUniqueSelector(target);
    const info = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error("Message timeout")),
        5000
      );

      chrome.runtime.sendMessage(
        {
          action: "getBackendNodeIdAndAccessibleInfo",
          elementSelector: selector,
        },
        (response) => {
          clearTimeout(timeoutId);
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(response);
        }
      );
    });
    console.log("Final attempt result:", {
      role: info?.role,
      name: info?.name,
    });
    return info;
  } catch (error) {
    throw new Error("Failed to get accessibility info after all attempts");
  }
}

async function getAccessibleInfo(target, forceUpdate = false) {
  console.log(
    "getAccessibleInfo called with:",
    target,
    "forceUpdate:",
    forceUpdate
  );

  // Check cache first, unless forceUpdate is true
  if (!forceUpdate) {
    const cached = accessibilityCache.get(target);
    if (
      cached &&
      cached.role !== "(no role)" &&
      cached.name !== "(no accessible name)"
    ) {
      console.log("Using cached accessibility info:", cached);
      return cached;
    }
  }

  if (isInShadowRoot(target)) {
    console.log("Element is in shadow root, using local info");
    return getLocalAccessibleInfo(target);
  }

  try {
    const info = await waitForAccessibilityUpdate(target);

    console.log("getAccessibleInfo: building return object from", info);
    const states = { ...(info?.states || {}) };
    const ariaProperties = { ...(info?.ariaProperties || {}) };

    // Clean up recursive properties and exclude non-essential states
    delete states.describedby;
    delete states.url;
    delete ariaProperties["aria-describedby"];

    const result = {
      role: info?.role || "(no role)",
      name: info?.name || "(no accessible name)",
      description: info?.description || "(no description)",
      value: info?.value || "(no value)",
      states,
      ariaProperties,
      ignored: info?.ignored || false,
      ignoredReasons: info?.ignoredReasons || [],
    };

    // If we got good data, cache it
    if (
      result.role !== "(no role)" ||
      result.name !== "(no accessible name)" ||
      Object.keys(states).length > 0 ||
      Object.keys(ariaProperties).length > 0
    ) {
      accessibilityCache.set(target, result);
    } else if (cached) {
      // If current result is empty but we have cached data, use that
      console.log("Using cached data instead of empty result");
      return cached;
    }

    console.log("getAccessibleInfo: final result", result);
    return result;
  } catch (error) {
    console.error("Failed to get accessibility info:", error);
    // If we have cached data, use it instead of falling back to local info
    if (cached) {
      console.log("Using cached data after error");
      return cached;
    }
    const localInfo = getLocalAccessibleInfo(target);
    // Cache local info if it has meaningful data
    if (
      localInfo.role !== "(no role)" ||
      localInfo.name !== "(no accessible name)"
    ) {
      accessibilityCache.set(target, localInfo);
    }
    return localInfo;
  }
}

function onFocusIn(e) {
  logger.log("onFocusIn", "event fired", e.target);
  if (!extensionEnabled) {
    logger.log("onFocusIn", "extension disabled");
    hideTooltip();
    return;
  }
  if (suppressNextFocusIn) {
    suppressNextFocusIn = false;
    return;
  }
  // Don't inspect the close button or anything inside the tooltip
  if (tooltip && tooltip.contains(e.target)) {
    return;
  }
  const targetElement = e.target;
  lastFocusedElement = targetElement;
  inspectedElement = targetElement;

  // Start observing the new focused element
  // Start observing any focusable element for state changes
  startObserving(targetElement);

  let loadingTimeout;

  // Show loading after 300ms
  loadingTimeout = setTimeout(() => {
    if (lastFocusedElement === targetElement) {
      showLoadingTooltip(targetElement);
    }
  }, 300);

  // Start immediately - no delay
  getAccessibleInfo(targetElement)
    .then((info) => {
      clearTimeout(loadingTimeout);
      console.log("getAccessibleInfo resolved with:", info);
      if (lastFocusedElement === targetElement) {
        showTooltip(info, targetElement);
      }
    })
    .catch((error) => {
      clearTimeout(loadingTimeout);
      console.error("Error showing tooltip:", error);
      hideTooltip(targetElement);
    });
}

function onFocusOut(e) {
  // Only stop observing when focus leaves document completely
  if (!e.relatedTarget) {
    stopObserving();
    lastFocusedElement = null;
  }
}

function onKeyDown(e) {
  if (!extensionEnabled) {
    hideTooltip(lastFocusedElement);
    return;
  }
  if (e.key === "Escape" && !e.shiftKey) {
    hideTooltip(lastFocusedElement);
  } else if (e.key === "Escape" && e.shiftKey && lastFocusedElement) {
    getAccessibleInfo(lastFocusedElement)
      .then((info) => {
        showTooltip(info, lastFocusedElement);
      })
      .catch((error) => {
        console.error("Error showing tooltip:", error);
      });
  }
}

// On load, get state and set up listeners
chrome.storage.sync.get({ extensionEnabled: true }, (data) => {
  extensionEnabled = !!data.extensionEnabled;
  if (extensionEnabled) {
    registerEventListeners();
  } else {
    unregisterEventListeners();
    hideTooltip();
  }
});

// Listen for toggle messages from popup
chrome.runtime.onMessage.addListener((msg) => {
  try {
    switch (msg.type) {
      case "ENABLE_EXTENSION":
        extensionEnabled = true;
        registerEventListeners();
        break;
      case "DISABLE_EXTENSION":
        extensionEnabled = false;
        unregisterEventListeners();
        hideTooltip();
        break;
      default:
        console.warn("Unknown message type:", msg.type);
    }
  } catch (error) {
    console.error("Error handling message:", error);
  }
});

function isInShadowRoot(el) {
  return el.getRootNode() instanceof ShadowRoot;
}

function getLocalAccessibleInfo(el) {
  console.log("getLocalAccessibleInfo called with:", el);
  // Try ARIA attributes and native properties
  let role = el.getAttribute("role") || el.role || "(no role)";
  let name =
    el.getAttribute("aria-label") ||
    (el.getAttribute("aria-labelledby") &&
      document.getElementById(el.getAttribute("aria-labelledby"))
        ?.textContent) ||
    el.innerText ||
    el.alt ||
    el.title ||
    "(no accessible name)";
  let description =
    el.getAttribute("aria-description") ||
    (el.getAttribute("aria-describedby") &&
      document.getElementById(el.getAttribute("aria-describedby"))
        ?.textContent) ||
    "";
  if (!description) description = "(no description)";

  // Collect ARIA properties, excluding describedby to prevent recursion
  const ariaProperties = {};
  const states = {};
  Array.from(el.attributes).forEach((attr) => {
    if (attr.name.startsWith("aria-") && attr.name !== "aria-describedby") {
      ariaProperties[attr.name] = attr.value;
    }
  });

  // Add common states
  ["disabled", "checked", "selected", "pressed"].forEach((state) => {
    if (el.hasAttribute(state)) {
      states[state] = true;
    }
  });

  return {
    role,
    name,
    description,
    value: el.value || "(no value)",
    states,
    ariaProperties,
    ignored: false,
    ignoredReasons: [],
  };
}

function getBackendNodeId(element, callback) {
  // Get the element's objectId via the Chrome DevTools Protocol
  chrome.runtime.sendMessage(
    { action: "getBackendNodeId" },
    async (response) => {
      if (response && response.backendNodeId) {
        callback(response.backendNodeId);
      } else {
        callback(null);
      }
    }
  );
}

// Keycap CSS (compact, single-line)
if (!window.chromeAxTooltipKeycapStyle) {
  const keycapStyle = document.createElement("style");
  keycapStyle.textContent = `
    .chrome-ax-tooltip-keys {
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      gap: 0.7em;
      font-size: 12px;
      margin: 2px 0;
      padding-top: 10px;
      color: #3a2956;
      font-family: inherit;
      font-weight: 500;
      letter-spacing: 0.01em;
      user-select: none;
      line-height: 1.4;
      white-space: nowrap;
      overflow-x: auto;
      text-overflow: ellipsis;
    }
    .chrome-ax-tooltip-keys span {
      display: flex;
      align-items: center;
      gap: 0.1em;
      white-space: nowrap;
    }
    .chrome-ax-tooltip-keys kbd {
      display: inline-block;
      font-family: inherit;
      font-size: 11px;
      background: #f3f0fa;
      border: 1px solid #d1c4e9;
      border-radius: 4px;
      box-shadow: 0 1px 1px rgba(104,58,183,0.07);
      padding: 1px 5px 1px 5px;
      margin: 0 1px 0 0;
      color: #683ab7;
      font-weight: 600;
      line-height: 1.1;
      vertical-align: middle;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(keycapStyle);
  window.chromeAxTooltipKeycapStyle = true;
}
