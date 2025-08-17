/**
 * Content Script Event Management - Core Module
 *
 * This module coordinates all event handling by integrating the focus, shadow DOM,
 * and state management modules. It provides the main public API and handles
 * initialization, cleanup, and message handling.
 *
 * Dependencies: content-deps.js, eventsFocus, eventsState, eventsShadow
 */

// Use the enhanced module definition system
window.ContentExtension.deps.defineModule(
  "events",
  ["eventsFocus", "eventsState", "eventsShadow"],
  function (deps, utils) {
    "use strict";

    // Event listener state
    let listenersRegistered = false;
    let messageListener = null;
    let initRetryCount = 0;
    const maxInitRetries = 5;

    /**
     * Initialize the events system
     */
    function initialize() {
      console.log("[ContentExtension.events] Initializing events module");

      // All dependencies should be available since we declared them
      // But add defensive checks just in case
      if (!deps.eventsFocus || !deps.eventsState || !deps.eventsShadow) {
        const missing = [];
        if (!deps.eventsFocus) missing.push("eventsFocus");
        if (!deps.eventsState) missing.push("eventsState");
        if (!deps.eventsShadow) missing.push("eventsShadow");

        console.error(
          "[ContentExtension.events] Missing required dependencies:",
          missing.join(", ")
        );

        if (initRetryCount < maxInitRetries) {
          initRetryCount++;
          setTimeout(() => initialize(), 100 * initRetryCount);
          return false;
        } else {
          console.error(
            "[ContentExtension.events] Max initialization retries exceeded"
          );
          return false;
        }
      }

      initMessageListener();
      console.log("[ContentExtension.events] Initialized successfully");
      return true;
    }

    /**
     * Initialize message listener for runtime messages
     */
    function initMessageListener() {
      if (messageListener) {
        console.log(
          "[ContentExtension.events] Message listener already initialized"
        );
        return;
      }

      messageListener = (request, sender, sendResponse) => {
        // Check for undefined or invalid messages
        if (!request) {
          console.warn("[ContentExtension.events] Received undefined message", {
            request,
            sender,
            sendResponseType: typeof sendResponse,
          });
          if (sendResponse)
            sendResponse({ success: false, error: "Invalid message" });
          return;
        }

        // Only process and log messages intended for the events module
        if (
          request.action === "enableEvents" ||
          request.action === "disableEvents"
        ) {
          console.log(
            "[ContentExtension.events] Received message:",
            request.action
          );
        } else {
          // Not a message for this module - ignore silently
          return;
        }

        try {
          if (request.action === "enableEvents") {
            const result = enableEventListeners();
            sendResponse({ success: result });
          } else if (request.action === "disableEvents") {
            const result = disableEventListeners();
            sendResponse({ success: result });
          }
        } catch (error) {
          console.error(
            "[ContentExtension.events] Error handling message:",
            error
          );
          sendResponse({ success: false, error: error.message });
        }
      };

      chrome.runtime.onMessage.addListener(messageListener);
      console.log("[ContentExtension.events] Message listener initialized");
    }

    /**
     * Enable all event listeners
     */
    function enableEventListeners() {
      if (listenersRegistered) {
        console.log(
          "[ContentExtension.events] Event listeners already registered"
        );
        return true;
      }

      console.log("[ContentExtension.events] Enabling event listeners");

      try {
        // Ensure dependency modules are available
        if (!deps.eventsFocus) {
          console.error(
            "[ContentExtension.events] eventsFocus module not available"
          );
          return false;
        }
        if (!deps.eventsState) {
          console.error(
            "[ContentExtension.events] eventsState module not available"
          );
          return false;
        }
        if (!deps.eventsShadow) {
          console.error(
            "[ContentExtension.events] eventsShadow module not available"
          );
          return false;
        }

        // Register DOM event listeners
        document.addEventListener("focusin", deps.eventsFocus.onFocusIn, true);
        document.addEventListener(
          "focusout",
          deps.eventsFocus.onFocusOut,
          true
        );
        document.addEventListener("keydown", deps.eventsFocus.onKeyDown, true);

        // Register state management listeners
        deps.eventsState.registerStateListeners();

        listenersRegistered = true;
        console.log(
          "[ContentExtension.events] Event listeners enabled successfully"
        );
        return true;
      } catch (error) {
        console.error(
          "[ContentExtension.events] Error enabling event listeners:",
          error
        );
        return false;
      }
    }

    /**
     * Disable all event listeners
     */
    function disableEventListeners() {
      if (!listenersRegistered) {
        console.log("[ContentExtension.events] No event listeners to disable");
        return true;
      }

      console.log("[ContentExtension.events] Disabling event listeners");

      try {
        // Check if dependency modules are still available
        if (deps.eventsFocus) {
          // Remove DOM event listeners
          document.removeEventListener(
            "focusin",
            deps.eventsFocus.onFocusIn,
            true
          );
          document.removeEventListener(
            "focusout",
            deps.eventsFocus.onFocusOut,
            true
          );
          document.removeEventListener(
            "keydown",
            deps.eventsFocus.onKeyDown,
            true
          );
        }

        // Unregister state management listeners
        if (deps.eventsState) {
          deps.eventsState.unregisterStateListeners();
        }

        // Clean up shadow DOM monitoring
        if (deps.eventsShadow) {
          deps.eventsShadow.cleanupShadowMonitoring();
        }

        listenersRegistered = false;
        console.log(
          "[ContentExtension.events] Event listeners disabled successfully"
        );
        return true;
      } catch (error) {
        console.error(
          "[ContentExtension.events] Error disabling event listeners:",
          error
        );
        return false;
      }
    }

    /**
     * Clean up event listeners and state
     */
    function cleanup() {
      console.log("[ContentExtension.events] Cleaning up events");

      // Disable all event listeners
      disableEventListeners();

      // Remove message listener
      if (messageListener) {
        chrome.runtime.onMessage.removeListener(messageListener);
        messageListener = null;
      }

      // Clean up focus state through state manager
      const focusState = utils.callModuleMethod(
        "stateManager",
        "getCurrentState"
      );
      if (focusState && focusState.lastFocusedElement) {
        try {
          focusState.lastFocusedElement.removeEventListener(
            "input",
            deps.eventsFocus.onValueChanged
          );
          focusState.lastFocusedElement.removeEventListener(
            "change",
            deps.eventsFocus.onValueChanged
          );
          focusState.lastFocusedElement.removeEventListener(
            "change",
            deps.eventsFocus.onNativeCheckboxChange
          );
        } catch (error) {
          console.warn(
            "[ContentExtension.events] Error cleaning up element listeners:",
            error
          );
        }
      }

      // Reset state
      initRetryCount = 0;
    }

    /**
     * Handle state change (extension enabled/disabled)
     * @param {boolean} enabled - Whether extension is enabled
     */
    function onStateChange(enabled) {
      if (enabled) {
        return enableEventListeners();
      } else {
        return disableEventListeners();
      }
    }

    /**
     * Get current focus state (delegated to focus module)
     * @returns {Object} The current focus state
     */
    function getFocusState() {
      // Redirect to state manager
      return (
        utils.callModuleMethod("stateManager", "getCurrentState") || {
          lastFocusedElement: null,
          inspectedElement: null,
        }
      );
    }

    /**
     * Set suppress next focus flag (delegated to focus module)
     * @param {boolean} suppress - Whether to suppress the next focus event
     */
    function setSuppressNextFocusIn(suppress) {
      if (deps.eventsFocus && deps.eventsFocus.setSuppressNextFocusIn) {
        deps.eventsFocus.setSuppressNextFocusIn(suppress);
      } else {
        console.warn(
          "[ContentExtension.events] Focus module not available for setSuppressNextFocusIn"
        );
      }
    }

    /**
     * Handle shadow DOM focus changes (delegated to focus module)
     * @param {Element} element - The focused element within shadow DOM
     * @param {Element} shadowHost - The shadow host element
     */
    function handleShadowFocusChange(element, shadowHost) {
      if (deps.eventsFocus && deps.eventsFocus.handleShadowFocusChange) {
        deps.eventsFocus.handleShadowFocusChange(element, shadowHost);
      } else {
        console.warn(
          "[ContentExtension.events] Focus module not available for handleShadowFocusChange"
        );
      }
    }

    /**
     * Handle element inspection (delegated to focus module)
     * @param {Element} targetElement - The element to inspect
     * @param {Element} targetForInspect - The element to target for inspection
     * @returns {boolean} True if inspection was handled, false otherwise
     */
    function handleElementInspection(targetElement, targetForInspect) {
      if (deps.eventsFocus && deps.eventsFocus.handleElementInspection) {
        deps.eventsFocus.handleElementInspection(
          targetElement,
          targetForInspect
        );
        return true;
      } else {
        console.warn(
          "[ContentExtension.events] Focus module not available for handleElementInspection"
        );
        return false;
      }
    }

    /**
     * Get module status and dependencies
     * @returns {Object} Status information
     */
    function getStatus() {
      return {
        initialized: initRetryCount === 0,
        listenersRegistered,
        dependencies: {
          eventsFocus: !!deps.eventsFocus,
          eventsState: !!deps.eventsState,
          eventsShadow: !!deps.eventsShadow,
        },
        retryCount: initRetryCount,
      };
    }

    // Return module exports
    return {
      // Core lifecycle
      initialize,
      cleanup,
      onStateChange,
      getStatus,

      // Event listener management
      enableEventListeners,
      disableEventListeners,

      // Focus state management
      getFocusState,
      setSuppressNextFocusIn,

      // Delegation methods for inter-module communication
      handleShadowFocusChange,
      handleElementInspection,

      // Event handlers (exposed for testing and backward compatibility)
      onFocusIn: deps.eventsFocus?.onFocusIn,
      onFocusOut: deps.eventsFocus?.onFocusOut,
      onKeyDown: deps.eventsFocus?.onKeyDown,
      onValueChanged: deps.eventsFocus?.onValueChanged,
      onNativeCheckboxChange: deps.eventsFocus?.onNativeCheckboxChange,
    };
  }
);

console.log("[ContentExtension.events] Core module loaded");
