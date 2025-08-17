/**
 * Content Script Event Management
 *
 * This module handles all DOM event listening and management.
 * It manages focus events, keyboard events, and other user interactions.
 *
 * Dependencies: content-utils.js, content-cache.js
 */

(function () {
  "use strict";

  // Ensure our namespace exists
  window.ContentExtension = window.ContentExtension || {};
  const CE = window.ContentExtension;

  // State variables
  let lastFocusedElement = null;
  let inspectedElement = null;
  let listenersRegistered = false;
  let suppressNextFocusIn = false;

  // Shadow DOM monitoring
  let currentShadowHost = null;
  let shadowActiveElementObserver = null;
  let lastProcessedElement = null; // Track the last element we processed
  /**
   * Monitor shadow DOM active element changes
   */
  function monitorShadowActiveElement(shadowHost) {
    // Clean up previous observer
    if (shadowActiveElementObserver) {
      shadowActiveElementObserver.disconnect();
      shadowActiveElementObserver = null;
    }

    if (!shadowHost || !shadowHost.shadowRoot) {
      currentShadowHost = null;
      return;
    }

    currentShadowHost = shadowHost;
    let lastActiveElement = shadowHost.shadowRoot.activeElement;

    console.log(
      "[ContentExtension.events] Starting shadow DOM monitoring for:",
      shadowHost.id
    );
    console.log(
      "Initial shadowRoot.activeElement:",
      lastActiveElement?.tagName,
      lastActiveElement?.id
    );

    // Poll for activeElement changes since MutationObserver can't detect focus changes
    const checkInterval = setInterval(() => {
      if (!currentShadowHost || currentShadowHost !== shadowHost) {
        console.log(
          "[ContentExtension.events] Stopping monitor - shadow host changed"
        );
        clearInterval(checkInterval);
        return;
      }

      const currentActiveElement = shadowHost.shadowRoot.activeElement;
      // Log the current state for debugging
      if (currentActiveElement !== lastActiveElement) {
        console.log(
          "[ContentExtension.events] Shadow DOM activeElement changed"
        );
        console.log(
          "Previous:",
          lastActiveElement?.tagName,
          lastActiveElement?.id
        );
        console.log(
          "Current:",
          currentActiveElement?.tagName,
          currentActiveElement?.id
        );
        if (currentActiveElement) {
          lastActiveElement = currentActiveElement;
          lastProcessedElement = currentActiveElement;
          // Store the shadow host for CDP (since focus events target the host)
          CE.utils.storeElementForCDP(shadowHost, "shadow-active-change");
          // Trigger accessibility info retrieval
          handleElementInspection(shadowHost, currentActiveElement);
        }
      }
    }, 50); // Check every 50ms

    // Store the interval ID so we can clean it up
    shadowActiveElementObserver = {
      disconnect: () => clearInterval(checkInterval),
    };
  }

  /**
   * Clean up shadow monitoring
   */
  function cleanupShadowMonitoring() {
    if (shadowActiveElementObserver) {
      console.log(
        "[ContentExtension.events] Cleaning up shadow DOM monitoring"
      );
      shadowActiveElementObserver.disconnect();
      shadowActiveElementObserver = null;
    }
    currentShadowHost = null;
  }

  // Shadow DOM monitoring
  // (removed duplicate declarations)
  let messageListener = null;

  /**
   * Initialize the events module
   */
  function initialize() {
    console.log("[ContentExtension.events] Initializing event management");
    initMessageListener();
  }

  /**
   * Initialize message listener for cross-frame communication
   */
  function initMessageListener() {
    if (messageListener) return; // Prevent duplicates

    messageListener = (msg) => {
      try {
        if (
          msg &&
          msg.type === "AX_TOOLTIP_SHOWN" &&
          msg.frameToken !== CE.utils.getFrameToken()
        ) {
          // Hide our tooltip if visible when another frame shows one
          if (CE.tooltip && CE.tooltip.hideTooltip) {
            CE.tooltip.hideTooltip();
          }
        }
      } catch (error) {
        console.error(
          "[ContentExtension.events] Error in message listener:",
          error
        );
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
  }

  /**
   * Monitor shadow DOM active element changes
   */
  function monitorShadowActiveElement(shadowHost) {
    // Clean up previous observer
    if (shadowActiveElementObserver) {
      shadowActiveElementObserver.disconnect();
      shadowActiveElementObserver = null;
    }

    if (!shadowHost || !shadowHost.shadowRoot) {
      currentShadowHost = null;
      return;
    }

    currentShadowHost = shadowHost;
    let lastActiveElement = shadowHost.shadowRoot.activeElement;

    // Poll for activeElement changes since MutationObserver can't detect focus changes
    const checkInterval = setInterval(() => {
      if (!currentShadowHost || currentShadowHost !== shadowHost) {
        clearInterval(checkInterval);
        return;
      }

      const currentActiveElement = shadowHost.shadowRoot.activeElement;
      if (currentActiveElement !== lastActiveElement && currentActiveElement) {
        console.log(
          "[ContentExtension.events] Shadow DOM activeElement changed"
        );
        console.log(
          "Previous:",
          lastActiveElement?.tagName,
          lastActiveElement?.id
        );
        console.log(
          "Current:",
          currentActiveElement.tagName,
          currentActiveElement.id
        );

        lastActiveElement = currentActiveElement;

        // Store the shadow host for CDP (since focus events target the host)
        CE.utils.storeElementForCDP(shadowHost, "shadow-active-change");

        // Trigger accessibility info retrieval
        handleElementInspection(shadowHost, currentActiveElement);
      }
    }, 50); // Check every 50ms

    // Store the interval ID so we can clean it up
    shadowActiveElementObserver = {
      disconnect: () => clearInterval(checkInterval),
    };
  }

  /**
   * Clean up shadow monitoring
   */
  function cleanupShadowMonitoring() {
    if (shadowActiveElementObserver) {
      shadowActiveElementObserver.disconnect();
      shadowActiveElementObserver = null;
    }
    currentShadowHost = null;
  }

  /**
   * Handle focus in events
   * @param {FocusEvent} e - The focus event
   */
  function onFocusIn(e) {
    const utils = CE.utils;
    utils.logger.content.log("onFocusIn", "event fired", e.target);

    console.log("[DEBUG] Focus event details:", {
      target: e.target,
      tagName: e.target?.tagName,
      id: e.target?.id,
      className: e.target?.className,
      isInShadowRoot: e.target?.getRootNode() instanceof ShadowRoot,
      parentHost: e.target?.getRootNode()?.host?.tagName || "none",
    });

    // Check if we're focusing the same element we just processed
    if (e.target === lastProcessedElement) {
      console.log(
        "[ContentExtension.events] Skipping - same element as last processed"
      );
      return;
    }

    // Clean up previous shadow monitoring
    cleanupShadowMonitoring();

    if (!CE.main || !CE.main.isEnabled()) {
      utils.logger.content.log("onFocusIn", "extension disabled");
      if (CE.tooltip) CE.tooltip.hideTooltip();
      return;
    }

    if (suppressNextFocusIn) {
      suppressNextFocusIn = false;
      return;
    }

    // Don't inspect the close button or anything inside the tooltip
    const tooltipEl = utils.getTooltipElement();
    if (tooltipEl && utils.safeContains(tooltipEl, e.target)) {
      return;
    }

    const element = e.target;
    lastProcessedElement = element;

    // Ignore focus on iframes/frames
    if (
      element &&
      (element.tagName === "IFRAME" || element.tagName === "FRAME")
    ) {
      if (CE.tooltip) CE.tooltip.hideTooltip();
      return;
    }

    // Clean up previous focused element
    cleanupPreviousFocus(element);

    // Update focus tracking
    lastFocusedElement = element;

    // Store element for CDP access
    utils.storeElementForCDP(element, "focus");

    // Check if this element is inside a shadow DOM
    const rootNode = element.getRootNode();
    if (rootNode instanceof ShadowRoot) {
      console.log(
        "[ContentExtension.events] Focused element is inside shadow DOM"
      );
      const shadowHost = rootNode.host;
      console.log(
        "Shadow host:",
        shadowHost?.id,
        "delegatesFocus:",
        rootNode.delegatesFocus
      );
      // Store the actual focused element for CDP, not the host
      utils.storeElementForCDP(element, "shadow-element-focus");
      // If the host has delegatesFocus, monitor for changes
      if (shadowHost && rootNode.delegatesFocus) {
        monitorShadowActiveElement(shadowHost);
      }
    } else if (element.shadowRoot) {
      // This is a shadow host
      console.log("[ContentExtension.events] Focused element is a shadow host");
      // If it has delegatesFocus, monitor activeElement changes
      if (element.shadowRoot.delegatesFocus) {
        console.log(
          "[ContentExtension.events] Shadow host has delegatesFocus, setting up monitoring"
        );
        monitorShadowActiveElement(element);
      }
    }

    // Determine target for inspection (handle aria-activedescendant)
    let targetForInspect = element;
    const activeDescId = utils.safeGetAttribute(
      element,
      "aria-activedescendant"
    );
    if (activeDescId) {
      const activeEl = element.ownerDocument.getElementById(activeDescId);
      if (activeEl) {
        targetForInspect = activeEl;
      }
    }
    inspectedElement = targetForInspect;

    // Start observing the focused element
    if (CE.observers && CE.observers.startObserving) {
      CE.observers.startObserving(element);
    }

    // Set up loading timeout and fetch accessibility info
    handleElementInspection(element, targetForInspect);

    // Set up event listeners for this element
    setupElementEventListeners(element);
  }

  /**
   * Clean up event listeners from previous focused element
   * @param {Element} newTargetElement - The new target element
   */
  function cleanupPreviousFocus(newTargetElement) {
    if (lastFocusedElement && lastFocusedElement !== newTargetElement) {
      try {
        lastFocusedElement.removeEventListener("input", onValueChanged);
        lastFocusedElement.removeEventListener("change", onValueChanged);
        lastFocusedElement.removeEventListener(
          "change",
          onNativeCheckboxChange
        );
      } catch (error) {
        console.warn(
          "[ContentExtension.events] Error cleaning up previous focus:",
          error
        );
      }

      // Clear any pending timers
      if (CE.cache) {
        CE.cache.clearRefetchTimer(lastFocusedElement);
      }
    }
  }

  /**
   * Handle inspection of focused element
   * @param {Element} targetElement - The focused element
   * @param {Element} targetForInspect - The element to inspect (may be different for aria-activedescendant)
   */
  function handleElementInspection(targetElement, targetForInspect) {
    console.log("[ContentExtension.events] handleElementInspection called");
    console.log("targetElement:", targetElement?.tagName, targetElement?.id);
    console.log(
      "targetForInspect:",
      targetForInspect?.tagName,
      targetForInspect?.id
    );

    let loadingTimeout;

    // Show loading after 300ms
    loadingTimeout = setTimeout(() => {
      if (lastFocusedElement === targetElement && CE.tooltip) {
        CE.tooltip.showLoadingTooltip(targetForInspect);
      }
    }, 300);

    // Clear cache and fetch accessibility info
    if (CE.cache) {
      CE.cache.deleteCached(targetForInspect);
    }

    // Function to actually fetch the accessibility info
    const fetchAccessibilityInfo = () => {
      if (CE.accessibility && CE.accessibility.getAccessibleInfo) {
        CE.accessibility
          .getAccessibleInfo(targetForInspect, true)
          .then((info) => {
            clearTimeout(loadingTimeout);
            if (lastFocusedElement === targetElement && CE.tooltip) {
              CE.tooltip.showTooltip(info, targetForInspect);
            }
          })
          .catch((error) => {
            clearTimeout(loadingTimeout);
            console.error(
              "[ContentExtension.events] Error showing tooltip:",
              error
            );
            if (CE.tooltip) {
              CE.tooltip.hideTooltip();
            }
          });
      }
    };

    // Fetch accessibility info immediately - timing is now handled in background script
    fetchAccessibilityInfo();
  }

  /**
   * Set up event listeners for a specific element
   * @param {Element} targetElement - The element to set up listeners for
   */
  function setupElementEventListeners(targetElement) {
    // Listen for native checkbox changes
    if (
      targetElement.tagName === "INPUT" &&
      targetElement.type === "checkbox"
    ) {
      targetElement.addEventListener("change", onNativeCheckboxChange);
    }

    // Listen for value changes on inputs, textareas, and contenteditable elements
    const isValueElement =
      targetElement.tagName === "INPUT" ||
      targetElement.tagName === "TEXTAREA" ||
      targetElement.tagName === "SELECT" ||
      targetElement.isContentEditable === true;

    if (isValueElement) {
      targetElement.addEventListener("input", onValueChanged);
      targetElement.addEventListener("change", onValueChanged);
    }
  }

  /**
   * Handle focus out events
   * @param {FocusEvent} e - The focus event
   */
  function onFocusOut(e) {
    // Clean up shadow monitoring when focus leaves the shadow host
    if (currentShadowHost === e.target) {
      cleanupShadowMonitoring();
    }

    // Only stop observing when focus leaves document completely
    if (!e.relatedTarget) {
      if (CE.observers && CE.observers.stopObserving) {
        CE.observers.stopObserving();
      }

      // Clean up pending operations
      if (lastFocusedElement && CE.cache) {
        CE.cache.clearRefetchTimer(lastFocusedElement);

        // Remove value listeners
        try {
          lastFocusedElement.removeEventListener("input", onValueChanged);
          lastFocusedElement.removeEventListener("change", onValueChanged);
          lastFocusedElement.removeEventListener(
            "change",
            onNativeCheckboxChange
          );
        } catch (error) {
          console.warn(
            "[ContentExtension.events] Error cleaning up on focus out:",
            error
          );
        }
      }

      lastFocusedElement = null;

      // Request background to detach debugger when focus leaves
      try {
        if (CE.utils && CE.utils.validatedSend) {
          CE.utils
            .validatedSend({ action: "detachDebugger" }, "detachDebuggerOnBlur")
            .catch((e) =>
              console.warn(
                "[ContentExtension.events] detachDebugger send failed:",
                e.message
              )
            );
        } else {
          chrome.runtime.sendMessage({ action: "detachDebugger" });
        }
      } catch (error) {
        console.warn(
          "[ContentExtension.events] Failed to send detach message:",
          error
        );
      }
    }
  }

  /**
   * Handle keyboard events
   * @param {KeyboardEvent} e - The keyboard event
   */
  function onKeyDown(e) {
    if (!CE.main || !CE.main.isEnabled()) {
      if (CE.tooltip) CE.tooltip.hideTooltip();
      return;
    }

    const tooltipEl = CE.utils.getTooltipElement();

    if (e.key === "Escape" && !e.shiftKey) {
      // If Escape is pressed from within the tooltip, let the tooltip handle it
      if (tooltipEl && CE.utils.safeContains(tooltipEl, e.target)) {
        return;
      }

      // Close tooltip and clear state
      if (CE.tooltip) CE.tooltip.hideTooltip();
      inspectedElement = null;
      lastFocusedElement = null;
    } else if (e.key === "Escape" && e.shiftKey) {
      // If pressed from within tooltip, defer to tooltip handler
      if (tooltipEl && CE.utils.safeContains(tooltipEl, e.target)) {
        return;
      }

      // Reopen tooltip for currently focused element
      let target = lastFocusedElement || document.activeElement;
      if (target && target !== document.body) {
        lastFocusedElement = target;

        // Force fresh fetch when reopening
        if (CE.cache) {
          CE.cache.deleteCached(target);
        }

        if (CE.accessibility && CE.accessibility.getAccessibleInfo) {
          CE.accessibility
            .getAccessibleInfo(target, true)
            .then((info) => {
              if (CE.tooltip) {
                CE.tooltip.showTooltip(info, target);
              }
            })
            .catch((error) => {
              console.error(
                "[ContentExtension.events] Error showing tooltip on Shift+Escape:",
                error
              );
            });
        }
      }
    }
  }

  /**
   * Handle value changes on form elements
   * @param {Event} e - The change/input event
   */
  function onValueChanged(e) {
    const el = e.target;

    if (CE.cache) {
      CE.cache.deleteCached(el);
    }

    // Create debounced update function
    const updateTooltip = () => {
      if (CE.accessibility && CE.accessibility.getAccessibleInfo) {
        CE.accessibility
          .getAccessibleInfo(el, true)
          .then((info) => {
            if (lastFocusedElement === el && CE.tooltip) {
              CE.tooltip.showTooltip(info, el);
            }
          })
          .catch((err) => {
            console.error(
              "[ContentExtension.events] Error updating tooltip on value change:",
              err
            );
          });
      }
    };

    if (CE.cache && CE.cache.createDebouncedUpdate) {
      const debouncedUpdate = CE.cache.createDebouncedUpdate(
        updateTooltip,
        100
      );
      debouncedUpdate(el);
    } else {
      // Fallback without debouncing
      updateTooltip();
    }
  }

  /**
   * Handle native checkbox changes
   * @param {Event} e - The change event
   */
  function onNativeCheckboxChange(e) {
    const el = e.target;

    if (CE.cache) {
      CE.cache.deleteCached(el);
    }

    if (CE.accessibility && CE.accessibility.getAccessibleInfo) {
      CE.accessibility
        .getAccessibleInfo(el, true)
        .then((info) => {
          if (lastFocusedElement === el && CE.tooltip) {
            CE.tooltip.showTooltip(info, el);
          }
        })
        .catch((error) => {
          console.error(
            "[ContentExtension.events] Error updating tooltip for native checkbox:",
            error
          );
        });
    }
  }

  /**
   * Register all event listeners
   */
  function enableEventListeners() {
    if (listenersRegistered) return;

    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("keydown", onKeyDown, true);

    listenersRegistered = true;
    console.log("[ContentExtension.events] Event listeners enabled");
  }

  /**
   * Unregister all event listeners
   */
  function disableEventListeners() {
    if (!listenersRegistered) return;

    // Clean up shadow monitoring
    cleanupShadowMonitoring();

    document.removeEventListener("focusin", onFocusIn, true);
    document.removeEventListener("focusout", onFocusOut, true);
    document.removeEventListener("keydown", onKeyDown, true);

    listenersRegistered = false;
    console.log("[ContentExtension.events] Event listeners disabled");
  }

  /**
   * Get current focus state
   * @returns {Object} Current focus state
   */
  function getFocusState() {
    return {
      lastFocusedElement,
      inspectedElement,
      suppressNextFocusIn,
    };
  }

  /**
   * Set suppress next focus in flag
   * @param {boolean} suppress - Whether to suppress next focus in
   */
  function setSuppressNextFocusIn(suppress) {
    suppressNextFocusIn = !!suppress;
  }

  /**
   * Clean up event listeners and state
   */
  function cleanup() {
    console.log("[ContentExtension.events] Cleaning up events");

    disableEventListeners();

    if (messageListener) {
      chrome.runtime.onMessage.removeListener(messageListener);
      messageListener = null;
    }

    // Clean up element event listeners
    if (lastFocusedElement) {
      try {
        lastFocusedElement.removeEventListener("input", onValueChanged);
        lastFocusedElement.removeEventListener("change", onValueChanged);
        lastFocusedElement.removeEventListener(
          "change",
          onNativeCheckboxChange
        );
      } catch (error) {
        console.warn(
          "[ContentExtension.events] Error cleaning up element listeners:",
          error
        );
      }
    }

    lastFocusedElement = null;
    inspectedElement = null;
    suppressNextFocusIn = false;
  }

  /**
   * Handle state change (extension enabled/disabled)
   * @param {boolean} enabled - Whether extension is enabled
   */
  function onStateChange(enabled) {
    // State changes are handled by main module calling enable/disable
  }

  // Export the events module
  CE.events = {
    initialize,
    cleanup,
    onStateChange,

    // Event listener management
    enableEventListeners,
    disableEventListeners,

    // Focus state management
    getFocusState,
    setSuppressNextFocusIn,

    // Event handlers (exposed for testing)
    onFocusIn,
    onFocusOut,
    onKeyDown,
    onValueChanged,
    onNativeCheckboxChange,
  };

  console.log("[ContentExtension.events] Module loaded");
})();
