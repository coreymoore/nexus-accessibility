import { DebuggerConnectionManager } from "./connectionManager.js";
import { getOrCreateIsolatedWorld, evalInWorld, resolveNode, getPartialAXTree } from "./cdp.js";

// Create a shared connection manager instance for the router
const connectionManager = new DebuggerConnectionManager();

export function initRouter() {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!sender?.tab?.id) return; // ignore popup/runtime messages without tab
    const tabId = sender.tab.id;
    const frameId = sender.frameId ?? 0;

    if (msg?.type !== "AX_REQUEST") return;
    
    // Use connection manager instead of queueDebuggerSession
    connectionManager.executeWithDebugger(
      tabId,
      async ({ connection }) => {
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
        }
      },
      { frameId }
    ).catch(err => {
      sendResponse({ ok: false, error: String(err && err.message || err) });
    });

    // Use async response
    return true;
  });
}
