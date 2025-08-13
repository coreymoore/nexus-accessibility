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

  // Validation function for individual elements
  function validateAccessibilityLibraries(el) {
    if (!el) {
      console.log("[VALIDATION] No element provided");
      return;
    }

    console.group(
      "[VALIDATION] Testing accessibility libraries on: " +
        el.tagName +
        (el.id ? "#" + el.id : "") +
        (el.className ? "." + el.className.replace(/\s+/g, ".") : "")
    );

    const results = {
      element: el,
      libraryResults: {},
      fallbackResults: {},
      comparison: {},
    };

    // Test libraries
    try {
      if (window.DOMAccessibilityAPI) {
        console.log("[VALIDATION] ✅ DOMAccessibilityAPI is available");
        results.libraryResults.name =
          window.DOMAccessibilityAPI.computeAccessibleName(el);
        results.libraryResults.description =
          window.DOMAccessibilityAPI.computeAccessibleDescription(el);
        results.libraryResults.role_dom =
          window.DOMAccessibilityAPI.getRole(el);
        console.log("[VALIDATION] DOM API results:", {
          name: results.libraryResults.name,
          description: results.libraryResults.description,
          role: results.libraryResults.role_dom,
        });
      } else {
        console.log("[VALIDATION] ❌ DOMAccessibilityAPI is NOT available");
      }

      if (window.AriaQuery) {
        console.log("[VALIDATION] ✅ AriaQuery is available");
        results.libraryResults.role_aria = window.AriaQuery.getImplicitRole(el);
        console.log(
          "[VALIDATION] ARIA Query role:",
          results.libraryResults.role_aria
        );
      } else {
        console.log("[VALIDATION] ❌ AriaQuery is NOT available");
      }
    } catch (error) {
      console.error("[VALIDATION] Error with libraries:", error);
      results.libraryError = error.message;
    }

    console.groupEnd();
    return results;
  }

  // Batch validation function
  function batchValidateAccessibility(selector) {
    selector = selector || "*";
    const elements = document.querySelectorAll(selector);
    console.log(
      "[BATCH VALIDATION] Testing " +
        elements.length +
        " elements matching: " +
        selector
    );

    const results = [];
    elements.forEach(function (el, index) {
      if (index < 10) {
        // Limit to first 10 to avoid spam
        results.push(validateAccessibilityLibraries(el));
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
