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
  background: #f6f6fa;
  color: #24124b;
  padding: 14px 20px 12px 20px;
  border-radius: 8px;
  z-index: 2147483647 !important;
  font-size: 1em;
  font-family: 'Inter', 'Segoe UI', 'Liberation Sans', Arial, sans-serif;
  box-shadow: 0 6px 32px 0 rgba(120,81,169,0.13), 0 2px 8px 0 rgba(120,81,169,0.10);
  border: 2.5px solid #7851a9;
  white-space: normal;
  pointer-events: none;
  transition: opacity 0.18s cubic-bezier(.4,0,.2,1), box-shadow 0.18s cubic-bezier(.4,0,.2,1);
  opacity: 0.98;
  letter-spacing: 0.01em;
  min-width: 260px;
  max-width: 360px;
  animation: ax-pop 0.18s cubic-bezier(.4,0,.2,1);
  overflow: visible;
}
@keyframes ax-pop {
  0% { transform: scale(0.96) translateY(10px); opacity: 0.7; }
  100% { transform: scale(1) translateY(0); opacity: 0.98; }
}

.chrome-ax-tooltip::before {
  content: "";
  display: block;
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 5px;
  border-radius: 8px 8px 0 0;
  background: #7851a9;
  margin-bottom: 8px;
}

.chrome-ax-tooltip-heading {
  font-size: 1.13em;
  font-weight: 900;
  color: #7851a9;
  margin-bottom: 8px;
  padding-top: 8px;
  padding-bottom: 3px;
  border-bottom: 2px solid #e3e0ef;
  font-family: inherit;
  letter-spacing: 0.01em;
  text-shadow: none;
  background: none;
}

.chrome-ax-tooltip-sr {
  background: #edeaf5;
  color: #24124b;
  font-size: 1em;
  padding: 7px 12px;
  border-radius: 5px;
  border-left: 5px solid #7851a9;
  margin-bottom: 10px;
  font-family: 'IBM Plex Mono', 'Menlo', 'Consolas', 'Liberation Mono', monospace;
  font-weight: 600;
  word-break: break-word;
  box-shadow: none;
}

.chrome-ax-tooltip dl {
  margin: 0;
  padding: 0;
}

.chrome-ax-tooltip dt {
  font-weight: 800;
  margin-top: 8px;
  margin-bottom: 2px;
  color: #7851a9;
  background: none;
  display: inline-block;
  padding: 0 7px 0 0;
  border: none;
  border-radius: 0;
  font-size: 1em;
  letter-spacing: 0.01em;
  font-family: inherit;
  box-shadow: none;
  text-shadow: none;
}

.chrome-ax-tooltip dd {
  margin-left: 0;
  margin-bottom: 8px;
  padding-left: 10px;
  font-size: 0.99em;
  color: #24124b;
  background: none;
  border-left: 2.5px solid #b39ddb;
  border-radius: 0;
  font-family: inherit;
  font-weight: 400;
  word-break: break-word;
  box-shadow: none;
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

function getPropertiesList(role, name, description) {
  let dl = "<dl>";
  dl += `<dt>Name</dt><dd>${name}</dd>`;
  dl += `<dt>Role</dt><dd>${role}</dd>`;
  if (description !== "(no description)") {
    dl += `<dt>Description</dt><dd>${description}</dd>`;
  }
  dl += "</dl>";
  return dl;
}

function showTooltip(role, name, description, target) {
  console.log("showTooltip called", { role, name, description, target });
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
  <!-- Speaker body -->
  <rect x="3" y="8" width="5" height="8" rx="1.5" fill="#7851a9"/>
  <polygon points="8,8 14,4 14,20 8,16" fill="#7851a9"/>
  <!-- Sound waves -->
  <path d="M17 9a4 4 0 0 1 0 6" stroke="#7851a9" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M19.5 7a7 7 0 0 1 0 10" stroke="#7851a9" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</svg>
    ${getScreenReaderOutput(role, name, description)}
  </div>
  ${getPropertiesList(role, name, description)}
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
  whiteLine.setAttribute("stroke", "#fff");
  whiteLine.setAttribute("stroke-width", "6");
  whiteLine.setAttribute("stroke-linecap", "round");
  connector.appendChild(whiteLine);

  // Draw thinner black line on top
  const blackLine = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line"
  );
  blackLine.setAttribute("x1", tooltipEdge.x);
  blackLine.setAttribute("y1", tooltipEdge.y);
  blackLine.setAttribute("x2", elemEdge.x);
  blackLine.setAttribute("y2", elemEdge.y);
  blackLine.setAttribute("stroke", "#111");
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

function onFocusIn(e) {
  if (!extensionEnabled) {
    hideTooltip(e.target);
    return;
  }
  lastFocusedElement = e.target;
  if (isInShadowRoot(e.target)) {
    const { role, name, description } = getLocalAccessibleInfo(e.target);
    showTooltip(
      role,
      name,
      description + " (Shadow DOM: computed accessibility info unavailable)",
      e.target
    );
    return;
  }
  const selector = markAndGetSelector(e.target);
  chrome.runtime.sendMessage(
    { action: "getAccessibleInfo", elementSelector: selector },
    (info) => {
      e.target.removeAttribute("data-chrome-ax-marker");
      let role = info && info.role ? info.role : "(no role)";
      let name = info && info.name ? info.name : "(no accessible name)";
      let description =
        info && info.description ? info.description : "(no description)";
      showTooltip(role, name, description, e.target);
    }
  );
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
  } else if (e.key === "Escape" && e.shiftKey) {
    if (lastFocusedElement) {
      const selector = getUniqueSelector(lastFocusedElement);
      chrome.runtime.sendMessage(
        { action: "getAccessibleInfo", elementSelector: selector },
        (info) => {
          let role = info && info.role ? info.role : "(no role)";
          let name = info && info.name ? info.name : "(no accessible name)";
          let description =
            info && info.description ? info.description : "(no description)";
          showTooltip(role, name, description, lastFocusedElement);
        }
      );
    }
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
  if (msg.type === "ENABLE_EXTENSION") {
    extensionEnabled = true;
    registerEventListeners();
  } else if (msg.type === "DISABLE_EXTENSION") {
    extensionEnabled = false;
    unregisterEventListeners();
    hideTooltip();
  }
});

async function getAccessibleInfo(tabId, selector) {
  await chrome.debugger.attach({ tabId }, "1.3");
  await chrome.debugger.sendCommand({ tabId }, "Accessibility.enable");
  const { root } = await chrome.debugger.sendCommand(
    { tabId },
    "DOM.getDocument",
    { depth: -1, pierce: true }
  );
  const { nodeId } = await chrome.debugger.sendCommand(
    { tabId },
    "DOM.querySelector",
    {
      nodeId: root.nodeId,
      selector: selector,
    }
  );
  if (!nodeId) {
    await chrome.debugger.detach({ tabId });
    throw new Error("Node not found");
  }
  const { nodes } = await chrome.debugger.sendCommand(
    { tabId },
    "Accessibility.getPartialAXTree",
    {
      nodeId,
      fetchRelatives: false,
    }
  );
  await chrome.debugger.detach({ tabId });
  let role = "(no role)";
  let name = "(no accessible name)";
  let description = "(no description)";
  if (nodes && nodes.length) {
    if (nodes[0].role && nodes[0].role.value) role = nodes[0].role.value;
    if (nodes[0].name && nodes[0].name.value) name = nodes[0].name.value;
    if (nodes[0].description && nodes[0].description.value)
      description = nodes[0].description.value;
  }
  return { role, name, description };
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
