/**
 * Smart Caches with TTL and LRU eviction
 * 
 * Implements bounded caches with time-to-live and least-recently-used eviction
 * to prevent memory leaks while maintaining performance.
 */

export class SmartCache {
  constructor(maxSize = 500, defaultTTL = 10000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.accessOrder = [];
    this.setupCleanup();
  }

  setupCleanup() {
    if (chrome.alarms) {
      const alarmName = `cache-cleanup-${Math.random().toString(36).substr(2, 9)}`;
      chrome.alarms.create(alarmName, { periodInMinutes: 1 });
      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === alarmName) {
          this.cleanup();
        }
      });
    }
  }

  set(key, value, ttl = this.defaultTTL) {
    // Remove expired entries first
    this.cleanup();
    
    // If at capacity and this is a new key, evict oldest
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
      accessed: Date.now(),
    });

    // Update access order
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      return null;
    }

    // Update access time and order
    entry.accessed = Date.now();
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
    }

    return entry.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    const deleted = this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    return deleted;
  }

  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.delete(key);
    }
  }

  evictOldest() {
    if (this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift();
      this.cache.delete(oldestKey);
    }
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  size() {
    this.cleanup(); // Clean expired entries before reporting size
    return this.cache.size;
  }

  // Get cache statistics
  getStats() {
    this.cleanup();
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      accessOrder: this.accessOrder.length,
    };
  }
}

// Legacy Map interface for backward compatibility
class LegacyMapWrapper {
  constructor(smartCache) {
    this.smartCache = smartCache;
  }

  get(key) {
    return this.smartCache.get(key);
  }

  set(key, value) {
    this.smartCache.set(key, value);
    return this;
  }

  has(key) {
    return this.smartCache.has(key);
  }

  delete(key) {
    return this.smartCache.delete(key);
  }

  clear() {
    this.smartCache.clear();
  }

  get size() {
    return this.smartCache.size();
  }

  keys() {
    this.smartCache.cleanup();
    return this.smartCache.cache.keys();
  }

  values() {
    this.smartCache.cleanup();
    return Array.from(this.smartCache.cache.values()).map(entry => entry.value);
  }

  entries() {
    this.smartCache.cleanup();
    return Array.from(this.smartCache.cache.entries()).map(([key, entry]) => [key, entry.value]);
  }

  forEach(callback, thisArg) {
    this.smartCache.cleanup();
    for (const [key, entry] of this.smartCache.cache.entries()) {
      callback.call(thisArg, entry.value, key, this);
    }
  }
}

// Create smart caches with appropriate sizes and TTLs
const docRootCache = new SmartCache(100, 30000); // 100 entries, 30s TTL
const nodeCacheImpl = new SmartCache(500, 10000); // 500 entries, 10s TTL

// Export with legacy Map interface for backward compatibility
export const docRoots = new LegacyMapWrapper(docRootCache);
export const nodeCache = new LegacyMapWrapper(nodeCacheImpl);
