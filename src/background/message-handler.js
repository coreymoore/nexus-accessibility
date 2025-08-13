import { MessageValidator } from "./message-validator.js";
import { getAccessibilityInfoForElement } from "./accessibilityInfo.js";

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

        case "AX_TOOLTIP_SHOWN":
          return await this.handleTooltipShown(msg, sender);

        case "detachDebugger":
          return await this.handleDetachDebugger(msg, sender);

        case "keepAlive":
          return { status: "alive" };

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
        const cacheKey = `element-direct-${tabId}-${frameId || 0}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
          console.log("Background: Returning cached direct reference result");
          return cached;
        }

        // Ensure debugger is attached and get connection
        console.log("Background: attaching debugger to tab", tabId);
        const connection = await this.debugger.attach(tabId);
        console.log("Background: debugger attached, connection:", connection);

        // Get accessibility info using direct reference method
        console.log("Background: calling getAccessibilityInfoForElement with direct reference");
        const result = await getAccessibilityInfoForElement(
          tabId,
          frameId || 0,
          null, // No selector needed for direct reference
          connection,
          true  // Flag to use direct reference
        );
        console.log("Background: got result from direct reference method:", result);

        // Cache the result briefly (shorter TTL since it's element-specific)
        this.cache.set(cacheKey, result, 2000); // 2 second cache
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
      console.log("Background: got result from getAccessibilityInfoForElement:", result);

      // Cache the result
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Background: Error in handleGetElementInfo:", error);
      console.error("Background: Error stack:", error.stack);
      throw new Error(`Failed to get element info: ${error.message}`);
    }
  }

  async handleTooltipShown(msg, sender) {
    // Relay tooltip-coordination messages across all frames in the tab
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
      throw new Error(`Failed to handle tooltip shown: ${error.message}`);
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
}
