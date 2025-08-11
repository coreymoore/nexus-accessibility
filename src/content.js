console.log("Content script loading...");

const logger = window.axLogger;

// Unique token for this frame to coordinate tooltips across frames
const FRAME_TOKEN = `${location.origin}|${location.href}`;

// When another frame shows a tooltip, hide ours to prevent duplicates
chrome.runtime.onMessage.addListener((msg) => {
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
});

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
}

function stopObserving() {
  observer.disconnect();
}

async function waitForAccessibilityUpdate(target, maxAttempts = 8) {
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
            frameUrl: window.location.href,
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

      // Short backoff: 50ms, 100ms, 150ms, ...
      if (attempt < maxAttempts - 1) {
        const delay = 50 * (attempt + 1);
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
        await new Promise((resolve) => setTimeout(resolve, 100));
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
          frameUrl: window.location.href,
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
  // Do not force detach; background manages idle detach via alarms to avoid races
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
      case "AX_TOOLTIP_SHOWN":
        // This is relayed across frames; if it’s from another frame, hide ours.
        if (msg.frameToken && msg.frameToken !== FRAME_TOKEN) {
          const tip = getTooltipEl();
          if (tip) hideTooltip();
        }
        break;
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
        // ignore
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
  let role = el.getAttribute("role") || "";
  const tag = (el.tagName || "").toUpperCase();
  const type =
    (el.getAttribute && (el.getAttribute("type") || "").toLowerCase()) || "";
  // Infer role from native semantics if no explicit role
  if (!role) {
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
  }

  // Compute accessible name: aria first, then labels, then text/alt/title
  let name = el.getAttribute("aria-label") || "";
  if (!name) {
    const labelledby = el.getAttribute("aria-labelledby");
    if (labelledby) {
      name = labelledby
        .split(/\s+/)
        .map((id) =>
          (el.ownerDocument.getElementById(id)?.textContent || "").trim()
        )
        .filter(Boolean)
        .join(" ");
    }
  }
  if (!name && (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")) {
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
  if (!name && tag === "IMG") {
    name = el.getAttribute("alt") || "";
  }
  if (!name) {
    name = (el.innerText || el.textContent || "").trim();
  }
  if (!name) {
    name = el.getAttribute("title") || "";
  }
  if (!name) name = "(no accessible name)";
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
    role: role || "(no role)",
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
