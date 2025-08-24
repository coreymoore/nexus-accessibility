/**
 * Content Script Main Entry Point
 *
 * This is the main entry point for the content script. It initializes the extension,
 * coordinates between modules, and manages the overall extension state.
 *
 * Dependencies (load order):
 * 1. content-utils.js - Utility functions and helpers
 * 2. content-cache.js - Caching and performance management
 * 3. content-events.js - Event handling and listeners
 * 4. content-accessibility.js - Accessibility data fetching
 * 5. content-observers.js - DOM mutation observers
 * 6. content-inspector.js - Inspector management
 * 7. content-validation.js - Testing and validation (optional)
 * 8. content-main.js - This file (initialization and coordination)
 */

(function () {
  "use strict";

  console.log(
    "Content script loading... v2.1 - Refactored modular architecture"
  );

  // Ensure our namespace exists
  window.ContentExtension = window.ContentExtension || {};
  const CE = window.ContentExtension;

  // Generate or reuse a stable per-frame ID for diagnostics and ACKs.
  // This value remains consistent for the lifetime of the document/frame and
  // is useful to correlate background frame lists with content-side acks.
  if (!CE.frameId) {
    try {
      // Simple random hex id (8 chars) — deterministic enough for correlation
      CE.frameId = (
        // Prefer centralized UUID generator when available
        (window && window.NexusUtils && typeof window.NexusUtils.generateCorrelationId === 'function')
          ? window.NexusUtils.generateCorrelationId()
          : (Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-4))
      ).slice(0, 12);
    } catch (e) {
      CE.frameId = String(Math.floor(Math.random() * 1e9));
    }
    // Expose for debugging from page context if needed
    try {
      window.__NEXUS_FRAME_ID = CE.frameId;
    } catch (e) {}
  }

  // Register message listener early so frames can respond to background
  // messages (CLEAR_CACHES, state changes, etc.) even if module
  // initialization fails or is delayed. This prevents "Receiving end does
  // not exist" errors when the background sends messages shortly after
  // injection.
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    try {
      switch (msg.type) {
        case "INSPECTOR_STATE_CHANGE":
          updateInspectorState(msg.inspectorState);
          break;
        case "ENABLE_EXTENSION":
          updateInspectorState("on");
          break;
        case "DISABLE_EXTENSION":
          updateInspectorState("off");
          break;
        case "AX_INSPECTOR_SHOWN":
          if (CE.inspector && CE.inspector.handleCrossFrameInspector) {
            CE.inspector.handleCrossFrameInspector(msg);
          }
          break;
        case "CLEAR_CACHES":
          (async () => {
            const frameId = (window.frameElement && window.frameElement.id) || 0;
            try {
              console.log("[ContentExtension] CLEAR_CACHES received from background");

              if (CE.cache && typeof CE.cache.clearAllRefetchTimers === "function") {
                CE.cache.clearAllRefetchTimers();
              }
              if (CE.cache && typeof CE.cache.clearPendingRequest === "function") {
                CE.cache.clearPendingRequest();
              }
              if (CE.observers && typeof CE.observers.stopObserving === "function") {
                CE.observers.stopObserving();
              }
              if (CE.inspector && typeof CE.inspector.hideInspector === "function") {
                CE.inspector.hideInspector();
              }

              if (typeof sendResponse === "function") {
                const resp = {
                  status: "cleared",
                  frameId: CE.frameId,
                  originFrameId: frameId,
                  url: window.location.href,
                  title: document.title,
                  isTopFrame: window.top === window,
                };
                if (msg && msg.correlationId) resp.correlationId = msg.correlationId;
                sendResponse(resp);
              }
            } catch (e) {
              console.warn("[ContentExtension] Error handling CLEAR_CACHES:", e);
              if (typeof sendResponse === "function") {
                const errResp = {
                  status: "error",
                  frameId: CE.frameId,
                  originFrameId: frameId,
                  error: e.message,
                };
                if (msg && msg.correlationId) errResp.correlationId = msg.correlationId;
                sendResponse(errResp);
              }
            }
          })();

          // Indicate async sendResponse will be used
          return true;
          break;
        default:
          if (msg && typeof msg.miniMode === "boolean") {
            const currentState = getInspectorState();
            if (currentState !== "off") {
              updateInspectorState(msg.miniMode ? "mini" : "on");
            }
          } else {
            console.warn("[ContentExtension] Unknown message type:", msg && msg.type);
          }
      }
    } catch (error) {
      console.error("[ContentExtension] Error handling message:", error);
    }
  });

  // Extension state
  let extensionEnabled = true;
  let currentInspectorState = "on"; // "off", "on", or "mini"
  let initialized = false;

  /**
   * Initialize the content script extension
   */
  async function initialize() {
    if (initialized) {
      console.warn("[ContentExtension] Already initialized");
      return;
    }

    try {
      // Initialize logger if available
      if (window.initializeLogger) {
        window.initializeLogger();
      }

      // Verify all required modules are loaded
      const requiredModules = [
        "utils",
        "cache",
        "events",
        "accessibility",
        "observers",
        "inspector",
      ];

      const missingModules = requiredModules.filter((module) => !CE[module]);
      if (missingModules.length > 0) {
        throw new Error(
          `Missing required modules: ${missingModules.join(", ")}`
        );
      }

      // Initialize modules in order
      CE.cache.initialize();
      CE.events.initialize();
      CE.accessibility.initialize();
      CE.observers.initialize();
      CE.inspector.initialize();

      // Set up extension state management
      await setupExtensionState();

      // Set up cleanup handlers
      setupCleanup();

      initialized = true;
      console.log("[ContentExtension] Initialized successfully");
    } catch (error) {
      console.error("[ContentExtension] Initialization failed:", error);
      // Attempt graceful degradation
      fallbackInitialization();
    }
  }

  /**
   * Set up extension state management
   */
  async function setupExtensionState() {
    // Get initial state directly from storage (migration should be complete)
    try {
      const data = await new Promise((resolve) => {
        chrome.storage.sync.get({ inspectorState: "on" }, resolve);
      });
      updateInspectorState(data.inspectorState);
    } catch (error) {
      console.error("[ContentExtension] Error loading state:", error);
      // Fallback to default state
      updateInspectorState("on");
    }

    // Listen for state change messages from popup
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      try {
        switch (msg.type) {
          case "INSPECTOR_STATE_CHANGE":
            updateInspectorState(msg.inspectorState);
            break;
          case "ENABLE_EXTENSION":
            // Legacy support - map to "on" state
            updateInspectorState("on");
            break;
          case "DISABLE_EXTENSION":
            // Legacy support - map to "off" state
            updateInspectorState("off");
            break;
          case "AX_INSPECTOR_SHOWN":
            // Handle inspector coordination between frames
            if (CE.inspector && CE.inspector.handleCrossFrameInspector) {
              CE.inspector.handleCrossFrameInspector(msg);
            }
            break;
          case "CLEAR_CACHES":
            // Background requested that content frames clear their caches and timers
            (async () => {
              const frameId = (window.frameElement && window.frameElement.id) || 0;
              try {
                console.log("[ContentExtension] CLEAR_CACHES received from background");

                // Invoke module-level cleanup functions if present
                if (CE.cache && typeof CE.cache.clearAllRefetchTimers === "function") {
                  CE.cache.clearAllRefetchTimers();
                }
                if (CE.cache && typeof CE.cache.clearPendingRequest === "function") {
                  CE.cache.clearPendingRequest();
                }
                if (CE.observers && typeof CE.observers.stopObserving === "function") {
                  CE.observers.stopObserving();
                }
                if (CE.inspector && typeof CE.inspector.hideInspector === "function") {
                  CE.inspector.hideInspector();
                }

                // Send an explicit ACK back to background with richer metadata
                if (typeof sendResponse === "function") {
                  const resp = {
                    status: "cleared",
                    frameId: CE.frameId,
                    originFrameId: frameId,
                    url: window.location.href,
                    title: document.title,
                    isTopFrame: window.top === window,
                  };
                  if (msg && msg.correlationId) resp.correlationId = msg.correlationId;
                  sendResponse(resp);
                }
              } catch (e) {
                console.warn("[ContentExtension] Error handling CLEAR_CACHES:", e);
                if (typeof sendResponse === "function") {
                  const errResp = {
                    status: "error",
                    frameId: CE.frameId,
                    originFrameId: frameId,
                    error: e.message,
                  };
                  if (msg && msg.correlationId) errResp.correlationId = msg.correlationId;
                  sendResponse(errResp);
                }
              }
            })();

            // Indicate we will call sendResponse asynchronously
            return true;
            break;
          default:
            // Handle legacy miniMode messages
            if (msg && typeof msg.miniMode === "boolean") {
              // Convert legacy miniMode to new state format
              const currentState = getInspectorState();
              if (currentState !== "off") {
                updateInspectorState(msg.miniMode ? "mini" : "on");
              }
            } else {
              console.warn(
                "[ContentExtension] Unknown message type:",
                msg.type
              );
            }
        }
      } catch (error) {
        console.error("[ContentExtension] Error handling message:", error);
      }
    });
  }

  /**
   * Update inspector state across all modules
   */
  function updateInspectorState(state) {
    // Validate state
    const validStates = ["off", "on", "mini"];
    if (!validStates.includes(state)) {
      console.warn("[ContentExtension] Invalid inspector state:", state);
      state = "on"; // Default to "on"
    }

    // Store current state
    currentInspectorState = state;

    // Update legacy extensionEnabled for backward compatibility
    extensionEnabled = state !== "off";

    // Update mini mode in inspector
    if (window.nexusAccessibilityUiInspector) {
      window.nexusAccessibilityUiInspector.miniMode = state === "mini";
    }

    // Enable/disable event listeners based on state
    if (state === "off") {
      CE.events.disableEventListeners();
      CE.inspector.hideInspector();
    } else {
      CE.events.enableEventListeners();
    }

    // Notify all modules of state change
    Object.keys(CE).forEach((moduleName) => {
      const module = CE[moduleName];
      if (module && typeof module.onStateChange === "function") {
        try {
          // Pass both new state and legacy enabled flag
          module.onStateChange(extensionEnabled, state);
        } catch (error) {
          console.error(
            `[ContentExtension] Error updating ${moduleName} state:`,
            error
          );
        }
      }
    });
  }

  /**
   * Get current inspector state
   */
  function getInspectorState() {
    return currentInspectorState || "on";
  }

  /**
   * Update extension state across all modules (legacy function)
   */
  function updateExtensionState(enabled) {
    // Convert legacy enabled flag to new state format
    const newState = enabled ? "on" : "off";
    updateInspectorState(newState);
  }

  /**
   * Set up cleanup handlers for page unload
   */
  function setupCleanup() {
    const cleanup = () => {
      console.log("[ContentExtension] Cleaning up...");

      // Clean up all modules
      Object.keys(CE).forEach((moduleName) => {
        const module = CE[moduleName];
        if (module && typeof module.cleanup === "function") {
          try {
            module.cleanup();
          } catch (error) {
            console.error(
              `[ContentExtension] Error cleaning up ${moduleName}:`,
              error
            );
          }
        }
      });

      initialized = false;
    };

    // Handler for page visibility and focus restoration
    const restoreObservers = () => {
      if (!initialized) return;

      console.log(
        "[ContentExtension] Page became visible/focused, restoring observers"
      );

      // Reconnect observers if needed
      if (CE.observers && CE.observers.reconnectObserver) {
        CE.observers.reconnectObserver();
      }

      // Re-establish observation for currently focused element
      if (CE.events && CE.events.getFocusState) {
        const focusState = CE.events.getFocusState();
        const { lastFocusedElement, inspectedElement } = focusState;

        const elementToReobserve = inspectedElement || lastFocusedElement;
        if (elementToReobserve && document.contains(elementToReobserve)) {
          console.log(
            "[ContentExtension] Restarting observation for element:",
            {
              tagName: elementToReobserve.tagName,
              id: elementToReobserve.id || "(no id)",
              role: elementToReobserve.getAttribute("role"),
            }
          );

          if (CE.observers && CE.observers.startObserving) {
            CE.observers.startObserving(elementToReobserve);

            // Verify observation started
            if (
              CE.observers.isObserving &&
              CE.observers.isObserving(elementToReobserve)
            ) {
              console.log("[ContentExtension] ✓ Element observation confirmed");
            } else {
              console.warn(
                "[ContentExtension] ✗ Element observation failed to start"
              );
            }
          }
        } else {
          console.log("[ContentExtension] No valid element to reobserve");
        }
      }

      // Log observer stats for debugging
      if (CE.observers && CE.observers.getObserverStats) {
        const stats = CE.observers.getObserverStats();
        console.log("[ContentExtension] Observer stats after restore:", stats);
      }
    };

    // Set up cleanup listeners
    window.addEventListener("pagehide", cleanup, { once: true });
    window.addEventListener("beforeunload", cleanup, { once: true });

    // Set up restoration listeners
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        // Page became visible again
        setTimeout(restoreObservers, 100); // Small delay to ensure everything is ready
      }
    });

    window.addEventListener("focus", () => {
      // Window regained focus
      setTimeout(restoreObservers, 100); // Small delay to ensure everything is ready
    });

    window.addEventListener("pageshow", (event) => {
      // Page was restored from cache (back/forward navigation)
      if (event.persisted) {
        console.log(
          "[ContentExtension] Page restored from cache, restoring observers"
        );
        setTimeout(restoreObservers, 100);
      }
    });
  }

  /**
   * Fallback initialization for when modules are missing
   */
  function fallbackInitialization() {
    console.warn("[ContentExtension] Using fallback initialization");

    // Basic inspector functionality
    if (!CE.inspector) {
      CE.inspector = {
        hideInspector: () => {
          const inspector = document.querySelector(
            ".nexus-accessibility-ui-inspector"
          );
          if (inspector) {
            inspector.remove();
          }
        },
      };
    }

    // Basic event handling
    if (!CE.events) {
      CE.events = {
        enableEventListeners: () => console.log("Events would be enabled"),
        disableEventListeners: () => console.log("Events would be disabled"),
      };
    }
  }

  /**
   * Get current extension state
   */
  function isEnabled() {
    return extensionEnabled;
  }

  /**
   * Get initialization status
   */
  function isInitialized() {
    return initialized;
  }

  // Export public API
  CE.main = {
    initialize,
    isEnabled,
    isInitialized,
    updateExtensionState,
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initialize().catch((error) => {
        console.error("[ContentExtension] Initialization failed:", error);
        fallbackInitialization();
      });
    });
  } else {
    // DOM is already ready
    setTimeout(() => {
      initialize().catch((error) => {
        console.error("[ContentExtension] Initialization failed:", error);
        fallbackInitialization();
      });
    }, 0);
  }
})();
