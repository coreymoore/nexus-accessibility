/**
 * Debugger Connection Manager
 *
 * Manages Chrome DevTools Protocol connections with proper serialization,
 * error handling, and resource management to prevent race conditions.
 */

import { chromeAsync } from "../utils/chromeAsync.js";
import { sendCdp } from "./cdp.js";
import { errorRecovery } from "../utils/errorRecovery.bg.js";
import { scheduler } from "../utils/scheduler.js";
import { logger } from "../utils/logger.js";
import { security, debuggerRateLimit } from "../utils/security.js";
import { performance } from "../utils/performance.js";
import { DEBUGGER_CONNECTION_RETRIES } from "./constants.js";

export class DebuggerConnectionManager {
  constructor() {
    this.log = logger.debugger;
    this.connections = new Map();
    this.queues = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Handle debugger detach events
    chrome.debugger.onDetach.addListener((source, reason) => {
      if (source.tabId) {
        const connection = this.getConnectionState(source.tabId);
        connection.state = "DETACHED";
        connection.frameContexts.clear();
        this.clearCaches(source.tabId);
        console.log(
          `Debugger detached from tab ${source.tabId}, reason: ${reason}`
        );
      }
    });

    // Handle alarm-based detach scheduling
    if (!globalThis.__NEXUS_ALARM_LISTENER_CONN_MGR) {
      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name && alarm.name.startsWith("detach-")) {
          const tabId = parseInt(alarm.name.replace("detach-", ""));
          this.handleScheduledDetach(tabId);
        }
      });
      globalThis.__NEXUS_ALARM_LISTENER_CONN_MGR = true;
    }
  }

  /**
   * Execute a callback with an attached debugger, with proper serialization
   * @param {number} tabId - Chrome tab ID
   * @param {Function} callback - Function to execute with debugger attached
   * @param {Object} opts - Options including frameId, timeout, etc.
   * @returns {Promise<any>} Result of the callback
   * @throws {Error} If debugger attachment fails
   */
  async executeWithDebugger(tabId, callback, opts = {}) {
    // Security validation
    const tabValidation = security.validateTabId(tabId);
    if (!tabValidation.valid) {
      throw new Error(`Invalid tab ID: ${tabValidation.reason}`);
    }

    if (opts.frameId !== undefined) {
      const frameValidation = security.validateFrameId(opts.frameId);
      if (!frameValidation.valid) {
        throw new Error(`Invalid frame ID: ${frameValidation.reason}`);
      }
    }

    // Rate limiting
    if (!debuggerRateLimit(tabId)) {
      throw new Error("Rate limit exceeded for debugger operations");
    }

    if (!this.queues.has(tabId)) {
      this.queues.set(tabId, Promise.resolve());
    }

    const queue = this.queues.get(tabId);
    const operation = queue.then(async () => {
      return await performance.measure("debugger-operation", async () => {
        try {
          // Surface correlationId in logs for tracing
          if (opts && opts.correlationId) {
            console.log(`executeWithDebugger starting for tab ${tabId} [corr=${opts.correlationId}]`);
          } else {
            console.log(`executeWithDebugger starting for tab ${tabId}`);
          }

          await this.ensureAttached(tabId, opts);
          // attach correlationId to connection state for downstream usage
          const connection = this.getConnectionState(tabId);
          if (opts && opts.correlationId) {
            connection.lastCorrelationId = opts.correlationId;
            try {
              globalThis.__NEXUS_LAST_CORR = opts.correlationId;
            } catch (e) {}
          }

          const result = await callback({
            connection,
            tabId,
            frameId: opts.frameId,
            correlationId: opts.correlationId,
          });

          // clear global correlation marker to avoid leakage
          try {
            if (globalThis.__NEXUS_LAST_CORR === opts.correlationId) {
              delete globalThis.__NEXUS_LAST_CORR;
            }
          } catch (e) {}

          this.scheduleDetach(tabId);

          if (opts && opts.correlationId) {
            console.log(`executeWithDebugger finished for tab ${tabId} [corr=${opts.correlationId}]`);
          } else {
            console.log(`executeWithDebugger finished for tab ${tabId}`);
          }

          return result;
        } catch (error) {
          await this.handleError(tabId, error);
          throw error;
        }
      });
    });

    this.queues.set(
      tabId,
      operation.catch(() => {}) // Prevent unhandled rejection from affecting queue
    );

    return operation;
  }
  /**
   * Ensure debugger is attached to the specified tab
   * @param {number} tabId - Chrome tab ID
   * @param {Object} opts - Options for attachment
   */
  async ensureAttached(tabId, opts = {}) {
    const connection = this.getConnectionState(tabId);

    if (connection.state === "ATTACHED") {
      this.clearDetachTimer(tabId);
      connection.lastActivity = Date.now();
      return;
    }

    if (connection.state === "ATTACHING") {
      await connection.attachPromise;
      return;
    }

    connection.state = "ATTACHING";
    connection.attachPromise = this.attach(tabId, opts);
    await connection.attachPromise;
  }

  /**
   * Attach debugger and enable required domains
   * @param {number} tabId - Chrome tab ID
   * @param {Object} opts - Attachment options
   */
  async attach(tabId, opts = {}) {
    return await errorRecovery.executeWithRecovery(
      `attach-${tabId}`,
      async () => {
        try {
          await chromeAsync.debugger.attach({ tabId }, "1.3");

          // Enable required CDP domains via centralized sender so correlationId
          // logging is applied consistently.
          await sendCdp(tabId, "DOM.enable", {});
          await sendCdp(tabId, "Accessibility.enable", {});
          await sendCdp(tabId, "Page.enable", {});
          await sendCdp(tabId, "Runtime.enable", {});

          const connection = this.getConnectionState(tabId);
          connection.state = "ATTACHED";
          connection.lastActivity = Date.now();
          connection.attachPromise = null;
          connection.retryCount = 0;

          console.log(`Debugger attached to tab ${tabId}`);
        } catch (error) {
          const connection = this.getConnectionState(tabId);
          connection.state = "DETACHED";
          connection.attachPromise = null;
          throw error;
        }
      },
      {
        shouldRetry: (error) => {
          return (
            !error.message.includes("already attached") &&
            !error.message.includes("Permission denied")
          );
        },
      }
    );
  }

  /**
   * Schedule automatic detach after idle period
   * @param {number} tabId - Chrome tab ID
   * @param {number} delayMs - Delay in milliseconds (default 30s)
   */
  scheduleDetach(tabId, delayMs = 30000) {
    this.clearDetachTimer(tabId);
    const alarmName = `detach-${tabId}`;
    chrome.alarms.create(alarmName, {
      delayInMinutes: delayMs / 60000,
    });
  }

  /**
   * Clear pending detach timer
   * @param {number} tabId - Chrome tab ID
   */
  clearDetachTimer(tabId) {
    const alarmName = `detach-${tabId}`;
    chrome.alarms.clear(alarmName);
  }

  /**
   * Handle scheduled detach
   * @param {number} tabId - Chrome tab ID
   */
  async handleScheduledDetach(tabId) {
    const connection = this.getConnectionState(tabId);
    if (!connection || connection.state !== "ATTACHED") return;

    const idleTime = Date.now() - connection.lastActivity;
    const maxIdleTime = 30000; // 30 seconds

    if (idleTime >= maxIdleTime) {
      await this.detach(tabId);
    }
  }

  /**
   * Detach debugger from tab
   * @param {number} tabId - Chrome tab ID
   */
  async detach(tabId) {
    return await errorRecovery
      .executeWithRecovery(
        `detach-${tabId}`,
        async () => {
          await chromeAsync.debugger.detach({ tabId });
        },
        {
          shouldRetry: (error) => !error.message.includes("not attached"),
        }
      )
      .catch((error) => {
        if (!error.message.includes("not attached")) {
          console.warn("Error during debugger detach:", error);
        }
      })
      .finally(() => {
        const connection = this.getConnectionState(tabId);
        connection.state = "DETACHED";
        connection.frameContexts.clear();
        this.clearCaches(tabId);
        this.clearDetachTimer(tabId);
      });
  }

  /**
   * Get connection state for a tab
   * @param {number} tabId - Chrome tab ID
   * @returns {Object} Connection state object
   */
  getConnectionState(tabId) {
    if (!this.connections.has(tabId)) {
      this.connections.set(tabId, {
        state: "DETACHED",
        lastActivity: 0,
        attachPromise: null,
        frameContexts: new Map(),
        retryCount: 0,
      });
    }
    return this.connections.get(tabId);
  }

  /**
   * Handle connection errors with retry logic
   * @param {number} tabId - Chrome tab ID
   * @param {Error} error - Error that occurred
   */
  async handleError(tabId, error) {
    const connection = this.getConnectionState(tabId);
    connection.retryCount++;

    console.warn(
      `Debugger error for tab ${tabId} (attempt ${connection.retryCount}):`,
      error.message
    );

    // For certain errors, force detach and reset state
    if (
      error.message.includes("not attached") ||
      error.message.includes("Target closed") ||
      connection.retryCount > DEBUGGER_CONNECTION_RETRIES
    ) {
      connection.state = "DETACHED";
      connection.frameContexts.clear();
      this.clearCaches(tabId);
    }
  }

  /**
   * Clear caches for a specific tab
   * @param {number} tabId - Chrome tab ID
   */
  async clearCaches(tabId, opts = {}) {
    // Notify all frames in the tab to clear their content-side caches and timers.
    // Collect per-frame ACKs and return a summary so callers can observe delivery.
    try {
      console.log(`Clearing caches for tab ${tabId}`);

      // Verify tab still exists. Tabs can be closed or navigated away between
      // the time the request was enqueued and execution; if the tab is gone,
      // return a clear per-tab error rather than letting chrome.tabs.get throw
      // an unchecked runtime.lastError elsewhere.
      try {
        await new Promise((resolve, reject) => {
          chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
            resolve(tab);
          });
        });
      } catch (tabErr) {
        console.warn(`Tab ${tabId} not available when clearing caches:`, tabErr.message);
        return [{ frameId: 0, ok: false, error: `No tab with id: ${tabId}`, message: tabErr.message }];
      }

      // Get all frames for the tab (best-effort)
      let frames = [];
      try {
        frames = await chromeAsync.webNavigation.getAllFrames({ tabId });
      } catch (e) {
        // If webNavigation isn't available or fails, we'll still attempt a top-frame message
        frames = [];
      }

  const results = [];
  let permissionRequiredCount = 0;

      if (frames && frames.length) {
        // Helper: try sending message, and on "Receiving end does not exist" try
        // injecting the content-main script into that specific frame and retry once.
        const sendToFrameWithRetry = async (frame) => {
          const payload = { type: "CLEAR_CACHES" };
          if (opts && opts.correlationId) payload.correlationId = opts.correlationId;
          try {
            const response = await chromeAsync.tabs.sendMessage(tabId, payload, { frameId: frame.frameId });
            return { frameId: frame.frameId, ok: true, response, url: frame.url };
          } catch (err) {
            const errMsg = (err && err.message) || String(err);
            // If this is a permission/host access error, don't try to inject —
            // the extension lacks rights to run scripts on this host.
              if (/Cannot access contents of the page|must request permission to access|request permission to access|Extension manifest must request permission/i.test(errMsg)) {
              permissionRequiredCount++;
              return { frameId: frame.frameId, ok: false, error: errMsg, url: frame.url, permissionRequired: true };
            }

            // If receiving end missing, attempt conservative one-shot injection
            if (err && /Receiving end does not exist/.test(errMsg)) {
              try {
                console.log(`No receiver in tab ${tabId} frame ${frame.frameId}, attempting one-shot inject and retry`);
                await chromeAsync.scripting.executeScript({ target: { tabId, frameIds: [frame.frameId] }, files: ["src/content/content-main.js"] });
                // small delay to allow the injected script to register listeners
                await new Promise((res) => setTimeout(res, 120));
                const response = await chromeAsync.tabs.sendMessage(tabId, payload, { frameId: frame.frameId });
                return { frameId: frame.frameId, ok: true, response, retried: true, url: frame.url };
              } catch (e2) {
                return { frameId: frame.frameId, ok: false, error: e2.message, url: frame.url };
              }
            }
            return { frameId: frame.frameId, ok: false, error: err.message, url: frame.url };
          }
        };

        const promises = frames.map((frame) => sendToFrameWithRetry(frame));

        const settled = await Promise.all(promises);
        for (const r of settled) results.push(r);
      } else {
        // Fallback: send to top-level frame
        try {
          const payload = { type: "CLEAR_CACHES" };
          if (opts && opts.correlationId) payload.correlationId = opts.correlationId;
          try {
            const response = await chromeAsync.tabs.sendMessage(tabId, payload);
            results.push({ frameId: 0, ok: true, response });
          } catch (err) {
            const errMsg = (err && err.message) || String(err);
            if (/Cannot access contents of the page|must request permission to access|request permission to access|Extension manifest must request permission/i.test(errMsg)) {
              console.log(`Permission error sending to top frame of tab ${tabId}: ${errMsg}`);
              permissionRequiredCount++;
              results.push({ frameId: 0, ok: false, error: errMsg, permissionRequired: true });
            } else if (err && /Receiving end does not exist/.test(errMsg)) {
              console.log(`No receiver in top frame of tab ${tabId}, attempting one-shot inject and retry`);
              try {
                await chromeAsync.scripting.executeScript({ target: { tabId, frameIds: [0] }, files: ["src/content/content-main.js"] });
                await new Promise((res) => setTimeout(res, 120));
                const response = await chromeAsync.tabs.sendMessage(tabId, payload);
                results.push({ frameId: 0, ok: true, response, retried: true });
              } catch (e2) {
                results.push({ frameId: 0, ok: false, error: e2.message });
              }
            } else {
              results.push({ frameId: 0, ok: false, error: errMsg });
            }
          }
        } catch (err) {
          results.push({ frameId: 0, ok: false, error: err.message });
        }
      }
      // Annotate results with summary information for permission issues
      if (permissionRequiredCount > 0) {
        results.permissionRequiredCount = permissionRequiredCount;
      }
      // Log summary and return results for observability
      if (opts && opts.correlationId) {
        console.log(`clearCaches results for tab ${tabId} [corr=${opts.correlationId}]:`, results);
      } else {
        console.log(`clearCaches results for tab ${tabId}:`, results);
      }
      return results;
    } catch (error) {
      console.warn(`Failed to clear caches for tab ${tabId}:`, error);
      return [{ frameId: 0, ok: false, error: error.message }];
    }
  }

  /**
   * Create isolated world for frame-specific operations
   * @param {number} tabId - Chrome tab ID
   * @param {string} frameId - CDP frame ID
   * @param {string} worldName - Name for the isolated world
   * @returns {Promise<number>} Execution context ID
   */
  async createIsolatedWorld(tabId, frameId, worldName = "NexusAccessibility") {
    try {
      const { executionContextId } = await sendCdp(
        tabId,
        "Page.createIsolatedWorld",
        {
          frameId,
          worldName: `${worldName}_${Date.now()}`,
          grantUniversalAccess: false,
        }
      );

      const connection = this.getConnectionState(tabId);
      connection.frameContexts.set(frameId, {
        executionContextId,
        timestamp: Date.now(),
      });

      return executionContextId;
    } catch (error) {
      console.warn("Failed to create isolated world:", error);
      throw error;
    }
  }

  /**
   * Get statistics about current connections
   * @returns {Object} Connection statistics
   */
  getStats() {
    const stats = {
      totalConnections: this.connections.size,
      attachedTabs: 0,
      attachingTabs: 0,
      detachedTabs: 0,
      totalFrameContexts: 0,
    };

    for (const connection of this.connections.values()) {
      switch (connection.state) {
        case "ATTACHED":
          stats.attachedTabs++;
          break;
        case "ATTACHING":
          stats.attachingTabs++;
          break;
        case "DETACHED":
          stats.detachedTabs++;
          break;
      }
      stats.totalFrameContexts += connection.frameContexts.size;
    }

    return stats;
  }

  /**
   * Cleanup all connections (for extension shutdown)
   */
  async cleanup() {
    const promises = [];
    for (const tabId of this.connections.keys()) {
      promises.push(this.detach(tabId));
    }
    await Promise.allSettled(promises);
    this.connections.clear();
    this.queues.clear();
  }
}

export const connectionManager = new DebuggerConnectionManager();
