// Error Handler Utility - No Build Process Version
// Exposes window.ErrorHandler for use in content scripts

(function() {
  'use strict';

  class ErrorHandler {
    constructor() {
      this.errors = [];
      this.maxErrors = 50;
      this.listeners = [];
    }

    log(error, context = '') {
      const errorInfo = {
        message: error.message || String(error),
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        url: window?.location?.href
      };

      this.errors.push(errorInfo);

      // Keep only recent errors
      if (this.errors.length > this.maxErrors) {
        this.errors = this.errors.slice(-this.maxErrors);
      }

      // Notify listeners
      this.listeners.forEach(listener => listener(errorInfo));

      // Log to console in development
      console.error(`[ErrorHandler] ${context}:`, error);

      // Store in chrome.storage for debugging
      this.persistError(errorInfo);
    }

    async persistError(errorInfo) {
      try {
        const { errors = [] } = await chrome.storage.local.get('errors');
        errors.push(errorInfo);

        // Keep only last 20 in storage
        const recentErrors = errors.slice(-20);
        await chrome.storage.local.set({ errors: recentErrors });
      } catch (e) {
        // Fail silently
      }
    }

    onError(listener) {
      this.listeners.push(listener);
    }

    getErrors() {
      return this.errors;
    }

    clear() {
      this.errors = [];
      chrome.storage.local.remove('errors');
    }

    // Wrap function with error handling
    wrap(fn, context) {
      return (...args) => {
        try {
          const result = fn(...args);
          if (result instanceof Promise) {
            return result.catch(error => {
              this.log(error, context);
              throw error;
            });
          }
          return result;
        } catch (error) {
          this.log(error, context);
          throw error;
        }
      };
    }
  }

  // Global instance
  const errorHandler = new ErrorHandler();

  // Set up global error handlers
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      errorHandler.log(event.error, 'window.error');
    });

    window.addEventListener('unhandledrejection', (event) => {
      errorHandler.log(event.reason, 'unhandledrejection');
      event.preventDefault();
    });
  }

  // Expose to global scope
  window.ErrorHandler = ErrorHandler;
  window.errorHandler = errorHandler;

})();
