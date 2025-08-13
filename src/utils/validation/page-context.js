/**
 * Page Context Validation
 *
 * Validation functions specifically designed for injection into page context.
 * This module provides the global functions used by test pages.
 */

(function () {
  "use strict";

  // Set up testing mode
  window.NEXUS_TESTING_MODE = window.NEXUS_TESTING_MODE || {
    useLibraries: true,
    verbose: false,
  };

  // Load validation core if not already available
  if (!window.ValidationCore) {
    console.warn("[NEXUS] ValidationCore not available in page context");
    return;
  }

  /**
   * Validation function for individual elements (page context)
   * @param {Element} el - Element to validate
   * @returns {Object} Validation results
   */
  function validateAccessibilityLibraries(el) {
    const options = {
      verbose: window.NEXUS_TESTING_MODE.verbose,
      useLibraries: window.NEXUS_TESTING_MODE.useLibraries,
    };
    return window.ValidationCore.validateAccessibilityLibrariesCore(el, options);
  }

  /**
   * Batch validation function (page context)
   * @param {string} selector - CSS selector for elements to test
   * @param {number} limit - Maximum number of elements to test
   * @returns {Array} Array of validation results
   */
  function batchValidateAccessibility(selector = "*", limit = null) {
    const actualLimit = limit || 
      (window.NexusConstants?.BATCH_LIMITS?.VALIDATION_PAGE_CONTEXT || 10);
    
    console.log(
      `[BATCH VALIDATION] Testing up to ${actualLimit} elements matching: ${selector}`
    );

    const options = {
      verbose: window.NEXUS_TESTING_MODE.verbose,
      useLibraries: window.NEXUS_TESTING_MODE.useLibraries,
    };

    return window.ValidationCore.batchValidateAccessibilityCore(
      selector,
      actualLimit,
      options
    );
  }

  // Make functions globally available
  window.validateAccessibilityLibraries = validateAccessibilityLibraries;
  window.batchValidateAccessibility = batchValidateAccessibility;

  console.log("[NEXUS] ✅ Page context validation functions loaded");
  console.log(
    "Available functions: validateAccessibilityLibraries(element), batchValidateAccessibility(selector, limit)"
  );
})();
