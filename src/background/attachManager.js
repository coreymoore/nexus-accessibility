import { DETACH_IDLE_MS } from "./constants.js";
import { attachedTabs, contextCache } from "./state.js";
import { ensureDomains } from "./cdp.js";
import { docRoots, nodeCache } from "./caches.js";
import { chromeAsync } from "../utils/chromeAsync.js";
import { errorRecovery } from "../utils/errorRecovery.bg.js";

export async function attachIfNeeded(tabId) {
  const info = attachedTabs.get(tabId);
  if (info?.attached) return;

  return await errorRecovery.executeWithRecovery(
    `attach-${tabId}`,
    async () => {
      await chromeAsync.debugger.attach({ tabId }, "1.3");
      await ensureDomains(tabId);
      attachedTabs.set(tabId, { attached: true, lastUsed: Date.now() });
    },
    {
      onError: (error, retryCount) => {
        console.warn(
          `Debugger attach failed (attempt ${retryCount + 1}):`,
          error.message
        );
      },
      shouldRetry: (error) => {
        // Don't retry if already attached or permission denied
        return (
          !error.message.includes("already attached") &&
          !error.message.includes("Permission denied")
        );
      },
    }
  );
}

export async function markUsed(tabId) {
  const info = attachedTabs.get(tabId);
  if (info) info.lastUsed = Date.now();
}

// Deprecated: unified detach scheduling handled by connectionManager/debugger-manager.
// Keep a no-op to avoid breaking legacy imports.
export function scheduleIdleDetach(tabId) {
  // no-op (legacy path disabled to reduce alarm proliferation)
}

export function initDetachHandlers() {
  // Legacy handler disabled; connectionManager handles detach & cache invalidation.
}

export async function doDetach(tabId) {
  return await errorRecovery
    .executeWithRecovery(
      `detach-${tabId}`,
      async () => {
        await chromeAsync.debugger.detach({ tabId });
      },
      {
        shouldRetry: (error) => {
          // Don't retry if not attached
          return !error.message.includes("not attached");
        },
      }
    )
    .catch((error) => {
      // Ignore "not attached" errors in final catch
      if (!error.message.includes("not attached")) {
        console.warn("Error during debugger detach:", error);
      }
    })
    .finally(() => {
      attachedTabs.delete(tabId);
      for (const k of Array.from(contextCache.keys()))
        if (k.startsWith(`${tabId}:`)) contextCache.delete(k);
      for (const k of Array.from(docRoots.keys()))
        if (k.startsWith(`${tabId}:`)) docRoots.delete(k);
      for (const k of Array.from(nodeCache.keys()))
        if (k.startsWith(`${tabId}:`)) nodeCache.delete(k);
    });
}
