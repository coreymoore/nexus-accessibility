/**
 * Content Script DOM Observers Management
 *
 * This module manages DOM mutation observers to watch for accessibility-related
 * attribute changes and coordinate updates with other modules.
 *
 * Dependencies: content-utils.js, content-cache.js
 */

(function () {
  "use strict";

  // Ensure our namespace exists
  window.ContentExtension = window.ContentExtension || {};
  const CE = window.ContentExtension;

  // Observer management
  const activeObservers = new WeakMap();
  const allObservers = new Set();
  const observerCleanupTimeouts = new Map();

  // Main mutation observer
  let mainObserver = null;

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
    mainObserver = new MutationObserver(handleMutations);
  }

  /**
   * Handle mutation observer callbacks
   * @param {MutationRecord[]} mutations - Array of mutation records
   */
  function handleMutations(mutations) {
    mutations.forEach((mutation) => {
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
    const focusState = CE.events ? CE.events.getFocusState() : {};
    const { lastFocusedElement, inspectedElement } = focusState;

    const isTargetElement = mutation.target === lastFocusedElement;
    const isSelectOption =
      lastFocusedElement &&
      lastFocusedElement.tagName === "SELECT" &&
      mutation.target &&
      mutation.target.tagName === "OPTION";

    if (!(isTargetElement || isSelectOption)) {
      return;
    }

    console.log("Attribute changed:", mutation.attributeName);

    // Determine which element to update
    const targetForUpdate = isTargetElement
      ? lastFocusedElement
      : lastFocusedElement;

    // Handle aria-activedescendant changes
    if (
      mutation.attributeName === "aria-activedescendant" &&
      lastFocusedElement &&
      mutation.target === lastFocusedElement
    ) {
      handleAriaActiveDescendantChange(lastFocusedElement);
      return;
    }

    // Handle general attribute changes with debouncing
    if (targetForUpdate) {
      scheduleAttributeUpdate(targetForUpdate);
    }
  }

  /**
   * Handle aria-activedescendant changes
   * @param {Element} container - The container element with aria-activedescendant
   */
  function handleAriaActiveDescendantChange(container) {
    const activeId = CE.utils.safeGetAttribute(
      container,
      "aria-activedescendant"
    );
    if (!activeId) return;

    const activeEl = container.ownerDocument.getElementById(activeId);
    if (!activeEl) return;

    // Update inspected element in events module
    if (CE.events && CE.events.getFocusState) {
      const focusState = CE.events.getFocusState();
      focusState.inspectedElement = activeEl;
    }

    scheduleAttributeUpdate(activeEl);
  }

  /**
   * Schedule debounced update for attribute changes
   * @param {Element} target - The target element
   */
  function scheduleAttributeUpdate(target) {
    if (!CE.cache) {
      console.warn("[ContentExtension.observers] Cache module not available");
      return;
    }

    // Clear cache for fresh data
    CE.cache.deleteCached(target);

    // Create debounced update function
    const updateFunction = (element) => {
      if (CE.accessibility && CE.accessibility.getAccessibleInfo) {
        CE.accessibility
          .getAccessibleInfo(element, true)
          .then((info) => {
            const focusState = CE.events ? CE.events.getFocusState() : {};
            const { lastFocusedElement, inspectedElement } = focusState;

            const isCurrentlyFocused =
              lastFocusedElement === element || inspectedElement === element;
            if (isCurrentlyFocused && CE.tooltip) {
              CE.tooltip.showTooltip(info, element);
            }
          })
          .catch((error) => {
            console.error(
              "[ContentExtension.observers] Error updating tooltip:",
              error
            );
          });
      }
    };

    // Use cache's debounced update mechanism
    const debouncedUpdate = CE.cache.createDebouncedUpdate(updateFunction, 150);
    debouncedUpdate(target);
  }

  /**
   * Start observing an element for attribute changes
   * @param {Element} element - The element to observe
   */
  function startObservingElement(element) {
    if (!mainObserver) {
      console.warn(
        "[ContentExtension.observers] Main observer not initialized"
      );
      return;
    }

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

    mainObserver.observe(element, observerOptions);
    activeObservers.set(element, mainObserver);
    allObservers.add(mainObserver);

    // Schedule periodic cleanup check
    scheduleObserverCleanup(element);
  }

  /**
   * Start observing an element with comprehensive attribute monitoring
   * @param {Element} element - The element to observe
   */
  function startObserving(element) {
    if (!mainObserver) {
      console.warn(
        "[ContentExtension.observers] Main observer not initialized"
      );
      return;
    }

    const isSelect = element && element.tagName === "SELECT";

    const observerOptions = {
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
    };

    mainObserver.observe(element, observerOptions);

    // Also start observing with memory-safe method
    startObservingElement(element);
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

  // Export the observers module
  CE.observers = {
    initialize,
    cleanup,
    onStateChange,

    // Main observation control
    startObserving,
    stopObserving,
    startObservingElement,
    stopObservingElement,

    // Utility functions
    scheduleObserverCleanup,
    getObserverStats,
    reconnectObserver,

    // Internal functions (exposed for testing)
    handleMutations,
    handleAttributeMutation,
    handleAriaActiveDescendantChange,
    scheduleAttributeUpdate,
  };

  console.log("[ContentExtension.observers] Module loaded");
})();
