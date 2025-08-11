// Ephemeral background state maps; not persisted across SW restarts
export const sessionQueues = new Map(); // tabId -> Promise
export const attachedTabs = new Map(); // tabId -> { attached, domainsEnabled, lastUsedAt }
export const contextCache = new Map(); // `${tabId}:${frameId}` -> { contextId, t }
