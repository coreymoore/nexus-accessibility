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
  background: #fff;
  color: #111;
  padding: 14px 22px;
  border-radius: 10px;
  z-index: 2147483647 !important;
  font-size: 15px;
  font-family: Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace;
  max-width: 420px;
  min-width: 80px;
  box-shadow:
    0 0 0 4px #000,
    0 4px 24px rgba(0,0,0,0.18),
    0 1.5px 4px rgba(0,0,0,0.10);
  border: 2px solid #fff;
  white-space: pre-wrap;
  pointer-events: none;
  transition: opacity 0.18s cubic-bezier(.4,0,.2,1);
  opacity: 0.98;
  letter-spacing: 0.01em;
}
`;
document.head.appendChild(style);

let tooltip = null;
let connector = null;

function showTooltip(text, target) {
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "chrome-ax-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.setAttribute("id", "chrome-ax-tooltip");
    document.body.appendChild(tooltip);
  }
  tooltip.textContent = text;
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

let lastFocusedElement = null;
let lastAccessibleName = null;

document.addEventListener("focusin", (e) => {
  lastFocusedElement = e.target;
  chrome.runtime.sendMessage(
    { action: "getAccessibleName", elementSelector: ":focus" },
    (response) => {
      if (response && response.name) {
        lastAccessibleName = response.name;
        showTooltip(response.name, e.target);
      } else if (response && response.error) {
        lastAccessibleName = "Error: " + response.error;
        showTooltip(lastAccessibleName, e.target);
      }
    }
  );
});

document.addEventListener("focusout", (e) => {
  hideTooltip(e.target);
  lastFocusedElement = null;
  lastAccessibleName = null;
});

// Keyboard accessibility: ESC to hide, Shift+ESC to restore
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !e.shiftKey) {
    hideTooltip(lastFocusedElement);
  } else if (e.key === "Escape" && e.shiftKey) {
    if (lastFocusedElement && lastAccessibleName) {
      showTooltip(lastAccessibleName, lastFocusedElement);
    }
  }
});
