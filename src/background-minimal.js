// Minimal background service worker for badge functionality
import { BadgeManager } from "./background/badge-manager.js";

// Initialize badge manager
const badgeManager = new BadgeManager();

console.log("[Background] Minimal service worker started");
console.log("[Background] Badge manager available:", !!badgeManager);

// Test badge API availability on startup
setTimeout(() => {
  console.log("[Background] Testing badge API availability...");
  if (typeof chrome !== "undefined" && chrome.action) {
    console.log("[Background] Chrome action API is available");
    chrome.action
      .setBadgeText({ text: "TEST" })
      .then(() => {
        console.log("[Background] Test badge set successfully");
        setTimeout(() => {
          chrome.action.setBadgeText({ text: "" }).then(() => {
            console.log("[Background] Test badge cleared successfully");
          });
        }, 2000);
      })
      .catch((error) => {
        console.error("[Background] Test badge failed:", error);
      });
  } else {
    console.error("[Background] Chrome action API not available");
  }
}, 1000);

/**
 * Main message handler for extension communication
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log(
    "[Background] Received message:",
    msg.action || msg.type,
    "from:",
    sender.tab?.id || "unknown"
  );

  // Handle scan completed messages for badge updates
  if (msg.action === "scanCompleted") {
    console.log("[Background] Processing scanCompleted message");

    (async () => {
      try {
        const tabId = sender?.tab?.id || msg.tabId;
        if (!tabId) {
          console.warn("[Background] No tab ID in scan completed message");
          sendResponse({ status: "no_tab_id" });
          return;
        }

        const violationCount = msg.violationCount || 0;
        console.log(
          `[Background] Scan completed for tab ${tabId}: ${violationCount} violations`
        );
        console.log(`[Background] BadgeManager available:`, !!badgeManager);

        // Update badge with violation count
        if (badgeManager) {
          console.log(
            `[Background] Calling badgeManager.updateViolationCount(${tabId}, ${violationCount})`
          );
          badgeManager.updateViolationCount(tabId, violationCount);
          console.log(`[Background] Badge update call completed`);
        } else {
          console.warn("[Background] Badge manager not available");
        }

        sendResponse({
          status: "success",
          violationCount,
          tabId,
          badgeManagerAvailable: !!badgeManager,
        });
      } catch (error) {
        console.error("[Background] Error handling scanCompleted:", error);
        sendResponse({ status: "error", error: error.message });
      }
    })();
    return true; // Keep sendResponse alive for async operation
  }

  // Handle other message types here if needed
  console.log("[Background] Unhandled message type:", msg.action || msg.type);
});

console.log("[Background] Message listeners registered");
