export class MessageValidator {
  static ALLOWED_ACTIONS = [
    "getAccessibilityTree",
    "getBackendNodeIdAndAccessibleInfo",
    "AX_INSPECTOR_SHOWN",
    "keepAlive",
    "detachDebugger",
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
        // Support both new direct reference approach and legacy selector approach
        if (msg.useDirectReference === true) {
          // Direct reference approach - elementSelector is optional as backup
          if (typeof msg.useDirectReference !== "boolean") {
            throw new Error("Invalid useDirectReference flag");
          }
          // elementSelector is optional for backup, but if provided must be string
          if (
            msg.elementSelector !== undefined &&
            typeof msg.elementSelector !== "string"
          ) {
            throw new Error("Invalid backup elementSelector");
          }
        } else {
          // Legacy selector approach - elementSelector required
          if (typeof msg.elementSelector !== "string") {
            throw new Error("Invalid elementSelector");
          }
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
