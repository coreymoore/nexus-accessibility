// Debounce Utilities - No Build Process Version
// Exposes window.debounceUtils for use in content scripts

(function () {
  "use strict";

  /**
   * Debounce function execution
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @param {boolean} immediate - Execute immediately on first call
   * @returns {Function} Debounced function
   */
  function debounce(func, wait, immediate = false) {
    let timeout;

    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };

      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);

      if (callNow) func(...args);
    };
  }

  /**
   * Throttle function execution
   * @param {Function} func - Function to throttle
   * @param {number} limit - Throttle limit in milliseconds
   * @returns {Function} Throttled function
   */
  function throttle(func, limit) {
    let inThrottle;

    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  // Debounce with request cancellation
  class DebouncedRequest {
    constructor(
      func,
      delay = (typeof window !== "undefined" &&
        window.NexusConstants?.TIMEOUTS?.DEBOUNCE_DEFAULT) ||
        150
    ) {
      this.func = func;
      this.delay = delay;
      this.timeout = null;
    }

    execute(...args) {
      this.cancel();

      return new Promise((resolve, reject) => {
        this.timeout = setTimeout(async () => {
          try {
            const result = await this.func(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, this.delay);
      });
    }

    cancel() {
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = null;
      }
    }
  }

  // Expose to global scope
  window.debounceUtils = {
    debounce,
    throttle,
    DebouncedRequest,
  };
})();
