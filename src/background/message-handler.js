import { MessageValidator } from "./message-validator.js";
import { getAccessibilityInfoForElement } from "./accessibilityInfo.js";
import { nodeCache as __axNodeCache } from "./caches.js";

export class MessageHandler {
  constructor(cacheManager, debuggerManager) {
    this.cache = cacheManager;
    this.debugger = debuggerManager;
  }

  async handle(msg, sender) {
    try {
      // Validate the message
      MessageValidator.validate(msg, sender);

      const action = msg.action || msg.type;

      switch (action) {
        case "getAccessibilityTree":
          return await this.handleGetAccessibilityTree(msg, sender);

        case "getBackendNodeIdAndAccessibleInfo":
          return await this.handleGetElementInfo(msg, sender);

        case "AX_INSPECTOR_SHOWN":
          return await this.handleInspectorShown(msg, sender);

        case "detachDebugger":
          return await this.handleDetachDebugger(msg, sender);

        case "keepAlive":
          return { status: "alive" };

        case "invalidateAccessibilityCache":
          return await this.handleInvalidateCache(msg, sender);

        default:
          throw new Error(`Unhandled action: ${action}`);
      }
    } catch (error) {
      console.error("Message handling error:", error);
      return { error: error.message };
    }
  }

  async handleGetAccessibilityTree(msg, sender) {
    const tabId = sender.tab.id;
    const cacheKey = `tree-${tabId}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { nodes } = await this.debugger.sendCommand(
        tabId,
        "Accessibility.getFullAXTree"
      );

      const result = { nodes };
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      throw new Error(`Failed to get accessibility tree: ${error.message}`);
    }
  }

  async handleGetElementInfo(msg, sender) {
    try {
      const tabId = sender.tab?.id;
      const frameId = sender.frameId;

      if (!tabId) {
        throw new Error("No tab ID available");
      }

      // Check if we're using the new direct reference approach
      if (msg.useDirectReference) {
        console.log("Background: Using direct element reference approach");

        // For direct reference, we don't need complex selectors or caching by selector
        // Clear any existing cache when we get a new request to ensure fresh data
        const cacheKey = `element-direct-${tabId}-${frameId || 0}`;
        console.log(
          "Background: Clearing any existing cache for fresh element data"
        );
        this.cache.delete(cacheKey);

        // Don't use cache for direct reference - always get fresh data
        // This ensures we always get the current element, not a cached previous one

        // Ensure debugger is attached and get connection
        console.log("Background: attaching debugger to tab", tabId);
        const connection = await this.debugger.attach(tabId);
        console.log("Background: debugger attached, connection:", connection);

        // Get accessibility info using direct reference method
        console.log(
          "Background: calling getAccessibilityInfoForElement with direct reference"
        );
        const result = await getAccessibilityInfoForElement(
          tabId,
          frameId || 0,
          null, // No selector needed for direct reference
          connection,
          true // Flag to use direct reference
        );
        console.log(
          "Background: got result from direct reference method:",
          result
        );

        // Don't cache direct reference results to ensure we always get fresh data
        // Each focus change should get the current element, not cached data
        return result;
      }

      // Legacy selector-based approach (fallback)
      const cacheKey = `element-${tabId}-${frameId || 0}-${
        msg.elementSelector
      }`;

      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      console.log(
        "Background: getting accessibility info for",
        msg.elementSelector,
        "in tab",
        tabId
      );

      // Ensure debugger is attached and get connection
      console.log("Background: attaching debugger to tab", tabId);
      const connection = await this.debugger.attach(tabId);
      console.log("Background: debugger attached, connection:", connection);

      // Get accessibility info using the debugger connection
      console.log("Background: calling getAccessibilityInfoForElement");
      const result = await getAccessibilityInfoForElement(
        tabId,
        frameId || 0,
        msg.elementSelector,
        connection
      );
      console.log(
        "Background: got result from getAccessibilityInfoForElement:",
        result
      );

      // Cache the result
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Background: Error in handleGetElementInfo:", error);
      console.error("Background: Error stack:", error.stack);
      throw new Error(`Failed to get element info: ${error.message}`);
    }
  }

  async handleInspectorShown(msg, sender) {
    // Relay inspector-coordination messages across all frames in the tab
    try {
      if (!sender || !sender.tab || !sender.tab.id) return;
      const tabId = sender.tab.id;

      // Get all frames in this tab and broadcast
      const frames = await chrome.webNavigation.getAllFrames({ tabId });
      for (const frame of frames) {
        try {
          await chrome.tabs.sendMessage(tabId, msg, {
            frameId: frame.frameId,
          });
        } catch (e) {
          // Ignore frame errors
        }
      }
      return { status: "broadcasted" };
    } catch (error) {
      throw new Error(`Failed to handle inspector shown: ${error.message}`);
    }
  }

  async handleDetachDebugger(msg, sender) {
    try {
      const tabId = sender.tab?.id || msg.tabId;
      if (tabId) {
        await this.debugger.detach(tabId);
        return { status: "detached", tabId };
      }
      return { status: "no_tab_id" };
    } catch (error) {
      throw new Error(`Failed to detach debugger: ${error.message}`);
    }
  }

  async handleInvalidateCache(msg, sender) {
    try {
      const tabId = sender.tab?.id || msg.tabId;
      const frameId = msg.frameId || 0;
      const elementSelector = msg.elementSelector;
      const reason = msg.reason;

      if (!elementSelector) {
        console.warn(
          "[MessageHandler] No element selector provided for cache invalidation"
        );
        return { status: "no_selector" };
      }

      // Construct the cache key format used in accessibilityInfo.js
      const cacheKey = `${tabId}:cdp:${frameId}`;
      const cacheSelKey = `${cacheKey}::${elementSelector}`;

      console.log(
        `[MessageHandler] Invalidating CDP cache for key: ${cacheSelKey}, reason: ${
          reason || "general"
        }`
      );

      // Clear the CDP node cache entry
      __axNodeCache.delete(cacheSelKey);

      // For combobox changes, also clear related element cache and general cache
      if (reason === "combobox-expanded-change") {
        console.log(
          "[MessageHandler] Combobox change detected - enhanced cache clearing"
        );

        // Clear the general cache entry for this element as well
        const generalCacheKey = `element-${tabId}-${frameId}-${elementSelector}`;
        this.cache.delete(generalCacheKey);

        // Also clear direct reference cache for this tab/frame
        const directCacheKey = `element-direct-${tabId}-${frameId}`;
        this.cache.delete(directCacheKey);

        console.log(
          "[MessageHandler] Enhanced cache clearing complete for combobox"
        );
      }

      return {
        status: "invalidated",
        cacheKey: cacheSelKey,
        enhanced: reason === "combobox-expanded-change",
      };
    } catch (error) {
      console.error("[MessageHandler] Failed to invalidate cache:", error);
      throw new Error(`Failed to invalidate cache: ${error.message}`);
    }
  }
}
