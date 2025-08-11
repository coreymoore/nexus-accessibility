// Shared caches used by background logic
// Keying convention mirrors background.js usage: `${tabId}:${frameId||'main'}` and `${..}::${selector}`
export const docRoots = new Map();
export const nodeCache = new Map();
