// Background service constants
export const CDP_VERSION = "1.3";

// Connection management timeouts
export const DETACH_IDLE_MS = 30000; // keep attached 30s after last use
export const CONTEXT_TTL_MS = 5000; // 5s context cache per frame

// Micro-cache TTLs
export const DIRECT_CACHE_TTL_MS = 150; // ms - micro-cache for direct-reference results

// Import shared constants for consistency
// Note: Can't import ES modules here due to service worker context limitations
// These constants should be kept in sync with src/utils/constants.js
export const DEBUGGER_CONNECTION_RETRIES = 3;
export const DEBUGGER_ATTACH_TIMEOUT = 2000;
