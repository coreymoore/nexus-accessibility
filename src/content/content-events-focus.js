/**
 * Content Script Focus Event Management
 *
 * This module handles focus events, element inspection, and user interactions.
 * It manages the core logic for tracking focused elements and triggering
 * accessibility inspections.
 *
 * Dependencies: content-deps.js
 */

// Use the enhanced module definition system
window.ContentExtension.deps.defineModule(
  "eventsFocus",
  ["utils", "stateManager"],
  function (deps, utils) {
    "use strict";

    // Focus state variables
    let suppressNextFocusIn = false;
    let pendingAccessibilityCallback = null;

    /**
     * Handle focus in events
     * @param {FocusEvent} e - The focus event
     */
    function onFocusIn(e) {
      const targetElement = e.target;

      if (!targetElement || suppressNextFocusIn) {
        if (suppressNextFocusIn) {
          console.log(
            "[ContentExtension.events.focus] Suppressing focus event"
          );
          suppressNextFocusIn = false;
        }
        return;
      }

      console.log(
        "[ContentExtension.events.focus] Focus in:",
        targetElement.tagName,
        targetElement.id,
        targetElement.className
      );

      // Skip non-focusable elements or ones we don't want to inspect
      if (!shouldInspectElement(targetElement)) {
        // Cancel any pending accessibility callback since we're not inspecting this element
        if (pendingAccessibilityCallback) {
          if (window.cancelIdleCallback) {
            window.cancelIdleCallback(pendingAccessibilityCallback);
          } else {
            clearTimeout(pendingAccessibilityCallback);
          }
          pendingAccessibilityCallback = null;
          console.log(
            "[ContentExtension.events.focus] Cancelled pending accessibility callback"
          );
        }
        return;
      }

      // Check if this is within a shadow DOM using safe method call
      const shadowHost = utils.callModuleMethod(
        "eventsShadow",
        "findShadowHost",
        targetElement
      );
      if (shadowHost) {
        console.log(
          "[ContentExtension.events.focus] Element is within shadow DOM, starting monitoring"
        );
        utils.callModuleMethod(
          "eventsShadow",
          "monitorShadowActiveElement",
          shadowHost
        );
      }

      // Clean up previous focus
      cleanupPreviousFocus(targetElement);

      // Handle the new focus
      handleElementInspection(targetElement, targetElement);
    }

    /**
     * Handle focus out events
     * @param {FocusEvent} e - The focus event
     */
    function onFocusOut(e) {
      const targetElement = e.target;

      if (!targetElement) {
        return;
      }

      console.log(
        "[ContentExtension.events.focus] Focus out:",
        targetElement.tagName,
        targetElement.id,
        targetElement.className
      );

      // Clean up element-specific event listeners
      const currentState = utils.callModuleMethod(
        "stateManager",
        "getCurrentState"
      );
      if (targetElement === currentState.lastFocusedElement) {
        try {
          targetElement.removeEventListener("input", onValueChanged);
          targetElement.removeEventListener("change", onValueChanged);
          targetElement.removeEventListener("change", onNativeCheckboxChange);
        } catch (error) {
          console.warn(
            "[ContentExtension.events.focus] Error removing element listeners:",
            error
          );
        }
      }

      // If we're losing focus completely (no related target), clean up
      if (!e.relatedTarget) {
        console.log("[ContentExtension.events.focus] Lost focus completely");
      }
    }

    /**
     * Clean up previous focus state
     * @param {Element} newTargetElement - The newly focused element
     */
    function cleanupPreviousFocus(newTargetElement) {
      const currentState = utils.callModuleMethod(
        "stateManager",
        "getCurrentState"
      );
      const previousElement = currentState.lastFocusedElement;

      if (previousElement && previousElement !== newTargetElement) {
        console.log(
          "[ContentExtension.events.focus] Cleaning up previous focus:",
          previousElement.tagName,
          previousElement.id
        );

        try {
          previousElement.removeEventListener("input", onValueChanged);
          previousElement.removeEventListener("change", onValueChanged);
          previousElement.removeEventListener("change", onNativeCheckboxChange);
        } catch (error) {
          console.warn(
            "[ContentExtension.events.focus] Error cleaning up previous focus:",
            error
          );
        }
      }
    }

    /**
     * Handle element inspection and accessibility info fetching
     * @param {Element} targetElement - The element that received focus
     * @param {Element} targetForInspect - The element to inspect (might be different from targetElement)
     * @returns {boolean} True indicating inspection was initiated
     */
    function handleElementInspection(targetElement, targetForInspect) {
      console.log(
        "[ContentExtension.events.focus] Inspecting element:",
        targetElement.tagName,
        targetElement.id,
        targetElement.className
      );

      // Update focus state using state manager
      utils.callModuleMethod(
        "stateManager",
        "updateFocusState",
        targetElement,
        targetForInspect,
        "focus"
      );

      // Start observing this element (and parent details if summary) for attribute/state mutations.
      try {
        if (window.ContentExtension && window.ContentExtension.observers) {
          window.ContentExtension.observers.startObserving(targetElement);
          // If focusing a <summary>, observe its <details> parent too so we catch 'open' changes.
          if (
            targetElement.tagName &&
            targetElement.tagName.toLowerCase() === "summary" &&
            targetElement.parentElement &&
            targetElement.parentElement.tagName &&
            targetElement.parentElement.tagName.toLowerCase() === "details"
          ) {
            const detailsElement = targetElement.parentElement;
            window.ContentExtension.observers.startObserving(detailsElement);

            // Add safe toggle event listener for reliable details state changes
            if (!detailsElement.__nexusToggleBound) {
              console.log(
                "[ContentExtension.events.focus][DEBUG] Adding toggle listener to details element"
              );
              detailsElement.addEventListener(
                "toggle",
                () => {
                  console.log(
                    "[ContentExtension.events.focus][DEBUG] Details toggle fired, scheduling updates"
                  );
                  // Only update if the details or its summary is still focused
                  const currentFocused = document.activeElement;
                  if (
                    currentFocused === detailsElement ||
                    currentFocused === targetElement ||
                    detailsElement.contains(currentFocused)
                  ) {
                    if (
                      window.ContentExtension &&
                      window.ContentExtension.observers
                    ) {
                      window.ContentExtension.observers.scheduleAttributeUpdate(
                        detailsElement
                      );
                      // Also update the focused summary if it's the current target
                      if (currentFocused === targetElement) {
                        window.ContentExtension.observers.scheduleAttributeUpdate(
                          targetElement
                        );
                      }
                    }
                  }
                },
                { passive: true }
              );
              detailsElement.__nexusToggleBound = true;
            }
          }
        }
      } catch (err) {
        console.warn(
          "[ContentExtension.events.focus] Failed to start observing focused element",
          err
        );
      }

      // Set up element-specific event listeners
      setupElementEventListeners(targetElement);

      // Function to actually fetch the accessibility info
      const fetchAccessibilityInfo = () => {
        // Clear the pending callback since we're executing now
        pendingAccessibilityCallback = null;

        // Double-check that we should still inspect this element
        // (in case focus has moved to an inspector element since scheduling)
        if (!shouldInspectElement(targetForInspect)) {
          console.log(
            "[ContentExtension.events.focus] Skipping accessibility fetch - element no longer valid for inspection:",
            targetForInspect ? targetForInspect.tagName : "null",
            targetForInspect ? targetForInspect.className : "null"
          );
          return;
        }

        console.log(
          "[ContentExtension.events.focus] Fetching accessibility info"
        );

        const accessibilityResult = utils.callModuleMethod(
          "accessibility",
          "getAccessibleInfo",
          targetForInspect,
          true // Force fresh data on focus - bypass cache
        );
        if (!accessibilityResult) {
          console.warn(
            "[ContentExtension.events.focus] Accessibility module not available"
          );
        }
      };

      // Use requestIdleCallback if available, otherwise setTimeout
      if (window.requestIdleCallback) {
        pendingAccessibilityCallback = window.requestIdleCallback(
          fetchAccessibilityInfo,
          { timeout: 100 }
        );
      } else {
        pendingAccessibilityCallback = setTimeout(fetchAccessibilityInfo, 10);
      }

      return true; // Indicate that inspection was initiated
    }
    /**
     * Set up element-specific event listeners
     * @param {Element} targetElement - The target element
     */
    function setupElementEventListeners(targetElement) {
      const tagName = targetElement.tagName.toLowerCase();

      // Add input event listeners for form controls
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        targetElement.contentEditable === "true"
      ) {
        targetElement.addEventListener("input", onValueChanged);
        targetElement.addEventListener("change", onValueChanged);

        // Special handling for native checkboxes
        if (
          tagName === "input" &&
          (targetElement.type === "checkbox" || targetElement.type === "radio")
        ) {
          targetElement.addEventListener("change", onNativeCheckboxChange);
        }
      }
    }

    /**
     * Handle keyboard events
     * @param {KeyboardEvent} e - The keyboard event
     */
    function onKeyDown(e) {
      const targetElement = e.target;

      if (!targetElement) {
        return;
      }

      // Handle specific keys that might change accessibility state
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === " " ||
        e.key === "Enter"
      ) {
        // For elements that might change state with keyboard interaction
        const tagName = targetElement.tagName.toLowerCase();
        if (
          tagName === "select" ||
          targetElement.getAttribute("role") === "combobox" ||
          targetElement.getAttribute("role") === "listbox" ||
          targetElement.getAttribute("role") === "button" ||
          targetElement.getAttribute("role") === "slider" ||
          tagName === "summary"
        ) {
          // Defer inspection to allow state change
          setTimeout(() => {
            const currentState = utils.callModuleMethod(
              "stateManager",
              "getCurrentState"
            );
            if (targetElement === currentState.lastFocusedElement) {
              console.log(
                "[ContentExtension.events.focus] Re-inspecting after keyboard interaction:",
                e.key
              );
              utils.callModuleMethod(
                "accessibility",
                "getAccessibleInfo",
                targetElement,
                true // Force fresh data after keyboard interaction
              );
              // Also force an observer-driven update path to ensure mutation coverage (in case attribute change missed)
              try {
                if (
                  window.ContentExtension &&
                  window.ContentExtension.observers
                ) {
                  window.ContentExtension.observers.scheduleAttributeUpdate(
                    targetElement
                  );
                }
              } catch (err) {
                console.warn(
                  "[ContentExtension.events.focus] scheduleAttributeUpdate failed",
                  err
                );
              }
            }
          }, 50);
        }
      }

      // Handle Escape key to hide inspector
      if (e.key === "Escape") {
        console.log(
          "[ContentExtension.events.focus] Escape pressed, hiding inspector"
        );
        utils.callModuleMethod("inspector", "hide");
      }
    }

    /**
     * Handle value change events
     * @param {Event} e - The change event
     */
    function onValueChanged(e) {
      const targetElement = e.target;

      const currentState = utils.callModuleMethod(
        "stateManager",
        "getCurrentState"
      );
      if (!targetElement || targetElement !== currentState.lastFocusedElement) {
        return;
      }

      console.log(
        "[ContentExtension.events.focus] Value changed:",
        targetElement.tagName,
        targetElement.value
      );

      // Defer inspection to allow for any additional state changes
      setTimeout(() => {
        const currentState = utils.callModuleMethod(
          "stateManager",
          "getCurrentState"
        );
        if (targetElement === currentState.lastFocusedElement) {
          utils.callModuleMethod(
            "accessibility",
            "getAccessibleInfo",
            targetElement,
            true // Force fresh data after value change
          );
        }
      }, 10);
    }

    /**
     * Handle native checkbox/radio change events
     * @param {Event} e - The change event
     */
    function onNativeCheckboxChange(e) {
      const targetElement = e.target;

      const currentState = utils.callModuleMethod(
        "stateManager",
        "getCurrentState"
      );
      if (!targetElement || targetElement !== currentState.lastFocusedElement) {
        return;
      }

      console.log(
        "[ContentExtension.events.focus] Native checkbox/radio changed:",
        targetElement.tagName,
        targetElement.checked
      );

      // Immediate inspection for checkbox/radio changes
      utils.callModuleMethod(
        "accessibility",
        "getAccessibleInfo",
        targetElement,
        true // Force fresh data after checkbox/radio change
      );
    }

    /**
     * Handle shadow DOM focus changes (called from shadow module)
     * @param {Element} element - The focused element within shadow DOM
     * @param {Element} shadowHost - The shadow host element
     */
    function handleShadowFocusChange(element, shadowHost) {
      console.log(
        "[ContentExtension.events.focus] Shadow focus changed:",
        element.tagName,
        element.id
      );

      // Clean up previous focus
      cleanupPreviousFocus(element);

      // Handle inspection of the shadow DOM element
      handleElementInspection(element, element);
    }

    /**
     * Check if an element should be inspected
     * @param {Element} element - The element to check
     * @returns {boolean} Whether the element should be inspected
     */
    function shouldInspectElement(element) {
      if (!element || !element.tagName) {
        return false;
      }

      const tagName = element.tagName.toLowerCase();

      // Skip if it's our own inspector
      if (element.closest(".nexus-accessibility-ui-inspector")) {
        return false;
      }

      // Skip if it's a script or style element
      if (tagName === "script" || tagName === "style") {
        return false;
      }

      return true;
    }

    /**
     * Get current focus state
     * @returns {Object} The current focus state
     */
    function getFocusState() {
      return (
        utils.callModuleMethod("stateManager", "getCurrentState") || {
          lastFocusedElement: null,
          inspectedElement: null,
        }
      );
    }

    /**
     * Set the suppress next focus flag
     * @param {boolean} suppress - Whether to suppress the next focus event
     */
    function setSuppressNextFocusIn(suppress) {
      suppressNextFocusIn = suppress;
    }

    // Return module exports
    return {
      // Public API
      onFocusIn,
      onFocusOut,
      onKeyDown,
      onValueChanged,
      onNativeCheckboxChange,
      handleShadowFocusChange,
      handleElementInspection,
      getFocusState,
      setSuppressNextFocusIn,

      // Utilities
      shouldInspectElement,
      cleanupPreviousFocus,
      setupElementEventListeners,
    };
  }
);

console.log("[ContentExtension.events.focus] Module loaded");
