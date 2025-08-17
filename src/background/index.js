import { CacheManager } from "./cache-manager.js";
import { DebuggerManager } from "./debugger-manager.js";
import { MessageHandler } from "./message-handler.js";
import { backgroundStateManager } from "./nexus-background-state.js";

// Initialize managers
const cacheManager = new CacheManager();
const debuggerManager = new DebuggerManager();
const messageHandler = new MessageHandler(cacheManager, debuggerManager);

// Initialize state manager
backgroundStateManager
  .initialize()
  .then(() => {
    console.log("Nexus Background State Manager initialized");
  })
  .catch((error) => {
    console.error("Failed to initialize background state manager:", error);
  });

// Setup message listener with state manager integration
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  try {
    // Try state manager first
    const stateResponse = await backgroundStateManager.handleMessage(
      msg,
      sender
    );
    if (stateResponse) {
      sendResponse(stateResponse);
      return;
    }

    // Fall back to legacy message handler
    const response = await messageHandler.handle(msg, sender);
    sendResponse(response);
  } catch (error) {
    console.error("Message handling error:", error);
    sendResponse({ error: error.message });
  }

  // Return true is not needed here since we're not using async patterns
});

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  debuggerManager.detach(tabId);
});

// Store global instances for cleanup
globalThis.cacheInstance = cacheManager;
globalThis.stateManagerInstance = backgroundStateManager;

console.log("Nexus Background Service Worker initialized");
