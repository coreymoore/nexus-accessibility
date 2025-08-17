/**
 * Content Script Inspector Management
 *
 * This module manages inspector display and coordinates with the inspector component.
 * It handles showing/hiding inspectors and cross-frame coordination.
 *
 * Dependencies: content-utils.js
 */

// Use the enhanced module definition system
window.ContentExtension.deps.defineModule(
  "inspector",
  [],
  function (deps, utils) {
    "use strict";

    // Ensure our namespace exists for backwards compatibility
    window.ContentExtension = window.ContentExtension || {};
    const CE = window.ContentExtension;

    /**
     * Initialize the inspector module
     */
    function initialize() {
      console.log(
        "[ContentExtension.inspector] Initializing inspector management"
      );
    }

    /**
     * Get the inspector element created by the inspector component
     * @returns {Element|null} The inspector element or null
     */
    function getInspectorElement() {
      return document.querySelector(".nexus-accessibility-ui-inspector");
    }

    /**
     * Show loading inspector
     * @param {Element} target - The target element
     */
    function showLoadingInspector(target) {
      if (
        window.nexusAccessibilityUiInspector &&
        typeof window.nexusAccessibilityUiInspector.showLoadingInspector ===
          "function"
      ) {
        window.nexusAccessibilityUiInspector.showLoadingInspector(target);
      } else {
        console.warn(
          "[ContentExtension.inspector] nexusAccessibilityUiInspector.showLoadingInspector not available"
        );
      }
    }

    /**
     * Show inspector with accessibility information
     * @param {Object} info - The accessibility information
     * @param {Element} target - The target element
     * @returns {boolean} Whether the inspector was successfully shown
     */
    function showInspector(info, target) {
      if (
        !window.nexusAccessibilityUiInspector ||
        typeof window.nexusAccessibilityUiInspector.showInspector !== "function"
      ) {
        console.warn(
          "[ContentExtension.inspector] nexusAccessibilityUiInspector.showInspector not available"
        );
        return false;
      }

      const options = {
        onClose: createCloseHandler(target),
        enabled: () => (CE.main ? CE.main.isEnabled() : true),
      };

      window.nexusAccessibilityUiInspector.showInspector(info, target, options);

      // Broadcast that this frame is showing a inspector
      broadcastInspectorShown();

      return true; // Success
    }

    /**
     * Create close handler for inspector
     * @param {Element} originalTarget - The original target element
     * @returns {Function} Close handler function
     */
    function createCloseHandler(originalTarget) {
      return () => {
        const focusState =
          utils.callModuleMethod("stateManager", "getCurrentState") || {};
        const { inspectedElement, lastFocusedElement } = focusState;
        const elementToFocus =
          inspectedElement || lastFocusedElement || originalTarget;

        hideInspector({
          onRefocus: () => {
            if (elementToFocus && typeof elementToFocus.focus === "function") {
              if (CE.events && CE.events.setSuppressNextFocusIn) {
                CE.events.setSuppressNextFocusIn(true);
              }
              CE.utils.safeFocus(elementToFocus, { preventScroll: true });
            }
          },
        });
      };
    }

    /**
     * Hide inspector
     * @param {Object} [opts] - Options including onRefocus callback
     */
    function hideInspector(opts = {}) {
      if (
        window.nexusAccessibilityUiInspector &&
        typeof window.nexusAccessibilityUiInspector.hideInspector === "function"
      ) {
        window.nexusAccessibilityUiInspector.hideInspector(opts);
      } else {
        // Fallback: manually remove inspector
        const inspector = getInspectorElement();
        if (inspector) {
          inspector.remove();
        }

        // Call onRefocus if provided
        if (opts.onRefocus && typeof opts.onRefocus === "function") {
          try {
            opts.onRefocus();
          } catch (error) {
            console.error(
              "[ContentExtension.inspector] Error in onRefocus callback:",
              error
            );
          }
        }
      }
    }

    /**
     * Broadcast that this frame is showing a inspector
     */
    function broadcastInspectorShown() {
      try {
        CE.utils.validatedSend(
          {
            type: "AX_INSPECTOR_SHOWN",
            frameToken: CE.utils.getFrameToken(),
          },
          "broadcastInspectorShown"
        );
      } catch (error) {
        console.warn(
          "[ContentExtension.inspector] Failed to broadcast inspector shown:",
          error
        );
      }
    }

    /**
     * Handle cross-frame inspector coordination
     * @param {Object} msg - Message from another frame
     */
    function handleCrossFrameInspector(msg) {
      if (
        msg &&
        msg.type === "AX_INSPECTOR_SHOWN" &&
        msg.frameToken !== CE.utils.getFrameToken()
      ) {
        // Hide our inspector if another frame is showing one
        const inspector = getInspectorElement();
        if (inspector) {
          hideInspector();
        }
      }
    }

    /**
     * Check if inspector is currently visible
     * @returns {boolean} True if inspector is visible
     */
    function isInspectorVisible() {
      const inspector = getInspectorElement();
      return !!(inspector && inspector.offsetParent);
    }

    /**
     * Get current inspector information
     * @returns {Object|null} Inspector information or null
     */
    function getInspectorInfo() {
      const inspector = getInspectorElement();
      if (!inspector) return null;

      return {
        element: inspector,
        visible: isInspectorVisible(),
        target: inspector.dataset.target || null,
      };
    }

    /**
     * Force hide inspector without callbacks
     */
    function forceHideInspector() {
      const inspector = getInspectorElement();
      if (inspector) {
        inspector.remove();
      }
    }

    /**
     * Clean up inspector module
     */
    function cleanup() {
      console.log("[ContentExtension.inspector] Cleaning up inspector");
      forceHideInspector();
    }

    /**
     * Handle state change (extension enabled/disabled)
     * @param {boolean} enabled - Whether extension is enabled
     */
    function onStateChange(enabled) {
      if (!enabled) {
        forceHideInspector();
      }
    }

    /**
     * Check if inspector component is available
     * @returns {boolean} True if inspector component is loaded
     */
    function isInspectorComponentAvailable() {
      return !!(
        window.nexusAccessibilityUiInspector &&
        window.nexusAccessibilityUiInspector.showInspector &&
        window.nexusAccessibilityUiInspector.hideInspector
      );
    }

    /**
     * Wait for inspector component to be available
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<boolean>} Promise that resolves when component is available
     */
    function waitForInspectorComponent(timeout = 5000) {
      return new Promise((resolve) => {
        if (isInspectorComponentAvailable()) {
          resolve(true);
          return;
        }

        const startTime = Date.now();
        const checkInterval = setInterval(() => {
          if (isInspectorComponentAvailable()) {
            clearInterval(checkInterval);
            resolve(true);
          } else if (Date.now() - startTime > timeout) {
            clearInterval(checkInterval);
            resolve(false);
          }
        }, 100);
      });
    }

    // Return the inspector module API
    const inspectorAPI = {
      initialize,
      cleanup,
      onStateChange,

      // Main inspector functions
      showLoadingInspector,
      showInspector,
      hideInspector,
      forceHideInspector,

      // Alias for hideInspector to match the method name used by focus module
      hide: hideInspector,

      // Cross-frame coordination
      handleCrossFrameInspector,
      broadcastInspectorShown,

      // Utility functions
      getInspectorElement,
      isInspectorVisible,
      getInspectorInfo,
      isInspectorComponentAvailable,
      waitForInspectorComponent,

      // Internal functions (exposed for testing)
      createCloseHandler,
    };

    // Also expose via legacy namespace for backwards compatibility
    CE.inspector = inspectorAPI;

    return inspectorAPI;
  }
);

console.log("[ContentExtension.inspector] Module defined");
