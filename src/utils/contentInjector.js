/**
 * Content Script Injection Manager
 *
 * Provides programmatic injection of content scripts for better security
 * and performance. Only injects scripts when needed.
 */

import { chromeAsync } from "./chromeAsync.js";

export class ContentScriptInjector {
  constructor() {
    this.injectedTabs = new Set();
    this.setupActionHandler();
  }

  setupActionHandler() {
    // Inject content scripts when extension icon is clicked
    chrome.action.onClicked.addListener(async (tab) => {
      try {
        await this.injectContentScripts(tab.id);
      } catch (error) {
        console.error("Failed to inject content scripts:", error);
      }
    });
  }

  /**
   * Inject content scripts into a specific tab
   * @param {number} tabId - Chrome tab ID
   * @param {number} frameId - Frame ID (optional, defaults to all frames)
   */
  async injectContentScripts(tabId, frameId = 0) {
    try {
      // Check if already injected
      const [result] = await chromeAsync.scripting.executeScript({
        target: { tabId, frameIds: frameId ? [frameId] : undefined },
        func: () => window.__nexusInjected === true,
      });

      if (result?.result) {
        console.log("Content scripts already injected in tab", tabId);
        return;
      }

      // List of scripts to inject in order
      const scripts = [
        "src/utils/logger.js",
        "src/utils/formatter.js",
        "src/components/tooltip/tooltip.js",
        "src/content.js",
      ];

      // Inject each script sequentially
      for (const script of scripts) {
        await chromeAsync.scripting.executeScript({
          target: { tabId, frameIds: frameId ? [frameId] : undefined },
          files: [script],
        });
      }

      // Mark as injected
      await chromeAsync.scripting.executeScript({
        target: { tabId, frameIds: frameId ? [frameId] : undefined },
        func: () => {
          window.__nexusInjected = true;
        },
      });

      this.injectedTabs.add(tabId);
      console.log("Content scripts injected successfully into tab", tabId);
    } catch (error) {
      console.error("Failed to inject content scripts:", error);
      throw error;
    }
  }

  /**
   * Inject into specific frame for cross-origin support
   */
  async injectIntoFrame(tabId, frameId) {
    try {
      await this.injectContentScripts(tabId, frameId);
    } catch (error) {
      console.warn(`Failed to inject into frame ${frameId}:`, error);
    }
  }

  /**
   * Clean up injection tracking for a tab
   */
  cleanup(tabId) {
    this.injectedTabs.delete(tabId);
  }

  /**
   * Check if tab has injected scripts
   */
  isInjected(tabId) {
    return this.injectedTabs.has(tabId);
  }
}

export const contentInjector = new ContentScriptInjector();

// Clean up on tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  contentInjector.cleanup(tabId);
});
