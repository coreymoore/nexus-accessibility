/**
 * Enhanced Constants Management
 *
 * Provides centralized configuration loading from JSON file with fallbacks
 * to hardcoded constants for backward compatibility.
 */

(function () {
  "use strict";

  // Fallback constants (same as before for backward compatibility)
  const FALLBACK_CONSTANTS = {
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
      TOOLTIP_DISPLAY: 100,
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

    // Security limits
    SECURITY: {
      MAX_SELECTOR_LENGTH: 1000,
      MAX_MESSAGE_SIZE: 10000,
      MAX_CACHE_KEY_LENGTH: 500,
      MAX_LOG_MESSAGE_LENGTH: 5000,
    },

    // Cache configuration
    CACHE: {
      DEFAULT_TTL: 30000,
      MAX_ENTRIES: 500,
      CLEANUP_INTERVAL: 60000,
    },
  };

  /**
   * Transform JSON config to match existing constant structure
   * @param {Object} config - JSON configuration
   * @returns {Object} Transformed constants
   */
  function transformConfig(config) {
    return {
      RETRY_ATTEMPTS: {
        ACCESSIBILITY_UPDATE: config.retryAttempts?.accessibilityUpdate || FALLBACK_CONSTANTS.RETRY_ATTEMPTS.ACCESSIBILITY_UPDATE,
        DEBUGGER_CONNECTION: config.retryAttempts?.debuggerConnection || FALLBACK_CONSTANTS.RETRY_ATTEMPTS.DEBUGGER_CONNECTION,
        ERROR_RECOVERY_MAX: config.retryAttempts?.errorRecoveryMax || FALLBACK_CONSTANTS.RETRY_ATTEMPTS.ERROR_RECOVERY_MAX,
      },

      TIMEOUTS: {
        LIBRARY_CHECK_DELAY: config.timeouts?.libraryCheckDelay || FALLBACK_CONSTANTS.TIMEOUTS.LIBRARY_CHECK_DELAY,
        ACCESSIBILITY_RETRY_BASE: config.timeouts?.accessibilityRetryBase || FALLBACK_CONSTANTS.TIMEOUTS.ACCESSIBILITY_RETRY_BASE,
        EXPONENTIAL_BACKOFF_BASE: config.timeouts?.exponentialBackoffBase || FALLBACK_CONSTANTS.TIMEOUTS.EXPONENTIAL_BACKOFF_BASE,
        DEBOUNCE_DEFAULT: config.timeouts?.debounceDefault || FALLBACK_CONSTANTS.TIMEOUTS.DEBOUNCE_DEFAULT,
        CACHE_UPDATE_DEBOUNCE: config.timeouts?.cacheUpdateDebounce || FALLBACK_CONSTANTS.TIMEOUTS.CACHE_UPDATE_DEBOUNCE,
        PERFORMANCE_MONITOR_INTERVAL: config.timeouts?.performanceMonitorInterval || FALLBACK_CONSTANTS.TIMEOUTS.PERFORMANCE_MONITOR_INTERVAL,
        DEBUGGER_STABILITY_TEST_DELAY: config.timeouts?.debuggerStabilityTestDelay || FALLBACK_CONSTANTS.TIMEOUTS.DEBUGGER_STABILITY_TEST_DELAY,
      },

      PERFORMANCE_THRESHOLDS: {
        TOOLTIP_DISPLAY: config.performanceThresholds?.tooltipDisplay || FALLBACK_CONSTANTS.PERFORMANCE_THRESHOLDS.TOOLTIP_DISPLAY,
        DEBUGGER_ATTACH: config.performanceThresholds?.debuggerAttach || FALLBACK_CONSTANTS.PERFORMANCE_THRESHOLDS.DEBUGGER_ATTACH,
        AX_TREE_RETRIEVAL: config.performanceThresholds?.axTreeRetrieval || FALLBACK_CONSTANTS.PERFORMANCE_THRESHOLDS.AX_TREE_RETRIEVAL,
        NODE_QUERY: config.performanceThresholds?.nodeQuery || FALLBACK_CONSTANTS.PERFORMANCE_THRESHOLDS.NODE_QUERY,
      },

      MEMORY_LIMITS: {
        GROWTH_WARNING_BYTES: config.memoryLimits?.growthWarningBytes || FALLBACK_CONSTANTS.MEMORY_LIMITS.GROWTH_WARNING_BYTES,
        GROWTH_WARNING_PERCENT: config.memoryLimits?.growthWarningPercent || FALLBACK_CONSTANTS.MEMORY_LIMITS.GROWTH_WARNING_PERCENT,
      },

      BATCH_LIMITS: {
        VALIDATION_DEFAULT: config.batchLimits?.validationDefault || FALLBACK_CONSTANTS.BATCH_LIMITS.VALIDATION_DEFAULT,
        VALIDATION_PAGE_CONTEXT: config.batchLimits?.validationPageContext || FALLBACK_CONSTANTS.BATCH_LIMITS.VALIDATION_PAGE_CONTEXT,
        ELEMENTS_MAX: config.batchLimits?.elementsMax || FALLBACK_CONSTANTS.BATCH_LIMITS.ELEMENTS_MAX,
      },

      SECURITY: {
        MAX_SELECTOR_LENGTH: config.security?.maxSelectorLength || FALLBACK_CONSTANTS.SECURITY.MAX_SELECTOR_LENGTH,
        MAX_MESSAGE_SIZE: config.security?.maxMessageSize || FALLBACK_CONSTANTS.SECURITY.MAX_MESSAGE_SIZE,
        MAX_CACHE_KEY_LENGTH: config.security?.maxCacheKeyLength || FALLBACK_CONSTANTS.SECURITY.MAX_CACHE_KEY_LENGTH,
        MAX_LOG_MESSAGE_LENGTH: config.security?.maxLogMessageLength || FALLBACK_CONSTANTS.SECURITY.MAX_LOG_MESSAGE_LENGTH,
      },

      CACHE: {
        DEFAULT_TTL: config.cache?.defaultTtl || FALLBACK_CONSTANTS.CACHE.DEFAULT_TTL,
        MAX_ENTRIES: config.cache?.maxEntries || FALLBACK_CONSTANTS.CACHE.MAX_ENTRIES,
        CLEANUP_INTERVAL: config.cache?.cleanupInterval || FALLBACK_CONSTANTS.CACHE.CLEANUP_INTERVAL,
      },
    };
  }

  /**
   * Load configuration asynchronously
   * @returns {Promise<Object>} Configuration constants
   */
  async function loadConfig() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        // In extension context, load from extension resources
        const configUrl = chrome.runtime.getURL('config.json');
        const response = await fetch(configUrl);
        if (response.ok) {
          const config = await response.json();
          console.log('[CONSTANTS] Configuration loaded from config.json');
          return transformConfig(config);
        }
      }
    } catch (error) {
      console.warn('[CONSTANTS] Failed to load config.json, using fallback constants:', error);
    }

    console.log('[CONSTANTS] Using fallback constants');
    return FALLBACK_CONSTANTS;
  }

  // Initialize constants
  let constantsPromise = null;
  let cachedConstants = null;

  /**
   * Get constants (loads asynchronously on first call)
   * @returns {Promise<Object>} Configuration constants
   */
  function getConstants() {
    if (cachedConstants) {
      return Promise.resolve(cachedConstants);
    }

    if (!constantsPromise) {
      constantsPromise = loadConfig().then(constants => {
        cachedConstants = constants;
        return constants;
      });
    }

    return constantsPromise;
  }

  /**
   * Get constants synchronously (returns fallback if not loaded)
   * @returns {Object} Configuration constants
   */
  function getConstantsSync() {
    return cachedConstants || FALLBACK_CONSTANTS;
  }

  // Set up global constants for backward compatibility
  if (typeof window !== "undefined") {
    // Start loading constants immediately
    getConstants().then(constants => {
      window.NexusConstants = constants;
      console.log('[CONSTANTS] NexusConstants loaded globally');
    });

    // Provide immediate access to fallback constants
    window.NexusConstants = FALLBACK_CONSTANTS;

    // Export enhanced constants management
    window.NexusConfig = {
      getConstants,
      getConstantsSync,
      loadConfig,
      FALLBACK_CONSTANTS,
    };
  }

  // Export for ES modules
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      getConstants,
      getConstantsSync,
      loadConfig,
      FALLBACK_CONSTANTS,
    };
  }

  console.log('[CONSTANTS] Enhanced constants management loaded');
})();
