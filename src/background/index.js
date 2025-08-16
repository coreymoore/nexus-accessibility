import { CacheManager } from "./cache-manager.js";
import { DebuggerManager } from "./debugger-manager.js";
import { MessageHandler } from "./message-handler.js";
import { BadgeManager } from "./badge-manager.js";

// Initialize managers
const cacheManager = new CacheManager();
const debuggerManager = new DebuggerManager();
const badgeManager = new BadgeManager();
const messageHandler = new MessageHandler(
  cacheManager,
  debuggerManager,
  badgeManager
);

// Setup message listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("[BackgroundService] Received message:", msg, "from:", sender);

  messageHandler
    .handle(msg, sender)
    .then((response) => {
      console.log("[BackgroundService] Sending response:", response);
      sendResponse(response);
    })
    .catch((error) => {
      console.error("[BackgroundService] Message handling error:", error);
      sendResponse({ error: error.message });
    });
  return true; // Keep channel open for async response
});

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  debuggerManager.detach(tabId);
});

// Store global cache instance for cleanup
globalThis.cacheInstance = cacheManager;

console.log("Nexus Background Service Worker initialized");
