console.log("Content script loading...");

const logger = window.axLogger;

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
        window.chromeAxTooltip.hideTooltip();
      },
      enabled: () => extensionEnabled,
    });
  }
}

function hideTooltip() {
  if (
    window.chromeAxTooltip &&
    typeof window.chromeAxTooltip.hideTooltip === "function"
  ) {
    window.chromeAxTooltip.hideTooltip();
  }
}

// Cache for successful accessibility info lookups
const accessibilityCache = new WeakMap();
// New: track in-flight fetches and debounce timers per element
const inflightRequests = new WeakMap();
const refetchTimers = new WeakMap();
let lastFocusedElement = null;
let inspectedElement = null;
let suppressNextFocusIn = false;

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

      // New: debounce re-fetch to prevent overlapping requests
      const target = lastFocusedElement;
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
            // Treat structured error responses from background as failures
            if (response && response.error) {
              const err = new Error(response.error);
              if (response.errorCode) err.code = response.errorCode;
              reject(err);
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
      // Do NOT abort on debugger-attached errors; keep retrying to allow final result
      // Previously we threw on "Another debugger is already attached"; now we backoff and continue
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
          if (response && response.error) {
            const err = new Error(response.error);
            if (response.errorCode) err.code = response.errorCode;
            reject(err);
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
  const tooltipEl = getTooltipEl();
  if (tooltipEl && tooltipEl.contains(e.target)) {
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

  // Clear any cached entry and start immediately with a forced refresh to avoid any stale cache
  accessibilityCache.delete(targetElement);
  getAccessibleInfo(targetElement, true)
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
  // Listen for native checkbox changes
  if (targetElement.tagName === "INPUT" && targetElement.type === "checkbox") {
    targetElement.addEventListener("change", onNativeCheckboxChange);
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
  if (e.key === "Escape" && !e.shiftKey) {
    // Always close tooltip regardless of focus state or element state
    hideTooltip();
    // Optionally, clear inspectedElement and lastFocusedElement to prevent re-show
    inspectedElement = null;
    lastFocusedElement = null;
  } else if (e.key === "Escape" && e.shiftKey) {
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
