/**
 * Error Recovery Manager (Module variant for background/service worker)
 *
 * This file exports `errorRecovery` as an ES module for use in background
 * scripts that run with `type: "module"` (service worker). The page-injectable
 * script `src/utils/errorRecovery.js` is intentionally non-module to avoid
 * parse-time `export` SyntaxErrors when injected as a classic script.
 */

"use strict";

class ErrorRecoveryManager {
  constructor() {
    this.retryCounters = new Map();
    this.maxRetries =
      (typeof globalThis !== "undefined" &&
        globalThis.NexusConstants?.RETRY_ATTEMPTS?.ERROR_RECOVERY_MAX) ||
      3;
    this.backoffBase =
      (typeof globalThis !== "undefined" &&
        globalThis.NexusConstants?.ERROR_RECOVERY?.BACKOFF_BASE) ||
      1000; // 1 second base delay
  }

  async executeWithRecovery(operationId, operation, options = {}) {
    const {
      maxRetries = this.maxRetries,
      onError = null,
      shouldRetry = this.defaultShouldRetry,
      backoffMultiplier =
        (typeof globalThis !== "undefined" &&
          globalThis.NexusConstants?.ERROR_RECOVERY?.BACKOFF_MULTIPLIER) ||
        2,
    } = options;

    let lastError = null;
    let retryCount = this.retryCounters.get(operationId) || 0;

    while (retryCount <= maxRetries) {
      try {
        const result = await operation();
        this.retryCounters.delete(operationId);
        return result;
      } catch (error) {
        lastError = error;
        if (onError) {
          try {
            await onError(error, retryCount);
          } catch (handlerError) {
            console.warn("Error in error handler:", handlerError);
          }
        }

        if (retryCount >= maxRetries || !shouldRetry(error, retryCount)) {
          this.retryCounters.delete(operationId);
          throw error;
        }

        const delay = this.backoffBase * Math.pow(backoffMultiplier, retryCount);
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

  defaultShouldRetry(error, retryCount) {
    const message = error.message || "";

    if (
      message.includes("not attached") ||
      message.includes("Permission denied") ||
      message.includes("Invalid target") ||
      message.includes("Node not found")
    ) {
      return false;
    }

    if (
      message.includes("timeout") ||
      message.includes("disconnected") ||
      message.includes("Target closed") ||
      message.includes("Connection lost")
    ) {
      return true;
    }

    return retryCount === 0;
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  reset() {
    this.retryCounters.clear();
  }

  getStats() {
    const stats = {};
    for (const [operationId, count] of this.retryCounters.entries()) {
      stats[operationId] = count;
    }
    return stats;
  }
}

export const errorRecovery = new ErrorRecoveryManager();
