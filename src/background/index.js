import { CacheManager } from "./cache-manager.js";
import { DebuggerManager } from "./debugger-manager.js";
import { MessageHandler } from "./message-handler.js";

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
