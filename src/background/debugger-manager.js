export class DebuggerManager {
  constructor() {
    this.connections = new Map();
  }

  async attach(tabId) {
    if (this.connections.has(tabId)) {
      return this.connections.get(tabId);
    }

    try {
      await chrome.debugger.attach({ tabId }, "1.3");

      // Enable required domains
      await chrome.debugger.sendCommand({ tabId }, "DOM.enable");
      await chrome.debugger.sendCommand({ tabId }, "Accessibility.enable");
      await chrome.debugger.sendCommand({ tabId }, "Page.enable");
      await chrome.debugger.sendCommand({ tabId }, "Runtime.enable");

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
      await chrome.debugger.detach({ tabId });
      this.connections.delete(tabId);
    } catch (error) {
      // Ignore detach errors
    }
  }

  async sendCommand(tabId, method, params = {}) {
    await this.ensureAttached(tabId);
    return chrome.debugger.sendCommand({ tabId }, method, params);
  }

  async ensureAttached(tabId) {
    if (!this.connections.has(tabId)) {
      await this.attach(tabId);
    }
  }
}
