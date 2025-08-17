/**
 * Enhanced Logger for Chrome Extension - Content Script Version
 *
 * Provides structured logging with levels and namespaces.
 * Helps with debugging and error tracking across the extension.
 * This version is designed for content scripts without ES6 exports.
 */

const DEBUG = true;

class Logger {
  constructor(namespace = "default") {
    this.namespace = namespace;
    this.levels = ["ERROR", "WARN", "INFO", "DEBUG"];
    this.currentLevel = DEBUG ? "DEBUG" : "WARN";
  }

  _shouldLog(level) {
    const currentIndex = this.levels.indexOf(this.currentLevel);
    const messageIndex = this.levels.indexOf(level);
    return messageIndex <= currentIndex;
  }

  _format(level, message, data) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.namespace}] [${level}]`;

    if (data) {
      return `${prefix} ${message}`, data;
    }
    return `${prefix} ${message}`;
  }

  error(message, data) {
    if (this._shouldLog("ERROR")) {
      if (data) {
        console.error("[NEXUS]", this._format("ERROR", message), data);
      } else {
        console.error("[NEXUS]", this._format("ERROR", message));
      }
    }
  }

  warn(message, data) {
    if (this._shouldLog("WARN")) {
      if (data) {
        console.warn("[NEXUS]", this._format("WARN", message), data);
      } else {
        console.warn("[NEXUS]", this._format("WARN", message));
      }
    }
  }

  log(message, data) {
    if (this._shouldLog("INFO")) {
      if (data) {
        console.log("[NEXUS]", this._format("INFO", message), data);
      } else {
        console.log("[NEXUS]", this._format("INFO", message));
      }
    }
  }

  info(message, data) {
    if (this._shouldLog("INFO")) {
      if (data) {
        console.info("[NEXUS]", this._format("INFO", message), data);
      } else {
        console.info("[NEXUS]", this._format("INFO", message));
      }
    }
  }

  debug(message, data) {
    if (this._shouldLog("DEBUG")) {
      if (data) {
        console.log("[NEXUS]", this._format("DEBUG", message), data);
      } else {
        console.log("[NEXUS]", this._format("DEBUG", message));
      }
    }
  }

  // Helper method for performance timing
  time(label) {
    console.time(`[NEXUS:${this.namespace}] ${label}`);
  }

  timeEnd(label) {
    console.timeEnd(`[NEXUS:${this.namespace}] ${label}`);
  }

  // Create a child logger with extended namespace
  child(suffix) {
    return new Logger(`${this.namespace}:${suffix}`);
  }

  // Set log level
  setLevel(level) {
    if (this.levels.includes(level)) {
      this.currentLevel = level;
    }
  }
}

// Global logger instances
const loggers = {
  background: new Logger("background"),
  content: new Logger("content"),
  inspector: new Logger("inspector"),
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
 * Initialize the content script logger
 * Creates a global logger instance for content scripts
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

// Browser environment - attach to window for content scripts
if (typeof window !== "undefined") {
  window.Logger = Logger;
  window.logger = loggers;
  window.initializeLogger = initializeLogger;

  // Auto-initialize for content scripts
  initializeLogger();
}

// Also export for modules that can handle it
if (typeof globalThis !== "undefined") {
  globalThis.Logger = Logger;
  globalThis.logger = loggers;
}
