// Core imports needed for basic functionality
import { BadgeManager } from "./background/badge-manager.js";

// Optional imports - wrapped in try/catch to prevent service worker failure
let chromeAsync, attachIfNeeded, scheduleDetach, initDetachHandlers, markUsed;
let initRouter,
  __axDocRoots,
  __axNodeCache,
  getCdpFrameId,
  getOrCreateIsolatedWorld;
let errorRecovery, scheduler, frameContextManager, contentInjector, logger;
let DebuggerConnectionManager, getAccessibilityInfoForElement;

try {
  const imports = await Promise.allSettled([
    import("./utils/chromeAsync.js"),
    import("./background/attachManager.js"),
    import("./background/router.js"),
    import("./background/caches.js"),
    import("./background/cdp.js"),
    import("./utils/errorRecovery.js"),
    import("./utils/frameContextManager.js"),
    import("./utils/contentInjector.js"),
    import("./background/connectionManager.js"),
    import("./background/accessibilityInfo.js"),
  ]);

  const [
    chromeAsyncModule,
    attachManagerModule,
    routerModule,
    cachesModule,
    cdpModule,
    errorRecoveryModule,
    frameContextModule,
    contentInjectorModule,
    connectionManagerModule,
    accessibilityInfoModule,
  ] = imports.map((result) =>
    result.status === "fulfilled" ? result.value : null
  );

  if (chromeAsyncModule) chromeAsync = chromeAsyncModule.chromeAsync;
  if (attachManagerModule) {
    attachIfNeeded = attachManagerModule.attachIfNeeded;
    scheduleDetach = attachManagerModule.scheduleIdleDetach;
    initDetachHandlers = attachManagerModule.initDetachHandlers;
    markUsed = attachManagerModule.markUsed;
  }
  if (routerModule) initRouter = routerModule.initRouter;
  if (cachesModule) {
    __axDocRoots = cachesModule.docRoots;
    __axNodeCache = cachesModule.nodeCache;
  }
  if (cdpModule) {
    getCdpFrameId = cdpModule.getCdpFrameId;
    getOrCreateIsolatedWorld = cdpModule.getOrCreateIsolatedWorld;
  }
  if (errorRecoveryModule) errorRecovery = errorRecoveryModule.errorRecovery;
  if (frameContextModule)
    frameContextManager = frameContextModule.frameContextManager;
  if (contentInjectorModule)
    contentInjector = contentInjectorModule.contentInjector;
  if (connectionManagerModule)
    DebuggerConnectionManager =
      connectionManagerModule.DebuggerConnectionManager;
  if (accessibilityInfoModule)
    getAccessibilityInfoForElement =
      accessibilityInfoModule.getAccessibilityInfoForElement;

  console.log("[Background] Core modules loaded successfully");
} catch (error) {
  console.warn("[Background] Some optional modules failed to load:", error);
}

// Initialize the connection manager (optional)
let connectionManager;
if (DebuggerConnectionManager) {
  connectionManager = new DebuggerConnectionManager();
  console.log("[Background] Connection manager initialized");
}

// Initialize the badge manager (required)
const badgeManager = new BadgeManager();

console.log("[Background] Service worker started successfully");
console.log("[Background] Badge manager available:", !!badgeManager);

// Test badge API availability
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

chrome.runtime.onInstalled.addListener(() => {
  console.log("Chrome Accessibility Extension installed");
});

// Initialize shared detach/cleanup handlers
initDetachHandlers();
initRouter();

// Caches are now shared via module to persist across SW runs when possible

// Cache policy
const AX_DOCROOT_TTL_MS = 30000; // 30s per-frame document root TTL
const AX_NODECACHE_TTL_MS = 10000; // 10s per selector->nodeId cache entry
const AX_NODECACHE_MAX_ENTRIES = 500; // cap total entries to bound memory

/**
 * Evicts the oldest entry from the node cache to prevent unbounded growth
 */
function evictOldestNodeCacheEntry() {
  let oldestKey = null;
  let oldestT = Infinity;
  for (const [k, v] of __axNodeCache) {
    const t = v && v.t ? v.t : 0;
    if (t < oldestT) {
      oldestT = t;
      oldestKey = k;
    }
  }
  if (oldestKey) __axNodeCache.delete(oldestKey);
}

/**
 * Helper function to get the full accessibility tree for a tab
 * @param {number} tabId - The Chrome tab ID
 * @returns {Promise<Array>} Array of accessibility nodes
 * @throws {Error} If debugger operations fail
 */
async function getAccessibilityTree(tabId) {
  if (!chromeAsync) {
    throw new Error("[Background] chromeAsync not available");
  }

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
  // Relay tooltip-coordination messages across all frames in the tab
  if (msg && msg.type === "AX_TOOLTIP_SHOWN") {
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
        console.warn("Failed to relay AX_TOOLTIP_SHOWN:", e);
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

  // Handle scan completed messages for badge updates
  if (msg.action === "scanCompleted") {
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
          `[Background] Scan completed for tab ${tabId}: ${violationCount} violations (source: ${
            sender.tab?.id ? "content" : "popup"
          })`
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

        sendResponse({ status: "badge_updated", tabId, violationCount });
      } catch (error) {
        console.error("[Background] Error handling scan completed:", error);
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
