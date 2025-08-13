console.log(
  "Content script loading... v2.1 - Fixed logger exports and performance conflicts"
);

// Global element storage for CDP accessibility retrieval
// IMPORTANT: Do not change this approach! This method uses Runtime.evaluate with direct element
// references followed by DOM.requestNode, which is the most reliable way to get nodeIds for CDP.
// It works regardless of duplicate IDs, classes, or broken markup, and doesn't depend on selectors.
window.nexusTargetElement = null;

/**
 * Store an element reference globally for CDP access
 * This is modular and can be used for focus events, pointer events, or any element selection
 * @param {Element} element - The element to store for CDP access
 * @param {string} selectionType - The type of selection ('focus', 'hover', 'click', etc.)
 */
function storeElementForCDP(element, selectionType = "focus") {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    console.warn("Invalid element provided to storeElementForCDP");
    return;
  }

  // Since document.activeElement is reliable and always accessible from CDP,
  // we don't need complex injection. The element should already be the active element
  // when this is called from focus events.
  console.log(
    `[NEXUS] Element stored for CDP access (${selectionType}):`,
    element
  );
  console.log(
    `[NEXUS] This element should be accessible via document.activeElement in CDP context`
  );
}

// Initialize logger
if (window.initializeLogger) {
  window.initializeLogger();
}

const logger = window.logger ||
  window.axLogger || {
    content: {
      log: console.log.bind(console),
      error: console.error.bind(console),
    },
  };

// Initialize error handler if available
const errorHandler = window.errorHandler || {
  log: (error, context) => console.error(`[${context}]`, error),
  wrap: (fn, context) => fn,
};

// Access debounce utilities if available
const { debounce, throttle, DebouncedRequest } = window.debounceUtils || {
  debounce: (fn, delay) => fn,
  throttle: (fn, delay) => fn,
  DebouncedRequest: null,
};

// Unique token for this frame to coordinate tooltips across frames
const frameToken = Math.random().toString(36).substr(2, 9);

// Observer management with cleanup tracking
const activeObservers = new WeakMap();
const allObservers = new Set(); // Track all observers for cleanup
const observerCleanupTimeouts = new Map(); // Changed to Map for cleanup

// Timer and state management
const refetchTimers = new Map(); // Map of element -> timer ID
const elementTimerTracker = new WeakMap(); // WeakMap of element -> timer ID for cleanup

// Track message listener for cleanup
let messageListener = null;

// Initialize message listener
function initMessageListener() {
  if (messageListener) return; // Prevent duplicates

  messageListener = (msg) => {
    try {
      if (
        msg &&
        msg.type === "AX_TOOLTIP_SHOWN" &&
        msg.frameToken !== FRAME_TOKEN
      ) {
        // Hide our tooltip if visible
        const tip = getTooltipEl();
        if (tip) {
          hideTooltip();
        }
      }
    } catch {}
  };

  chrome.runtime.onMessage.addListener(messageListener);
}

// Cleanup function for page unload
function cleanup() {
  if (messageListener) {
    chrome.runtime.onMessage.removeListener(messageListener);
    messageListener = null;
  }

  // Clean up tooltip
  hideTooltip();

  // Clean up any pending timers
  for (const timer of refetchTimers.values()) {
    clearTimeout(timer);
  }
  refetchTimers.clear();

  // Clean up observers
  if (allObservers && typeof allObservers.forEach === "function") {
    allObservers.forEach((observer) => observer.disconnect());
    allObservers.clear();
  } else if (activeObservers && typeof activeObservers.clear === "function") {
    // Fallback for legacy activeObservers if it exists
    console.warn("Using legacy activeObservers cleanup");
  }

  // Clean up cleanup timeouts
  if (
    observerCleanupTimeouts &&
    typeof observerCleanupTimeouts.forEach === "function"
  ) {
    observerCleanupTimeouts.forEach((timeout) => clearTimeout(timeout));
    observerCleanupTimeouts.clear();
  }

  // Cancel any pending accessibility requests
  if (pendingAccessibilityRequest) {
    pendingAccessibilityRequest.cancelled = true;
    pendingAccessibilityRequest = null;
  }

  // Clean up event listeners
  unregisterEventListeners();
}

// Initialize
initMessageListener();

// Clean up on page unload
window.addEventListener("pagehide", cleanup, { once: true });
window.addEventListener("beforeunload", cleanup, { once: true });

// Helper to get the tooltip element created by the tooltip module
function getTooltipEl() {
  return document.querySelector(".chrome-ax-tooltip");
}

// Thin wrappers delegating to tooltip module (src/components/tooltip/tooltip.js)
function showLoadingTooltip(target) {
  if (
    window.chromeAxTooltip &&
    typeof window.chromeAxTooltip.showLoadingTooltip === "function"
  ) {
    window.chromeAxTooltip.showLoadingTooltip(target);
  }
}

function showTooltip(info, target) {
  if (
    window.chromeAxTooltip &&
    typeof window.chromeAxTooltip.showTooltip === "function"
  ) {
    window.chromeAxTooltip.showTooltip(info, target, {
      onClose: () => {
        const el = inspectedElement || lastFocusedElement;
        // Ask tooltip to hide and then restore focus to the inspected element
        hideTooltip({
          onRefocus: () => {
            if (el && typeof el.focus === "function") {
              suppressNextFocusIn = true;
              try {
                el.focus({ preventScroll: true });
              } catch (e) {
                try {
                  el.focus();
                } catch {}
              }
            }
          },
        });
      },
      enabled: () => extensionEnabled,
    });
    // Broadcast that this frame is showing a tooltip so others can hide theirs
    try {
      chrome.runtime.sendMessage({
        type: "AX_TOOLTIP_SHOWN",
        frameToken: FRAME_TOKEN,
      });
    } catch {}
  }
}

function hideTooltip(opts) {
  if (
    window.chromeAxTooltip &&
    typeof window.chromeAxTooltip.hideTooltip === "function"
  ) {
    // Forward options (may include onRefocus) to tooltip module
    window.chromeAxTooltip.hideTooltip(opts);
  }
}

// Cache for successful accessibility info lookups
const accessibilityCache = new WeakMap();
// New: track in-flight fetches and debounce timers per element
const inflightRequests = new WeakMap();
let lastFocusedElement = null;
let inspectedElement = null;
let suppressNextFocusIn = false;

let extensionEnabled = true;
let listenersRegistered = false;

// Shared handler for any value-changing events (input/change)
const onValueChanged = debounce
  ? debounce((e) => {
      const el = e.target;
      accessibilityCache.delete(el);
      errorHandler
        .wrap(async () => {
          const info = await getAccessibleInfo(el, true);
          if (lastFocusedElement === el) {
            showTooltip(info, el);
          }
        }, "onValueChanged")()
        .catch((err) =>
          console.error("Error updating tooltip on value change:", err)
        );
    }, 100)
  : function onValueChanged(e) {
      const el = e.target;
      // Fallback: manual debounce with setTimeout if utility not available
      const prev = refetchTimers.get(el);
      if (prev) clearTimeout(prev);
      const timer = setTimeout(() => {
        accessibilityCache.delete(el);
        getAccessibleInfo(el, true)
          .then((info) => {
            if (lastFocusedElement === el) {
              showTooltip(info, el);
            }
          })
          .catch((err) =>
            console.error("Error updating tooltip on value change:", err)
          );
      }, 100);
      refetchTimers.set(el, timer);
    };

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

// Helpers to derive group info (role + label) from DOM ancestors
function getTextFromId(id) {
  if (!id) return "";
  const n = document.getElementById(id);
  return (n && n.textContent ? n.textContent : "").trim();
}

function getAriaLabel(el) {
  if (!el) return "";
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel.trim();
  const labelledby = el.getAttribute("aria-labelledby");
  if (labelledby) {
    // aria-labelledby can be space-separated ids
    return labelledby.split(/\s+/).map(getTextFromId).filter(Boolean).join(" ");
  }
  return "";
}

function getFieldsetLegend(el) {
  const legend = el.querySelector(":scope > legend");
  return (legend && legend.textContent ? legend.textContent : "").trim();
}

function computeGroupInfo(el) {
  try {
    let node = el && el.parentElement;
    while (node && node !== document.body) {
      // HTML fieldset acts as a group, label from legend if present
      if (node.tagName === "FIELDSET") {
        const label = getFieldsetLegend(node) || getAriaLabel(node);
        return { role: "group", label: label || undefined };
      }
      // ARIA group containers
      const role = (node.getAttribute && node.getAttribute("role")) || "";
      if (role === "group" || role === "radiogroup") {
        const label = getAriaLabel(node);
        return { role, label: label || undefined };
      }
      node = node.parentElement;
    }
  } catch (e) {
    console.warn("computeGroupInfo failed:", e);
  }
  return undefined;
}

// Add at the top level
// Create mutation observer to watch for ARIA changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (
      mutation.type === "attributes" &&
      (mutation.target === lastFocusedElement ||
        // Also handle attribute changes on <option> elements inside a focused <select>
        (lastFocusedElement &&
          lastFocusedElement.tagName === "SELECT" &&
          mutation.target &&
          mutation.target.tagName === "OPTION"))
    ) {
      console.log("Attribute changed:", mutation.attributeName);
      // Clear cache for this element to force fresh data
      const targetForUpdate =
        mutation.target === lastFocusedElement
          ? lastFocusedElement
          : lastFocusedElement; // always refetch for the focused select
      accessibilityCache.delete(targetForUpdate);

      // If the container is driving active item via aria-activedescendant, follow the active item
      if (
        mutation.attributeName === "aria-activedescendant" &&
        lastFocusedElement &&
        mutation.target === lastFocusedElement
      ) {
        const activeId = lastFocusedElement.getAttribute(
          "aria-activedescendant"
        );
        if (activeId) {
          const activeEl =
            lastFocusedElement.ownerDocument.getElementById(activeId);
          if (activeEl) {
            inspectedElement = activeEl;
            const prevTimer = refetchTimers.get(activeEl);
            if (prevTimer) clearTimeout(prevTimer);
            const timer = setTimeout(() => {
              accessibilityCache.delete(activeEl);
              getAccessibleInfo(activeEl, true)
                .then((info) => {
                  if (inspectedElement === activeEl) {
                    showTooltip(info, activeEl);
                  }
                })
                .catch((error) => {
                  console.error(
                    "Error updating tooltip for aria-activedescendant:",
                    error
                  );
                });
            }, 120);
            refetchTimers.set(activeEl, timer);
            return; // handled
          }
        }
      }

      // New: debounce re-fetch to prevent overlapping requests
      const target = targetForUpdate;
      if (target) {
        const prevTimer = refetchTimers.get(target);
        if (prevTimer) clearTimeout(prevTimer);
        const timer = setTimeout(() => {
          accessibilityCache.delete(target);
          getAccessibleInfo(target, true)
            .then((info) => {
              if (lastFocusedElement === target) {
                showTooltip(info, target);
              }
            })
            .catch((error) => {
              console.error("Error updating tooltip:", error);
            });
        }, 150);
        refetchTimers.set(target, timer);
      }
    }

    // Schedule cleanup check for all mutation targets
    if (mutation.target && mutation.target.nodeType === Node.ELEMENT_NODE) {
      scheduleObserverCleanup(mutation.target);
    }
  });
});

function startObservingElement(element) {
  // Check if already observing
  if (activeObservers.has(element)) {
    return;
  }

  const observerOptions = {
    attributes: true,
    attributeFilter: [
      "aria-label",
      "aria-describedby",
      "aria-labelledby",
      "title",
      "value",
    ],
    subtree: false,
    childList: false,
  };

  observer.observe(element, observerOptions);
  activeObservers.set(element, observer);
  allObservers.add(observer); // Track for cleanup

  // Schedule periodic cleanup check
  scheduleObserverCleanup(element);
}

function scheduleObserverCleanup(element) {
  // Clear existing timeout
  const existingTimeout = observerCleanupTimeouts.get(element);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Schedule new cleanup check
  const timeout = setTimeout(() => {
    if (!document.contains(element)) {
      stopObservingElement(element);
    }
  }, 30000); // Check every 30 seconds

  observerCleanupTimeouts.set(element, timeout);
}

function stopObservingElement(element) {
  const observer = activeObservers.get(element);
  if (observer) {
    observer.disconnect();
    activeObservers.delete(element);
    allObservers.delete(observer); // Remove from cleanup tracking
  }

  const timeout = observerCleanupTimeouts.get(element);
  if (timeout) {
    clearTimeout(timeout);
    observerCleanupTimeouts.delete(element);
  }
}

function startObserving(element) {
  const isSelect = element && element.tagName === "SELECT";
  observer.observe(element, {
    attributes: true,
    // For <select>, also observe subtree to catch <option selected> attribute toggles
    subtree: !!isSelect,
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
      // Patterns where focus remains on container but active item changes
      "aria-activedescendant",
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

  // Also start observing with new memory-safe method
  startObservingElement(element);
}

function stopObserving() {
  observer.disconnect();
}

// Add at the top of the file after logger initialization
let pendingAccessibilityRequest = null;

async function waitForAccessibilityUpdate(target, maxAttempts = 8) {
  // Cancel any pending request
  if (pendingAccessibilityRequest) {
    pendingAccessibilityRequest.cancelled = true;
  }

  // Create new request tracker
  const currentRequest = { cancelled: false };
  pendingAccessibilityRequest = currentRequest;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Check if this request was cancelled
    if (currentRequest.cancelled) {
      console.log("[NEXUS] Request cancelled");
      return null;
    }

    try {
      // Use the new CDP approach with direct element reference
      // Also provide a selector as backup in case direct reference fails
      const selector = getUniqueSelector(target);
      const response = await chrome.runtime.sendMessage({
        action: "getBackendNodeIdAndAccessibleInfo",
        useDirectReference: true, // Flag to indicate we're using the global reference approach
        elementSelector: selector, // Backup selector in case direct reference fails
        frameId: 0,
      });

      if (currentRequest.cancelled) return null;

      if (response && response.accessibleNode) {
        return response;
      }

      // Check if we have meaningful data
      const hasData =
        (response?.role && response.role !== "(no role)") ||
        (response?.name && response.name !== "(no accessible name)") ||
        (response?.states && Object.keys(response.states).length > 0) ||
        (response?.ariaProperties &&
          Object.keys(response.ariaProperties).length > 0);

      if (hasData) {
        console.log(`Got accessibility data on attempt ${attempt + 1}:`, {
          role: response?.role,
          name: response?.name,
          statesCount: Object.keys(response?.states || {}).length,
          ariaCount: Object.keys(response?.ariaProperties || {}).length,
        });
        return response;
      }

      // Short backoff: 50ms, 100ms, 150ms, ...
      if (attempt < maxAttempts - 1) {
        const delay = 50 * (attempt + 1);
        console.log(
          `No meaningful data on attempt ${attempt + 1}, waiting ${delay}ms...`,
          { role: response?.role, name: response?.name }
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      if (currentRequest.cancelled) return null;
      console.error("[NEXUS] Attempt failed:", error);

      // Wait before retry with exponential backoff
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, attempt))
        );
      }
    }
  }

  // Clean up
  if (pendingAccessibilityRequest === currentRequest) {
    pendingAccessibilityRequest = null;
  }

  // Final attempt - return whatever we get
  console.log("Final attempt after all retries...");
  try {
    // Use the new CDP approach with direct element reference for final attempt too
    // Also provide a selector as backup
    const selector = getUniqueSelector(target);
    const response = await chrome.runtime.sendMessage({
      action: "getBackendNodeIdAndAccessibleInfo",
      useDirectReference: true,
      elementSelector: selector, // Backup selector
      frameId: 0,
    });

    console.log("Final attempt result:", {
      role: response?.role,
      name: response?.name,
    });
    return response;
  } catch (error) {
    throw new Error("Failed to get accessibility info after all attempts");
  }
}

// New: coalesce concurrent calls per element
async function getAccessibleInfo(target, forceUpdate = false) {
  console.log(
    "getAccessibleInfo called with:",
    target,
    "forceUpdate:",
    forceUpdate
  );

  const existing = inflightRequests.get(target);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    // Check cache first, unless forceUpdate is true
    let cached;
    if (!forceUpdate) {
      cached = accessibilityCache.get(target);
      // Do not show cached; we always fetch fresh now. Cached is kept only as a hard error fallback.
    }

    if (isInShadowRoot(target)) {
      console.log("Element is in shadow root, using local info");
      const localInfo = getLocalAccessibleInfo(target);
      showTooltip(localInfo, target);
      return localInfo;
    }

    // Log the current DOM attribute value for aria-expanded before fetching accessibility info
    const domExpanded = target.getAttribute("aria-expanded");
    console.log("DOM aria-expanded value before fetch:", domExpanded);

    try {
      const info = await waitForAccessibilityUpdate(target);

      // If background returned a structured error object, surface it as an exception
      if (info && info.error) {
        const err = new Error(info.error);
        if (info.errorCode) err.code = info.errorCode;
        throw err;
      }

      console.log("getAccessibleInfo: building return object from", info);
      // Log the accessibility info's expanded state if present
      if (info && info.states && "expanded" in info.states) {
        console.log(
          "Accessibility info.states.expanded:",
          info.states.expanded
        );
      }
      if (
        info &&
        info.ariaProperties &&
        "aria-expanded" in info.ariaProperties
      ) {
        console.log(
          'Accessibility info.ariaProperties["aria-expanded"]:',
          info.ariaProperties["aria-expanded"]
        );
      }
      const states = { ...(info?.states || {}) };
      const ariaProperties = { ...(info?.ariaProperties || {}) };

      // Clean up recursive properties and exclude non-essential states
      delete states.describedby;
      delete states.url;
      delete ariaProperties["aria-describedby"];

      // Normalize expanded state for display
      let normalizedExpanded = null;
      if ("expanded" in states) {
        if (
          typeof states.expanded === "object" &&
          states.expanded !== null &&
          "value" in states.expanded
        ) {
          normalizedExpanded = states.expanded.value === true;
        } else {
          normalizedExpanded = states.expanded === true;
        }
      } else if ("aria-expanded" in ariaProperties) {
        if (
          ariaProperties["aria-expanded"] === "true" ||
          ariaProperties["aria-expanded"] === true
        ) {
          normalizedExpanded = true;
        } else if (
          ariaProperties["aria-expanded"] === "false" ||
          ariaProperties["aria-expanded"] === false
        ) {
          normalizedExpanded = false;
        }
      }

      const result = {
        role: info?.role || "(no role)",
        name: info?.name || "(no accessible name)",
        description: info?.description || "(no description)",
        value: info?.value || "(no value)",
        states,
        ariaProperties,
        normalizedExpanded,
        ignored: info?.ignored || false,
        ignoredReasons: info?.ignoredReasons || [],
      };

      // Normalize native checkbox states from DOM to avoid stale/misaligned AX tri-state
      // Prefer the element's actual properties: checked and indeterminate
      try {
        if (
          target instanceof Element &&
          target.tagName === "INPUT" &&
          target.type === "checkbox"
        ) {
          const domChecked = !!target.checked;
          const domIndeterminate = !!target.indeterminate;
          if (domIndeterminate) {
            result.states.checked = "mixed";
            // Reflect mixed in ariaProperties for visibility, but states drives UI
            result.ariaProperties["aria-checked"] = "mixed";
          } else {
            result.states.checked = domChecked;
            // Remove conflicting aria-checked if present to prevent ambiguity
            if ("aria-checked" in result.ariaProperties) {
              delete result.ariaProperties["aria-checked"];
            }
          }
        } else if ("aria-checked" in result.ariaProperties) {
          // Non-native checkbox or ARIA widget: trust aria-checked attribute
          const a = String(result.ariaProperties["aria-checked"]).toLowerCase();
          if (a === "mixed") {
            result.states.checked = "mixed";
          } else if (a === "true") {
            result.states.checked = true;
          } else if (a === "false") {
            result.states.checked = false;
          }
        }
      } catch (e) {
        console.warn("Checkbox normalization failed:", e);
      }

      // Prefer group from CDP response if present; fallback to DOM-derived group
      result.group = info?.group ?? computeGroupInfo(target);

      // Only cache if not a forceUpdate (mutation observer or explicit refresh)
      if (
        !forceUpdate &&
        (result.role !== "(no role)" ||
          result.name !== "(no accessible name)" ||
          Object.keys(states).length > 0 ||
          Object.keys(ariaProperties).length > 0)
      ) {
        accessibilityCache.set(target, result);
      } else if (cached) {
        // If currIent result is empty but we have cached data, use that
        console.log("Using cached data instead of empty result");
        showTooltip(cached, target);
        return cached;
      }

      console.log("getAccessibleInfo: final result", result);
      // Only show tooltip if this is still the focused element
      if (lastFocusedElement === target) {
        showTooltip(result, target);
      }
      return result;
    } catch (error) {
      console.error("Failed to get accessibility info:", error);
      // Only fallback to cached/local info if all attempts fail
      const cachedNow = accessibilityCache.get(target);
      if (cachedNow) {
        console.log("Using cached data after error");
        showTooltip(cachedNow, target);
        return cachedNow;
      }
      const localInfo = getLocalAccessibleInfo(target);
      // Cache local info if it has meaningful data
      if (
        localInfo.role !== "(no role)" ||
        localInfo.name !== "(no accessible name)"
      ) {
        accessibilityCache.set(target, localInfo);
      }
      // Only show tooltip if this is still the focused element
      if (lastFocusedElement === target) {
        showTooltip(localInfo, target);
      }
      return localInfo;
    } finally {
      inflightRequests.delete(target);
    }
  })();

  inflightRequests.set(target, promise);
  return promise;
}

function onFocusIn(e) {
  logger.content.log("onFocusIn", "event fired", e.target);
  if (!extensionEnabled) {
    logger.content.log("onFocusIn", "extension disabled");
    hideTooltip();
    return;
  }
  if (suppressNextFocusIn) {
    suppressNextFocusIn = false;
    return;
  }
  // Don't inspect the close button or anything inside the tooltip
  const tooltipEl = getTooltipEl();
  if (tooltipEl && tooltipEl.contains(e.target)) {
    return;
  }
  const targetElement = e.target;
  // Ignore focus on iframes/frames to avoid showing a tooltip in the parent frame when
  // focus is moving into a child browsing context; the child frame will manage its tooltip.
  if (
    targetElement &&
    (targetElement.tagName === "IFRAME" || targetElement.tagName === "FRAME")
  ) {
    hideTooltip();
    return;
  }

  // If we're switching focus between elements, remove value listeners from the previous focused element
  if (lastFocusedElement && lastFocusedElement !== targetElement) {
    try {
      lastFocusedElement.removeEventListener("input", onValueChanged);
      lastFocusedElement.removeEventListener("change", onValueChanged);
      lastFocusedElement.removeEventListener("change", onNativeCheckboxChange);
    } catch {}
    const t = refetchTimers.get(lastFocusedElement);
    if (t) clearTimeout(t);
    refetchTimers.delete(lastFocusedElement);
  }
  lastFocusedElement = targetElement;

  // Store the focused element for CDP access - this ensures we always have the current focused element
  console.log(
    "[NEXUS] Focus changed - storing new element for CDP:",
    targetElement
  );
  console.log("[NEXUS] Element details:", {
    tagName: targetElement.tagName,
    id: targetElement.id,
    className: targetElement.className,
    textContent: targetElement.textContent?.substring(0, 50),
  });
  storeElementForCDP(targetElement, "focus");

  // If the focused element manages active item with aria-activedescendant, inspect that item
  let targetForInspect = targetElement;
  const activeDescId = targetElement.getAttribute("aria-activedescendant");
  if (activeDescId) {
    const activeEl = targetElement.ownerDocument.getElementById(activeDescId);
    if (activeEl) {
      targetForInspect = activeEl;
    }
  }
  inspectedElement = targetForInspect;

  // Start observing the new focused element
  // Start observing any focusable element for state changes
  startObserving(targetElement);

  let loadingTimeout;

  // Show loading after 300ms
  loadingTimeout = setTimeout(() => {
    if (lastFocusedElement === targetElement) {
      showLoadingTooltip(targetForInspect);
    }
  }, 300);

  // Clear any cached entry and start immediately with a forced refresh to avoid any stale cache
  accessibilityCache.delete(targetForInspect);
  getAccessibleInfo(targetForInspect, true)
    .then((info) => {
      clearTimeout(loadingTimeout);
      console.log("getAccessibleInfo resolved with:", info);
      if (lastFocusedElement === targetElement) {
        showTooltip(info, targetForInspect);
      }
    })
    .catch((error) => {
      clearTimeout(loadingTimeout);
      console.error("Error showing tooltip:", error);
      hideTooltip(targetForInspect);
    });
  // Listen for native checkbox changes
  if (targetElement.tagName === "INPUT" && targetElement.type === "checkbox") {
    targetElement.addEventListener("change", onNativeCheckboxChange);
  }

  // Listen for value changes on inputs, textareas, and contenteditable elements
  const isValueElt =
    targetElement.tagName === "INPUT" ||
    targetElement.tagName === "TEXTAREA" ||
    targetElement.tagName === "SELECT" ||
    targetElement.isContentEditable === true;
  if (isValueElt) {
    targetElement.addEventListener("input", onValueChanged);
    targetElement.addEventListener("change", onValueChanged);
  }
}

function onNativeCheckboxChange(e) {
  const el = e.target;
  accessibilityCache.delete(el);
  getAccessibleInfo(el, true)
    .then((info) => {
      if (lastFocusedElement === el) {
        showTooltip(info, el);
      }
    })
    .catch((error) => {
      console.error("Error updating tooltip for native checkbox:", error);
    });
}

function onFocusOut(e) {
  // Only stop observing when focus leaves document completely
  if (!e.relatedTarget) {
    stopObserving();
    // Clear pending mutation debounce for this element
    if (lastFocusedElement) {
      const t = refetchTimers.get(lastFocusedElement);
      if (t) clearTimeout(t);
      refetchTimers.delete(lastFocusedElement);
      // Remove value listeners on blur-out-of-document
      try {
        lastFocusedElement.removeEventListener("input", onValueChanged);
        lastFocusedElement.removeEventListener("change", onValueChanged);
        lastFocusedElement.removeEventListener(
          "change",
          onNativeCheckboxChange
        );
      } catch {}
    }
    lastFocusedElement = null;
    // Request background to detach debugger when focus leaves
    chrome.runtime.sendMessage({ action: "detachDebugger" });
  }
}

function onKeyDown(e) {
  if (!extensionEnabled) {
    hideTooltip();
    return;
  }
  const tooltipEl = getTooltipEl();
  if (e.key === "Escape" && !e.shiftKey) {
    // If Escape is pressed from within the tooltip, let the tooltip's
    // own handler close and restore focus to the inspected element.
    if (tooltipEl && tooltipEl.contains(e.target)) {
      return;
    }
    // Always close tooltip regardless of focus state or element state
    hideTooltip();
    // Optionally, clear inspectedElement and lastFocusedElement to prevent re-show
    inspectedElement = null;
    lastFocusedElement = null;
  } else if (e.key === "Escape" && e.shiftKey) {
    // If pressed from within tooltip, defer to tooltip handler instead of reopening
    if (tooltipEl && tooltipEl.contains(e.target)) {
      return;
    }
    // Reopen tooltip for the currently focused element if possible
    let target = lastFocusedElement || document.activeElement;
    if (target && target !== document.body) {
      lastFocusedElement = target;
      // Clear cache and force a fresh fetch when reopening via Shift+Escape
      accessibilityCache.delete(target);
      getAccessibleInfo(target, true)
        .then((info) => {
          showTooltip(info, target);
        })
        .catch((error) => {
          console.error("Error showing tooltip:", error);
        });
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
      case "AX_TOOLTIP_SHOWN":
        // Handle tooltip shown broadcasts from other frames
        // No action needed in content script for this message
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
  const verbose = window.NEXUS_TESTING_MODE?.verbose;
  if (verbose) console.log("getLocalAccessibleInfo called with:", el);

  // Use libraries if available and testing mode allows, fallback to manual computation
  let name = "";
  let description = "";
  let role = "";

  const useLibraries = window.NEXUS_TESTING_MODE?.useLibraries !== false;

  if (useLibraries) {
    try {
      // Try to use dom-accessibility-api for name and description
      if (window.DOMAccessibilityAPI) {
        name = window.DOMAccessibilityAPI.computeAccessibleName(el);
        description =
          window.DOMAccessibilityAPI.computeAccessibleDescription(el);
        if (verbose) console.log("DOM API computed:", { name, description });
      }

      // Try to use aria-query for role (first check explicit, then implicit)
      role = el.getAttribute("role") || "";
      if (!role && window.AriaQuery && window.AriaQuery.getImplicitRole) {
        role = window.AriaQuery.getImplicitRole(el) || "";
        if (verbose) console.log("ARIA Query role:", role);
      }

      // Also try the dom-accessibility-api getRole if aria-query didn't work
      if (
        !role &&
        window.DOMAccessibilityAPI &&
        window.DOMAccessibilityAPI.getRole
      ) {
        role = window.DOMAccessibilityAPI.getRole(el) || "";
        if (verbose) console.log("DOM API role:", role);
      }
    } catch (error) {
      console.warn(
        "Error using accessibility libraries, falling back to manual computation:",
        error
      );
    }
  } else {
    if (verbose)
      console.log("Libraries disabled by testing mode, using fallbacks only");
  }

  // Fallback computation if libraries failed or returned empty values
  if (!name) {
    name = computeFallbackAccessibleName(el);
  }

  if (!description) {
    description = computeFallbackDescription(el);
  }

  if (!role) {
    role = computeFallbackRole(el);
  }

  // Normalize empty values
  if (!name) name = "(no accessible name)";
  if (!description) description = "(no description)";
  if (!role) role = "(no role)";

  // Collect ARIA properties, excluding describedby to prevent recursion
  const ariaProperties = {};
  const states = {};
  Array.from(el.attributes).forEach((attr) => {
    if (attr.name.startsWith("aria-") && attr.name !== "aria-describedby") {
      ariaProperties[attr.name] = attr.value;
    }
  });

  // Add common states
  ["disabled", "selected", "pressed"].forEach((state) => {
    if (el.hasAttribute(state)) {
      states[state] = true;
    }
  });

  // Normalize checkbox states from DOM properties
  if (el.tagName === "INPUT" && el.type === "checkbox") {
    if (el.indeterminate) {
      states.checked = "mixed";
    } else {
      states.checked = !!el.checked;
    }
  } else if (el.hasAttribute("checked")) {
    // For non-input elements using ARIA tri-state patterns, reflect attribute presence only
    states.checked = true;
  }

  return {
    role,
    name,
    description,
    value: el.value || "(no value)",
    states,
    ariaProperties,
    group: computeGroupInfo(el),
    ignored: false,
    ignoredReasons: [],
  };
}

// Fallback accessible name computation
function computeFallbackAccessibleName(el) {
  // Try ARIA label first
  let name = el.getAttribute("aria-label") || "";
  if (name) return name.trim();

  // Try aria-labelledby
  const labelledby = el.getAttribute("aria-labelledby");
  if (labelledby) {
    name = labelledby
      .split(/\s+/)
      .map((id) =>
        (el.ownerDocument.getElementById(id)?.textContent || "").trim()
      )
      .filter(Boolean)
      .join(" ");
    if (name) return name;
  }

  const tag = (el.tagName || "").toUpperCase();

  // For form controls, check for labels
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    // Associated <label for>
    const id = el.getAttribute("id");
    if (id) {
      const lbl = el.ownerDocument.querySelector(
        `label[for="${CSS.escape(id)}"]`
      );
      if (lbl) name = (lbl.textContent || "").trim();
    }
    // Nested label
    if (!name) {
      const parentLabel = el.closest("label");
      if (parentLabel) name = (parentLabel.textContent || "").trim();
    }
  }

  // For images, use alt text
  if (tag === "IMG") {
    name = el.getAttribute("alt") || "";
    if (name) return name;
  }

  // Use text content
  if (!name) {
    name = (el.innerText || el.textContent || "").trim();
  }

  // Use title as last resort
  if (!name) {
    name = el.getAttribute("title") || "";
  }

  return name;
}

// Fallback description computation
function computeFallbackDescription(el) {
  let description =
    el.getAttribute("aria-description") ||
    (el.getAttribute("aria-describedby") &&
      document.getElementById(el.getAttribute("aria-describedby"))
        ?.textContent) ||
    "";
  return description;
}

// Fallback role computation
function computeFallbackRole(el) {
  // Try explicit role first
  let role = el.getAttribute("role") || "";
  if (role) return role;

  const tag = (el.tagName || "").toUpperCase();
  const type =
    (el.getAttribute && (el.getAttribute("type") || "").toLowerCase()) || "";

  // Infer role from native semantics if no explicit role
  if (tag === "A" && el.hasAttribute("href")) role = "link";
  else if (tag === "BUTTON") role = "button";
  else if (tag === "INPUT") {
    if (type === "button" || type === "submit" || type === "reset")
      role = "button";
    else if (type === "checkbox") role = "checkbox";
    else if (type === "radio") role = "radio";
    else if (type === "range") role = "slider";
    else if (
      type === "search" ||
      type === "email" ||
      type === "url" ||
      type === "tel" ||
      type === "password" ||
      type === "text"
    )
      role = "textbox";
    else if (type === "number") role = "spinbutton";
    else role = "textbox"; // default text-like
  } else if (tag === "TEXTAREA") role = "textbox";
  else if (tag === "SELECT") {
    const multiple = el.hasAttribute("multiple");
    const sizeAttr = parseInt(el.getAttribute("size") || "0", 10);
    role = multiple || sizeAttr > 1 ? "listbox" : "combobox";
  } else if (tag === "OPTION") role = "option";
  else if (tag === "IMG") role = "img";
  else if (tag === "SUMMARY") role = "button";
  else if (tag === "NAV") role = "navigation";
  else if (tag === "MAIN") role = "main";
  else if (tag === "ASIDE") role = "complementary";
  else if (tag === "HEADER") role = "banner";
  else if (tag === "FOOTER") role = "contentinfo";
  else if (tag === "UL" || tag === "OL") role = "list";
  else if (tag === "LI") role = "listitem";
  else if (tag === "TABLE") role = "table";
  else if (tag === "TR") role = "row";
  else if (tag === "TH")
    role = el.getAttribute("scope") === "row" ? "rowheader" : "columnheader";
  else if (tag === "TD") role = "cell";
  else if (el.isContentEditable) role = "textbox";
  else if (
    typeof el.tabIndex === "number" &&
    el.tabIndex >= 0 &&
    typeof el.onclick === "function"
  )
    role = "button";

  return role;
}

/**
 * VALIDATION FUNCTION - Safe testing of accessibility libraries
 * This function allows testing the new libraries without affecting production code
 * Usage: validateAccessibilityLibraries(element) in console
 */
function validateAccessibilityLibraries(el) {
  if (!el) {
    console.log("[VALIDATION] No element provided");
    return;
  }

  console.group(
    `[VALIDATION] Testing accessibility libraries on: ${el.tagName}${
      el.id ? "#" + el.id : ""
    }${el.className ? "." + el.className.replace(/\s+/g, ".") : ""}`
  );

  const results = {
    element: el,
    libraryResults: {},
    fallbackResults: {},
    comparison: {},
  };

  // Test libraries
  try {
    if (window.DOMAccessibilityAPI) {
      console.log("[VALIDATION] ✅ DOMAccessibilityAPI is available");
      results.libraryResults.name =
        window.DOMAccessibilityAPI.computeAccessibleName(el);
      results.libraryResults.description =
        window.DOMAccessibilityAPI.computeAccessibleDescription(el);
      results.libraryResults.role_dom = window.DOMAccessibilityAPI.getRole(el);
      console.log("[VALIDATION] DOM API results:", {
        name: results.libraryResults.name,
        description: results.libraryResults.description,
        role: results.libraryResults.role_dom,
      });
    } else {
      console.log("[VALIDATION] ❌ DOMAccessibilityAPI is NOT available");
    }

    if (window.AriaQuery) {
      console.log("[VALIDATION] ✅ AriaQuery is available");
      results.libraryResults.role_aria = window.AriaQuery.getImplicitRole(el);
      console.log(
        "[VALIDATION] ARIA Query role:",
        results.libraryResults.role_aria
      );
    } else {
      console.log("[VALIDATION] ❌ AriaQuery is NOT available");
    }
  } catch (error) {
    console.error("[VALIDATION] Error with libraries:", error);
    results.libraryError = error.message;
  }

  // Test fallback functions
  try {
    results.fallbackResults.name = computeFallbackAccessibleName(el);
    results.fallbackResults.description = computeFallbackDescription(el);
    results.fallbackResults.role = computeFallbackRole(el);
    console.log("[VALIDATION] Fallback results:", results.fallbackResults);
  } catch (error) {
    console.error("[VALIDATION] Error with fallbacks:", error);
    results.fallbackError = error.message;
  }

  // Compare results
  if (
    results.libraryResults.name !== undefined &&
    results.fallbackResults.name !== undefined
  ) {
    results.comparison.nameMatch =
      results.libraryResults.name === results.fallbackResults.name;
    if (!results.comparison.nameMatch) {
      console.warn("[VALIDATION] ⚠️ Name mismatch:", {
        library: results.libraryResults.name,
        fallback: results.fallbackResults.name,
      });
    } else {
      console.log("[VALIDATION] ✅ Name matches");
    }
  }

  if (
    results.libraryResults.description !== undefined &&
    results.fallbackResults.description !== undefined
  ) {
    results.comparison.descriptionMatch =
      results.libraryResults.description ===
      results.fallbackResults.description;
    if (!results.comparison.descriptionMatch) {
      console.warn("[VALIDATION] ⚠️ Description mismatch:", {
        library: results.libraryResults.description,
        fallback: results.fallbackResults.description,
      });
    } else {
      console.log("[VALIDATION] ✅ Description matches");
    }
  }

  // Test the actual production function
  console.log("[VALIDATION] Testing production getLocalAccessibleInfo:");
  const prodResult = getLocalAccessibleInfo(el);
  console.log("[VALIDATION] Production result:", prodResult);

  console.groupEnd();
  return results;
}

// Make validation function globally available
window.validateAccessibilityLibraries = validateAccessibilityLibraries;

// Add testing mode toggle
window.NEXUS_TESTING_MODE = {
  useLibraries: true, // Set to false to test without libraries
  verbose: false, // Set to true for detailed logging
};

// Debug: Check if libraries are loaded
setTimeout(() => {
  console.log("[NEXUS DEBUG] Checking library availability:");
  console.log("  DOMAccessibilityAPI:", typeof window.DOMAccessibilityAPI);
  console.log("  AriaQuery:", typeof window.AriaQuery);
  console.log(
    "  validateAccessibilityLibraries:",
    typeof window.validateAccessibilityLibraries
  );
  console.log("  NEXUS_TESTING_MODE:", window.NEXUS_TESTING_MODE);

  if (window.DOMAccessibilityAPI) {
    console.log(
      "  DOMAccessibilityAPI functions:",
      Object.keys(window.DOMAccessibilityAPI)
    );
  }
  if (window.AriaQuery) {
    console.log("  AriaQuery functions:", Object.keys(window.AriaQuery));
  }

  // Inject libraries and validation functions into page context
  injectIntoPageContext();
}, 100);

/**
 * Inject libraries and validation functions into the page context
 * This allows them to be used from the browser console and page scripts
 */
function injectIntoPageContext() {
  try {
    // Inject the library files directly into the page
    const domApiScript = document.createElement("script");
    domApiScript.src = chrome.runtime.getURL(
      "src/libs/dom-accessibility-api.js"
    );
    domApiScript.onload = () => {
      console.log("[NEXUS] DOMAccessibilityAPI injected into page context");

      // After DOM API loads, inject ARIA Query
      const ariaScript = document.createElement("script");
      ariaScript.src = chrome.runtime.getURL("src/libs/aria-query.js");
      ariaScript.onload = () => {
        console.log("[NEXUS] AriaQuery injected into page context");

        // After both libraries load, inject validation functions
        injectValidationFunctions();
      };
      (document.head || document.documentElement).appendChild(ariaScript);
    };
    (document.head || document.documentElement).appendChild(domApiScript);
  } catch (error) {
    console.error(
      "[NEXUS] Failed to inject libraries into page context:",
      error
    );
  }
}

/**
 * Inject validation functions into page context after libraries are loaded
 */
function injectValidationFunctions() {
  try {
    // Load validation functions from external file to avoid CSP issues
    const validationScript = document.createElement("script");
    validationScript.src = chrome.runtime.getURL(
      "src/libs/validation-functions.js"
    );
    validationScript.onload = () => {
      console.log("[NEXUS] ✅ Validation functions loaded into page context");
    };
    validationScript.onerror = (error) => {
      console.error("[NEXUS] Failed to load validation functions:", error);
    };
    (document.head || document.documentElement).appendChild(validationScript);
  } catch (error) {
    console.error("[NEXUS] Failed to inject validation functions:", error);
  }
}

/**
 * BATCH VALIDATION - Test multiple elements at once
 */
function batchValidateAccessibility(selector = "*") {
  const elements = document.querySelectorAll(selector);
  console.log(
    `[BATCH VALIDATION] Testing ${elements.length} elements matching: ${selector}`
  );

  const results = [];
  elements.forEach((el, index) => {
    if (index < 10) {
      // Limit to first 10 to avoid spam
      results.push(validateAccessibilityLibraries(el));
    }
  });

  return results;
}

window.batchValidateAccessibility = batchValidateAccessibility;

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
