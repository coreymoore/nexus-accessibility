/**
 * Content Script Loader
 *
 * This module handles loading all content script modules in the correct dependency order.
 * It replaces the need to list all individual modules in the manifest.json file.
 *
 * Loading Strategy:
 * 1. Load utility modules first
 * 2. Load third-party libraries
 * 3. Load validation and component modules
 * 4. Load content modules with dependency management
 * 5. Initialize the system
 */

(function () {
  "use strict";

  // Track loading state
  let isLoading = false;
  let isLoaded = false;

  console.log("[ContentExtension.loader] Starting content script loader");

  // Define all modules in dependency order
  const modules = [
    // Core utilities (no dependencies)
    "src/utils/constants.js",
    "src/utils/enhanced-constants.js",
    "src/utils/environment.js",
    "src/utils/chromeAsync.js",
    "src/utils/security.js",
    "src/utils/performance.js",
    "src/utils/scheduler.js",
    "src/utils/dom-sanitizer.js",
    "src/utils/error-handler.js",
    "src/utils/errorRecovery.js",
    "src/utils/debounce.js",
    "src/utils/logger-content.js",
    "src/utils/formatter.js",
    "src/utils/testUtils.js",
    "src/utils/contentInjector.js",
    "src/utils/frameContextManager.js",

    // Third-party libraries
    "src/libs/dom-accessibility-api.js",
    "src/libs/aria-query.js",
    "src/libs/validation-functions.js",

    // Validation utilities
    "src/utils/validation-utils.js",
    "src/utils/validation/core.js",
    "src/utils/validation/page-context.js",

    // Inspector components (old system - these load globally)
    "src/components/inspector/inspector-utils.js",
    "src/components/inspector/inspector-content.js",
    "src/components/inspector/inspector-positioning.js",
    "src/components/inspector/inspector-events.js",
    "src/components/inspector/inspector-focus.js",
    "src/components/inspector/inspector-core.js",
    "src/components/inspector/inspector-main.js",

    // Content script foundations
    "src/content/content-utils.js",
    "src/content/content-cache.js",

    // Dependency system (must load before all modules using it)
    "src/content/content-deps.js",

    // Content modules using new dependency system (order matters for dependencies)
    "src/content/content-inspector.js", // No dependencies
    "src/content/content-events-shadow.js", // No dependencies
    "src/content/content-events-state.js", // No dependencies
    "src/content/content-events-focus.js", // No dependencies
    "src/content/content-events-core.js", // Depends on: eventsFocus, eventsState, eventsShadow
    "src/content/content-accessibility.js", // Depends on: inspector

    // Remaining content modules
    "src/content/content-observers.js",
    "src/content/content-validation.js",

    // Main initialization (must be last)
    "src/content/content-main.js",
  ];

  /**
   * Load a single script file
   * @param {string} path - Path to the script file
   * @returns {Promise<void>}
   */
  function loadScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL(path);

      script.onload = () => {
        console.log(`[ContentExtension.loader] Loaded: ${path}`);
        resolve();
      };

      script.onerror = (error) => {
        console.error(
          `[ContentExtension.loader] Failed to load: ${path}`,
          error
        );
        reject(new Error(`Failed to load ${path}`));
      };

      // Inject into document head
      (document.head || document.documentElement).appendChild(script);
    });
  }

  /**
   * Load all modules in sequence
   * @returns {Promise<void>}
   */
  async function loadAllModules() {
    if (isLoading || isLoaded) {
      console.log(
        "[ContentExtension.loader] Already loading or loaded, skipping"
      );
      return;
    }

    isLoading = true;
    console.log(
      "[ContentExtension.loader] Loading",
      modules.length,
      "modules..."
    );

    try {
      // Load modules sequentially to maintain dependency order
      for (let i = 0; i < modules.length; i++) {
        const module = modules[i];
        console.log(
          `[ContentExtension.loader] Loading ${i + 1}/${
            modules.length
          }: ${module}`
        );
        await loadScript(module);

        // Small delay to ensure proper initialization order
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      console.log("[ContentExtension.loader] All modules loaded successfully");
      isLoaded = true;

      // Wait a bit for modules to initialize, then verify the system
      setTimeout(verifySystem, 100);
    } catch (error) {
      console.error("[ContentExtension.loader] Failed to load modules:", error);
      isLoading = false;

      // Attempt recovery after a delay
      setTimeout(() => {
        console.log("[ContentExtension.loader] Attempting recovery...");
        isLoading = false;
        loadAllModules();
      }, 1000);
    }
  }

  /**
   * Verify that the system loaded correctly
   */
  function verifySystem() {
    const checks = [];

    // Check if dependency system is available
    if (window.ContentExtension?.deps?.registry) {
      checks.push("✓ Dependency system loaded");

      // Check module registrations
      const registry = window.ContentExtension.deps.registry;
      const expectedModules = [
        "inspector",
        "accessibility",
        "events",
        "eventsFocus",
        "eventsState",
        "eventsShadow",
      ];

      for (const moduleName of expectedModules) {
        if (registry.has(moduleName)) {
          checks.push(`✓ Module '${moduleName}' registered`);
        } else {
          checks.push(`✗ Module '${moduleName}' missing`);
        }
      }
    } else {
      checks.push("✗ Dependency system not loaded");
    }

    // Check if main ContentExtension namespace exists
    if (window.ContentExtension) {
      checks.push("✓ ContentExtension namespace available");
    } else {
      checks.push("✗ ContentExtension namespace missing");
    }

    // Check if inspector components are available
    if (window.InspectorCore) {
      checks.push("✓ Inspector components loaded");
    } else {
      checks.push("✗ Inspector components missing");
    }

    console.log("[ContentExtension.loader] System verification:", checks);

    // Count successful checks
    const successful = checks.filter((check) => check.startsWith("✓")).length;
    const total = checks.length;

    if (successful === total) {
      console.log(
        `[ContentExtension.loader] System fully operational (${successful}/${total})`
      );
    } else {
      console.warn(
        `[ContentExtension.loader] System partially loaded (${successful}/${total})`
      );
    }
  }

  /**
   * Initialize the loader
   */
  function initialize() {
    // Check if we're in a valid context
    if (!chrome?.runtime?.getURL) {
      console.error(
        "[ContentExtension.loader] Chrome extension context not available"
      );
      return;
    }

    // Start loading immediately
    loadAllModules().catch((error) => {
      console.error("[ContentExtension.loader] Initialization failed:", error);
    });
  }

  // Start loading when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    // DOM already loaded
    initialize();
  }

  // Expose loader status for debugging
  window.ContentExtensionLoader = {
    isLoading: () => isLoading,
    isLoaded: () => isLoaded,
    modules: modules,
    reload: () => {
      isLoading = false;
      isLoaded = false;
      loadAllModules();
    },
  };
})();
