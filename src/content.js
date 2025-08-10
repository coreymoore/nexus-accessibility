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

// Shared handler for any value-changing events (input/change)
function onValueChanged(e) {
  const el = e.target;
  // Debounce refetches per element to avoid flooding
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
}

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
  });
});

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

      // Compute focus-related alerts for tooltip linking
      try {
        result.focusAlerts = computeFocusAlerts(target, result);
      } catch (e) {
        console.warn("computeFocusAlerts failed:", e);
        result.focusAlerts = [];
      }

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

// Determine if an element is programmatically focusable
function isProgrammaticallyFocusable(el) {
  if (!(el instanceof Element)) return false;
  if (el.hasAttribute("disabled")) return false;
  if (!isVisibleForFocus(el)) return false;
  const tabindex = el.getAttribute("tabindex");
  if (tabindex !== null) {
    const ti = parseInt(tabindex, 10);
    if (!Number.isNaN(ti)) return true; // -1 or >=0 => programmatically focusable
  }
  // Natively focusable controls
  const tag = el.tagName;
  if (
    tag === "INPUT" ||
    tag === "SELECT" ||
    tag === "TEXTAREA" ||
    tag === "BUTTON"
  )
    return true;
  if (tag === "A" && el.hasAttribute("href")) return true;
  if (tag === "AREA" && el.hasAttribute("href")) return true;
  if (el.isContentEditable) return true;
  // ARIA widgets often should be focusable
  const role = el.getAttribute("role");
  if (
    role &&
    /^(button|link|checkbox|radio|switch|tab|tabpanel|slider|spinbutton|textbox|combobox|menuitem|menuitemcheckbox|menuitemradio|option|treeitem)$/i.test(
      role
    )
  )
    return true;
  return false;
}

// Determine if element is tabbable (reachable via Tab)
function isTabbable(el) {
  if (!isProgrammaticallyFocusable(el)) return false;
  const tabindex = el.getAttribute("tabindex");
  if (tabindex !== null) {
    const ti = parseInt(tabindex, 10);
    if (ti < 0) return false; // -1 = focusable but not tabbable
  }
  return true;
}

// Rough visibility check similar to ANDI logic
function isVisibleForFocus(el) {
  if (!(el instanceof Element)) return false;
  const style = window.getComputedStyle(el);
  if (
    style.visibility === "hidden" ||
    style.display === "none" ||
    parseFloat(style.opacity) === 0
  )
    return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  // Hidden via hidden attribute
  if (el.hasAttribute("hidden")) return false;
  // aria-hidden on self or ancestor
  let n = el;
  while (n && n.nodeType === 1) {
    if (n.getAttribute && n.getAttribute("aria-hidden") === "true")
      return false;
    n = n.parentElement;
  }
  return true;
}

// Build focus alerts array with { text, anchor }
function computeFocusAlerts(el, info) {
  const alerts = [];
  try {
    const tabindexAttr = el.getAttribute("tabindex");
    const tabindex = tabindexAttr != null ? parseInt(tabindexAttr, 10) : null;
    const ariaHiddenSelf = el.getAttribute("aria-hidden") === "true";
    const disabled =
      el.hasAttribute("disabled") ||
      (info?.states && info.states.disabled === true);
    const role = (
      el.getAttribute("role") ||
      (info && info.role) ||
      ""
    ).toLowerCase();
    const autofocus = el.hasAttribute("autofocus");

    // Tabindex present/positive (map to keyboard access guidance)
    if (tabindexAttr !== null) {
      alerts.push({
        text: `Has tabindex=${tabindexAttr}`,
        anchor: "not_in_tab_order",
      });
      if (tabindex !== null && tabindex > 0) {
        alerts.push({
          text: `Positive tabindex (${tabindex}) affects tab order`,
          anchor: "not_in_tab_order",
        });
      }
    }

    // Not Tabbable
    if (!isTabbable(el)) {
      const noName = !info?.name || info.name === "(no accessible name)";
      alerts.push({
        text: "Element is not tabbable",
        anchor: noName ? "not_in_tab_order_no_name" : "not_in_tab_order",
      });
    }

    // ARIA Hidden (self or ancestor)
    if (ariaHiddenSelf) {
      alerts.push({
        text: 'aria-hidden="true" on element',
        anchor: "ariahidden",
      });
    } else {
      let n = el.parentElement;
      while (n && n.nodeType === 1) {
        if (n.getAttribute && n.getAttribute("aria-hidden") === "true") {
          alerts.push({
            text: 'Ancestor has aria-hidden="true"',
            anchor: "ariahidden",
          });
          break;
        }
        n = n.parentElement;
      }
    }

    // Invisible (CSS/hidden/size)
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      parseFloat(style.opacity) === 0 ||
      el.hasAttribute("hidden") ||
      (rect.width === 0 && rect.height === 0)
    ) {
      // Closest ANDI help topic available is aria-hidden; link there for guidance about hidden content
      alerts.push({ text: "Element appears invisible", anchor: "ariahidden" });
    }

    // Disabled
    if (disabled) {
      alerts.push({ text: "Element is disabled", anchor: "disabled_elements" });
    }

    // role="presentation"|"none"
    if (role === "presentation" || role === "none") {
      // Only surface a help link when this impacts images per ANDI docs
      if (
        el.tagName === "IMG" &&
        el.getAttribute("alt") &&
        el.getAttribute("alt").trim() !== ""
      ) {
        alerts.push({
          text: "Image marked presentational will ignore alt text",
          anchor: "image_alt_not_used",
        });
      }
    }

    // Focus event handlers
    const hasFocusHandlers = hasAnyEventHandler(el, [
      "onfocus",
      "onblur",
      "onfocusin",
      "onfocusout",
    ]);
    if (hasFocusHandlers) {
      alerts.push({
        text: "Has focus/blur event handler(s)",
        anchor: "javascript_event_caution",
      });
    }

    // Autofocus
    // Autofocus not covered by ANDI alerts help: omit linking to avoid dead anchors

    // Focusable descendant
    // Focusable descendant note not mapped in ANDI alerts: skip to avoid dead anchors

    // Custom focusable (role suggests widget but not actually focusable)
    if (role && !isProgrammaticallyFocusable(el)) {
      const widgetish =
        /^(button|link|checkbox|radio|switch|tab|slider|spinbutton|textbox|combobox|menuitem|menuitemcheckbox|menuitemradio|option|treeitem)$/i;
      if (widgetish.test(role)) {
        alerts.push({
          text: `Role \"${role}\" but not focusable`,
          anchor: "role_tab_order",
        });
      }
    }

    // --- Broader ANDI-like checks ---
    const tag = el.tagName;
    const isInputLike =
      tag === "INPUT" ||
      tag === "SELECT" ||
      tag === "TEXTAREA" ||
      el.isContentEditable;

    // Input: missing label/name
    if (isInputLike) {
      const accessibleName = (info && info.name) || "";
      if (!accessibleName || accessibleName === "(no accessible name)") {
        alerts.push({
          text: "Form control is missing an accessible name",
          anchor: "no_name_form_element",
        });
      }
      // Placeholder/required/invalid not covered in ANDI alerts help page: omit
    }

    // Button: no name
    if (tag === "BUTTON" || role === "button") {
      const nameBtn = (info && info.name) || "";
      if (!nameBtn || nameBtn === "(no accessible name)") {
        alerts.push({
          text: "Button has no accessible name",
          anchor: "no_name_generic",
        });
      }
    }

    // Link: empty name
    if ((tag === "A" && el.hasAttribute("href")) || role === "link") {
      const nameLink = (info && info.name) || "";
      if (!nameLink || nameLink === "(no accessible name)") {
        alerts.push({
          text: "Link has no accessible name",
          anchor: "no_name_generic",
        });
      }
    }

    // Image: missing alt
    if (tag === "IMG") {
      const alt = el.getAttribute("alt");
      if (alt == null) {
        alerts.push({
          text: "Image missing alt attribute",
          anchor: "no_name_image",
        });
      }
    }

    // Heading: empty text
    if (/^H[1-6]$/.test(tag)) {
      const nameHeading = (info && info.name) || "";
      if (!nameHeading || nameHeading === "(no accessible name)") {
        alerts.push({
          text: "Heading has no accessible text",
          anchor: "no_name_generic",
        });
      }
    }

    // Focusable but aria-hidden
    if (ariaHiddenSelf && isProgrammaticallyFocusable(el)) {
      alerts.push({
        text: "Focusable element with aria-hidden=true",
        anchor: "ariahidden",
      });
    }

    // Duplicate id
    const id = el.id;
    if (id) {
      const count = document.querySelectorAll(`#${CSS.escape(id)}`).length;
      if (count > 1) {
        alerts.push({
          text: `Duplicate id \"${id}\" present`,
          anchor: "dup_id",
        });
      }
    }

    // iFrame: missing title
    if (tag === "IFRAME") {
      const title = el.getAttribute("title");
      if (!title || !title.trim()) {
        alerts.push({
          text: "iFrame is missing a title",
          anchor: "no_name_iframe",
        });
      }
    }

    // Roles requiring a name
    const rolesRequiringName =
      /^(button|link|img|checkbox|radio|switch|tab|slider|spinbutton|textbox|combobox|menuitem|menuitemcheckbox|menuitemradio|option|treeitem)$/i;
    if (role && rolesRequiringName.test(role)) {
      const nameRole = (info && info.name) || "";
      if (!nameRole || nameRole === "(no accessible name)") {
        alerts.push({
          text: `Role \"${role}\" requires an accessible name`,
          anchor: "no_name_generic",
        });
      }
    }
  } catch (e) {
    console.warn("computeFocusAlerts error:", e);
  }
  return alerts;
}

function hasAnyEventHandler(el, names) {
  for (const n of names) {
    if (n in el && typeof el[n] === "function") return true;
    if (el.hasAttribute && el.hasAttribute(n)) return true; // inline handler
  }
  return false;
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
    group: computeGroupInfo(el),
    ignored: false,
    ignoredReasons: [],
    focusAlerts: computeFocusAlerts(el, { role, name, states, ariaProperties }),
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
