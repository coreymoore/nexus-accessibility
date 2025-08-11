import { CDP_VERSION, CONTEXT_TTL_MS } from "./constants.js";
import { contextCache } from "./state.js";

export async function sendCdp(tabId, method, params) {
  return chrome.debugger.sendCommand({ tabId }, method, params);
}

export async function ensureDomains(tabId) {
  await sendCdp(tabId, "Page.enable");
  await sendCdp(tabId, "DOM.enable");
  await sendCdp(tabId, "Runtime.enable");
  await sendCdp(tabId, "Accessibility.enable");
}

export async function getFrameTree(tabId) {
  const { frameTree } = await sendCdp(tabId, "Page.getFrameTree");
  return flattenFrameTree(frameTree);
}

function flattenFrameTree(node, acc = []) {
  if (!node) return acc;
  acc.push(node.frame);
  for (const c of node.childFrames || []) flattenFrameTree(c, acc);
  return acc;
}

export function cacheKey(tabId, frameId, worldName) {
  return `${tabId}:${frameId}:${worldName || ""}`;
}

export async function getOrCreateIsolatedWorld(tabId, frameId, worldName = "AX_Helper") {
  const key = cacheKey(tabId, frameId, worldName);
  const now = Date.now();
  const cached = contextCache.get(key);
  if (cached && now - cached.t < CONTEXT_TTL_MS) return cached.id;

  const { executionContextId } = await sendCdp(tabId, "Page.createIsolatedWorld", {
    frameId,
    worldName,
  });
  contextCache.set(key, { id: executionContextId, t: now });
  return executionContextId;
}

export async function evalInWorld(tabId, executionContextId, expression) {
  const { result } = await sendCdp(tabId, "Runtime.evaluate", {
    contextId: executionContextId,
    expression,
    awaitPromise: true,
    returnByValue: false,
  });
  return result;
}

export async function resolveNode(tabId, objectId) {
  const { node: { backendNodeId } } = await sendCdp(tabId, "DOM.describeNode", { objectId });
  return backendNodeId;
}

export async function getPartialAXTree(tabId, backendNodeId, fetchRelatives = true) {
  const { nodes } = await sendCdp(tabId, "Accessibility.getPartialAXTree", {
    backendNodeId,
    fetchRelatives,
  });
  return nodes;
}

// Map a Chrome extension numeric frameId (from sender.frameId/webNavigation) to a CDP Page.FrameId
export async function getCdpFrameId(tabId, chromeFrameId, hintUrl) {
  try {
    const [framesNav, framesCdp] = await Promise.all([
      chrome.webNavigation.getAllFrames({ tabId }),
      getFrameTree(tabId),
    ]);
    const nav = framesNav.find((f) => f.frameId === chromeFrameId);
    // Prefer the url from navigation if available; otherwise use provided hint
    const targetUrl = nav?.url || hintUrl;
    if (!targetUrl) return undefined;
    // Try exact URL match first
    let match = framesCdp.find((f) => f.url === targetUrl);
    if (match) return match.id;
    // Fallback: strip hash for fuzzy match; keep query as some sites rely on it
    const strip = (u) => {
      try {
        const url = new URL(u);
        url.hash = "";
        return url.toString();
      } catch {
        return u.split('#')[0];
      }
    };
    const target = strip(targetUrl);
    match = framesCdp.find((f) => strip(f.url) === target);
    if (match) return match.id;
    // Fallback by origin: pick the only frame that shares the same origin
    try {
      const originOf = (u) => {
        const url = new URL(u);
        return url.origin;
      };
      const wantedOrigin = originOf(targetUrl);
      const byOrigin = framesCdp.filter((f) => {
        try { return originOf(f.url) === wantedOrigin; } catch { return false; }
      });
      if (byOrigin.length === 1) return byOrigin[0].id;
      // As a last resort, choose the longest path-prefix match on same origin
      if (byOrigin.length > 1) {
        const pathOf = (u) => {
          const url = new URL(u);
          return url.pathname;
        };
        const targetPath = pathOf(targetUrl);
        let best = null;
        let bestScore = -1;
        for (const f of byOrigin) {
          try {
            const p = pathOf(f.url);
            const score = targetPath.startsWith(p) ? p.length : -1;
            if (score > bestScore) { bestScore = score; best = f; }
          } catch {}
        }
        if (best) return best.id;
      }
    } catch {}
  } catch {}
  return undefined;
}
