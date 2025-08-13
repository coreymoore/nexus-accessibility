/**
 * Content Script Validation and Testing
 *
 * This module provides validation and testing utilities for the accessibility extension.
 * It includes library validation, batch testing, and debugging functions.
 * This module is optional and used primarily for development and testing.
 *
 * Dependencies: content-utils.js, content-accessibility.js, validation/core.js
 */

(function () {
  "use strict";

  // Ensure our namespace exists
  window.ContentExtension = window.ContentExtension || {};
  const CE = window.ContentExtension;

  // Testing mode configuration
  window.NEXUS_TESTING_MODE = window.NEXUS_TESTING_MODE || {
    useLibraries: true, // Set to false to test without libraries
    verbose: false, // Set to true for detailed logging
  };

  /**
   * Initialize the validation module
   */
  function initialize() {
    console.log(
      "[ContentExtension.validation] Initializing validation and testing"
    );

    // Check if libraries are loaded
    setTimeout(() => {
      checkLibraryAvailability();
      injectLibrariesIntoPageContext();
    }, window.NexusConstants?.TIMEOUTS?.LIBRARY_CHECK_DELAY || 100);
  }

  /**
   * Check availability of accessibility libraries
   */
  function checkLibraryAvailability() {
    console.log("[NEXUS DEBUG] Checking library availability:");
    console.log("  DOMAccessibilityAPI:", typeof window.DOMAccessibilityAPI);
    console.log("  AriaQuery:", typeof window.AriaQuery);
    console.log(
      "  validateAccessibilityLibraries:",
      typeof window.validateAccessibilityLibraries
    );
    console.log("  NEXUS_TESTING_MODE:", window.NEXUS_TESTING_MODE);

    if (window.DOMAccessibilityAPI) {
      console.log(
        "  DOMAccessibilityAPI functions:",
        Object.keys(window.DOMAccessibilityAPI)
      );
    }
    if (window.AriaQuery) {
      console.log("  AriaQuery functions:", Object.keys(window.AriaQuery));
    }
  }

  /**
   * Validate accessibility libraries against fallback functions
   * @param {Element} el - Element to test
   * @returns {Object} Validation results
   */
  function validateAccessibilityLibraries(el) {
    if (!el) {
      console.log("[VALIDATION] No element provided");
      return null;
    }

    console.group(
      `[VALIDATION] Testing accessibility libraries on: ${el.tagName}${
        el.id ? "#" + el.id : ""
      }${el.className ? "." + el.className.replace(/\s+/g, ".") : ""}`
    );

    // Use centralized validation core
    let results;
    if (window.ValidationCore) {
      results = window.ValidationCore.validateAccessibilityLibrariesCore(el, {
        verbose: true,
        useLibraries: window.NEXUS_TESTING_MODE?.useLibraries !== false,
      });
    } else if (window.ValidationUtils) {
      // Fallback to legacy ValidationUtils for backward compatibility
      results = window.ValidationUtils.validateAccessibilityLibrariesCore(el, {
        verbose: true,
        useLibraries: window.NEXUS_TESTING_MODE?.useLibraries !== false,
      });
    } else {
      // Fallback for when validation modules aren't loaded
      console.warn("[VALIDATION] No validation modules available");
      results = {
        element: el,
        libraryResults: {},
        fallbackResults: {},
        comparison: {},
      };
    }

    // Test fallback functions
    try {
      if (CE.accessibility) {
        results.fallbackResults.name =
          CE.accessibility.computeFallbackAccessibleName(el);
        results.fallbackResults.description =
          CE.accessibility.computeFallbackDescription(el);
        results.fallbackResults.role = CE.accessibility.computeFallbackRole(el);
        console.log("[VALIDATION] Fallback results:", results.fallbackResults);
      } else {
        console.warn("[VALIDATION] Accessibility module not available");
      }
    } catch (error) {
      console.error("[VALIDATION] Error with fallbacks:", error);
      results.fallbackError = error.message;
    }

    // Compare results using centralized logic
    if (window.ValidationCore) {
      window.ValidationCore.compareValidationResults(results);
    } else if (window.ValidationUtils) {
      window.ValidationUtils.compareValidationResults(results);
    } else {
      compareValidationResults(results);
    }

    // Test the production function
    if (CE.accessibility && CE.accessibility.getLocalAccessibleInfo) {
      console.log("[VALIDATION] Testing production getLocalAccessibleInfo:");
      const prodResult = CE.accessibility.getLocalAccessibleInfo(el);
      console.log("[VALIDATION] Production result:", prodResult);
    }

    console.groupEnd();
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

  /**
   * Batch validate multiple elements
   * @param {string} selector - CSS selector for elements to test
   * @param {number} limit - Maximum number of elements to test
   * @returns {Array} Array of validation results
   */
  function batchValidateAccessibility(
    selector = "*",
    limit = window.NexusConstants?.BATCH_LIMITS?.VALIDATION_DEFAULT || 10
  ) {
    // Use centralized validation core
    if (window.ValidationCore) {
      return window.ValidationCore.batchValidateAccessibilityCore(
        selector,
        limit,
        {
          verbose: window.NEXUS_TESTING_MODE?.verbose || false,
          useLibraries: window.NEXUS_TESTING_MODE?.useLibraries !== false,
        }
      );
    } else if (window.ValidationUtils) {
      // Fallback to legacy ValidationUtils for backward compatibility
      return window.ValidationUtils.batchValidateAccessibilityCore(
        selector,
        limit,
        {
          verbose: window.NEXUS_TESTING_MODE?.verbose || false,
          useLibraries: window.NEXUS_TESTING_MODE?.useLibraries !== false,
        }
      );
    }

    // Fallback implementation
    const elements = document.querySelectorAll(selector);
    console.log(
      `[BATCH VALIDATION] Testing ${Math.min(
        elements.length,
        limit
      )} elements matching: ${selector}`
    );

    const results = [];
    const elementsToTest = Array.from(elements).slice(0, limit);

    elementsToTest.forEach((el, index) => {
      results.push(validateAccessibilityLibraries(el));
    });

    return results;
  }

  /**
   * Inject accessibility libraries into page context
   */
  function injectLibrariesIntoPageContext() {
    try {
      // Inject DOM accessibility API
      const domApiScript = document.createElement("script");
      domApiScript.src = chrome.runtime.getURL(
        "src/libs/dom-accessibility-api.js"
      );
      domApiScript.onload = () => {
        console.log("[NEXUS] DOMAccessibilityAPI injected into page context");

        // After DOM API loads, inject ARIA Query
        injectAriaQuery();
      };
      domApiScript.onerror = (error) => {
        console.error("[NEXUS] Failed to load DOMAccessibilityAPI:", error);
      };

      (document.head || document.documentElement).appendChild(domApiScript);
    } catch (error) {
      console.error(
        "[NEXUS] Failed to inject DOM API into page context:",
        error
      );
    }
  }

  /**
   * Inject ARIA Query library
   */
  function injectAriaQuery() {
    try {
      const ariaScript = document.createElement("script");
      ariaScript.src = chrome.runtime.getURL("src/libs/aria-query.js");
      ariaScript.onload = () => {
        console.log("[NEXUS] AriaQuery injected into page context");
        injectValidationFunctions();
      };
      ariaScript.onerror = (error) => {
        console.error("[NEXUS] Failed to load AriaQuery:", error);
      };

      (document.head || document.documentElement).appendChild(ariaScript);
    } catch (error) {
      console.error(
        "[NEXUS] Failed to inject ARIA Query into page context:",
        error
      );
    }
  }

  /**
   * Inject validation functions into page context
   */
  function injectValidationFunctions() {
    try {
      // First inject the validation core
      const validationCoreScript = document.createElement("script");
      validationCoreScript.src = chrome.runtime.getURL(
        "src/utils/validation/core.js"
      );
      validationCoreScript.onload = () => {
        console.log("[NEXUS] ValidationCore injected into page context");

        // Then inject the page context validation functions
        const pageContextScript = document.createElement("script");
        pageContextScript.src = chrome.runtime.getURL(
          "src/utils/validation/page-context.js"
        );
        pageContextScript.onload = () => {
          console.log("[NEXUS] Page context validation functions injected");
        };
        pageContextScript.onerror = (error) => {
          console.error("[NEXUS] Failed to load page context validation:", error);
          // Fallback to legacy validation functions
          injectLegacyValidationFunctions();
        };
        (document.head || document.documentElement).appendChild(pageContextScript);
      };
      validationCoreScript.onerror = (error) => {
        console.error("[NEXUS] Failed to load ValidationCore:", error);
        // Fallback to legacy validation functions
        injectLegacyValidationFunctions();
      };

      (document.head || document.documentElement).appendChild(validationCoreScript);
    } catch (error) {
      console.error(
        "[NEXUS] Failed to inject validation functions into page context:",
        error
      );
      // Fallback to legacy validation functions
      injectLegacyValidationFunctions();
    }
  }

  /**
   * Inject legacy validation functions (fallback)
   */
  function injectLegacyValidationFunctions() {
    try {
      // Inject legacy validation utilities first
      const validationUtilsScript = document.createElement("script");
      validationUtilsScript.src = chrome.runtime.getURL(
        "src/utils/validation-utils.js"
      );
      validationUtilsScript.onload = () => {
        console.log("[NEXUS] Legacy ValidationUtils injected into page context");

        // Then inject the legacy validation functions
        const validationScript = document.createElement("script");
        validationScript.src = chrome.runtime.getURL(
          "src/libs/validation-functions.js"
        );
        validationScript.onload = () => {
          console.log("[NEXUS] Legacy validation functions injected into page context");
        };
        validationScript.onerror = (error) => {
          console.error("[NEXUS] Failed to load legacy validation functions:", error);
        };
        (document.head || document.documentElement).appendChild(validationScript);
      };
      validationUtilsScript.onerror = (error) => {
        console.error("[NEXUS] Failed to load legacy ValidationUtils:", error);
      };

      (document.head || document.documentElement).appendChild(validationUtilsScript);
    } catch (error) {
      console.error(
        "[NEXUS] Failed to inject legacy validation functions:",
        error
      );
    }
  }  /**
   * Test accessibility info retrieval for current focused element
   * @returns {Promise<Object>} Test results
   */
  async function testCurrentElement() {
    const focusState = CE.events ? CE.events.getFocusState() : {};
    const { lastFocusedElement } = focusState;
    const element = lastFocusedElement || document.activeElement;

    if (!element || element === document.body) {
      console.warn("[VALIDATION] No suitable element to test");
      return null;
    }

    console.group("[VALIDATION] Testing current element");

    try {
      // Test validation
      const validationResult = validateAccessibilityLibraries(element);

      // Test actual accessibility info retrieval
      if (CE.accessibility && CE.accessibility.getAccessibleInfo) {
        const accessibilityInfo = await CE.accessibility.getAccessibleInfo(
          element,
          true
        );
        console.log("[VALIDATION] Live accessibility info:", accessibilityInfo);

        return {
          element,
          validation: validationResult,
          liveInfo: accessibilityInfo,
        };
      }
    } catch (error) {
      console.error("[VALIDATION] Error testing current element:", error);
    } finally {
      console.groupEnd();
    }

    return null;
  }

  /**
   * Run comprehensive validation suite
   * @param {Object} options - Test options
   * @returns {Object} Comprehensive test results
   */
  function runValidationSuite(options = {}) {
    const {
      testCurrentElement: shouldTestCurrent = true,
      batchSelector = "button, input, a, [role]",
      batchLimit = window.NexusConstants?.BATCH_LIMITS?.ELEMENTS_MAX || 5,
    } = options;

    console.group("[VALIDATION SUITE] Running comprehensive validation");

    const results = {
      timestamp: new Date().toISOString(),
      libraryStatus: {
        domApi: typeof window.DOMAccessibilityAPI,
        ariaQuery: typeof window.AriaQuery,
      },
      tests: {},
    };

    // Test current element if requested
    if (shouldTestCurrent) {
      testCurrentElement().then((currentResult) => {
        results.tests.currentElement = currentResult;
        console.log("[VALIDATION SUITE] Current element test completed");
      });
    }

    // Run batch validation
    try {
      results.tests.batchValidation = batchValidateAccessibility(
        batchSelector,
        batchLimit
      );
      console.log("[VALIDATION SUITE] Batch validation completed");
    } catch (error) {
      console.error("[VALIDATION SUITE] Batch validation failed:", error);
      results.tests.batchValidation = { error: error.message };
    }

    console.groupEnd();
    return results;
  }

  /**
   * Clean up validation module
   */
  function cleanup() {
    console.log("[ContentExtension.validation] Cleaning up validation module");
    // Nothing specific to clean up for validation module
  }

  /**
   * Handle state change (extension enabled/disabled)
   * @param {boolean} enabled - Whether extension is enabled
   */
  function onStateChange(enabled) {
    // Validation module doesn't need to respond to state changes
  }

  // Conditionally expose validation functions globally based on environment
  if (window.EnvironmentConfig?.isDevelopmentMode?.() !== false) {
    // Default to exposing in development mode or when environment can't be determined
    window.validateAccessibilityLibraries = validateAccessibilityLibraries;
    window.batchValidateAccessibility = batchValidateAccessibility;
    console.log("[VALIDATION] Debug functions exposed globally");
  } else {
    console.log("[VALIDATION] Production mode - debug functions not exposed");
  }

  // Export the validation module
  CE.validation = {
    initialize,
    cleanup,
    onStateChange,

    // Main validation functions
    validateAccessibilityLibraries,
    batchValidateAccessibility,
    runValidationSuite,
    testCurrentElement,

    // Utility functions
    checkLibraryAvailability,
    injectLibrariesIntoPageContext,
    injectValidationFunctions,
    injectLegacyValidationFunctions,
    compareValidationResults,

    // Testing mode
    getTestingMode: () => window.NEXUS_TESTING_MODE,
    setTestingMode: (mode) => {
      window.NEXUS_TESTING_MODE = { ...window.NEXUS_TESTING_MODE, ...mode };
    },
  };

  console.log("[ContentExtension.validation] Module loaded");
})();
