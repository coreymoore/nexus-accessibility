export class MessageValidator {
  static ALLOWED_ACTIONS = [
    "getAccessibilityTree",
    "getBackendNodeIdAndAccessibleInfo",
    "AX_INSPECTOR_SHOWN",
    "NEXUS_TAB_INIT",
    "INSPECTOR_STATE_CHANGE",
    "keepAlive",
    "detachDebugger",
    "invalidateAccessibilityCache",
  ];

  static validate(msg, sender) {
    // For messages coming from other extension contexts (popup, background)
    // we expect sender.id to match. Content scripts will not have sender.id
    // set, so only validate sender.id when present.
    if (sender && sender.id && sender.id !== chrome.runtime.id) {
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
      case "NEXUS_TAB_INIT":
        // Content script initialization message. No extra fields required.
        break;
      case "INSPECTOR_STATE_CHANGE":
        if (!msg.inspectorState || typeof msg.inspectorState !== "string") {
          throw new Error("Invalid inspectorState");
        }
        if (!["off", "on", "mini"].includes(msg.inspectorState)) {
          throw new Error("Invalid inspectorState value");
        }
        break;
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
      case "invalidateAccessibilityCache":
        if (typeof msg.elementSelector !== "string") {
          throw new Error("Invalid elementSelector for cache invalidation");
        }
        if (msg.frameId !== undefined && typeof msg.frameId !== "number") {
          throw new Error("Invalid frameId for cache invalidation");
        }
        break;
    }

    return true;
  }
}
