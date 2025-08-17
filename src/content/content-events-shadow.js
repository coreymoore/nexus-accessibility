/**
 * Content Script Shadow DOM Event Management
 *
 * This module handles Shadow DOM monitoring and active element tracking.
 * It provides utilities for monitoring shadow roots and tracking focus changes
 * within shadow DOM contexts.
 *
 * Dependencies: content-deps.js
 */

// Use the enhanced module definition system
window.ContentExtension.deps.defineModule(
  "eventsShadow",
  [],
  function (deps, utils) {
    "use strict";

    // Shadow DOM monitoring state
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
        "[ContentExtension.events.shadow] Starting shadow DOM monitoring for:",
        shadowHost.id
      );
      console.log(
        "Initial shadowRoot.activeElement:",
        lastActiveElement?.tagName,
        lastActiveElement?.id
      );

      // Create an interval to check for shadow DOM active element changes
      shadowActiveElementObserver = setInterval(() => {
        const currentActiveElement = shadowHost.shadowRoot.activeElement;

        if (currentActiveElement !== lastActiveElement) {
          console.log(
            "[ContentExtension.events.shadow] Shadow active element changed from:",
            lastActiveElement?.tagName,
            lastActiveElement?.id,
            "to:",
            currentActiveElement?.tagName,
            currentActiveElement?.id
          );

          lastActiveElement = currentActiveElement;

          // Only process if this is a different element from what we last processed
          if (
            currentActiveElement &&
            currentActiveElement !== lastProcessedElement
          ) {
            lastProcessedElement = currentActiveElement;

            // Notify the main events module about the change using safe method call
            utils.callModuleMethod(
              "events",
              "handleShadowFocusChange",
              currentActiveElement,
              shadowHost
            );
          }
        }
      }, 100); // Check every 100ms
    }

    /**
     * Clean up shadow DOM monitoring
     */
    function cleanupShadowMonitoring() {
      if (shadowActiveElementObserver) {
        clearInterval(shadowActiveElementObserver);
        shadowActiveElementObserver = null;
      }
      currentShadowHost = null;
      lastProcessedElement = null;
    }

    /**
     * Get the current shadow host being monitored
     * @returns {Element|null} The current shadow host
     */
    function getCurrentShadowHost() {
      return currentShadowHost;
    }

    /**
     * Check if an element is within a shadow root
     * @param {Element} element - The element to check
     * @returns {Element|null} The shadow host if element is in shadow DOM, null otherwise
     */
    function findShadowHost(element) {
      let current = element;
      while (current) {
        if (current.host) {
          return current.host;
        }
        current = current.parentNode;
      }
      return null;
    }

    // Return module exports
    return {
      monitorShadowActiveElement,
      cleanupShadowMonitoring,
      getCurrentShadowHost,
      findShadowHost,
    };
  }
);

console.log("[ContentExtension.events.shadow] Module loaded");
