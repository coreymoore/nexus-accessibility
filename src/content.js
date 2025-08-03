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
  padding: 12px 16px;
  border-radius: 8px;
  z-index: 2147483647 !important;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  box-shadow: 
    0 12px 20px -10px rgba(104,58,183,0.18),
    0 3px 6px -2px rgba(104,58,183,0.12),
    inset 0 0 0 1px rgba(104,58,183,0.14);
  border: none;
  white-space: normal;
  pointer-events: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  opacity: 0.98;
  letter-spacing: -0.011em;
  min-width: 280px;
  max-width: 380px;
  animation: ax-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: visible;
}

@keyframes ax-pop {
  0% { transform: scale(0.96) translateY(10px); opacity: 0.7; }
  100% { transform: scale(1) translateY(0); opacity: 0.98; }
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

.chrome-ax-tooltip dl {
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 10px;
  align-items: baseline;
}

.chrome-ax-tooltip dt {
  font-weight: 600;
  color: #683ab7;
  font-size: 12px;
  letter-spacing: 0.02em;
  font-family: inherit;
  text-transform: uppercase;
}

.chrome-ax-tooltip dd {
  margin: 0;
  font-size: 13px;
  color: #2d1958;
  font-family: inherit;
  font-weight: 450;
  background: rgba(245,241,255,0.7);
  padding: 4px 8px;
  border-radius: 6px;
  word-break: break-word;
  box-shadow: inset 0 0 0 1px rgba(104,58,183,0.1);
}

.chrome-ax-tooltip dd:after {
  content: "";
  display: block;
  margin-bottom: 4px;
}
`;
document.head.appendChild(style);

let tooltip = null;
let connector = null;

function getScreenReaderOutput(role, name, description) {
  let output = role;
  if (name && name !== "(no accessible name)") output += " " + name;
  if (description && description !== "(no description)")
    output += " " + description;
  return output;
}

function getPropertiesList(
  role,
  name,
  description,
  value,
  ignored,
  ignoredReasons
) {
  let dl = "<dl>";
  dl += `<dt>Name</dt><dd>${name}</dd>`;
  dl += `<dt>Role</dt><dd>${role}</dd>`;
  if (description !== "(no description)") {
    dl += `<dt>Description</dt><dd>${description}</dd>`;
  }
  if (value !== undefined && value !== null && value !== "(no value)") {
    dl += `<dt>Value</dt><dd>${value}</dd>`;
  }
  dl += `<dt>Ignored</dt><dd>${ignored ? "true" : "false"}</dd>`;
  if (Array.isArray(ignoredReasons) && ignoredReasons.length > 0) {
    dl += `<dt>Ignored Reasons</dt><dd>${ignoredReasons
      .map((r) => r.message || JSON.stringify(r))
      .join(", ")}</dd>`;
  }
  dl += "</dl>";
  return dl;
}

function showTooltip(
  role,
  name,
  description,
  value,
  ignored,
  ignoredReasons,
  target
) {
  console.log("showTooltip called", {
    role,
    name,
    description,
    value,
    ignored,
    ignoredReasons,
    target,
  });
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "chrome-ax-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.setAttribute("id", "chrome-ax-tooltip");
    document.body.appendChild(tooltip);
  }

  tooltip.innerHTML = `
    <div class="chrome-ax-tooltip-sr">
      <svg width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="Screen Reader Output" focusable="false" style="vertical-align:middle;">
        <rect x="3" y="8" width="5" height="8" rx="1.5" fill="#7851a9"/>
        <polygon points="8,8 14,4 14,20 8,16" fill="#7851a9"/>
        <path d="M17 9a4 4 0 0 1 0 6" stroke="#7851a9" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M19.5 7a7 7 0 0 1 0 10" stroke="#78551a9" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      </svg>
      ${getScreenReaderOutput(role, name, description)}
    </div>
    ${getPropertiesList(
      role,
      name,
      description,
      value,
      ignored,
      ignoredReasons
    )}
  `;
  tooltip.style.display = "block";

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

  // Draw connector line (append BEFORE tooltip so it's behind)
  connector = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  connector.style.position = "absolute";
  connector.style.pointerEvents = "none";
  connector.style.zIndex = "2147483646"; // just below tooltip
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

  const [tooltipEdge, elemEdge] = getClosestEdgePoint(
    tooltipRectAbs,
    elemRectAbs
  );

  // Draw thick white line for contrast
  const whiteLine = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line"
  );
  whiteLine.setAttribute("x1", tooltipEdge.x);
  whiteLine.setAttribute("y1", tooltipEdge.y);
  whiteLine.setAttribute("x2", elemEdge.x);
  whiteLine.setAttribute("y2", elemEdge.y);
  whiteLine.setAttribute("stroke", "rgba(238, 242, 255, 0.9)");
  whiteLine.setAttribute("stroke-width", "6");
  whiteLine.setAttribute("stroke-linecap", "round");
  connector.appendChild(whiteLine);

  // Draw thinner colored line on top
  const blackLine = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line"
  );
  blackLine.setAttribute("x1", tooltipEdge.x);
  blackLine.setAttribute("y1", tooltipEdge.y);
  blackLine.setAttribute("x2", elemEdge.x);
  blackLine.setAttribute("y2", elemEdge.y);
  blackLine.setAttribute("stroke", "rgba(99, 102, 241, 0.8)");
  blackLine.setAttribute("stroke-width", "2");
  blackLine.setAttribute("stroke-linecap", "round");
  connector.appendChild(blackLine);

  // Insert connector before tooltip so it's behind
  document.body.insertBefore(connector, tooltip);

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
  target.setAttribute("aria-describedby", "chrome-ax-tooltip");
}

function hideTooltip(target) {
  if (tooltip) tooltip.style.display = "none";
  if (connector) {
    connector.remove();
    connector = null;
  }
  if (target) target.removeAttribute("aria-describedby");
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

// Replace selector logic in focusin and Shift+Escape handlers:
let lastFocusedElement = null;

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

async function getAccessibleInfo(target) {
  if (isInShadowRoot(target)) {
    return getLocalAccessibleInfo(target);
  }

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

    return {
      role: info?.role || "(no role)",
      name: info?.name || "(no accessible name)",
      description: info?.description || "(no description)",
      value: info?.value || "(no value)",
      ignored: info?.ignored || false,
      ignoredReasons: info?.ignoredReasons || [],
      properties: info?.properties || [],
    };
  } catch (error) {
    console.error("Failed to get accessibility info:", error);
    return getLocalAccessibleInfo(target);
  }
}

function onFocusIn(e) {
  if (!extensionEnabled) {
    hideTooltip(e.target);
    return;
  }

  const targetElement = e.target;
  lastFocusedElement = targetElement;

  getAccessibleInfo(targetElement)
    .then((info) => {
      if (lastFocusedElement === targetElement) {
        showTooltip(
          info.role,
          info.name,
          info.description,
          info.value,
          info.ignored,
          info.ignoredReasons,
          targetElement
        );
      }
    })
    .catch((error) => {
      console.error("Error showing tooltip:", error);
      hideTooltip(targetElement);
    });
}

function onFocusOut(e) {
  hideTooltip(e.target);
  lastFocusedElement = null;
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
        showTooltip(
          info.role,
          info.name,
          info.description,
          info.value,
          info.ignored,
          info.ignoredReasons,
          lastFocusedElement
        );
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

// Background script handles the debugger API calls
async function getAccessibleInfo(target) {
  if (isInShadowRoot(target)) {
    return getLocalAccessibleInfo(target);
  }

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

    return {
      role: info?.role || "(no role)",
      name: info?.name || "(no accessible name)",
      description: info?.description || "(no description)",
      value: info?.value || "(no value)",
      ignored: info?.ignored || false,
      ignoredReasons: info?.ignoredReasons || [],
      properties: info?.properties || [],
    };
  } catch (error) {
    console.error("Failed to get accessibility info:", error);
    return getLocalAccessibleInfo(target);
  }
}

function isInShadowRoot(el) {
  return el.getRootNode() instanceof ShadowRoot;
}

function getLocalAccessibleInfo(el) {
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
  return { role, name, description };
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
