/**
 * Application Constants
 *
 * Centralized constants for timeouts, retry attempts, and other magic numbers
 * used throughout the accessibility extension.
 */

(function () {
  "use strict";

  const CONSTANTS = {
    // Retry configurations
    RETRY_ATTEMPTS: {
      ACCESSIBILITY_UPDATE: 8,
      DEBUGGER_CONNECTION: 3,
      ERROR_RECOVERY_MAX: 3,
    },

    // Timeout delays (in milliseconds)
    TIMEOUTS: {
      LIBRARY_CHECK_DELAY: 100,
      ACCESSIBILITY_RETRY_BASE: 50,
      EXPONENTIAL_BACKOFF_BASE: 100,
      DEBOUNCE_DEFAULT: 150,
      CACHE_UPDATE_DEBOUNCE: 150,
      PERFORMANCE_MONITOR_INTERVAL: 1000,
      DEBUGGER_STABILITY_TEST_DELAY: 100,
    },

    // Performance thresholds (in milliseconds)
    PERFORMANCE_THRESHOLDS: {
      INSPECTOR_DISPLAY: 100,
      DEBUGGER_ATTACH: 2000,
      AX_TREE_RETRIEVAL: 1000,
      NODE_QUERY: 500,
    },

    // Memory thresholds
    MEMORY_LIMITS: {
      GROWTH_WARNING_BYTES: 50 * 1024 * 1024, // 50MB
      GROWTH_WARNING_PERCENT: 50,
    },

    // Batch processing limits
    BATCH_LIMITS: {
      VALIDATION_DEFAULT: 10,
      VALIDATION_PAGE_CONTEXT: 10,
      ELEMENTS_MAX: 5,
    },

    // Rate limiting
    RATE_LIMITS: {
      MAX_REQUESTS_DEFAULT: 100,
      WINDOW_MS_DEFAULT: 60000, // 1 minute
    },

    // Error recovery
    ERROR_RECOVERY: {
      BACKOFF_BASE: 1000, // 1 second
      BACKOFF_MULTIPLIER: 2,
    },
  };

  // Export to global scope for content scripts
  if (typeof window !== "undefined") {
    window.NexusConstants = CONSTANTS;
  }

  // Export for ES modules
  if (typeof module !== "undefined" && module.exports) {
    module.exports = CONSTANTS;
  }

  // Export for AMD
  if (typeof define === "function" && define.amd) {
    define([], function () {
      return CONSTANTS;
    });
  }
})();
