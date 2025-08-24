export class CacheManager {
  constructor(maxSize = 500, ttlMs = 10000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  set(key, value) {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  clear() {
    this.cache.clear();
  }

  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Delete a cache entry with awareness of operation mode.
   * If mode === 'direct', be conservative and only delete keys that look like
   * direct-reference keys to avoid evicting selector-based caches.
   * This keeps direct-reference flows from invalidating selector caches.
   *
   * @param {string} key
   * @param {{mode?: string}} opts
   */
  deleteWithMode(key, opts = {}) {
    const mode = opts.mode;
    if (mode === "direct") {
      // Conservative deletion: only delete if key explicitly looks like a direct key
      if (typeof key === "string" && key.startsWith("element-direct-")) {
        return this.cache.delete(key);
      }

      // If key doesn't match direct pattern, skip deletion to avoid selector eviction
      // Return false to indicate nothing was deleted.
      return false;
    }

    // Default behaviour
    return this.cache.delete(key);
  }

  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}
