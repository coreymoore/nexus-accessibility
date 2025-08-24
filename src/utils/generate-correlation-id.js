/**
 * generate-correlation-id.js
 *
 * Lightweight UUIDv4-style generator. Uses crypto.getRandomValues when
 * available, falls back to Math.random in restricted environments.
 *
 * Also attaches itself to window.NexusUtils.generateCorrelationId when run in
 * a page/context so other content scripts can reuse the function when this
 * script is included via the extension bundling pipeline.
 */
(function () {
  'use strict';

  function uuidv4() {
    // Use crypto if available
    try {
      const globalCrypto = (typeof crypto !== 'undefined' && crypto) || (typeof window !== 'undefined' && window.crypto) || null;
      if (globalCrypto && typeof globalCrypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(16);
        globalCrypto.getRandomValues(bytes);
        // Per RFC4122 v4: set version and variant bits
        bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
      }
    } catch (e) {
      // If crypto access throws (e.g., restricted), fall through to fallback
    }

    // Fallback using Math.random (not cryptographically secure)
    const rnd = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
    // Construct UUID format manually
    return `${rnd()}${rnd()}-${rnd()}-${rnd()}-${rnd()}-${rnd()}${rnd()}${rnd()}`;
  }

  // Expose to module systems if present
  try {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = { generateCorrelationId: uuidv4 };
    }
  } catch (e) {}

  // Attach to window.NexusUtils for in-page consumers (no overwrite if exists)
  try {
    if (typeof window !== 'undefined') {
      window.NexusUtils = window.NexusUtils || {};
      if (!window.NexusUtils.generateCorrelationId) {
        window.NexusUtils.generateCorrelationId = uuidv4;
      }
    }
  } catch (e) {}

  // Also expose as a top-level named function in this script's scope
  try {
    if (typeof self !== 'undefined') self.generateCorrelationId = uuidv4;
  } catch (e) {}

})();
