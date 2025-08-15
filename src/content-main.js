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
 * 6. content-tooltip.js - Tooltip management
 * 7. content-validation.js - Testing and validation (optional)
 * 8. content-main.js - This file (initialization and coordination)
 */

(function () {
  "use strict";

  console.log(
    "Content script loading... v2.1 - INTEGRATED VERSION 1.2.2 - Refactored modular architecture"
  );

  // Ensure our namespace exists
  window.ContentExtension = window.ContentExtension || {};
  const CE = window.ContentExtension;

  // Extension state
  let extensionEnabled = true;
  let initialized = false;

  // Add global debug flag
  window.CONTENT_SCRIPT_DEBUG = true;

  /**
   * Initialize the content script extension
   */
  function initialize() {
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
        "tooltip",
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
      CE.tooltip.initialize();

      // Initialize page-level accessibility scanning
      initializePageScanning();

      // Set up extension state management
      setupExtensionState();

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
   * Initialize automatic page-level accessibility scanning
   */
  function initializePageScanning() {
    console.log(
      "[ContentExtension] Initializing page-level accessibility scanning"
    );

    // Create global scan data storage
    if (!window.AccessibilityPageData) {
      window.AccessibilityPageData = {
        scanResults: null,
        lastScanTime: null,
        isScanning: false,
        url: window.location.href,
        initialized: true,
      };
    }

    // Wait for AxeIntegration to be available before scanning
    const waitForAxeAndScan = () => {
      if (
        window.AxeIntegration &&
        typeof window.AxeIntegration.runScan === "function"
      ) {
        console.log(
          "[ContentExtension] AxeIntegration available, starting page scan"
        );
        runPageScan();
      } else {
        console.log("[ContentExtension] Waiting for AxeIntegration...");
        setTimeout(waitForAxeAndScan, 100);
      }
    };

    // Run initial scan when page is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(waitForAxeAndScan, 200); // Give time for all scripts to load
      });
    } else {
      // DOM already loaded
      setTimeout(waitForAxeAndScan, 200);
    }

    // Set up re-scanning on significant DOM changes (but wait for initial scan)
    setTimeout(setupPageRescanning, 1000);
  }

  /**
   * Run a full page accessibility scan
   */
  async function runPageScan() {
    if (!window.AxeIntegration) {
      console.warn(
        "[ContentExtension] AxeIntegration not available for page scan"
      );
      return;
    }

    if (window.AccessibilityPageData.isScanning) {
      console.debug("[ContentExtension] Page scan already in progress");
      return;
    }

    // Check if this is a scannable page
    const url = window.location.href;
    if (
      url.startsWith("chrome://") ||
      url.startsWith("chrome-extension://") ||
      url.startsWith("moz-extension://") ||
      url === "about:blank" ||
      url.startsWith("file://")
    ) {
      console.debug(
        "[ContentExtension] Skipping scan for system/file page:",
        url
      );
      window.AccessibilityPageData.scanResults = {
        violations: [],
        passes: [],
        incomplete: [],
        inapplicable: [],
        error: "Cannot scan this page type",
      };
      window.AccessibilityPageData.lastScanTime = Date.now();
      return;
    }

    try {
      console.log("[ContentExtension] Running page accessibility scan...");
      window.AccessibilityPageData.isScanning = true;

      const scanResults = await window.AxeIntegration.runScan();

      window.AccessibilityPageData.scanResults = scanResults;
      window.AccessibilityPageData.lastScanTime = Date.now();
      window.AccessibilityPageData.url = window.location.href;

      console.log("[ContentExtension] Page scan completed:", {
        violations: scanResults.violations?.length || 0,
        passes: scanResults.passes?.length || 0,
        incomplete: scanResults.incomplete?.length || 0,
        inapplicable: scanResults.inapplicable?.length || 0,
      });

      // Dispatch custom event for other parts of the extension
      window.dispatchEvent(
        new CustomEvent("accessibility-page-scan-complete", {
          detail: { scanResults },
        })
      );
    } catch (error) {
      console.error("[ContentExtension] Page scan failed:", error);
      window.AccessibilityPageData.scanResults = {
        violations: [],
        passes: [],
        incomplete: [],
        inapplicable: [],
        error: error.message,
      };
      window.AccessibilityPageData.lastScanTime = Date.now();
    } finally {
      window.AccessibilityPageData.isScanning = false;
    }
  }

  /**
   * Set up automatic re-scanning on DOM changes
   */
  function setupPageRescanning() {
    let rescanningStopped = false;
    let rescanTimeout = null;

    // Debounced rescan function
    const debouncedRescan = () => {
      if (rescanningStopped) return;

      clearTimeout(rescanTimeout);
      rescanTimeout = setTimeout(() => {
        if (!rescanningStopped) {
          console.debug(
            "[ContentExtension] DOM changed significantly, re-scanning page"
          );
          runPageScan();
        }
      }, 2000); // Wait 2 seconds after last change
    };

    // Monitor significant DOM changes
    const observer = new MutationObserver((mutations) => {
      if (rescanningStopped) return;

      const significantChange = mutations.some((mutation) => {
        // Consider it significant if elements are added/removed or attributes change
        return (
          (mutation.type === "childList" &&
            (mutation.addedNodes.length > 0 ||
              mutation.removedNodes.length > 0)) ||
          (mutation.type === "attributes" &&
            ["aria-", "role", "tabindex", "alt", "title"].some(
              (attr) =>
                mutation.attributeName?.startsWith(attr) ||
                mutation.attributeName === attr
            ))
        );
      });

      if (significantChange) {
        debouncedRescan();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "aria-hidden",
        "aria-expanded",
        "aria-selected",
        "aria-checked",
        "aria-pressed",
        "role",
        "tabindex",
        "alt",
        "title",
      ],
    });

    // Stop rescanning when page unloads
    window.addEventListener("beforeunload", () => {
      rescanningStopped = true;
      clearTimeout(rescanTimeout);
      observer.disconnect();
    });
  }

  /**
   * Set up extension state management
   */
  function setupExtensionState() {
    // Get initial state from storage
    chrome.storage.sync.get({ extensionEnabled: true }, (data) => {
      extensionEnabled = !!data.extensionEnabled;
      updateExtensionState(extensionEnabled);
    });

    // Listen for state change messages from popup
    chrome.runtime.onMessage.addListener((msg) => {
      try {
        switch (msg.type) {
          case "ENABLE_EXTENSION":
            extensionEnabled = true;
            updateExtensionState(true);
            break;
          case "DISABLE_EXTENSION":
            extensionEnabled = false;
            updateExtensionState(false);
            break;
          case "AX_TOOLTIP_SHOWN":
            // Handle tooltip coordination between frames
            if (CE.tooltip && CE.tooltip.handleCrossFrameTooltip) {
              CE.tooltip.handleCrossFrameTooltip(msg);
            }
            break;
          default:
            console.warn("[ContentExtension] Unknown message type:", msg.type);
        }
      } catch (error) {
        console.error("[ContentExtension] Error handling message:", error);
      }
    });
  }

  /**
   * Update extension state across all modules
   */
  function updateExtensionState(enabled) {
    extensionEnabled = enabled;

    if (enabled) {
      CE.events.enableEventListeners();
    } else {
      CE.events.disableEventListeners();
      CE.tooltip.hideTooltip();
    }

    // Notify all modules of state change
    Object.keys(CE).forEach((moduleName) => {
      const module = CE[moduleName];
      if (module && typeof module.onStateChange === "function") {
        try {
          module.onStateChange(enabled);
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

    // Set up cleanup listeners
    window.addEventListener("pagehide", cleanup, { once: true });
    window.addEventListener("beforeunload", cleanup, { once: true });
  }

  /**
   * Fallback initialization for when modules are missing
   */
  function fallbackInitialization() {
    console.warn("[ContentExtension] Using fallback initialization");

    // Basic tooltip functionality
    if (!CE.tooltip) {
      CE.tooltip = {
        hideTooltip: () => {
          const tooltip = document.querySelector(".chrome-ax-tooltip");
          if (tooltip) {
            tooltip.remove();
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
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    // DOM is already ready
    setTimeout(initialize, 0);
  }
})();
