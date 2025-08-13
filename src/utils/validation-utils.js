/**
 * Centralized Validation Utilities
 *
 * Consolidates validation logic to eliminate duplication between
 * content-validation.js and libs/validation-functions.js
 */

(function () {
  "use strict";

  /**
   * Core validation logic for accessibility libraries
   * @param {Element} el - Element to test
   * @param {Object} options - Validation options
   * @returns {Object} Validation results
   */
  function validateAccessibilityLibrariesCore(el, options = {}) {
    if (!el) {
      console.log("[VALIDATION] No element provided");
      return null;
    }

    const { verbose = false, useLibraries = true } = options;

    if (verbose) {
      console.group(
        `[VALIDATION] Testing accessibility libraries on: ${el.tagName}${
          el.id ? "#" + el.id : ""
        }${el.className ? "." + el.className.replace(/\s+/g, ".") : ""}`
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
            console.log("[VALIDATION] ❌ DOMAccessibilityAPI is NOT available");
        }

        if (window.AriaQuery) {
          if (verbose) console.log("[VALIDATION] ✅ AriaQuery is available");
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
  }

  /**
   * Batch validation for multiple elements
   * @param {string} selector - CSS selector for elements to test
   * @param {number} limit - Maximum number of elements to test
   * @param {Object} options - Validation options
   * @returns {Array} Array of validation results
   */
  function batchValidateAccessibilityCore(
    selector = "*",
    limit = null,
    options = {}
  ) {
    // Use constants if available
    const defaultLimit =
      (typeof window !== "undefined" &&
        window.NexusConstants?.BATCH_LIMITS?.VALIDATION_DEFAULT) ||
      10;
    const actualLimit = limit || defaultLimit;

    const elements = document.querySelectorAll(selector);
    console.log(
      `[BATCH VALIDATION] Testing ${Math.min(
        elements.length,
        actualLimit
      )} elements matching: ${selector}`
    );

    const results = [];
    const elementsToTest = Array.from(elements).slice(0, actualLimit);

    elementsToTest.forEach((el, index) => {
      results.push(validateAccessibilityLibrariesCore(el, options));
    });

    return results;
  }

  /**
   * Compare validation results between libraries and fallbacks
   * @param {Object} results - Validation results object
   */
  function compareValidationResults(results) {
    // Compare names
    if (
      results.libraryResults.name !== undefined &&
      results.fallbackResults.name !== undefined
    ) {
      results.comparison.nameMatch =
        results.libraryResults.name === results.fallbackResults.name;

      if (!results.comparison.nameMatch) {
        console.warn("[VALIDATION] ⚠️ Name mismatch:", {
          library: results.libraryResults.name,
          fallback: results.fallbackResults.name,
        });
      } else {
        console.log("[VALIDATION] ✅ Name matches");
      }
    }

    // Compare descriptions
    if (
      results.libraryResults.description !== undefined &&
      results.fallbackResults.description !== undefined
    ) {
      results.comparison.descriptionMatch =
        results.libraryResults.description ===
        results.fallbackResults.description;

      if (!results.comparison.descriptionMatch) {
        console.warn("[VALIDATION] ⚠️ Description mismatch:", {
          library: results.libraryResults.description,
          fallback: results.fallbackResults.description,
        });
      } else {
        console.log("[VALIDATION] ✅ Description matches");
      }
    }

    // Compare roles
    const libraryRole =
      results.libraryResults.role_dom || results.libraryResults.role_aria;
    if (libraryRole && results.fallbackResults.role) {
      results.comparison.roleMatch =
        libraryRole === results.fallbackResults.role;

      if (!results.comparison.roleMatch) {
        console.warn("[VALIDATION] ⚠️ Role mismatch:", {
          library: libraryRole,
          fallback: results.fallbackResults.role,
        });
      } else {
        console.log("[VALIDATION] ✅ Role matches");
      }
    }
  }

  // Export to global scope
  if (typeof window !== "undefined") {
    window.ValidationUtils = {
      validateAccessibilityLibrariesCore,
      batchValidateAccessibilityCore,
      compareValidationResults,
    };
  }

  // Export for ES modules
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      validateAccessibilityLibrariesCore,
      batchValidateAccessibilityCore,
      compareValidationResults,
    };
  }
})();
