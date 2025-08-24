import { chromeAsync } from "../utils/chromeAsync.js";
import { sendCdp } from "./cdp.js";

export class DebuggerManager {
  constructor() {
    this.connections = new Map();
    // Track in-flight attach promises to avoid duplicate attach calls
    this._attachPromises = new Map();

    // Listen for alarm events to handle scheduled detach operations
    try {
      chrome.alarms.onAlarm.addListener((alarm) => {
        if (!alarm || !alarm.name) return;
        if (alarm.name.startsWith("detach-")) {
          const tabId = Number(alarm.name.replace("detach-", ""));
          // Only attempt detach if we still consider the connection attached
          const conn = this.connections.get(tabId);
          if (conn) {
            this.detach(tabId).catch(() => {});
          }
        }
      });

      // Propagate debugger detach events to internal state
      chrome.debugger.onDetach.addListener((source, reason) => {
        if (source && source.tabId) {
          const tid = source.tabId;
          this.connections.delete(tid);
          // Ensure any pending attach promise is cleared
          if (this._attachPromises.has(tid)) this._attachPromises.delete(tid);
          // Clear any scheduled detach alarm for cleanliness
          try {
            chrome.alarms.clear(`detach-${tid}`);
          } catch (e) {}
          console.log(`Debugger detached from tab ${tid}, reason: ${reason}`);
        }
      });
    } catch (e) {
      // If chrome.alarms or chrome.debugger is not available in this runtime,
      // swallow and continue; callers will still use attach/detach directly.
    }
  }

  async attach(tabId) {
    // If we already have an attached connection, return it
    if (this.connections.has(tabId)) {
      return this.connections.get(tabId);
    }

    // If an attach is already in-flight for this tab, await it
    if (this._attachPromises.has(tabId)) {
      return await this._attachPromises.get(tabId);
    }

    // Start attach and record promise to prevent duplicate attaches
    const p = (async () => {
      try {
        await chromeAsync.debugger.attach({ tabId }, "1.3");

        // Enable required CDP domains via centralized sender
        await sendCdp(tabId, "DOM.enable");
        await sendCdp(tabId, "Accessibility.enable");
        await sendCdp(tabId, "Page.enable");
        await sendCdp(tabId, "Runtime.enable");

        const connection = {
          tabId,
          attached: true,
          attachedAt: Date.now(),
        };

        this.connections.set(tabId, connection);
        return connection;
      } catch (error) {
        console.error("Failed to attach debugger:", error);
        throw error;
      } finally {
        // Clear in-flight record on completion (success or failure)
        this._attachPromises.delete(tabId);
      }
    })();

    this._attachPromises.set(tabId, p);
    return await p;
  }

  async detach(tabId) {
    try {
  await chromeAsync.debugger.detach({ tabId });
      this.connections.delete(tabId);
      // Clear any scheduled detach alarm
      try {
        chrome.alarms.clear(`detach-${tabId}`);
      } catch (e) {}
    } catch (error) {
      // Ignore detach errors
    }
  }

  async sendCommand(tabId, method, params = {}) {
    await this.ensureAttached(tabId);
    return await sendCdp(tabId, method, params);
  }

  async ensureAttached(tabId) {
    if (this.connections.has(tabId)) {
      return;
    }

    // If attach already in-flight, await it
    if (this._attachPromises.has(tabId)) {
      await this._attachPromises.get(tabId);
      return;
    }

    await this.attach(tabId);
  }

  /**
   * Schedule automatic detach after idle period
   * @param {number} tabId
   * @param {number} delayMs
   */
  scheduleDetach(tabId, delayMs = 30000) {
    try {
      const alarmName = `detach-${tabId}`;
      chrome.alarms.create(alarmName, { delayInMinutes: delayMs / 60000 });
    } catch (e) {
      // If alarms are not available, fallback to immediate detach after timeout
      setTimeout(() => {
        this.detach(tabId).catch(() => {});
      }, delayMs);
    }
  }

  clearDetachTimer(tabId) {
    try {
      chrome.alarms.clear(`detach-${tabId}`);
    } catch (e) {}
  }
}
