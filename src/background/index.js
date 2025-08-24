import { CacheManager } from "./cache-manager.js";
import { DebuggerManager } from "./debugger-manager.js";
import { connectionManager } from "./connectionManager.js";
import { MessageHandler } from "./message-handler.js";
import TestUtils from "../utils/testUtils.js";

// Initialize managers
const cacheManager = new CacheManager();
const debuggerManager = new DebuggerManager();
const messageHandler = new MessageHandler(cacheManager, debuggerManager);

// Setup message listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  messageHandler
    .handle(msg, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ error: error.message }));
  return true; // Keep channel open for async response
});

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  debuggerManager.detach(tabId);
});

// Store global cache instance for cleanup
globalThis.cacheInstance = cacheManager;


console.log("Nexus Background Service Worker initialized");

// Attach test utilities to the service worker global for developer console access.
try {
  if (typeof globalThis !== "undefined" && TestUtils) {
    globalThis.NexusTestUtils = TestUtils;
    console.log("[BACKGROUND-INDEX] NexusTestUtils attached:", !!globalThis.NexusTestUtils);
  }
} catch (e) {
  console.warn("[BACKGROUND-INDEX] Failed to attach NexusTestUtils:", e);
}

// Dynamically import and expose connectionManager to globalThis to avoid
// circular import issues when message-handler or other modules import it.
// Expose the imported connectionManager to the service worker global so
// developers can inspect and use it from the worker console.
try {
  if (typeof globalThis !== "undefined" && connectionManager) {
    globalThis.connectionManager = connectionManager;
    console.log("[BACKGROUND-INDEX] connectionManager attached to globalThis");
  }
} catch (e) {
  console.warn("[BACKGROUND-INDEX] Failed to attach connectionManager:", e);
}
