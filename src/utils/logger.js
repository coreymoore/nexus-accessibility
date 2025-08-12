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
};

// Backward compatibility - maintain existing interface
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

  // New enhanced loggers
  ...loggers,
};
