/**
 * Content Script - Handles accessibility scanning and popup communication
 */

(function () {
  "use strict";

  console.log("Content script loaded with axe-core scanning");

  // Extension state tracking - simplified to single mode
  let extensionState = {
    mode: "off", // "off", "on", or "mini"
  };

  // Helper function to check if inspector is active
  function isInspectorActive() {
    return extensionState.mode === "on" || extensionState.mode === "mini";
  }

  // Check if we need axe-core integration
  let axeIntegrationAvailable = false;

  /**
   * Initialize axe-core integration if available
   */
  function initializeAxeIntegration() {
    // Wait a bit for all modules to load
    const checkAvailability = () => {
      if (
        typeof window.AxeIntegration !== "undefined" &&
        typeof window.AccessibilityCache !== "undefined"
      ) {
        axeIntegrationAvailable = true;
        console.log("Axe integration and accessibility cache available");

        // Initialize axe if needed
        if (window.AxeIntegration.initialize) {
          window.AxeIntegration.initialize();
        }
        return true;
      }
      return false;
    };

    // Try immediately first
    if (checkAvailability()) {
      return true;
    }

    // If not available, wait a bit for modules to load
    console.log(
      "Axe integration or accessibility cache not yet available, waiting..."
    );
    setTimeout(() => {
      if (checkAvailability()) {
        console.log("Axe integration initialized after delay");
        // Run page scan if inspector is enabled and we're ready
        if (isInspectorActive() && document.readyState === "complete") {
          setTimeout(handlePageLoadScanning, 500);
        }
      } else {
        console.warn("Axe integration still not available after delay");
      }
    }, 2000);

    return false;
  }

  /**
   * Run an axe-core accessibility scan
   */
  async function runAccessibilityScan() {
    if (!axeIntegrationAvailable) {
      console.log("Attempting to initialize axe integration...");
      if (!initializeAxeIntegration()) {
        throw new Error("Axe integration not available");
      }
    }

    try {
      console.log("Running accessibility scan...");

      // Ensure axe is properly loaded
      if (typeof window.axe === "undefined") {
        throw new Error("axe-core library not loaded");
      }

      if (
        !window.AxeIntegration ||
        typeof window.AxeIntegration.runScan !== "function"
      ) {
        throw new Error("AxeIntegration.runScan not available");
      }

      const scanResults = await window.AxeIntegration.runScan();

      if (!scanResults) {
        throw new Error("Scan returned no results");
      }

      // Store results in cache
      if (window.AccessibilityCache && scanResults) {
        window.AccessibilityCache.setPageResults(scanResults, false); // Use additive mode
        console.log(
          `Scan completed: ${
            scanResults.violations?.length || 0
          } violations found and cached`
        );

        // Log cache statistics
        const cacheStats = window.AccessibilityCache.getStats();
        console.log("Cache stats after scan:", cacheStats);
      } else {
        console.warn("AccessibilityCache not available - results not cached");
      }

      // Send badge update message to background
      try {
        const violationCount = scanResults.violations?.length || 0;
        console.log(
          `[ContentMain] About to send badge update message: ${violationCount} violations`
        );

        const message = {
          action: "scanCompleted",
          violationCount: violationCount,
        };
        console.log(`[ContentMain] Sending message:`, message);

        chrome.runtime.sendMessage(message, (response) => {
          console.log(`[ContentMain] Badge update response:`, response);
          if (chrome.runtime.lastError) {
            console.error(
              `[ContentMain] Chrome runtime error:`,
              chrome.runtime.lastError
            );
          }
        });
      } catch (error) {
        console.warn("[ContentMain] Failed to send badge update:", error);
      }

      return {
        success: true,
        data: { scanResults },
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Failed to run accessibility scan:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  /**
   * Handle page load scanning if inspector is enabled
   */
  function handlePageLoadScanning() {
    console.log(
      "[content-main] handlePageLoadScanning called - extensionState:",
      extensionState
    );
    if (isInspectorActive()) {
      console.log(
        "[content-main] Inspector active - running automatic page scan"
      );
      setTimeout(() => {
        runAccessibilityScan().catch((error) => {
          console.error("Page load scan failed:", error);
        });
      }, 1000); // Short delay to ensure page is ready
    } else {
      console.log(
        "[content-main] Inspector inactive - skipping page load scan"
      );
    }
  }

  /**
   * Initialize extension with proper timing
   */
  function initializeExtension() {
    console.log("[content-main] Initializing extension...");

    // First, get the extension mode from storage (with migration support)
    chrome.storage.sync.get(
      ["inspectorMode", "extensionEnabled", "miniMode"],
      (result) => {
        console.log("[content-main] Storage retrieval result:", result);

        // Determine mode - migrate from old format if needed
        let mode = result.inspectorMode || "off";
        if (
          !result.inspectorMode &&
          (result.extensionEnabled || result.miniMode)
        ) {
          console.log("[content-main] Migrating from old storage format");
          if (!result.extensionEnabled) {
            mode = "off";
          } else if (result.miniMode) {
            mode = "mini";
          } else {
            mode = "on";
          }
          console.log("[content-main] Migrated to mode:", mode);
        }

        extensionState.mode = mode;
        console.log(
          "[content-main] Inspector mode set to:",
          extensionState.mode,
          "- isActive:",
          isInspectorActive()
        );

        // Now initialize axe integration
        initializeAxeIntegration();

        // Run page load scan if inspector is active and page is ready
        if (
          isInspectorActive() &&
          (document.readyState === "complete" ||
            document.readyState === "interactive")
        ) {
          console.log(
            "[content-main] Page ready and inspector active - running page load scan"
          );
          handlePageLoadScanning();
        }
      }
    );
  }

  /**
   * Handle inspector mode change - run scan when enabled
   */
  function handleInspectorModeChange(newMode) {
    console.log(
      "[content-main] handleInspectorModeChange called with mode:",
      newMode
    );
    const wasActive = isInspectorActive();
    const oldMode = extensionState.mode;

    // Update state
    extensionState.mode = newMode;
    const nowActive = isInspectorActive();

    // Notify all content script modules of state change
    notifyContentScriptsOfStateChange(nowActive);

    if (nowActive) {
      console.log(
        "[content-main] Inspector now active (mode:",
        newMode,
        ") - running accessibility scan"
      );
      // Always run scan when inspector becomes active or changes modes
      runAccessibilityScan().catch((error) => {
        console.error("Inspector mode change scan failed:", error);
      });
    } else {
      console.log("[content-main] Inspector now inactive - no scan needed");
    }

    console.log(
      "[content-main] Inspector mode changed from",
      oldMode,
      "to",
      newMode
    );
  }

  /**
   * Notify all content script modules of state change
   */
  function notifyContentScriptsOfStateChange(enabled) {
    console.log(
      "[content-main] Notifying content scripts of state change, enabled:",
      enabled
    );

    // Notify each content script module
    const modules = [
      "ContentExtension.events",
      "ContentExtension.tooltip",
      "ContentExtension.cache",
      "ContentExtension.accessibility",
      "ContentExtension.validation",
      "ContentExtension.observers",
    ];

    modules.forEach((moduleName) => {
      try {
        const module =
          window[moduleName.split(".")[0]]?.[moduleName.split(".")[1]];
        if (module && typeof module.onStateChange === "function") {
          console.log("[content-main] Calling onStateChange for", moduleName);
          module.onStateChange(enabled);
        }
      } catch (error) {
        console.warn(
          "[content-main] Failed to notify",
          moduleName,
          "of state change:",
          error
        );
      }
    });
  }

  // Wait for DOM to be ready before initializing
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      console.log("[content-main] DOM loaded - initializing extension");
      initializeExtension();
    });
  } else {
    // DOM already loaded
    console.log("[content-main] DOM already loaded - initializing extension");
    initializeExtension();
  }

  // Also ensure initialization on window load as a fallback
  window.addEventListener("load", () => {
    console.log(
      "[content-main] Window loaded - ensuring extension is initialized"
    );
    // If axe integration isn't available yet, try to initialize again
    if (!axeIntegrationAvailable) {
      console.log(
        "[content-main] Axe integration not available, re-initializing"
      );
      initializeExtension();
    }
  });

  // Basic message handling for popup communication
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content script received message:", message);

    try {
      // Handle both action and type properties for backwards compatibility
      const messageType = message.type || message.action;

      switch (messageType) {
        case "ping":
          // Simple ping response
          sendResponse({ status: "ok", success: true });
          return true;

        case "getCachedResults":
          // Return cached scan results if available
          console.log("[content-main] getCachedResults request received");
          if (window.AccessibilityCache) {
            const pageResults = window.AccessibilityCache.getPageResults();

            console.log("[content-main] Returning cached data:", {
              hasPageResults: !!pageResults,
              violationsCount: pageResults?.violations?.length || 0,
              passesCount: pageResults?.passes?.length || 0,
              isMainFrame: window.self === window.top,
            });

            // Only respond with data if we have actual results OR if we're the main frame
            // This prevents iframes without data from responding first
            if (pageResults || window.self === window.top) {
              // Send badge update for cached results if we have them
              if (pageResults && window.self === window.top) {
                try {
                  const violationCount = pageResults.violations?.length || 0;
                  console.log(
                    `[ContentMain] About to send cached badge update: ${violationCount} violations`
                  );

                  const message = {
                    action: "scanCompleted",
                    violationCount: violationCount,
                  };
                  console.log(`[ContentMain] Sending cached message:`, message);

                  chrome.runtime.sendMessage(message, (response) => {
                    console.log(
                      `[ContentMain] Cached badge update response:`,
                      response
                    );
                    if (chrome.runtime.lastError) {
                      console.error(
                        `[ContentMain] Cached chrome runtime error:`,
                        chrome.runtime.lastError
                      );
                    }
                  });
                } catch (error) {
                  console.warn(
                    "[ContentMain] Failed to send badge update for cached results:",
                    error
                  );
                }
              }

              sendResponse({
                success: true,
                data: pageResults ? { scanResults: pageResults } : null,
              });
            } else {
              // Don't respond from frames that don't have data - let main frame respond
              console.log("[content-main] Frame has no data, not responding");
              return false;
            }
          } else {
            console.log("[content-main] AccessibilityCache not available");
            sendResponse({ success: true, data: null });
          }
          return true;

        case "runAccessibilityScan":
          // Run accessibility scan using axe integration
          runAccessibilityScan()
            .then((result) => sendResponse(result))
            .catch((error) => {
              sendResponse({
                success: false,
                error: error.message,
                data: null,
              });
            });
          return true;

        case "SET_INSPECTOR_MODE":
          console.log(
            "[content-main] Received SET_INSPECTOR_MODE:",
            message.mode
          );
          if (message.mode) {
            handleInspectorModeChange(message.mode);
          }
          console.log(
            "[content-main] Updated extension state:",
            extensionState
          );
          sendResponse({ success: true });
          return true;

        case "SET_EXTENSION_STATE":
          // Legacy support - convert to new format
          console.log(
            "[content-main] Received legacy SET_EXTENSION_STATE:",
            message.state
          );
          if (message.state) {
            let mode = "off";
            if (message.state.extensionEnabled) {
              mode = message.state.miniMode ? "mini" : "on";
            }
            console.log(
              "[content-main] Converting legacy state to mode:",
              mode
            );
            handleInspectorModeChange(mode);
          }
          console.log(
            "[content-main] Updated extension state:",
            extensionState
          );
          sendResponse({ success: true });
          return true;

        case "AX_TOOLTIP_SHOWN":
          // Cross-frame tooltip coordination message - no response needed
          // This is handled by the events module, just acknowledge receipt
          return false; // Let other listeners handle this

        default:
          console.warn("Unknown message action:", messageType);
          sendResponse({ success: false, error: "Unknown action" });
          return true;
      }
    } catch (error) {
      console.error("Content script error handling message:", error);
      sendResponse({ success: false, error: error.message });
      return true;
    }
  });

  console.log("Content script message handlers registered");

  // Initialize the CE.main object that other content scripts expect
  if (!window.ContentExtension.main) {
    window.ContentExtension.main = {
      isEnabled: () => {
        const enabled = isInspectorActive();
        console.debug("[CE.main] isEnabled() called, returning:", enabled);
        return enabled;
      },
      triggerPageScan: () => {
        console.log(
          "[CE.main] triggerPageScan() called, mode:",
          extensionState.mode
        );
        if (isInspectorActive()) {
          runAccessibilityScan().catch((error) => {
            console.error("Triggered page scan failed:", error);
          });
        } else {
          console.log("[CE.main] triggerPageScan skipped - inspector inactive");
        }
      },
      // New methods for inspector mode management
      getInspectorMode: () => extensionState.mode,
      setInspectorMode: (mode) => {
        if (["off", "on", "mini"].includes(mode)) {
          handleInspectorModeChange(mode);
          // Also update storage to keep it in sync
          chrome.storage.sync.set({ inspectorMode: mode });
        }
      },
      // Legacy compatibility
      getState: () => ({
        mode: extensionState.mode,
        enabled: isInspectorActive(),
        miniMode: extensionState.mode === "mini",
      }),
    };
    console.log("CE.main interface initialized");
  }

  // Wait for all modules to be loaded before initializing
  function initializeModules() {
    console.log("Attempting to initialize content script modules...");

    const modulesToInitialize = [
      "cache",
      "observers",
      "accessibility",
      "events",
      "tooltip",
    ];
    let modulesReady = 0;

    modulesToInitialize.forEach((moduleName) => {
      const module = window.ContentExtension[moduleName];
      if (module && typeof module.initialize === "function") {
        try {
          module.initialize();
          modulesReady++;
          console.log(`✓ ${moduleName} system initialized`);
        } catch (error) {
          console.error(`✗ Failed to initialize ${moduleName}:`, error);
        }
      } else {
        console.warn(
          `⚠ Module ${moduleName} not available or missing initialize function`
        );
      }
    });

    // Check tooltip system specifically
    if (window.chromeAxTooltip) {
      console.log(
        `✓ Tooltip system available (initialized: ${window.chromeAxTooltip._initialized})`
      );
    } else {
      console.warn("⚠ window.chromeAxTooltip not available");
    }

    console.log(
      `Initialized ${modulesReady}/${modulesToInitialize.length} content script modules`
    );
    return modulesReady;
  }

  // Try to initialize immediately
  let initializedCount = initializeModules();

  // If not all modules were ready, try again after a delay
  if (initializedCount < 5) {
    console.log("Not all modules ready, retrying in 500ms...");
    setTimeout(() => {
      initializeModules();
    }, 500);
  }

  // Listen for storage changes to keep content script in sync
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.inspectorMode) {
      const newMode = changes.inspectorMode.newValue;
      if (newMode && newMode !== extensionState.mode) {
        console.log(
          "[content-main] Storage change detected, updating mode from",
          extensionState.mode,
          "to",
          newMode
        );
        handleInspectorModeChange(newMode);
      }
    }
  });

  console.log("Content script initialization complete");
})();
