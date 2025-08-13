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

  // State tracking
  let lastFocusedElement = null;
  let inspectedElement = null;
  let suppressNextFocusIn = false;
  let listenersRegistered = false;
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
   * Handle focus in events
   * @param {FocusEvent} e - The focus event
   */
  function onFocusIn(e) {
    const utils = CE.utils;
    utils.logger.content.log("onFocusIn", "event fired", e.target);

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

    const targetElement = e.target;

    // Ignore focus on iframes/frames
    if (
      targetElement &&
      (targetElement.tagName === "IFRAME" || targetElement.tagName === "FRAME")
    ) {
      if (CE.tooltip) CE.tooltip.hideTooltip();
      return;
    }

    // Clean up previous focused element
    cleanupPreviousFocus(targetElement);

    // Update focus tracking
    lastFocusedElement = targetElement;

    // Store element for CDP access
    utils.storeElementForCDP(targetElement, "focus");

    // Determine target for inspection (handle aria-activedescendant)
    let targetForInspect = targetElement;
    const activeDescId = utils.safeGetAttribute(
      targetElement,
      "aria-activedescendant"
    );
    if (activeDescId) {
      const activeEl = targetElement.ownerDocument.getElementById(activeDescId);
      if (activeEl) {
        targetForInspect = activeEl;
      }
    }
    inspectedElement = targetForInspect;

    // Start observing the focused element
    if (CE.observers && CE.observers.startObserving) {
      CE.observers.startObserving(targetElement);
    }

    // Set up loading timeout and fetch accessibility info
    handleElementInspection(targetElement, targetForInspect);

    // Set up event listeners for this element
    setupElementEventListeners(targetElement);
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
        chrome.runtime.sendMessage({ action: "detachDebugger" });
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
