# Cache Key Canonical Formats

This file documents the canonical cache key formats used across the background
modules so invalidation and lookup logic remains consistent.

Canonical key formats:

- Document root cache (per CDP frame or main):
  - CDP frame-scoped: `${tabId}:cdp:${cdpFrameId}`
  - Main-frame-scoped: `${tabId}:main`

- Node lookup cache (nodeId mapping for a selector):
  - `${tabId}:cdp:${cdpFrameId}::${elementSelector}`
  - `${tabId}:main::${elementSelector}`

- MessageHandler high-level element cache (selector-based):
  - `element-${tabId}-${frameId}-${elementSelector}`

- Direct-reference cache (if used in future):
  - `element-direct-${tabId}-${frameId}`
  - Optionally: `element-direct-${tabId}-${frameId}::${elementSelector}` if selector is available

Notes:
- The preferred canonical forms are the CDP-scoped document root keys and the
  node lookup cache keys (the `::` separator is used to keep scope vs selector
  separate and to avoid accidental collisions).
- When implementing new cache code, prefer the canonical formats above so that
  `handleInvalidateCache` can reliably clear matching entries.
- Avoid storing cache entries under ephemeral extension frame IDs; always use
  CDP frame ids when available.

