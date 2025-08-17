import {
  attachIfNeeded,
  scheduleIdleDetach as scheduleDetach,
  initDetachHandlers,
  markUsed,
} from "./background/attachManager.js";
import { initRouter } from "./background/router.js";
import { getCdpFrameId, getOrCreateIsolatedWorld } from "./background/cdp.js";
import { chromeAsync } from "./utils/chromeAsync.js";
import { errorRecovery } from "./utils/errorRecovery.js";
import { scheduler } from "./utils/scheduler.js";
import { frameContextManager } from "./utils/frameContextManager.js";
import { contentInjector } from "./utils/contentInjector.js";
import { logger } from "./utils/logger.js";
import { DebuggerConnectionManager } from "./background/connectionManager.js";
import { getAccessibilityInfoForElement } from "./background/accessibilityInfo.js";
import { MessageValidator } from "./background/message-validator.js";
import "./utils/contentInjector.js"; // Initialize content script injection
import "./utils/testUtils.js"; // Load testing utilities

// Initialize the connection manager
const connectionManager = new DebuggerConnectionManager();

chrome.runtime.onInstalled.addListener(() => {
  console.log("Chrome Accessibility Extension installed");
});

// Initialize shared detach/cleanup handlers
initDetachHandlers();
initRouter();

// Caches handled via SmartCache in background/caches.js where needed

/**
 * Helper function to get the full accessibility tree for a tab
 * @param {number} tabId - The Chrome tab ID
 * @returns {Promise<Array>} Array of accessibility nodes
 * @throws {Error} If debugger operations fail
 */
async function getAccessibilityTree(tabId) {
  try {
    await chromeAsync.debugger.attach({ tabId }, "1.3");
    await chromeAsync.debugger.sendCommand({ tabId }, "Accessibility.enable");
    const { nodes } = await chromeAsync.debugger.sendCommand(
      { tabId },
      "Accessibility.getFullAXTree"
    );
    await chromeAsync.debugger.detach({ tabId });
    return nodes;
  } catch (e) {
    try {
      await chromeAsync.debugger.detach({ tabId });
    } catch {}
    throw e;
  }
}

/**
 * Main message handler for extension communication
 * Handles requests for accessibility tree data and element inspection
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  try {
    if (msg) {
      MessageValidator.validate(msg, sender);
    }
  } catch (e) {
    sendResponse && sendResponse({ error: e.message });
    return false;
  }
  // Relay inspector-coordination messages across all frames in the tab
  if (msg && msg.type === "AX_INSPECTOR_SHOWN") {
    (async () => {
      try {
        if (!sender || !sender.tab || !sender.tab.id) return;
        const tabId = sender.tab.id;
        // Get all frames in this tab and broadcast
        const frames = await chromeAsync.webNavigation.getAllFrames({ tabId });
        for (const f of frames) {
          try {
            await chromeAsync.tabs.sendMessage(tabId, msg, {
              frameId: f.frameId,
            });
          } catch (e) {
            // ignore frames without our content script
          }
        }
      } catch (e) {
        console.warn("Failed to relay AX_INSPECTOR_SHOWN:", e);
      }
    })();
    return false;
  }

  if (msg.action === "getAccessibilityTree") {
    (async () => {
      try {
        const [tab] = await chromeAsync.tabs.query({
          active: true,
          currentWindow: true,
        });
        const tabId = tab.id;
        const tree = await connectionManager.executeWithDebugger(
          tabId,
          async () => {
            const { nodes } = await chromeAsync.debugger.sendCommand(
              { tabId },
              "Accessibility.getFullAXTree"
            );
            return nodes;
          }
        );
        sendResponse({ tree });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }

  if (
    msg.action === "getBackendNodeIdAndAccessibleInfo" ||
    msg.action === "getAccessibleInfo"
  ) {
    (async () => {
      try {
        const tabId = sender?.tab?.id;
        const frameId = sender?.frameId;

        if (!tabId) {
          sendResponse({ error: "No tab ID available" });
          return;
        }

        console.log("Background: received message", msg, "for tab", tabId);

        const result = await connectionManager.executeWithDebugger(
          tabId,
          async ({ connection }) => {
            return await getAccessibilityInfoForElement(
              tabId,
              frameId,
              msg.elementSelector,
              connection
            );
          },
          { frameId }
        );

        sendResponse(result);
      } catch (error) {
        console.error("Error in accessibility info handler:", error);
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }

  // Detach debugger when requested by content script
  if (msg.action === "detachDebugger") {
    (async () => {
      try {
        const [tab] = await chromeAsync.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tab && tab.id) {
          await connectionManager.executeWithDebugger(tab.id, async () => {
            // Only detach if currently attached; when not attached, no-op
            try {
              await chromeAsync.debugger.sendCommand(
                { tabId: tab.id },
                "Target.getBrowserContexts"
              );
              await chromeAsync.debugger.detach({ tabId: tab.id });
              console.log("Debugger detached from tab", tab.id);
            } catch (err) {
              // If not attached, ignore; otherwise warn
              if (!String(err?.message || err).includes("not attached")) {
                console.warn("Failed to detach debugger:", err);
              }
            }
          });
        }
      } catch (err) {
        console.warn("Failed to queue debugger detach:", err);
      }
    })();
    return false;
  }
});
