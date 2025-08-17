/**
 * Content Script Cache Management
 *
 * This module manages caching for accessibility information and performance optimization.
 * It handles WeakMaps for element data, timer management, and cache cleanup.
 *
 * Dependencies: content-utils.js
 */

(function () {
  "use strict";

  // Ensure our namespace exists
  window.ContentExtension = window.ContentExtension || {};
  const CE = window.ContentExtension;

  // Cache for successful accessibility info lookups (WeakMap to avoid leaks)
  const accessibilityCache = new WeakMap();
  /**
   * Metadata WeakMap storing timestamps for TTL enforcement.
   * Using separate WeakMap keeps primary cache lean while allowing expiry checks.
   */
  const accessibilityCacheMeta = new WeakMap();
  // Default TTL (ms) sourced from constants with safe fallback
  const DEFAULT_CACHE_TTL =
    (typeof window !== "undefined" &&
      window.NexusConstants?.CACHE?.DEFAULT_TTL) ||
    10000; // 10s fallback

  // Track in-flight fetches to prevent duplicate requests
  const inflightRequests = new WeakMap();

  // Timer management
  const refetchTimers = new Map(); // Map of element -> timer ID
  const elementTimerTracker = new WeakMap(); // WeakMap of element -> timer ID for cleanup

  // Pending request tracking
  let pendingAccessibilityRequest = null;

  /**
   * Initialize the cache module
   */
  function initialize() {
    console.log("[ContentExtension.cache] Initializing cache management");
  }

  /**
   * Get cached accessibility information for an element
   * @param {Element} element - The element to get cached info for
   * @returns {Object|null} Cached accessibility info or null
   */
  function getCached(element) {
    const info = accessibilityCache.get(element);
    if (!info) return null;
    const meta = accessibilityCacheMeta.get(element);
    if (meta && Date.now() - meta.timestamp > (meta.ttl || DEFAULT_CACHE_TTL)) {
      // Expired
      accessibilityCache.delete(element);
      accessibilityCacheMeta.delete(element);
      return null;
    }
    return info;
  }

  /**
   * Set cached accessibility information for an element
   * @param {Element} element - The element to cache info for
   * @param {Object} info - The accessibility information to cache
   */
  function setCached(element, info) {
    // Only cache meaningful data
    if (
      info &&
      (info.role !== "(no role)" ||
        info.name !== "(no accessible name)" ||
        Object.keys(info.states || {}).length > 0 ||
        Object.keys(info.ariaProperties || {}).length > 0)
    ) {
      accessibilityCache.set(element, info);
      accessibilityCacheMeta.set(element, {
        timestamp: Date.now(),
        ttl: DEFAULT_CACHE_TTL,
      });
    }
  }

  /**
   * Remove cached accessibility information for an element
   * @param {Element} element - The element to remove from cache
   */
  function deleteCached(element) {
    accessibilityCache.delete(element);
    accessibilityCacheMeta.delete(element);
  }

  /**
   * Check if an element has cached accessibility information
   * @param {Element} element - The element to check
   * @returns {boolean} True if element has cached info
   */
  function hasCached(element) {
    if (!accessibilityCache.has(element)) return false;
    return !!getCached(element);
  }

  /**
   * Get or set in-flight request for an element
   * @param {Element} element - The element
   * @param {Promise} [request] - The request promise to set
   * @returns {Promise|null} Existing request or null
   */
  function getInflightRequest(element, request = undefined) {
    if (request !== undefined) {
      inflightRequests.set(element, request);
      return request;
    }
    return inflightRequests.get(element);
  }

  /**
   * Remove in-flight request for an element
   * @param {Element} element - The element to remove request for
   */
  function deleteInflightRequest(element) {
    inflightRequests.delete(element);
  }

  /**
   * Set a refetch timer for an element
   * @param {Element} element - The element
   * @param {number} timerId - The timer ID
   */
  function setRefetchTimer(element, timerId) {
    // Clear existing timer
    const existingTimer = refetchTimers.get(element);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    refetchTimers.set(element, timerId);
    elementTimerTracker.set(element, timerId);
  }

  /**
   * Get refetch timer for an element
   * @param {Element} element - The element
   * @returns {number|null} Timer ID or null
   */
  function getRefetchTimer(element) {
    return refetchTimers.get(element);
  }

  /**
   * Clear refetch timer for an element
   * @param {Element} element - The element
   */
  function clearRefetchTimer(element) {
    const timerId = refetchTimers.get(element);
    if (timerId) {
      clearTimeout(timerId);
      refetchTimers.delete(element);
      elementTimerTracker.delete(element);
    }
  }

  /**
   * Clear all refetch timers
   */
  function clearAllRefetchTimers() {
    for (const timer of refetchTimers.values()) {
      clearTimeout(timer);
    }
    refetchTimers.clear();
  }

  /**
   * Set pending accessibility request
   * @param {Object} request - The request object with cancellation support
   */
  function setPendingRequest(request) {
    // Cancel existing request
    if (pendingAccessibilityRequest) {
      pendingAccessibilityRequest.cancelled = true;
    }
    pendingAccessibilityRequest = request;
  }

  /**
   * Get current pending accessibility request
   * @returns {Object|null} Current pending request or null
   */
  function getPendingRequest() {
    return pendingAccessibilityRequest;
  }

  /**
   * Clear pending accessibility request
   */
  function clearPendingRequest() {
    if (pendingAccessibilityRequest) {
      pendingAccessibilityRequest.cancelled = true;
      pendingAccessibilityRequest = null;
    }
  }

  /**
   * Create a debounced cache update function
   * @param {Function} updateFunction - The function to execute
   * @param {number} delay - Debounce delay in milliseconds
   * @returns {Function} Debounced function
   */
  function createDebouncedUpdate(
    updateFunction,
    delay = (typeof window !== "undefined" &&
      window.NexusConstants?.TIMEOUTS?.CACHE_UPDATE_DEBOUNCE) ||
      150
  ) {
    const utils = CE.utils;

    if (utils && utils.debounce) {
      return utils.debounce(updateFunction, delay);
    }

    // Fallback to manual debouncing with timers
    return function (element, ...args) {
      clearRefetchTimer(element);

      const timerId = setTimeout(() => {
        try {
          updateFunction(element, ...args);
        } catch (error) {
          console.error(
            "[ContentExtension.cache] Error in debounced update:",
            error
          );
        }
      }, delay);

      setRefetchTimer(element, timerId);
    };
  }

  /**
   * Invalidate cache for elements matching a condition
   * @param {Function} predicate - Function to test elements
   */
  function invalidateWhere(predicate) {
    // WeakMap doesn't have iteration, so we can't implement this efficiently
    // This is a placeholder for potential future enhancement
    console.warn(
      "[ContentExtension.cache] invalidateWhere not implemented for WeakMap"
    );
  }

  /**
   * Get cache statistics (for debugging)
   * @returns {Object} Cache statistics
   */
  function getStats() {
    return {
      refetchTimersCount: refetchTimers.size,
      hasPendingRequest: !!pendingAccessibilityRequest,
      // Note: WeakMap doesn't expose size
    };
  }

  /**
   * Clean up all cache data and timers
   */
  function cleanup() {
    console.log("[ContentExtension.cache] Cleaning up cache");

    // Clear all timers
    clearAllRefetchTimers();

    // Clear pending request
    clearPendingRequest();

    // Note: WeakMaps will be garbage collected when elements are removed from DOM
  }

  /**
   * Handle state change (extension enabled/disabled)
   * @param {boolean} enabled - Whether extension is enabled
   */
  function onStateChange(enabled) {
    if (!enabled) {
      // Clear all pending operations when disabled
      clearAllRefetchTimers();
      clearPendingRequest();
    }
  }

  // Export the cache module
  CE.cache = {
    initialize,
    cleanup,
    onStateChange,

    // Cache operations
    getCached,
    setCached,
    deleteCached,
    hasCached,

    // In-flight request management
    getInflightRequest,
    deleteInflightRequest,

    // Timer management
    setRefetchTimer,
    getRefetchTimer,
    clearRefetchTimer,
    clearAllRefetchTimers,

    // Pending request management
    setPendingRequest,
    getPendingRequest,
    clearPendingRequest,

    // Utilities
    createDebouncedUpdate,
    invalidateWhere,
    getStats,
  };

  console.log("[ContentExtension.cache] Module loaded");
})();
