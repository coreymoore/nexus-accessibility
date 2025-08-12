import { MessageValidator } from "./message-validator.js";

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
    const { elementSelector, frameId = 0 } = msg;
    const tabId = sender.tab.id;
    const cacheKey = `element-${tabId}-${frameId}-${elementSelector}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // This would need to be implemented based on your existing logic
      // For now, return a placeholder
      const result = {
        backendNodeId: null,
        accessibleNode: null,
        error: "Implementation needed",
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
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
}
