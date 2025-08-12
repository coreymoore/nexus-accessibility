/**
 * Frame Context Manager
 * 
 * Manages execution contexts across frames for better cross-origin support
 * and more reliable element targeting.
 */

import { chromeAsync } from "./chromeAsync.js";

export class FrameContextManager {
  constructor() {
    this.frameContexts = new Map(); // tabId -> Map<frameId, contextInfo>
    this.setupNavigationListener();
  }

  setupNavigationListener() {
    // Track frame navigations to invalidate contexts
    if (chrome.webNavigation) {
      chrome.webNavigation.onCommitted.addListener((details) => {
        this.invalidateFrameContext(details.tabId, details.frameId);
      });

      chrome.webNavigation.onDOMContentLoaded.addListener((details) => {
        // Clear context on DOM ready to ensure fresh state
        this.invalidateFrameContext(details.tabId, details.frameId);
      });
    }
  }

  /**
   * Get or create an isolated world context for a frame
   * @param {number} tabId - Chrome tab ID
   * @param {string} frameId - CDP frame ID
   * @param {string} worldName - Name for the isolated world
   * @returns {Promise<number>} Execution context ID
   */
  async getOrCreateContext(tabId, frameId, worldName = "NexusAccessibility") {
    const frameKey = `${frameId}`;
    
    if (!this.frameContexts.has(tabId)) {
      this.frameContexts.set(tabId, new Map());
    }
    
    const tabContexts = this.frameContexts.get(tabId);
    const existing = tabContexts.get(frameKey);
    
    // Check if existing context is still valid
    if (existing && this.isContextValid(existing)) {
      return existing.executionContextId;
    }

    try {
      // Create new isolated world
      const { executionContextId } = await chromeAsync.debugger.sendCommand(
        { tabId },
        "Page.createIsolatedWorld",
        {
          frameId,
          worldName: `${worldName}_${Date.now()}`,
          grantUniversalAccess: false,
        }
      );

      const contextInfo = {
        executionContextId,
        frameId,
        worldName,
        created: Date.now(),
        isValid: true,
      };

      tabContexts.set(frameKey, contextInfo);
      return executionContextId;

    } catch (error) {
      console.warn("Failed to create isolated world for frame:", frameId, error);
      
      // Fallback: try to get the default execution context
      try {
        const { contexts } = await chromeAsync.debugger.sendCommand(
          { tabId },
          "Runtime.getIsolatedWorlds"
        );
        
        const mainContext = contexts.find(ctx => 
          ctx.frameId === frameId && ctx.type === "main"
        );
        
        if (mainContext) {
          return mainContext.executionContextId;
        }
      } catch (fallbackError) {
        console.warn("Fallback context lookup failed:", fallbackError);
      }
      
      throw error;
    }
  }

  /**
   * Execute code in a frame's isolated context
   * @param {number} tabId - Chrome tab ID
   * @param {string} frameId - CDP frame ID  
   * @param {string} expression - JavaScript expression to evaluate
   * @returns {Promise<any>} Evaluation result
   */
  async evaluateInFrame(tabId, frameId, expression) {
    const contextId = await this.getOrCreateContext(tabId, frameId);
    
    const { result } = await chromeAsync.debugger.sendCommand(
      { tabId },
      "Runtime.evaluate",
      {
        contextId,
        expression,
        returnByValue: false,
        awaitPromise: true,
        userGesture: false,
      }
    );

    if (result.exceptionDetails) {
      throw new Error(`Evaluation failed: ${result.exceptionDetails.text}`);
    }

    return result;
  }

  /**
   * Get DOM node from a frame using a selector
   * @param {number} tabId - Chrome tab ID
   * @param {string} frameId - CDP frame ID
   * @param {string} selector - CSS selector
   * @returns {Promise<number|null>} DOM nodeId or null
   */
  async getNodeInFrame(tabId, frameId, selector) {
    try {
      const result = await this.evaluateInFrame(
        tabId,
        frameId,
        `document.querySelector(${JSON.stringify(selector)})`
      );

      if (result.objectId) {
        const { node } = await chromeAsync.debugger.sendCommand(
          { tabId },
          "DOM.describeNode",
          { objectId: result.objectId }
        );
        return node?.nodeId || null;
      }

      return null;
    } catch (error) {
      console.warn("Failed to get node in frame:", error);
      return null;
    }
  }

  /**
   * Check if a context is still valid
   * @param {Object} contextInfo - Context information
   * @returns {boolean} Whether context is valid
   */
  isContextValid(contextInfo) {
    // Context is valid for 5 minutes
    const TTL = 5 * 60 * 1000;
    return contextInfo.isValid && (Date.now() - contextInfo.created) < TTL;
  }

  /**
   * Invalidate context for a specific frame
   * @param {number} tabId - Chrome tab ID
   * @param {number} chromeFrameId - Chrome frame ID (not CDP frame ID)
   */
  invalidateFrameContext(tabId, chromeFrameId) {
    const tabContexts = this.frameContexts.get(tabId);
    if (tabContexts) {
      // Mark all contexts as invalid (we'll clean them up on next access)
      for (const context of tabContexts.values()) {
        context.isValid = false;
      }
    }
  }

  /**
   * Clean up all contexts for a tab
   * @param {number} tabId - Chrome tab ID
   */
  cleanupTab(tabId) {
    this.frameContexts.delete(tabId);
  }

  /**
   * Get context statistics
   */
  getStats() {
    const stats = {
      totalTabs: this.frameContexts.size,
      totalContexts: 0,
      validContexts: 0,
    };

    for (const tabContexts of this.frameContexts.values()) {
      stats.totalContexts += tabContexts.size;
      for (const context of tabContexts.values()) {
        if (this.isContextValid(context)) {
          stats.validContexts++;
        }
      }
    }

    return stats;
  }
}

export const frameContextManager = new FrameContextManager();

// Clean up on tab removal
if (chrome.tabs) {
  chrome.tabs.onRemoved.addListener((tabId) => {
    frameContextManager.cleanupTab(tabId);
  });
}
