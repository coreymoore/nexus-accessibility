import { DETACH_IDLE_MS } from "./constants.js";
import { attachedTabs, contextCache } from "./state.js";
import { ensureDomains } from "./cdp.js";
import { docRoots, nodeCache } from "./caches.js";
import { chromeAsync } from "../utils/chromeAsync.js";
import { errorRecovery } from "../utils/errorRecovery.js";

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
        console.warn(`Debugger attach failed (attempt ${retryCount + 1}):`, error.message);
      },
      shouldRetry: (error) => {
        // Don't retry if already attached or permission denied
        return !error.message.includes('already attached') && 
               !error.message.includes('Permission denied');
      }
    }
  );
}

export async function markUsed(tabId) {
  const info = attachedTabs.get(tabId);
  if (info) info.lastUsed = Date.now();
}

export function scheduleIdleDetach(tabId) {
  chrome.alarms.create(`ax-detach-${tabId}`, { when: Date.now() + DETACH_IDLE_MS });
}

export function initDetachHandlers() {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (!alarm.name.startsWith("ax-detach-")) return;
    const tabId = Number(alarm.name.replace("ax-detach-", ""));
    const info = attachedTabs.get(tabId);
    if (!info) return;
    const idleFor = Date.now() - (info.lastUsed || 0);
    if (idleFor >= DETACH_IDLE_MS) doDetach(tabId).catch(() => {});
  });

  chrome.debugger.onDetach.addListener(({ tabId }) => {
    attachedTabs.delete(tabId);
    // Invalidate contexts
    for (const k of Array.from(contextCache.keys())) if (k.startsWith(`${tabId}:`)) contextCache.delete(k);
    for (const k of Array.from(docRoots.keys())) if (k.startsWith(`${tabId}:`)) docRoots.delete(k);
    for (const k of Array.from(nodeCache.keys())) if (k.startsWith(`${tabId}:`)) nodeCache.delete(k);
  });
}

export async function doDetach(tabId) {
  return await errorRecovery.executeWithRecovery(
    `detach-${tabId}`,
    async () => {
      await chromeAsync.debugger.detach({ tabId });
    },
    {
      shouldRetry: (error) => {
        // Don't retry if not attached
        return !error.message.includes('not attached');
      }
    }
  ).catch((error) => {
    // Ignore "not attached" errors in final catch
    if (!error.message.includes("not attached")) {
      console.warn("Error during debugger detach:", error);
    }
  }).finally(() => {
    attachedTabs.delete(tabId);
    for (const k of Array.from(contextCache.keys())) if (k.startsWith(`${tabId}:`)) contextCache.delete(k);
    for (const k of Array.from(docRoots.keys())) if (k.startsWith(`${tabId}:`)) docRoots.delete(k);
    for (const k of Array.from(nodeCache.keys())) if (k.startsWith(`${tabId}:`)) nodeCache.delete(k);
  });
}
