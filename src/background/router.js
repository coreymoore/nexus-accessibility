import { queueDebuggerSession } from "./queue.js";
import { attachIfNeeded, markUsed, scheduleIdleDetach, initDetachHandlers } from "./attachManager.js";
import { getOrCreateIsolatedWorld, evalInWorld, resolveNode, getPartialAXTree } from "./cdp.js";

export function initRouter() {
  initDetachHandlers();

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!sender?.tab?.id) return; // ignore popup/runtime messages without tab
    const tabId = sender.tab.id;
    const frameId = sender.frameId ?? 0;

    if (msg?.type !== "AX_REQUEST") return;
    // Queue all work per tab to avoid attach races
    queueDebuggerSession(tabId, async () => {
      await attachIfNeeded(tabId);
      await markUsed(tabId);

      try {
        const worldId = await getOrCreateIsolatedWorld(tabId, String(sender.frameId), "AX_Helper");
        const evalResult = await evalInWorld(
          tabId,
          worldId,
          "(() => ({objectId: document.body}))()" // placeholder; real impl should accept a selector/objectId
        );
        const backendNodeId = await resolveNode(tabId, evalResult.objectId);
        const nodes = await getPartialAXTree(tabId, backendNodeId, true);
        sendResponse({ ok: true, nodes });
      } catch (err) {
        sendResponse({ ok: false, error: String(err && err.message || err) });
      } finally {
        scheduleIdleDetach(tabId);
      }
    });

    // Use async response
    return true;
  });
}
