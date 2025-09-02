import { MessageValidator } from "./message-validator.js";
import { getAccessibilityInfoForElement } from "./accessibilityInfo.js";
import { nodeCache as __axNodeCache } from "./caches.js";
import { connectionManager } from "./connectionManager.js";
import {
  getOrCreateIsolatedWorld,
  evalInWorld,
  resolveNode,
  getPartialAXTree,
} from "./cdp.js";
import { DIRECT_CACHE_TTL_MS } from "./constants.js";

export class MessageHandler {
  constructor(cacheManager) {
    this.cache = cacheManager;
    // Micro-cache for direct-reference results to avoid CDP churn during rapid
    // key navigation. Keyed by `element-direct-${tabId}-${frameId}` and
    // stores { value, t } where t is timestamp in ms.
    this.directCache = new Map();
  }

  async handle(msg, sender) {
    try {
      // Validate the message
      MessageValidator.validate(msg, sender);

      const action = msg.action || msg.type;

      switch (action) {
        case "CLEAR_CACHES":
          return await this.handleClearCaches(msg, sender);

        case "REQUEST_HOST_PERMISSION":
          return await this.handleRequestHostPermission(msg, sender);

        case "AX_REQUEST":
          return await this.handleAXRequest(msg, sender);

        case "NEXUS_TAB_INIT":
          return await this.handleNexusTabInit(msg, sender);

        case "getAccessibilityTree":
          return await this.handleGetAccessibilityTree(msg, sender);

        case "getBackendNodeIdAndAccessibleInfo":
          return await this.handleGetElementInfo(msg, sender);

        case "AX_INSPECTOR_SHOWN":
          return await this.handleInspectorShown(msg, sender);

        case "detachDebugger":
          return await this.handleDetachDebugger(msg, sender);

        case "keepAlive":
          return { status: "alive" };

        case "invalidateAccessibilityCache":
          return await this.handleInvalidateCache(msg, sender);

        default:
          throw new Error(`Unhandled action: ${action}`);
      }
    } catch (error) {
      console.error("Message handling error:", error);
      return { error: error.message };
    }
  }

  async handleClearCaches(msg, sender) {
    try {
      const tabId = sender.tab && sender.tab.id;
      if (!tabId) {
        return { status: "no_tab_id" };
      }

      const opts = {};
      if (msg && msg.correlationId) opts.correlationId = msg.correlationId;
      const results = await connectionManager.clearCaches(tabId, opts);

  const resp = { status: "cleared", tabId, results };
      if (opts.correlationId) resp.correlationId = opts.correlationId;

      // If connectionManager annotated permission issues, surface them here
      try {
        if (results && typeof results.permissionRequiredCount === 'number') {
          resp.permissionRequiredCount = results.permissionRequiredCount;
        }
      } catch (e) {
        // ignore
      }

      // Surface blocked hosts at top-level for easier UX
      try {
        const blocked = new Set();
        if (Array.isArray(results)) {
          for (const r of results) {
            if (r && r.permissionRequired && r.url) {
              try {
                const u = new URL(r.url);
                blocked.add(`${u.protocol}//${u.hostname}/*`);
              } catch (e) {}
            }
          }
        }
        if (blocked.size) resp.blockedHosts = Array.from(blocked);
      } catch (e) {
        // ignore
      }

      return resp;
    } catch (error) {
      console.error("[MessageHandler] handleClearCaches failed:", error);
      return { status: "error", error: error.message };
    }
  }

  async handleRequestHostPermission(msg, sender) {
    try {
      if (!msg || !msg.origin) return { status: 'no_origin' };
      const origins = Array.isArray(msg.origin) ? msg.origin : [msg.origin];
      return await new Promise((resolve) => {
        chrome.permissions.request({ origins }, (granted) => {
          if (chrome.runtime.lastError) {
            return resolve({ status: 'error', error: chrome.runtime.lastError.message });
          }
          resolve({ status: granted ? 'granted' : 'denied', origins });
        });
      });
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async handleNexusTabInit(msg, sender) {
    try {
      const tabId = sender?.tab?.id;
      if (!tabId) {
        return { status: "no_tab_id" };
      }

      // Persist to chrome.storage.local for test utilities to use when tabs
      // permission is not present.
      try {
        await new Promise((resolve, reject) => {
          chrome.storage.local.set({ nexus_test_tabId: tabId }, () => {
            const err = chrome.runtime.lastError;
            if (err) return reject(err);
            resolve();
          });
        });
        console.log("[MessageHandler] Persisted nexus_test_tabId:", tabId);
        return { status: "stored", tabId };
      } catch (storageErr) {
        console.warn(
          "[MessageHandler] Failed to persist nexus_test_tabId:",
          storageErr
        );
        return { status: "failed_to_store", error: storageErr.message };
      }
    } catch (error) {
      console.error("[MessageHandler] handleNexusTabInit error:", error);
      return { status: "error", error: error.message };
    }
  }

  async handleGetAccessibilityTree(msg, sender) {
    const tabId = sender.tab.id;
    const cacheKey = `tree-${tabId}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Use connectionManager to ensure attachment & serialized access
      const { nodes } = await connectionManager.executeWithDebugger(
        tabId,
        async () => {
          const { nodes } = await chrome.debugger.sendCommand(
            { tabId },
            "Accessibility.getFullAXTree",
            {}
          );
          return { nodes };
        }
      );

      const result = { nodes };
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      throw new Error(`Failed to get accessibility tree: ${error.message}`);
    }
  }

  async handleGetElementInfo(msg, sender) {
    try {
      const tabId = sender.tab?.id;
      const frameId = sender.frameId;

      if (!tabId) {
        throw new Error("No tab ID available");
      }

      // Check if we're using the new direct reference approach
      if (msg.useDirectReference) {
        console.log("Background: Using direct element reference approach");

          const cacheKey = `element-direct-${tabId}-${frameId || 0}`;
          // Check micro-cache first (TTL 150ms)
          try {
            const cached = this.directCache.get(cacheKey);
            if (cached && Date.now() - cached.t < DIRECT_CACHE_TTL_MS) {
              console.log("Background: Returning micro-cached direct reference result");
              return cached.value;
            }
          } catch (e) {
            // ignore cache errors
          }

          // Ensure debugger is attached and get connection
          console.log("Background: attaching debugger to tab", tabId);
          // Use serialized path via connectionManager
          await connectionManager.ensureAttached(tabId);
          const connection = connectionManager.getConnectionState(tabId);
          console.log("Background: debugger attached, connection:", connection);

          // Get accessibility info using direct reference method
          console.log(
            "Background: calling getAccessibilityInfoForElement with direct reference"
          );
          const result = await getAccessibilityInfoForElement(
            tabId,
            frameId || 0,
            msg.elementSelector || null, // Pass selector as a fallback if provided
            connection,
            true // Flag to use direct reference
          );
          console.log(
            "Background: got result from direct reference method:",
            result
          );

          // Store micro-cache entry
          try {
            this.directCache.set(cacheKey, { value: result, t: Date.now() });
          } catch (e) {
            // ignore
          }

          return result;
      }

      // Legacy selector-based approach (fallback)
      const cacheKey = `element-${tabId}-${frameId || 0}-${
        msg.elementSelector
      }`;

      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      console.log(
        "Background: getting accessibility info for",
        msg.elementSelector,
        "in tab",
        tabId
      );

      // Ensure debugger is attached and get connection
      console.log("Background: attaching debugger to tab", tabId);
  await connectionManager.ensureAttached(tabId);
  const connection = connectionManager.getConnectionState(tabId);
      console.log("Background: debugger attached, connection:", connection);

      // Get accessibility info using the debugger connection
      console.log("Background: calling getAccessibilityInfoForElement");
      const result = await getAccessibilityInfoForElement(
        tabId,
        frameId || 0,
        msg.elementSelector,
        connection
      );
      console.log(
        "Background: got result from getAccessibilityInfoForElement:",
        result
      );

      // Cache the result
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Background: Error in handleGetElementInfo:", error);
      console.error("Background: Error stack:", error.stack);
      throw new Error(`Failed to get element info: ${error.message}`);
    }
  }

  async handleInspectorShown(msg, sender) {
    // Relay inspector-coordination messages across all frames in the tab
    try {
      if (!sender || !sender.tab || !sender.tab.id) return;
      const tabId = sender.tab.id;

      // Get all frames in this tab and broadcast
      const frames = await chrome.webNavigation.getAllFrames({ tabId });
      for (const frame of frames) {
        try {
          await chrome.tabs.sendMessage(tabId, msg, {
            frameId: frame.frameId,
          });
        } catch (e) {
          // Ignore frame errors
        }
      }
      return { status: "broadcasted" };
    } catch (error) {
      throw new Error(`Failed to handle inspector shown: ${error.message}`);
    }
  }

  async handleDetachDebugger(msg, sender) {
    try {
      const tabId = sender.tab?.id || msg.tabId;
      if (tabId) {
        // Schedule a detach rather than forcing immediate detach to avoid
        // attach/detach churn when users quickly refocus the page.
        // Delegate to connectionManager idle detach scheduling
        if (typeof connectionManager.scheduleDetach === 'function') {
          connectionManager.scheduleDetach(tabId);
        } else if (typeof connectionManager.detach === 'function') {
          await connectionManager.detach(tabId);
        }
        return { status: "scheduled_detach", tabId };
      }
      return { status: "no_tab_id" };
    } catch (error) {
      throw new Error(`Failed to detach debugger: ${error.message}`);
    }
  }

  async handleInvalidateCache(msg, sender) {
    try {
      const tabId = sender.tab?.id || msg.tabId;
      const frameId = msg.frameId || 0;
      const elementSelector = msg.elementSelector;
      const reason = msg.reason;

      if (!elementSelector) {
        console.warn(
          "[MessageHandler] No element selector provided for cache invalidation"
        );
        return { status: "no_selector" };
      }

      // Construct the cache key format variants used in accessibilityInfo.js
      const cdpCacheKey = `${tabId}:cdp:${frameId}`;
      const mainCacheKey = `${tabId}:main`;
      const cacheSelKeyCdp = `${cdpCacheKey}::${elementSelector}`;
      const cacheSelKeyMain = `${mainCacheKey}::${elementSelector}`;

      console.log(
        `[MessageHandler] Invalidating caches for selector: ${elementSelector}, reasons: ${reason || "general"}, mode: ${msg.mode || 'selector'}`
      );

      // Clear the CDP node cache entries (both cdp-scoped and main-scoped variants)
      const deletedKeys = [];
      if (__axNodeCache.delete(cacheSelKeyCdp)) deletedKeys.push(cacheSelKeyCdp);
      if (__axNodeCache.delete(cacheSelKeyMain)) deletedKeys.push(cacheSelKeyMain);

      // Mode-aware deletion: if the caller indicates mode==='direct', avoid deleting
      // selector-based cache entries to preserve selector cache for other consumers.
      const mode = msg.mode || 'selector';

      // Clear the higher-level result cache used by MessageHandler (selector-based)
      const generalCacheKey = `element-${tabId}-${frameId}-${elementSelector}`;
      if (mode !== 'direct') {
        if (this.cache.delete(generalCacheKey)) deletedKeys.push(generalCacheKey);
      } else {
        // When mode is direct, prefer conservative deleteWithMode on direct keys only
        // and do not evict selector caches.
      }

      // Attempt to clear any direct-reference cache variants that may include selectors
      const directKeys = [
        `element-direct-${tabId}-${frameId}`,
        `element-direct-${tabId}-${frameId}::${elementSelector}`,
        `element-direct-${tabId}-${frameId}-${elementSelector}`,
      ];
      for (const dk of directKeys) {
        // Use cache manager's mode-aware delete to avoid evicting unrelated keys
        try {
          const deleted = this.cache.deleteWithMode
            ? this.cache.deleteWithMode(dk, { mode })
            : this.cache.delete(dk);
          if (deleted) deletedKeys.push(dk);
        } catch (e) {
          // ignore per-key deletion errors
        }
      }

      // Also clear the underlying CDP node cache keyed entries explicitly (already attempted above),
      // and ensure we remove any stored node cache for other common key patterns.
      // Pattern: `${tabId}:cdp:${frameId}::${elementSelector}` already handled; also try without frame scoping.

      // Emit debug/telemetry about cleared keys only when verbose testing mode is enabled.
      // Use a global NEXUS_TESTING_MODE.verbose flag so this can be toggled at runtime
      // without affecting production behavior.
      try {
        if (globalThis?.NEXUS_TESTING_MODE?.verbose) {
          console.debug("[MessageHandler][TESTING] Cleared cache keys:", deletedKeys);
        }
      } catch (e) {
        // Swallow any telemetry/logging errors to avoid affecting invalidation flow
      }

      return {
        status: "invalidated",
        deleted: deletedKeys,
        enhanced: reason === "combobox-expanded-change",
      };
    } catch (error) {
      console.error("[MessageHandler] Failed to invalidate cache:", error);
      throw new Error(`Failed to invalidate cache: ${error.message}`);
    }
  }

  async handleAXRequest(msg, sender) {
    // Mirror the previous router.js behavior but centralize through MessageHandler
    try {
      if (!sender?.tab?.id) return { ok: false, error: 'no_tab' };
      const tabId = sender.tab.id;
      const frameId = sender.frameId ?? 0;

      // Use the shared connection manager to serialize debugger operations
      const result = await connectionManager.executeWithDebugger(
        tabId,
        async ({ connection }) => {
          try {
            const worldId = await getOrCreateIsolatedWorld(
              tabId,
              String(sender.frameId),
              "AX_Helper"
            );
            const evalResult = await evalInWorld(
              tabId,
              worldId,
              // If a selector was provided, attempt to evaluate with it, otherwise default to document.body
              msg.selector
                ? `(() => ({objectId: (function(){ const el = document.querySelector(${JSON.stringify(
                    msg.selector
                  )}); return el || document.body; })()}))()`
                : "(() => ({objectId: document.body}))()"
            );

            const backendNodeId = await resolveNode(tabId, evalResult.objectId);
            const nodes = await getPartialAXTree(tabId, backendNodeId, true);
            return { ok: true, nodes };
          } catch (err) {
            return { ok: false, error: String((err && err.message) || err) };
          }
        },
        { frameId }
      );

      return result;
    } catch (error) {
      return { ok: false, error: String((error && error.message) || error) };
    }
  }
}
