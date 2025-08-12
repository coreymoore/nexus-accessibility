/**
 * Debugger Connection Manager
 * 
 * Manages Chrome DevTools Protocol connections with proper serialization,
 * error handling, and resource management to prevent race conditions.
 */

import { chromeAsync } from "../utils/chromeAsync.js";
import { errorRecovery } from "../utils/errorRecovery.js";
import { scheduler } from "../utils/scheduler.js";
import { logger } from "../utils/logger.js";
import { security, debuggerRateLimit } from "../utils/security.js";
import { performance } from "../utils/performance.js";

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
        connection.state = 'DETACHED';
        connection.frameContexts.clear();
        this.clearCaches(source.tabId);
        console.log(`Debugger detached from tab ${source.tabId}, reason: ${reason}`);
      }
    });

    // Handle alarm-based detach scheduling
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name.startsWith('detach-')) {
        const tabId = parseInt(alarm.name.replace('detach-', ''));
        this.handleScheduledDetach(tabId);
      }
    });
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
      return await performance.measure(
        "debugger-operation",
        async () => {
          try {
            await this.ensureAttached(tabId, opts);
            const result = await callback({
              connection: this.getConnectionState(tabId),
              tabId,
              frameId: opts.frameId,
            });
            this.scheduleDetach(tabId);
            return result;
          } catch (error) {
            await this.handleError(tabId, error);
            throw error;
          }
        }
      );
    });

    this.queues.set(
      tabId,
      operation.catch(() => {}) // Prevent unhandled rejection from affecting queue
    );

    return operation;
  }  /**
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
          
          // Enable required CDP domains
          await chromeAsync.debugger.sendCommand({ tabId }, "DOM.enable");
          await chromeAsync.debugger.sendCommand({ tabId }, "Accessibility.enable");
          await chromeAsync.debugger.sendCommand({ tabId }, "Page.enable");
          await chromeAsync.debugger.sendCommand({ tabId }, "Runtime.enable");

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
          return !error.message.includes('already attached') && 
                 !error.message.includes('Permission denied');
        }
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
    return await errorRecovery.executeWithRecovery(
      `detach-${tabId}`,
      async () => {
        await chromeAsync.debugger.detach({ tabId });
      },
      {
        shouldRetry: (error) => !error.message.includes('not attached')
      }
    ).catch((error) => {
      if (!error.message.includes("not attached")) {
        console.warn("Error during debugger detach:", error);
      }
    }).finally(() => {
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

    console.warn(`Debugger error for tab ${tabId} (attempt ${connection.retryCount}):`, error.message);

    // For certain errors, force detach and reset state
    if (
      error.message.includes('not attached') ||
      error.message.includes('Target closed') ||
      connection.retryCount > 3
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
  clearCaches(tabId) {
    // This will be implemented when we integrate with existing cache system
    console.log(`Clearing caches for tab ${tabId}`);
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
      const { executionContextId } = await chromeAsync.debugger.sendCommand(
        { tabId },
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
