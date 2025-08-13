/*
 * Nexus Accessibility Validation Functions
 * These functions are injected into the page context for testing accessibility libraries
 */

(function () {
  "use strict";

  // Set up testing mode
  window.NEXUS_TESTING_MODE = {
    useLibraries: true,
    verbose: false,
  };

  // Load centralized validation utilities if not already available
  if (!window.ValidationUtils) {
    console.warn("[NEXUS] ValidationUtils not available, loading inline...");
    // Inline minimal validation for page context
    window.ValidationUtils = {
      validateAccessibilityLibrariesCore: function (el, options = {}) {
        if (!el) {
          console.log("[VALIDATION] No element provided");
          return null;
        }

        const { verbose = false, useLibraries = true } = options;

        if (verbose) {
          console.group(
            "[VALIDATION] Testing accessibility libraries on: " +
              el.tagName +
              (el.id ? "#" + el.id : "") +
              (el.className ? "." + el.className.replace(/\s+/g, ".") : "")
          );
        }

        const results = {
          element: el,
          libraryResults: {},
          fallbackResults: {},
          comparison: {},
        };

        // Test libraries if enabled
        if (useLibraries) {
          try {
            if (window.DOMAccessibilityAPI) {
              if (verbose)
                console.log("[VALIDATION] ✅ DOMAccessibilityAPI is available");
              results.libraryResults.name =
                window.DOMAccessibilityAPI.computeAccessibleName(el);
              results.libraryResults.description =
                window.DOMAccessibilityAPI.computeAccessibleDescription(el);
              results.libraryResults.role_dom =
                window.DOMAccessibilityAPI.getRole(el);

              if (verbose) {
                console.log("[VALIDATION] DOM API results:", {
                  name: results.libraryResults.name,
                  description: results.libraryResults.description,
                  role: results.libraryResults.role_dom,
                });
              }
            } else {
              if (verbose)
                console.log(
                  "[VALIDATION] ❌ DOMAccessibilityAPI is NOT available"
                );
            }

            if (window.AriaQuery) {
              if (verbose)
                console.log("[VALIDATION] ✅ AriaQuery is available");
              results.libraryResults.role_aria =
                window.AriaQuery.getImplicitRole(el);
              if (verbose) {
                console.log(
                  "[VALIDATION] ARIA Query role:",
                  results.libraryResults.role_aria
                );
              }
            } else {
              if (verbose)
                console.log("[VALIDATION] ❌ AriaQuery is NOT available");
            }
          } catch (error) {
            console.error("[VALIDATION] Error with libraries:", error);
            results.libraryError = error.message;
          }
        }

        if (verbose) {
          console.groupEnd();
        }

        return results;
      },
    };
  }

  // Validation function for individual elements
  function validateAccessibilityLibraries(el) {
    const options = {
      verbose: window.NEXUS_TESTING_MODE.verbose,
      useLibraries: window.NEXUS_TESTING_MODE.useLibraries,
    };
    return window.ValidationUtils.validateAccessibilityLibrariesCore(
      el,
      options
    );
  }

  // Batch validation function
  function batchValidateAccessibility(selector) {
    selector = selector || "*";
    const elements = document.querySelectorAll(selector);
    const batchLimit =
      (typeof window !== "undefined" &&
        window.NexusConstants?.BATCH_LIMITS?.VALIDATION_PAGE_CONTEXT) ||
      10;

    console.log(
      "[BATCH VALIDATION] Testing " +
        Math.min(elements.length, batchLimit) +
        " elements matching: " +
        selector
    );

    const results = [];
    const options = {
      verbose: window.NEXUS_TESTING_MODE.verbose,
      useLibraries: window.NEXUS_TESTING_MODE.useLibraries,
    };

    elements.forEach(function (el, index) {
      if (index < batchLimit) {
        // Limit to prevent spam
        results.push(
          window.ValidationUtils.validateAccessibilityLibrariesCore(el, options)
        );
      }
    });

    return results;
  }

  // Make functions globally available
  window.validateAccessibilityLibraries = validateAccessibilityLibraries;
  window.batchValidateAccessibility = batchValidateAccessibility;

  console.log("[NEXUS] ✅ Validation functions loaded into page context");
  console.log(
    "Available functions: validateAccessibilityLibraries(element), batchValidateAccessibility(selector)"
  );
})();
