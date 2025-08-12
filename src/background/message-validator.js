export class MessageValidator {
  static ALLOWED_ACTIONS = [
    "getAccessibilityTree",
    "getBackendNodeIdAndAccessibleInfo",
    "AX_TOOLTIP_SHOWN",
    "keepAlive",
  ];

  static validate(msg, sender) {
    // Verify sender is from our extension
    if (sender.id !== chrome.runtime.id) {
      throw new Error("Invalid sender");
    }

    // Validate message structure
    if (!msg || typeof msg !== "object") {
      throw new Error("Invalid message format");
    }

    // Validate action
    const action = msg.action || msg.type;
    if (!this.ALLOWED_ACTIONS.includes(action)) {
      throw new Error(`Invalid action: ${action}`);
    }

    // Validate specific fields based on action
    switch (action) {
      case "getBackendNodeIdAndAccessibleInfo":
        if (typeof msg.elementSelector !== "string") {
          throw new Error("Invalid elementSelector");
        }
        break;
      case "getAccessibilityTree":
        if (msg.tabId && typeof msg.tabId !== "number") {
          throw new Error("Invalid tabId");
        }
        break;
    }

    return true;
  }
}
