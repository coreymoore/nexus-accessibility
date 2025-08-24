import { chromeAsync } from "../utils/chromeAsync.js";
import { sendCdp } from "./cdp.js";

export class DebuggerManager {
  constructor() {
    this.connections = new Map();
  }

  async attach(tabId) {
    if (this.connections.has(tabId)) {
      return this.connections.get(tabId);
    }

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
    }
  }

  async detach(tabId) {
    try {
  await chromeAsync.debugger.detach({ tabId });
      this.connections.delete(tabId);
    } catch (error) {
      // Ignore detach errors
    }
  }

  async sendCommand(tabId, method, params = {}) {
    await this.ensureAttached(tabId);
    return await sendCdp(tabId, method, params);
  }

  async ensureAttached(tabId) {
    if (!this.connections.has(tabId)) {
      await this.attach(tabId);
    }
  }
}
