/**
 * Error Recovery Manager
 *
 * Provides sophisticated error handling and recovery mechanisms
 * for Chrome DevTools Protocol operations.
 */

"use strict";

class ErrorRecoveryManager {
    constructor() {
      this.retryCounters = new Map();
      // Use constants if available, fallback to defaults
      this.maxRetries =
        (typeof window !== "undefined" &&
          window.NexusConstants?.RETRY_ATTEMPTS?.ERROR_RECOVERY_MAX) ||
        3;
      this.backoffBase =
        (typeof window !== "undefined" &&
          window.NexusConstants?.ERROR_RECOVERY?.BACKOFF_BASE) ||
        1000; // 1 second base delay
    }

    /**
     * Execute an operation with automatic retry and error recovery
     * @param {string} operationId - Unique identifier for the operation
     * @param {Function} operation - Async operation to execute
     * @param {Object} options - Recovery options
     * @returns {Promise<any>} Result of the operation
     */
    async executeWithRecovery(operationId, operation, options = {}) {
      const {
        maxRetries = this.maxRetries,
        onError = null,
        shouldRetry = this.defaultShouldRetry,
        backoffMultiplier = (typeof window !== "undefined" &&
          window.NexusConstants?.ERROR_RECOVERY?.BACKOFF_MULTIPLIER) ||
          2,
      } = options;

      let lastError = null;
      let retryCount = this.retryCounters.get(operationId) || 0;

      while (retryCount <= maxRetries) {
        try {
          const result = await operation();

          // Reset retry counter on success
          this.retryCounters.delete(operationId);
          return result;
        } catch (error) {
          lastError = error;

          // Call error handler if provided
          if (onError) {
            try {
              await onError(error, retryCount);
            } catch (handlerError) {
              console.warn("Error in error handler:", handlerError);
            }
          }

          // Check if we should retry
          if (retryCount >= maxRetries || !shouldRetry(error, retryCount)) {
            this.retryCounters.delete(operationId);
            throw error;
          }

          // Calculate backoff delay
          const delay =
            this.backoffBase * Math.pow(backoffMultiplier, retryCount);
          console.warn(
            `Operation ${operationId} failed, retrying in ${delay}ms:`,
            error.message
          );

          await this.delay(delay);
          retryCount++;
          this.retryCounters.set(operationId, retryCount);
        }
      }

      this.retryCounters.delete(operationId);
      throw lastError;
    }

    /**
     * Default retry logic for common Chrome API errors
     */
    defaultShouldRetry(error, retryCount) {
      const message = error.message || "";

      // Don't retry these errors
      if (
        message.includes("not attached") ||
        message.includes("Permission denied") ||
        message.includes("Invalid target") ||
        message.includes("Node not found")
      ) {
        return false;
      }

      // Retry these temporary errors
      if (
        message.includes("timeout") ||
        message.includes("disconnected") ||
        message.includes("Target closed") ||
        message.includes("Connection lost")
      ) {
        return true;
      }

      // Default: retry on first attempt, not on subsequent
      return retryCount === 0;
    }

    /**
     * Delay helper for backoff
     */
    delay(ms) {
      return new Promise((resolve) => {
        if (chrome.alarms) {
          const alarmName = `delay-${Date.now()}-${Math.random()}`;
          chrome.alarms.create(alarmName, { when: Date.now() + ms });
          chrome.alarms.onAlarm.addListener(function listener(alarm) {
            if (alarm.name === alarmName) {
              chrome.alarms.onAlarm.removeListener(listener);
              resolve();
            }
          });
        } else {
          setTimeout(resolve, ms);
        }
      });
    }

    /**
     * Clear all retry counters
     */
    reset() {
      this.retryCounters.clear();
    }

    /**
     * Get retry statistics
     */
    getStats() {
      const stats = {};
      for (const [operationId, count] of this.retryCounters.entries()) {
        stats[operationId] = count;
      }
      return stats;
    }
  }

const errorRecovery = new ErrorRecoveryManager();

// Expose globally for non-module contexts for backward compatibility
try {
  if (typeof window !== "undefined" && !window.errorRecovery) {
    window.errorRecovery = errorRecovery;
  }
} catch (e) {
  // Ignore if running in a worker/service worker without window
}

export { errorRecovery };
