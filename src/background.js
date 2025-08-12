import { queueDebuggerSession } from "./background/queue.js";
import { attachIfNeeded, scheduleIdleDetach as scheduleDetach, initDetachHandlers, markUsed } from "./background/attachManager.js";
import { initRouter } from "./background/router.js";
import { docRoots as __axDocRoots, nodeCache as __axNodeCache } from "./background/caches.js";
import { getCdpFrameId, getOrCreateIsolatedWorld } from "./background/cdp.js";
import { chromeAsync } from "./utils/chromeAsync.js";

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
            await chromeAsync.tabs.sendMessage(tabId, msg, { frameId: f.frameId });
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
        const tree = await queueDebuggerSession(tabId, async () => {
          await attachIfNeeded(tabId);
          try {
            const { nodes } = await chromeAsync.debugger.sendCommand(
              { tabId },
              "Accessibility.getFullAXTree"
            );
            return nodes;
          } finally {
            scheduleDetach(tabId);
          }
        });
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
      let tabId;
      try {
        console.log("Background: received message", msg);
        const [tab] = await chromeAsync.tabs.query({
          active: true,
          currentWindow: true,
        });
        tabId = tab.id;
        console.log("Background: using tab", tabId);

        const result = await queueDebuggerSession(tabId, async () => {
          await attachIfNeeded(tabId);
          await markUsed(tabId);
          try {
            // Resolve the correct frame: prefer sender.frameId -> CDP frame; fall back to main doc
            let documentNodeId;
            const chromeFrameId =
              sender && typeof sender.frameId !== "undefined"
                ? sender.frameId
                : undefined;
            let pageFrameId;
            if (typeof chromeFrameId === "number") {
              pageFrameId = await getCdpFrameId(tabId, chromeFrameId, msg.frameUrl);
              if (!pageFrameId && msg.frameUrl) {
                console.warn("Failed to map CDP frame for", { chromeFrameId, url: msg.frameUrl });
              }
            }
            // Only two cache scopes: main or a concrete CDP frame; never cache under ext frameId
            const cacheKey = pageFrameId ? `${tabId}:cdp:${pageFrameId}` : `${tabId}:main`;
            const cached = __axDocRoots.get(cacheKey);
            if (
              cached &&
              cached.nodeId &&
              Date.now() - cached.t <= AX_DOCROOT_TTL_MS
            ) {
              documentNodeId = cached.nodeId;
            } else {
              // For main frame, cache top-level document root. For subframes, we won't rely on DOM.getDocument.
              if (!pageFrameId) {
                const { root } = await chromeAsync.debugger.sendCommand(
                  { tabId },
                  "DOM.getDocument",
                  { depth: 1 }
                );
                documentNodeId = root.nodeId;
                __axDocRoots.set(cacheKey, {
                  nodeId: documentNodeId,
                  t: Date.now(),
                });
              }
            }

            const cacheSelKey = `${cacheKey}::${msg.elementSelector}`;
            let cachedNode = __axNodeCache.get(cacheSelKey);
            let nodeId = cachedNode && cachedNode.nodeId;
            let usedCache = false;
            if (nodeId) {
              // TTL check
              if (
                cachedNode &&
                Date.now() - cachedNode.t > AX_NODECACHE_TTL_MS
              ) {
                __axNodeCache.delete(cacheSelKey);
                nodeId = 0;
              }
            }
            if (nodeId) {
              // Validate quickly by asking for a small AX slice; if it fails, we'll re-query
              try {
                const test = await chromeAsync.debugger.sendCommand(
                  { tabId },
                  "Accessibility.getPartialAXTree",
                  { nodeId, fetchRelatives: false }
                );
                if (test && Array.isArray(test.nodes) && test.nodes.length) {
                  usedCache = true;
                } else {
                  nodeId = 0;
                }
              } catch {
                nodeId = 0;
              }
            }
            if (!nodeId) {
              if (pageFrameId) {
                // Cross-origin or subframe: evaluate in the frame's isolated world
                try {
                  const ctxId = await getOrCreateIsolatedWorld(tabId, pageFrameId, "AX_Helper");
                  const expr = `document.querySelector(${JSON.stringify(msg.elementSelector)})`;
                  const { result } = await chromeAsync.debugger.sendCommand(
                    { tabId },
                    "Runtime.evaluate",
                    { contextId: ctxId, expression: expr, returnByValue: false, awaitPromise: false }
                  );
                  const objectId = result && result.objectId;
                  if (objectId) {
                    const { node } = await chromeAsync.debugger.sendCommand(
                      { tabId },
                      "DOM.describeNode",
                      { objectId }
                    );
                    nodeId = node?.nodeId || 0;
                  }
                } catch (e) {
                  console.warn("Frame-world query failed; falling back to main DOM query", e);
                }
              }
              // Fallback to main frame DOM query
              if (!nodeId && documentNodeId) {
                let q = await chromeAsync.debugger.sendCommand(
                  { tabId },
                  "DOM.querySelector",
                  {
                    nodeId: documentNodeId,
                    selector: msg.elementSelector,
                  }
                );
                nodeId = q.nodeId;
                // If query fails (nodeId 0), refresh root once and retry quickly
                if (!nodeId && !pageFrameId) {
                  try {
                    const { root } = await chromeAsync.debugger.sendCommand(
                      { tabId },
                      "DOM.getDocument",
                      { depth: 1 }
                    );
                    documentNodeId = root.nodeId;
                    __axDocRoots.set(cacheKey, {
                      nodeId: documentNodeId,
                      t: Date.now(),
                    });
                    q = await chromeAsync.debugger.sendCommand(
                      { tabId },
                      "DOM.querySelector",
                      {
                        nodeId: documentNodeId,
                        selector: msg.elementSelector,
                      }
                    );
                    nodeId = q.nodeId;
                  } catch {}
                }
              }
              if (nodeId) {
                // Enforce cache cap
                while (__axNodeCache.size >= AX_NODECACHE_MAX_ENTRIES) {
                  evictOldestNodeCacheEntry();
                }
                __axNodeCache.set(cacheSelKey, { nodeId, t: Date.now() });
              }
            }

            if (!nodeId) {
              return { error: "Node not found" };
            }

            // Get the accessibility node with all properties
            const { nodes } = await chromeAsync.debugger.sendCommand(
              { tabId },
              "Accessibility.getPartialAXTree",
              {
                nodeId,
                fetchRelatives: true,
              }
            );

            // Optionally get DOM attributes to capture ARIA properties (defer unless needed)
            let attributes = null;

            if (!nodes || !nodes.length) {
              return { error: "No AXNode found" };
            }

            // Prefer a non-ignored node with a concrete role if available
            let node = nodes[0];
            const pick = nodes.find(
              (n) => n && !n.ignored && n.role && (n.role.value || n.role)
            );
            if (pick) node = pick;
            // If chosen node is still ignored, attempt to pick a non-ignored child with a role
            try {
              if (
                node &&
                node.ignored &&
                Array.isArray(node.childIds) &&
                node.childIds.length
              ) {
                const byIdTmp = new Map(nodes.map((n) => [n.nodeId, n]));
                for (const cid of node.childIds) {
                  const c = byIdTmp.get(cid);
                  if (c && !c.ignored && (c.role?.value || c.role)) {
                    node = c;
                    break;
                  }
                }
              }
            } catch (e) {
              console.warn("Failed to refine to child role:", e);
            }
            console.log("Raw AX node:", node, usedCache ? "(cached node)" : "");

            const out = {
              role: node.role?.value || node.role || "(no role)",
              name: node.name?.value || "(no accessible name)",
              description: node.description?.value || "(no description)",
              value: node.value?.value || "(no value)",
              states: {},
              ariaProperties: {},
              ignored: node.ignored || false,
              ignoredReasons: node.ignoredReasons || [],
            };

            // Compute nearest group/radiogroup ancestor from AX tree and include its accessible name
            try {
              if (Array.isArray(nodes) && nodes.length) {
                const roleOf = (n) => n?.role?.value || n?.role || "";
                const nameOf = (n) => {
                  const nn = n?.name;
                  const v = nn && (nn.value ?? nn);
                  return v ? String(v).trim() : "";
                };
                // Build map AX nodeId -> node and child->parent links
                const byId = new Map(nodes.map((n) => [n.nodeId, n]));
                const parentByChild = new Map();
                for (const n of nodes) {
                  const children = n.childIds || [];
                  for (const cid of children) parentByChild.set(cid, n.nodeId);
                }
                // The first node is the target AX node; walk up to find nearest group
                let current = node;
                const wanted = new Set(["group", "radiogroup"]);
                while (current) {
                  const pid = parentByChild.get(current.nodeId);
                  if (!pid) break;
                  const parent = byId.get(pid);
                  if (!parent) break;
                  const r = roleOf(parent);
                  if (wanted.has(r)) {
                    const label = nameOf(parent);
                    out.group = { role: r, label: label || undefined };
                    break;
                  }
                  current = parent;
                }
              }
            } catch (e) {
              console.warn("Failed to compute AX group:", e);
            }

            // Extract ARIA properties from DOM attributes if we have them
            if (attributes && Array.isArray(attributes)) {
              console.log("Processing DOM attributes:", attributes);
              for (let i = 0; i < attributes.length; i += 2) {
                const attrName = attributes[i];
                const attrValue = attributes[i + 1];
                console.log(`Attribute: ${attrName} = ${attrValue}`);
                if (attrName && attrName.startsWith("aria-")) {
                  console.log(
                    `Found ARIA attribute: ${attrName} = ${attrValue}`
                  );
                  out.ariaProperties[attrName] = attrValue;
                }
              }
            } else {
              console.log("No attributes fetched initially");
            }

            // Extract properties from accessibility node (if available)
            if (node.properties && Array.isArray(node.properties)) {
              console.log("Node has properties:", node.properties);
              node.properties.forEach((prop) => {
                console.log("Processing node property:", prop);
                if (prop.name && prop.name.startsWith("aria-")) {
                  // Only add if not already captured from DOM attributes
                  if (!out.ariaProperties[prop.name]) {
                    out.ariaProperties[prop.name] =
                      prop.value?.value || prop.value;
                  }
                } else if (prop.name) {
                  out.states[prop.name] = prop.value?.value || prop.value;
                }
              });
            }

            // If ariaProperties are still empty and we didn't fetch attributes yet, fetch once
            if (
              Object.keys(out.ariaProperties).length === 0 &&
              attributes === null
            ) {
              try {
                const resp = await chromeAsync.debugger.sendCommand(
                  { tabId },
                  "DOM.getAttributes",
                  { nodeId }
                );
                attributes = resp.attributes;
                if (attributes && Array.isArray(attributes)) {
                  for (let i = 0; i < attributes.length; i += 2) {
                    const attrName = attributes[i];
                    const attrValue = attributes[i + 1];
                    if (attrName && attrName.startsWith("aria-")) {
                      out.ariaProperties[attrName] = attrValue;
                    }
                  }
                }
              } catch (e) {
                console.warn("Deferred DOM.getAttributes failed:", e);
              }
            }

            // Add native properties from the node itself
            [
              "checked",
              "pressed",
              "expanded",
              "selected",
              "disabled",
              "focused",
              "readonly",
              "required",
              "level",
            ].forEach((prop) => {
              if (node[prop]?.value !== undefined) {
                out.states[prop] = node[prop].value;
              }
            });

            console.log("Final result:", out);
            return out;
          } finally {
            scheduleDetach(tabId);
          }
        });

        sendResponse(result);
      } catch (err) {
        console.error("Error in background script:", err);
        if (tabId) {
          try {
            await chrome.debugger.detach({ tabId });
          } catch {}
        }
        sendResponse({ error: err.message });
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
          await queueDebuggerSession(tab.id, async () => {
            // Only detach if currently attached; when not attached, no-op
            try {
              await chromeAsync.debugger.sendCommand({ tabId: tab.id }, "Target.getBrowserContexts");
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
