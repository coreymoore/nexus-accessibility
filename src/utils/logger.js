/**
 * Enhanced Logger for Chrome Extension
 *
 * Provides structured logging with levels and namespaces.
 * Helps with debugging and error tracking across the extension.
 */

const DEBUG = true;

class Logger {
  constructor(namespace) {
    this.namespace = namespace;
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3,
    };
    this.currentLevel = DEBUG ? this.levels.DEBUG : this.levels.INFO;
  }

  setLevel(level) {
    this.currentLevel = this.levels[level] || this.levels.INFO;
  }

  _format(level, message, data = {}) {
    return {
      timestamp: new Date().toISOString(),
      namespace: this.namespace,
      level,
      message,
      data,
    };
  }

  _shouldLog(level) {
    return this.currentLevel >= this.levels[level];
  }

  error(message, data) {
    if (this._shouldLog("ERROR")) {
      console.error("[NEXUS]", this._format("ERROR", message, data));
    }
  }

  warn(message, data) {
    if (this._shouldLog("WARN")) {
      console.warn("[NEXUS]", this._format("WARN", message, data));
    }
  }

  info(message, data) {
    if (this._shouldLog("INFO")) {
      console.info("[NEXUS]", this._format("INFO", message, data));
    }
  }

  debug(message, data) {
    if (this._shouldLog("DEBUG")) {
      console.log("[NEXUS]", this._format("DEBUG", message, data));
    }
  }

  // Helper method for performance timing
  time(label) {
    console.time(`[NEXUS:${this.namespace}] ${label}`);
  }

  timeEnd(label) {
    console.timeEnd(`[NEXUS:${this.namespace}] ${label}`);
  }

  // Helper method for measuring async operations
  async measure(label, operation) {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;
      this.debug(`${label} completed`, {
        duration: `${duration.toFixed(2)}ms`,
      });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`${label} failed`, {
        duration: `${duration.toFixed(2)}ms`,
        error: error.message,
      });
      throw error;
    }
  }

  // Backward compatibility
  log(context, ...args) {
    if (DEBUG) {
      console.log(`[${context}]`, ...args);
    }
  }
}

// Global logger instances
const loggers = {
  background: new Logger("background"),
  content: new Logger("content"),
  tooltip: new Logger("tooltip"),
  popup: new Logger("popup"),
  debugger: new Logger("debugger"),
  cache: new Logger("cache"),
  frame: new Logger("frame"),
  scheduler: new Logger("scheduler"),
  recovery: new Logger("recovery"),
  injector: new Logger("injector"),
};

// Remove the window assignment for content scripts
// Instead, create a separate initialization function
/**
 * Initialize the background script logger
 * Creates a global logger instance for background scripts
 */
function initializeLogger() {
  if (typeof window !== "undefined" && !window.axLogger) {
    window.axLogger = {
      log(context, ...args) {
        if (DEBUG) {
          console.log(`[${context}]`, ...args);
        }
      },
      error(context, ...args) {
        if (DEBUG) {
          console.error(`[${context}]`, ...args);
        }
      },
      ...loggers,
    };
  }
}

// Export for ES6 modules (for background scripts)
export { Logger };
export const logger = loggers;
export { initializeLogger };
export default loggers;

// Environment-specific exports
(function setupEnvironmentExports() {
  // Node.js/CommonJS environment
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { Logger, logger: loggers, initializeLogger };
    return;
  }

  // Browser environment - determine which globals to set
  if (typeof window !== "undefined") {
    // Content scripts and popup environment
    window.Logger = Logger;
    window.logger = loggers;
    window.initializeLogger = initializeLogger;

    // Auto-initialize for content scripts
    initializeLogger();
  } else if (typeof globalThis !== "undefined") {
    // Worker or other global contexts
    globalThis.Logger = Logger;
    globalThis.logger = loggers;
  }
})();
