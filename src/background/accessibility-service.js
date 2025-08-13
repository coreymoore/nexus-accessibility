import "./types.js";

export class AccessibilityService {
  /**
   * @param {DebuggerManager} debuggerManager
   * @param {CacheManager} cacheManager
   */
  constructor(debuggerManager, cacheManager) {
    this.debugger = debuggerManager;
    this.cache = cacheManager;
  }

  /**
   * Get accessibility info for an element
   * @param {number} tabId - Chrome tab ID
   * @param {number} frameId - Frame ID
   * @param {string} selector - CSS selector
   * @returns {Promise<AccessibilityInfo>}
   */
  async getElementInfo(tabId, frameId, selector) {
    const cacheKey = `${tabId}-${frameId}-${selector}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // Fetch from debugger
    const info = await this.fetchFromDebugger(tabId, frameId, selector);

    // Cache the result
    this.cache.set(cacheKey, info);

    return info;
  }

  /**
   * @private
   */
  async fetchFromDebugger(tabId, frameId, selector) {
    try {
      await this.debugger.ensureAttached(tabId);

      // Execute script to find element and get its backend node ID
      const { result } = await this.debugger.sendCommand(
        tabId,
        "Runtime.evaluate",
        {
          expression: `
            (function() {
              const element = document.querySelector('${selector}');
              return element ? element : null;
            })()
          `,
          returnByValue: false,
        }
      );

      if (!result || !result.objectId) {
        throw new Error("Element not found");
      }

      // Get the backend node ID
      const { nodeId } = await this.debugger.sendCommand(
        tabId,
        "DOM.requestNode",
        { objectId: result.objectId }
      );

      // Get accessibility info
      const { accessibilityNode } = await this.debugger.sendCommand(
        tabId,
        "Accessibility.getAXNodeAndAncestors",
        { nodeId }
      );

      if (!accessibilityNode) {
        throw new Error("No accessibility info available");
      }

      return this.formatAccessibilityInfo(accessibilityNode);
    } catch (error) {
      console.error("Failed to fetch accessibility info:", error);
      throw error;
    }
  }

  /**
   * @private
   */
  formatAccessibilityInfo(axNode) {
    const info = {
      role: axNode.role?.value || "unknown",
      name: axNode.name?.value || "",
      description: axNode.description?.value || "",
      states: {},
      properties: {},
    };

    // Process states
    if (axNode.booleanProperties) {
      for (const prop of axNode.booleanProperties) {
        info.states[prop.name] = prop.value;
      }
    }

    // Process properties
    if (axNode.stringProperties) {
      for (const prop of axNode.stringProperties) {
        info.properties[prop.name] = prop.value;
      }
    }

    return info;
  }
}
