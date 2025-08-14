/**
 * Content Script Tooltip Management
 *
 * This module manages tooltip display and coordinates with the tooltip component.
 * It handles showing/hiding tooltips and cross-frame coordination.
 *
 * Dependencies: content-utils.js
 */

(function () {
  "use strict";

  // Ensure our namespace exists
  window.ContentExtension = window.ContentExtension || {};
  const CE = window.ContentExtension;

  /**
   * Initialize the tooltip module
   */
  function initialize() {
    console.log("[ContentExtension.tooltip] Initializing tooltip management");
  }

  /**
   * Get the tooltip element created by the tooltip component
   * @returns {Element|null} The tooltip element or null
   */
  function getTooltipElement() {
    return document.querySelector(".chrome-ax-tooltip");
  }

  /**
   * Show loading tooltip
   * @param {Element} target - The target element
   */
  function showLoadingTooltip(target) {
    if (
      window.chromeAxTooltip &&
      typeof window.chromeAxTooltip.showLoadingTooltip === "function"
    ) {
      window.chromeAxTooltip.showLoadingTooltip(target);
    } else {
      console.warn(
        "[ContentExtension.tooltip] chromeAxTooltip.showLoadingTooltip not available"
      );
    }
  }

  /**
   * Show tooltip with accessibility information
   * @param {Object} info - The accessibility information
   * @param {Element} target - The target element
   */
  function showTooltip(info, target) {
    console.debug("[ContentExtension.tooltip] showTooltip called:", {
      hasInfo: !!info,
      hasTarget: !!target,
      targetTag: target?.tagName,
      targetId: target?.id,
      hasChromeAxTooltip: !!window.chromeAxTooltip,
      hasShowTooltipMethod: !!(
        window.chromeAxTooltip && window.chromeAxTooltip.showTooltip
      ),
    });

    if (
      !window.chromeAxTooltip ||
      typeof window.chromeAxTooltip.showTooltip !== "function"
    ) {
      console.warn(
        "[ContentExtension.tooltip] chromeAxTooltip.showTooltip not available"
      );
      console.debug(
        "[ContentExtension.tooltip] Available on window.chromeAxTooltip:",
        window.chromeAxTooltip
          ? Object.keys(window.chromeAxTooltip)
          : "chromeAxTooltip not found"
      );
      return;
    }

    const options = {
      onClose: createCloseHandler(target),
      enabled: () => (CE.main ? CE.main.isEnabled() : true),
    };

    console.debug(
      "[ContentExtension.tooltip] Calling window.chromeAxTooltip.showTooltip"
    );
    window.chromeAxTooltip.showTooltip(info, target, options);

    // Broadcast that this frame is showing a tooltip
    broadcastTooltipShown();
  }

  /**
   * Create close handler for tooltip
   * @param {Element} originalTarget - The original target element
   * @returns {Function} Close handler function
   */
  function createCloseHandler(originalTarget) {
    return () => {
      const focusState = CE.events ? CE.events.getFocusState() : {};
      const { inspectedElement, lastFocusedElement } = focusState;
      const elementToFocus =
        inspectedElement || lastFocusedElement || originalTarget;

      hideTooltip({
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
   * Hide tooltip
   * @param {Object} [opts] - Options including onRefocus callback
   */
  function hideTooltip(opts = {}) {
    if (
      window.chromeAxTooltip &&
      typeof window.chromeAxTooltip.hideTooltip === "function"
    ) {
      window.chromeAxTooltip.hideTooltip(opts);
    } else {
      // Fallback: manually remove tooltip
      const tooltip = getTooltipElement();
      if (tooltip) {
        tooltip.remove();
      }

      // Call onRefocus if provided
      if (opts.onRefocus && typeof opts.onRefocus === "function") {
        try {
          opts.onRefocus();
        } catch (error) {
          console.error(
            "[ContentExtension.tooltip] Error in onRefocus callback:",
            error
          );
        }
      }
    }
  }

  /**
   * Broadcast that this frame is showing a tooltip
   */
  function broadcastTooltipShown() {
    try {
      chrome.runtime.sendMessage({
        type: "AX_TOOLTIP_SHOWN",
        frameToken: CE.utils.getFrameToken(),
      });
    } catch (error) {
      console.warn(
        "[ContentExtension.tooltip] Failed to broadcast tooltip shown:",
        error
      );
    }
  }

  /**
   * Handle cross-frame tooltip coordination
   * @param {Object} msg - Message from another frame
   */
  function handleCrossFrameTooltip(msg) {
    if (
      msg &&
      msg.type === "AX_TOOLTIP_SHOWN" &&
      msg.frameToken !== CE.utils.getFrameToken()
    ) {
      // Hide our tooltip if another frame is showing one
      const tooltip = getTooltipElement();
      if (tooltip) {
        hideTooltip();
      }
    }
  }

  /**
   * Check if tooltip is currently visible
   * @returns {boolean} True if tooltip is visible
   */
  function isTooltipVisible() {
    const tooltip = getTooltipElement();
    return !!(tooltip && tooltip.offsetParent);
  }

  /**
   * Get current tooltip information
   * @returns {Object|null} Tooltip information or null
   */
  function getTooltipInfo() {
    const tooltip = getTooltipElement();
    if (!tooltip) return null;

    return {
      element: tooltip,
      visible: isTooltipVisible(),
      target: tooltip.dataset.target || null,
    };
  }

  /**
   * Force hide tooltip without callbacks
   */
  function forceHideTooltip() {
    const tooltip = getTooltipElement();
    if (tooltip) {
      tooltip.remove();
    }
  }

  /**
   * Clean up tooltip module
   */
  function cleanup() {
    console.log("[ContentExtension.tooltip] Cleaning up tooltip");
    forceHideTooltip();
  }

  /**
   * Handle state change (extension enabled/disabled)
   * @param {boolean} enabled - Whether extension is enabled
   */
  function onStateChange(enabled) {
    if (!enabled) {
      forceHideTooltip();
    }
  }

  /**
   * Check if tooltip component is available
   * @returns {boolean} True if tooltip component is loaded
   */
  function isTooltipComponentAvailable() {
    return !!(
      window.chromeAxTooltip &&
      window.chromeAxTooltip.showTooltip &&
      window.chromeAxTooltip.hideTooltip
    );
  }

  /**
   * Wait for tooltip component to be available
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} Promise that resolves when component is available
   */
  function waitForTooltipComponent(timeout = 5000) {
    return new Promise((resolve) => {
      if (isTooltipComponentAvailable()) {
        resolve(true);
        return;
      }

      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (isTooltipComponentAvailable()) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  }

  // Export the tooltip module
  CE.tooltip = {
    initialize,
    cleanup,
    onStateChange,

    // Main tooltip functions
    showLoadingTooltip,
    showTooltip,
    hideTooltip,
    forceHideTooltip,

    // Cross-frame coordination
    handleCrossFrameTooltip,
    broadcastTooltipShown,

    // Utility functions
    getTooltipElement,
    isTooltipVisible,
    getTooltipInfo,
    isTooltipComponentAvailable,
    waitForTooltipComponent,

    // Internal functions (exposed for testing)
    createCloseHandler,
  };

  console.log("[ContentExtension.tooltip] Module loaded - VERSION 1.1.9");
})();
