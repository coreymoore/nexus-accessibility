/**
 * Core Validation Logic
 *
 * Consolidated validation logic to eliminate duplication between
 * content-validation.js and libs/validation-functions.js
 */

(function () {
  "use strict";

  /**
   * @typedef {Object} ValidationOptions
   * @property {boolean} [verbose=false] - Enable verbose logging
   * @property {boolean} [useLibraries=true] - Use accessibility libraries for validation
   */

  /**
   * @typedef {Object} LibraryResults
   * @property {string} [name] - Accessible name from library
   * @property {string} [description] - Accessible description from library
   * @property {string} [role_dom] - Role from DOM accessibility API
   * @property {string} [role_aria] - Role from ARIA query library
   */

  /**
   * @typedef {Object} FallbackResults
   * @property {string} [name] - Accessible name from fallback computation
   * @property {string} [description] - Accessible description from fallback computation
   * @property {string} [role] - Role from fallback computation
   */

  /**
   * @typedef {Object} ComparisonResult
   * @property {boolean} match - Whether library and fallback results match
   * @property {*} library - Result from library
   * @property {*} fallback - Result from fallback
   */

  /**
   * @typedef {Object} ComparisonResults
   * @property {ComparisonResult} [name] - Name comparison results
   * @property {ComparisonResult} [description] - Description comparison results
   * @property {ComparisonResult} [role] - Role comparison results
   */

  /**
   * @typedef {Object} ValidationResult
   * @property {Element} element - The validated element
   * @property {LibraryResults} libraryResults - Results from accessibility libraries
   * @property {FallbackResults} fallbackResults - Results from fallback computations
   * @property {ComparisonResults} comparison - Comparison between library and fallback results
   * @property {string} [libraryError] - Error message if library validation failed
   * @property {string} [fallbackError] - Error message if fallback validation failed
   */

  /**
   * Core validation logic for accessibility libraries
   * @param {Element} el - Element to test
   * @param {ValidationOptions} [options={}] - Validation options
   * @returns {ValidationResult|null} Validation results or null if no element provided
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
   * @param {string} [selector="*"] - CSS selector for elements to test
   * @param {number|null} [limit=null] - Maximum number of elements to test
   * @param {ValidationOptions} [options={}] - Validation options
   * @returns {ValidationResult[]} Array of validation results
   */
  function batchValidateAccessibilityCore(
    selector = "*",
    limit = null,
    options = {}
  ) {
    // Validate selector for security if SecurityUtils is available
    if (typeof window !== "undefined" && window.SecurityUtils) {
      const validation = window.SecurityUtils.validateSelector(selector);
      if (!validation.valid) {
        console.error(
          `[BATCH VALIDATION] Invalid selector: ${validation.reason}`
        );
        return [];
      }
    }

    // Use constants if available
    const defaultLimit =
      (typeof window !== "undefined" &&
        window.NexusConstants?.BATCH_LIMITS?.VALIDATION_DEFAULT) ||
      10;
    const actualLimit = limit || defaultLimit;

    let elements;
    try {
      elements = document.querySelectorAll(selector);
    } catch (error) {
      console.error(
        `[BATCH VALIDATION] Invalid selector syntax: ${selector}`,
        error
      );
      return [];
    }

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
   * @param {ValidationResult} results - Validation results object to modify
   * @returns {void}
   */
  function compareValidationResults(results) {
    if (!results || !results.libraryResults || !results.fallbackResults) {
      return;
    }

    const { libraryResults, fallbackResults } = results;
    const comparison = {};

    // Compare names
    if (
      libraryResults.name !== undefined &&
      fallbackResults.name !== undefined
    ) {
      comparison.name = {
        match: libraryResults.name === fallbackResults.name,
        library: libraryResults.name,
        fallback: fallbackResults.name,
      };
    }

    // Compare descriptions
    if (
      libraryResults.description !== undefined &&
      fallbackResults.description !== undefined
    ) {
      comparison.description = {
        match: libraryResults.description === fallbackResults.description,
        library: libraryResults.description,
        fallback: fallbackResults.description,
      };
    }

    // Compare roles
    const libraryRole = libraryResults.role_dom || libraryResults.role_aria;
    if (libraryRole !== undefined && fallbackResults.role !== undefined) {
      comparison.role = {
        match: libraryRole === fallbackResults.role,
        library: libraryRole,
        fallback: fallbackResults.role,
      };
    }

    results.comparison = comparison;

    // Log comparison results
    console.log("[VALIDATION] Comparison results:", comparison);
  }

  // Export to global scope
  if (typeof window !== "undefined") {
    window.ValidationCore = {
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
