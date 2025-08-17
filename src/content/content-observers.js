/**
 * Content Script DOM Observers Management
 *
 * This module manages DOM mutation observers to watch for accessibility-related
 * attribute changes and coordinate updates with other modules.
 *
 * Dependencies: utils, cache, events, accessibility, inspector
 */

// Use the enhanced module definition system
window.ContentExtension.deps.defineModule(
  "observers",
  ["utils", "cache", "events", "accessibility", "inspector", "stateManager"],
  function (deps, utils) {
    "use strict";

    // Ensure our namespace exists for backwards compatibility
    window.ContentExtension = window.ContentExtension || {};
    const CE = window.ContentExtension;

    // Observer management
    const activeObservers = new WeakMap();
    const allObservers = new Set();
    const observerCleanupTimeouts = new Map();

    // Main mutation observer
    let mainObserver = null;

    // Unified attribute set for all observed elements (slider, details, combobox, etc.)
    // Keeping a single source of truth prevents divergence that caused missed updates.
    const OBSERVED_ATTRIBUTES = [
      // Core accessibility / labeling
      "aria-label",
      "aria-describedby",
      "aria-labelledby",
      "title",
      "value",
      // ARIA interactive/state attributes
      "aria-expanded",
      "aria-pressed",
      "aria-checked",
      "aria-selected",
      "aria-disabled",
      "aria-invalid",
      "aria-required",
      "aria-readonly",
      // Slider / range related
      "aria-valuenow",
      "aria-valuetext",
      "aria-valuemin",
      "aria-valuemax",
      // Active descendant pattern
      "aria-activedescendant",
      // HTML state attributes
      "disabled",
      "checked",
      "selected",
      "required",
      "readonly",
      // Details disclosure
      "open",
    ];

    /**
     * Initialize the observers module
     */
    function initialize() {
      console.log("[ContentExtension.observers] Initializing DOM observers");
      setupMainObserver();
    }

    /**
     * Set up the main mutation observer
     */
    function setupMainObserver() {
      console.log(
        "[ContentExtension.observers] Setting up main mutation observer"
      );
      mainObserver = new MutationObserver(handleMutations);

      // Test that the observer was created successfully
      if (mainObserver) {
        console.log(
          "[ContentExtension.observers] Main observer created successfully"
        );
      } else {
        console.error(
          "[ContentExtension.observers] Failed to create main observer"
        );
      }
    }

    /**
     * Handle mutation observer callbacks
     * @param {MutationRecord[]} mutations - Array of mutation records
     */
    function handleMutations(mutations) {
      console.log(
        "[ContentExtension.observers][DEBUG] MutationObserver fired with",
        mutations.length,
        "mutations"
      );

      mutations.forEach((mutation, index) => {
        console.log(
          `[ContentExtension.observers][DEBUG] Mutation ${index + 1}:`,
          mutation.type,
          mutation.attributeName,
          "on",
          mutation.target.tagName,
          mutation.target.id || "(no id)",
          "new value:",
          mutation.target.getAttribute(mutation.attributeName)
        );

        if (mutation.type === "attributes") {
          handleAttributeMutation(mutation);
        }

        // Schedule cleanup check for mutation targets
        if (mutation.target && mutation.target.nodeType === Node.ELEMENT_NODE) {
          scheduleObserverCleanup(mutation.target);
        }
      });
    }

    /**
     * Handle attribute mutation
     * @param {MutationRecord} mutation - The mutation record
     */
    function handleAttributeMutation(mutation) {
      const focusState =
        utils.callModuleMethod("stateManager", "getCurrentState") || {};
      const { lastFocusedElement, inspectedElement } = focusState;

      console.log(
        "[ContentExtension.observers][DEBUG] Focus check - lastFocused:",
        lastFocusedElement?.tagName,
        lastFocusedElement?.id || "(no id)",
        "mutation target:",
        mutation.target.tagName,
        mutation.target.id || "(no id)"
      );

      const isTargetElement = mutation.target === lastFocusedElement;
      const isSelectOption =
        lastFocusedElement &&
        lastFocusedElement.tagName === "SELECT" &&
        mutation.target &&
        mutation.target.tagName === "OPTION";

      // Check if this is a details element whose summary child is focused
      const isFocusedSummaryParent =
        lastFocusedElement &&
        lastFocusedElement.tagName.toLowerCase() === "summary" &&
        mutation.target === lastFocusedElement.parentElement &&
        mutation.target.tagName.toLowerCase() === "details";

      if (!(isTargetElement || isSelectOption || isFocusedSummaryParent)) {
        console.log(
          "[ContentExtension.observers][INSTRUMENT] Ignored mutation (not focus-relevant):",
          mutation.attributeName,
          "on",
          mutation.target.tagName
        );
        return;
      }

      console.log(
        "[ContentExtension.observers] Attribute changed:",
        mutation.attributeName,
        "on element:",
        mutation.target.tagName,
        mutation.target.id || "(no id)",
        "new value:",
        mutation.target.getAttribute(mutation.attributeName)
      );

      // Determine which element to update
      const targetForUpdate = isTargetElement
        ? lastFocusedElement
        : lastFocusedElement;

      // Handle state changes that affect screen reader output - UNIFIED APPROACH
      const stateAttributes = [
        "aria-expanded", // COMBOBOX, DETAILS, etc.
        "aria-pressed",
        "aria-checked",
        "aria-selected",
        "aria-disabled",
        "aria-invalid",
        "aria-valuenow", // SLIDER
        "aria-valuetext", // SLIDER
        "aria-valuemin", // SLIDER
        "aria-valuemax", // SLIDER
        "aria-activedescendant", // COMBOBOX
        "checked",
        "selected",
        "disabled",
        "open", // DETAILS
        "value",
      ];

      if (stateAttributes.includes(mutation.attributeName) && targetForUpdate) {
        console.log(
          "[ContentExtension.observers][INSTRUMENT] State mutation:",
          mutation.attributeName,
          "->",
          mutation.target.getAttribute(mutation.attributeName),
          "on",
          targetForUpdate.tagName
        );

        // Special handling for details/summary relationship
        if (
          mutation.attributeName === "open" &&
          mutation.target.tagName.toLowerCase() === "details"
        ) {
          // Also clear cache for child summary elements
          const summaries = mutation.target.querySelectorAll("summary");
          summaries.forEach((summary) => {
            console.log(
              "[ContentExtension.observers] Clearing summary cache for details state change"
            );
            utils.callModuleMethod("cache", "deleteCached", summary);
            utils.callModuleMethod("cache", "clearAccessibilityCache", summary);
          });
        }

        console.log(
          "[ContentExtension.observers][INSTRUMENT] scheduleAttributeUpdate (state)",
          targetForUpdate.tagName,
          mutation.attributeName
        );
        scheduleAttributeUpdate(targetForUpdate);
        return;
      }

      // Handle general attribute changes
      if (targetForUpdate) {
        console.log(
          "[ContentExtension.observers][INSTRUMENT] General mutation:",
          mutation.attributeName,
          "on",
          targetForUpdate.tagName
        );
        console.log(
          "[ContentExtension.observers][INSTRUMENT] scheduleAttributeUpdate (general)",
          targetForUpdate.tagName,
          mutation.attributeName
        );
        scheduleAttributeUpdate(targetForUpdate);
      }
    }

    /**
     * Handle aria-activedescendant changes
     * @param {Element} container - The container element with aria-activedescendant
     */
    function handleAriaActiveDescendantChange(container) {
      const activeId = utils.callModuleMethod(
        "utils",
        "safeGetAttribute",
        container,
        "aria-activedescendant"
      );
      if (!activeId) return;

      const activeEl = container.ownerDocument.getElementById(activeId);
      if (!activeEl) return;

      // Update inspected element using state manager
      utils.callModuleMethod(
        "stateManager",
        "updateInspectedElement",
        activeEl,
        "shadow-dom-focus"
      );

      scheduleAttributeUpdate(activeEl);
    }

    /**
     * Schedule debounced update for attribute changes
     * @param {Element} target - The target element that had the mutation
     */
    function scheduleAttributeUpdate(target) {
      console.log(
        "[ContentExtension.observers][INSTRUMENT] scheduleAttributeUpdate ->",
        target.tagName,
        target.id || "(no id)"
      );

      // Get the currently focused element that should be analyzed
      // Get current focus state through state manager
      const focusState =
        utils.callModuleMethod("stateManager", "getCurrentState") || {};
      const { lastFocusedElement, inspectedElement } = focusState;
      const elementToAnalyze = inspectedElement || lastFocusedElement;

      if (!elementToAnalyze) {
        console.log(
          "[ContentExtension.observers] No focused element to analyze"
        );
        return;
      }

      console.log(
        "[ContentExtension.observers][INSTRUMENT] Will analyze focused element:",
        elementToAnalyze.tagName,
        elementToAnalyze.id || "(no id)",
        "due to mutation on:",
        target.tagName,
        target.id || "(no id)"
      );

      // Clear cache for fresh data - this is critical for state changes
      utils.callModuleMethod("cache", "deleteCached", elementToAnalyze);

      // Also clear any related cached data that might be stale
      utils.callModuleMethod(
        "cache",
        "clearAccessibilityCache",
        elementToAnalyze
      );

      // Create debounced update function that analyzes the focused element
      const updateFunction = (mutationTarget) => {
        // Get the current focus state again in case it changed
        const currentFocusState =
          utils.callModuleMethod("stateManager", "getCurrentState") || {};
        const {
          lastFocusedElement: currentFocused,
          inspectedElement: currentInspected,
        } = currentFocusState;
        const currentElementToAnalyze = currentInspected || currentFocused;

        if (!currentElementToAnalyze) {
          console.log(
            "[ContentExtension.observers] No current focused element to analyze"
          );
          return;
        }

        // Defer to next animation frame so DOM & accessibility tree settle (prevents race on rapid state flips)
        requestAnimationFrame(() => {
          console.log(
            "[ContentExtension.observers][DEBUG] Executing update for focused element:",
            currentElementToAnalyze.tagName,
            currentElementToAnalyze.id || "(no id)",
            "due to mutation on:",
            mutationTarget.tagName,
            mutationTarget.id || "(no id)"
          );

          // Skip if the focused element is an inspector element
          if (
            currentElementToAnalyze.closest &&
            currentElementToAnalyze.closest(".nexus-accessibility-ui-inspector")
          ) {
            console.log(
              "[ContentExtension.observers] Skipping update - focused element is inspector element"
            );
            return;
          }

          const accessibilityResult = utils.callModuleMethod(
            "accessibility",
            "getAccessibleInfo",
            currentElementToAnalyze,
            true
          );

          console.log(
            "[ContentExtension.observers][DEBUG] Accessibility call result:",
            !!accessibilityResult,
            typeof accessibilityResult
          );

          if (
            accessibilityResult &&
            typeof accessibilityResult.then === "function"
          ) {
            accessibilityResult
              .then((info) => {
                console.log(
                  "[ContentExtension.observers][INSTRUMENT] Accessibility info:",
                  {
                    role: info.role,
                    name: info.name,
                    expanded: info.normalizedExpanded,
                    value: info.value,
                  }
                );

                const focusState =
                  utils.callModuleMethod("stateManager", "getCurrentState") ||
                  {};
                const { lastFocusedElement, inspectedElement } = focusState;

                const isCurrentlyFocused =
                  lastFocusedElement === currentElementToAnalyze ||
                  inspectedElement === currentElementToAnalyze;

                if (isCurrentlyFocused) {
                  console.log(
                    "[ContentExtension.observers][INSTRUMENT] showInspector (focused)"
                  );
                  const inspectorResult = utils.callModuleMethod(
                    "inspector",
                    "showInspector",
                    info,
                    currentElementToAnalyze
                  );
                  if (!inspectorResult) {
                    console.error(
                      "[ContentExtension.observers] Failed to show inspector"
                    );
                  }
                } else {
                  console.log(
                    "[ContentExtension.observers][INSTRUMENT] Skipped inspector update (focus moved)"
                  );
                }
              })
              .catch((error) => {
                console.error(
                  "[ContentExtension.observers][INSTRUMENT] Error updating inspector:",
                  error
                );
                const focusState =
                  utils.callModuleMethod("stateManager", "getCurrentState") ||
                  {};
                const { lastFocusedElement } = focusState;
                if (lastFocusedElement === currentElementToAnalyze) {
                  const errorResult = utils.callModuleMethod(
                    "inspector",
                    "showErrorInspector",
                    "Failed to retrieve updated accessibility information"
                  );
                  if (!errorResult) {
                    console.error(
                      "[ContentExtension.observers][INSTRUMENT] Failed to show error inspector"
                    );
                  }
                }
              });
          }
        });
      };

      // Use immediate update (0ms delay) for all calls to this function
      // since we now properly route state changes vs. general changes above
      const debouncedUpdate = utils.callModuleMethod(
        "cache",
        "createDebouncedUpdate",
        updateFunction,
        0 // Immediate update - no debouncing needed
      );
      if (debouncedUpdate && typeof debouncedUpdate === "function") {
        debouncedUpdate(target);
      } else {
        console.error(
          "[ContentExtension.observers] Failed to create debounced update function"
        );
      }
    }

    /**
     * Start observing an element for attribute changes
     * @param {Element} element - The element to observe
     */
    // Removed startObservingElement (redundant alias) to eliminate divergence.

    /**
     * Start observing an element with comprehensive attribute monitoring
     * @param {Element} element - The element to observe
     */
    function startObserving(element) {
      // Skip inspector elements to prevent observing our own UI
      if (
        element &&
        element.closest &&
        element.closest(".nexus-accessibility-ui-inspector")
      ) {
        console.log(
          "[ContentExtension.observers] Skipping inspector element observation"
        );
        return;
      }

      if (!mainObserver) {
        console.warn(
          "[ContentExtension.observers] Main observer not initialized"
        );
        return;
      }

      // Check if already observing to avoid duplicate setup
      if (activeObservers.has(element)) {
        console.log(
          "[ContentExtension.observers] Element already being observed:",
          element.tagName,
          element.id
        );
        return;
      }

      const isSelect = element && element.tagName === "SELECT";

      const observerOptions = {
        attributes: true,
        subtree: !!isSelect, // Keep subtree for <select> to catch <option> changes
        attributeFilter: OBSERVED_ATTRIBUTES,
      };

      console.log(
        "[ContentExtension.observers][INSTRUMENT] startObserving ->",
        element.tagName,
        element.id || "(no id)",
        "attrs:",
        observerOptions.attributeFilter.join(",")
      );

      try {
        mainObserver.observe(element, observerOptions);
        activeObservers.set(element, mainObserver);
        allObservers.add(mainObserver);

        console.log(
          "[ContentExtension.observers][DEBUG] Observer attached to:",
          element.tagName,
          element.id || "(no id)",
          "Watching attributes:",
          observerOptions.attributeFilter
        );

        // Schedule periodic cleanup check
        scheduleObserverCleanup(element);
      } catch (error) {
        console.error(
          "[ContentExtension.observers] Failed to set up observer:",
          error,
          "for element:",
          element.tagName,
          element.id
        );
      }
    }

    /**
     * Stop observing an element
     * @param {Element} element - The element to stop observing
     */
    function stopObservingElement(element) {
      const observer = activeObservers.get(element);
      if (observer) {
        // Note: We can't selectively stop observing just one element
        // with a single MutationObserver, so we just remove from tracking
        activeObservers.delete(element);
        allObservers.delete(observer);
      }

      const timeout = observerCleanupTimeouts.get(element);
      if (timeout) {
        clearTimeout(timeout);
        observerCleanupTimeouts.delete(element);
      }
    }

    /**
     * Stop all observation
     */
    function stopObserving() {
      if (mainObserver) {
        mainObserver.disconnect();
      }
    }

    /**
     * Schedule cleanup check for an element
     * @param {Element} element - The element to schedule cleanup for
     */
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

    /**
     * Get observer statistics for debugging
     * @returns {Object} Observer statistics
     */
    function getObserverStats() {
      return {
        activeObserversCount: activeObservers.size,
        allObserversCount: allObservers.size,
        cleanupTimeoutsCount: observerCleanupTimeouts.size,
        hasMainObserver: !!mainObserver,
      };
    }

    /**
     * Clean up all observers and timeouts
     */
    function cleanup() {
      console.log("[ContentExtension.observers] Cleaning up observers");

      // Disconnect main observer
      if (mainObserver) {
        mainObserver.disconnect();
        mainObserver = null;
      }

      // Clean up all observers
      if (allObservers && typeof allObservers.forEach === "function") {
        allObservers.forEach((observer) => observer.disconnect());
        allObservers.clear();
      }

      // Clear cleanup timeouts
      if (
        observerCleanupTimeouts &&
        typeof observerCleanupTimeouts.forEach === "function"
      ) {
        observerCleanupTimeouts.forEach((timeout) => clearTimeout(timeout));
        observerCleanupTimeouts.clear();
      }

      // Clear active observers tracking
      // Note: WeakMap doesn't have a clear method, but will be garbage collected
    }

    /**
     * Handle state change (extension enabled/disabled)
     * @param {boolean} enabled - Whether extension is enabled
     */
    function onStateChange(enabled) {
      if (!enabled) {
        stopObserving();
      }
    }

    /**
     * Reconnect observer after it's been disconnected
     */
    function reconnectObserver() {
      if (!mainObserver) {
        setupMainObserver();
      }
    }

    /**
     * Test function to manually trigger observer for debugging
     * @param {Element} element - Element to test observation on
     */
    function testObserver(element) {
      if (!element) {
        console.error(
          "[ContentExtension.observers] No element provided to testObserver"
        );
        return;
      }

      console.log(
        "[ContentExtension.observers] Testing observer on:",
        element.tagName,
        element.id
      );

      if (!mainObserver) {
        console.error(
          "[ContentExtension.observers] Main observer not initialized"
        );
        return;
      }

      // Force start observing
      startObserving(element);

      // Test by changing an attribute
      const originalExpanded = element.getAttribute("aria-expanded");
      console.log(
        "[ContentExtension.observers] Original aria-expanded:",
        originalExpanded
      );

      // Change it and see if we get a mutation
      setTimeout(() => {
        const testValue = originalExpanded === "true" ? "false" : "true";
        console.log(
          "[ContentExtension.observers] Setting aria-expanded to:",
          testValue
        );
        element.setAttribute("aria-expanded", testValue);

        // Change it back after a moment
        setTimeout(() => {
          console.log(
            "[ContentExtension.observers] Restoring aria-expanded to:",
            originalExpanded || "null"
          );
          if (originalExpanded === null) {
            element.removeAttribute("aria-expanded");
          } else {
            element.setAttribute("aria-expanded", originalExpanded);
          }
        }, 1000);
      }, 100);
    }

    // Create the observers module API
    const observersAPI = {
      initialize,
      cleanup,
      onStateChange,

      // Main observation control
      startObserving,
      stopObserving,
      stopObservingElement,

      // Utility functions
      scheduleObserverCleanup,
      getObserverStats,
      reconnectObserver,
      testObserver,

      // Internal functions (exposed for testing)
      handleMutations,
      handleAttributeMutation,
      handleAriaActiveDescendantChange,
      scheduleAttributeUpdate,
    };

    // Set up backwards compatibility with CE.observers
    CE.observers = observersAPI;

    console.log("[ContentExtension.observers] Module loaded");
    return observersAPI;
  }
);
