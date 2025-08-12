# Comprehensive Chrome Extension Refactoring Plan (No Build System)

## 1. Bug Fixes

````markdown
### 1.1 Logger Module Export Issue

**File:** `src/utils/logger.js`  
**Lines:** 115-130  
**Issue:** The logger module uses both ES6 exports and assigns to `window.axLogger`, which can cause issues in module contexts.

```javascript
// filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/src/utils/logger.js
// ...existing code...

// Remove the window assignment for content scripts
// Instead, create a separate initialization function
export function initializeLogger() {
  if (typeof window !== "undefined" && !window.axLogger) {
    window.axLogger = {
      log(context, ...args) {
        if (DEBUG) {
          console.log(`[${context}]`, ...args);
        }
      },
      error(context, ...args) {
        if (DEBUG) {
          console.error(`[${context}]`, ...args);
        }
      },
      ...loggers,
    };
  }
}

// Export for ES6 modules
export { Logger };
export const logger = loggers;
export default loggers;
```
````

Then in content scripts that need the global logger:

```javascript
// filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/src/content.js
// At the top of the file
import { initializeLogger } from "./utils/logger.js";
initializeLogger();
```

````

```markdown
### 1.2 Race Condition in Accessibility Info Retrieval

**File:** `src/content.js`
**Lines:** 357-463
**Issue:** Multiple retry attempts can overlap causing race conditions.

```javascript
// filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/src/content.js
// Add at the top of the file after imports
let pendingAccessibilityRequest = null;

async function waitForAccessibilityUpdate(target, maxAttempts = 8) {
  // Cancel any pending request
  if (pendingAccessibilityRequest) {
    pendingAccessibilityRequest.cancelled = true;
  }

  // Create new request tracker
  const currentRequest = { cancelled: false };
  pendingAccessibilityRequest = currentRequest;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Check if this request was cancelled
    if (currentRequest.cancelled) {
      console.log('[NEXUS] Request cancelled');
      return null;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getBackendNodeIdAndAccessibleInfo',
        elementSelector: uniqueSelector,
        tabId: chrome.runtime.id, // Use extension ID as fallback
        frameId: 0
      });

      if (currentRequest.cancelled) return null;

      if (response && response.accessibleNode) {
        return response;
      }
    } catch (error) {
      if (currentRequest.cancelled) return null;
      console.error('[NEXUS] Attempt failed:', error);
    }

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
  }

  // Clean up
  if (pendingAccessibilityRequest === currentRequest) {
    pendingAccessibilityRequest = null;
  }

  return null;
}
````

````

```markdown
### 1.3 Memory Leak in MutationObserver

**File:** `src/content.js`
**Lines:** 311-354
**Issue:** MutationObserver is not properly disconnected.

```javascript
// filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/src/content.js
// Add at the top level
const activeObservers = new WeakMap();
const observerCleanupTimeouts = new WeakMap();

function startObservingElement(element) {
  // Check if already observing
  if (activeObservers.has(element)) {
    return;
  }

  const observer = new MutationObserver((mutations) => {
    // ...existing mutation handling code...

    // Schedule cleanup check
    scheduleObserverCleanup(element);
  });

  const observerOptions = {
    attributes: true,
    attributeFilter: ['aria-label', 'aria-describedby', 'aria-labelledby', 'title', 'value'],
    subtree: false,
    childList: false
  };

  observer.observe(element, observerOptions);
  activeObservers.set(element, observer);

  // Schedule periodic cleanup check
  scheduleObserverCleanup(element);
}

function scheduleObserverCleanup(element) {
  // Clear existing timeout
  const existingTimeout = observerCleanupTimeouts.get(element);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Schedule new cleanup check
  const timeout = setTimeout(() => {
    if (!document.contains(element)) {
      stopObservingElement(element);
    }
  }, 30000); // Check every 30 seconds

  observerCleanupTimeouts.set(element, timeout);
}

function stopObservingElement(element) {
  const observer = activeObservers.get(element);
  if (observer) {
    observer.disconnect();
    activeObservers.delete(element);
  }

  const timeout = observerCleanupTimeouts.get(element);
  if (timeout) {
    clearTimeout(timeout);
    observerCleanupTimeouts.delete(element);
  }
}

// Add cleanup on page unload
window.addEventListener('beforeunload', () => {
  // Disconnect all observers
  activeObservers.forEach((observer) => observer.disconnect());
});
````

````

## 2. Code Quality & Structure

```markdown
### 2.1 Modularize Background Script Using Chrome's Module Support

**File:** `src/background.js`
**Issue:** Monolithic background script with mixed concerns.

First, update manifest.json to use ES6 modules:
```json
// filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/manifest.json
{
  "background": {
    "service_worker": "src/background/index.js",
    "type": "module"
  }
}
````

Create modular structure:

```javascript
// filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/src/background/cache-manager.js
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
}
```

```javascript
// filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/src/background/debugger-manager.js
export class DebuggerManager {
  constructor() {
    this.connections = new Map();
  }

  async attach(tabId) {
    if (this.connections.has(tabId)) {
      return this.connections.get(tabId);
    }

    try {
      await chrome.debugger.attach({ tabId }, "1.3");
      await chrome.debugger.sendCommand({ tabId }, "Accessibility.enable");

      const connection = {
        tabId,
        attached: true,
        attachedAt: Date.now(),
      };

      this.connections.set(tabId, connection);
      return connection;
    } catch (error) {
      console.error("Failed to attach debugger:", error);
      throw error;
    }
  }

  async detach(tabId) {
    try {
      await chrome.debugger.detach({ tabId });
      this.connections.delete(tabId);
    } catch (error) {
      // Ignore detach errors
    }
  }

  async sendCommand(tabId, method, params = {}) {
    await this.ensureAttached(tabId);
    return chrome.debugger.sendCommand({ tabId }, method, params);
  }

  async ensureAttached(tabId) {
    if (!this.connections.has(tabId)) {
      await this.attach(tabId);
    }
  }
}
```

```javascript
// filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/src/background/index.js
import { CacheManager } from "./cache-manager.js";
import { DebuggerManager } from "./debugger-manager.js";
import { MessageHandler } from "./message-handler.js";

// Initialize managers
const cacheManager = new CacheManager();
const debuggerManager = new DebuggerManager();
const messageHandler = new MessageHandler(cacheManager, debuggerManager);

// Setup message listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  messageHandler
    .handle(msg, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ error: error.message }));
  return true; // Keep channel open for async response
});

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  debuggerManager.detach(tabId);
});
```

````

```markdown
### 2.2 Use JSDoc for Type Safety (Instead of TypeScript)

**Files:** All JavaScript files
**Issue:** Lack of type safety.

Create a types file:
```javascript
// filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/src/types.js
/**
 * @typedef {Object} AccessibilityInfo
 * @property {string} role - ARIA role
 * @property {string} name - Accessible name
 * @property {string} [description] - Accessible description
 * @property {Object.<string, boolean>} states - State properties
 * @property {Object.<string, string>} properties - ARIA properties
 */

/**
 * @typedef {Object} ElementSelector
 * @property {string} selector - CSS selector
 * @property {number} [index] - Element index if multiple matches
 */

/**
 * @typedef {Object} DebuggerConnection
 * @property {number} tabId
 * @property {boolean} attached
 * @property {number} attachedAt
 */

export default {};
````

Use JSDoc in your code:

```javascript
// filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/src/background/accessibility-service.js
import "./types.js";

export class AccessibilityService {
  /**
   * @param {DebuggerManager} debuggerManager
   * @param {CacheManager} cacheManager
   */
  constructor(debuggerManager, cacheManager) {
    this.debugger = debuggerManager;
    this.cache = cacheManager;
  }

  /**
   * Get accessibility info for an element
   * @param {number} tabId - Chrome tab ID
   * @param {number} frameId - Frame ID
   * @param {string} selector - CSS selector
   * @returns {Promise<AccessibilityInfo>}
   */
  async getElementInfo(tabId, frameId, selector) {
    const cacheKey = `${tabId}-${frameId}-${selector}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // Fetch from debugger
    const info = await this.fetchFromDebugger(tabId, frameId, selector);

    // Cache the result
    this.cache.set(cacheKey, info);

    return info;
  }
}
```

````

## 4. Security Fixes

```markdown
### 4.1 Sanitize DOM Manipulation

**File:** `src/content.js`
**Issue:** Direct DOM manipulation without sanitization.

```javascript
// filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/src/utils/dom-sanitizer.js
export class DOMSanitizer {
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static createSafeElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);

    // Whitelist safe attributes
    const safeAttributes = [
      'class', 'id', 'role', 'aria-label', 'aria-describedby',
      'aria-live', 'aria-atomic', 'tabindex', 'data-nexus-id'
    ];

    for (const [key, value] of Object.entries(attributes)) {
      if (safeAttributes.includes(key.toLowerCase())) {
        element.setAttribute(key, String(value));
      }
    }

    if (content) {
      element.textContent = content;
    }

    return element;
  }

  static sanitizeText(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/[<>]/g, '');
  }
}
````

Use in content script:

```javascript
// filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/src/content.js
// Add at top (no build system, so we'll inline or use dynamic import)
async function loadDOMSanitizer() {
  const module = await import("./utils/dom-sanitizer.js");
  return module.DOMSanitizer;
}

// In tooltip creation
async function createTooltipContent(data) {
  const DOMSanitizer = await loadDOMSanitizer();

  const container = DOMSanitizer.createSafeElement("div", {
    class: "nexus-tooltip-content",
    role: "tooltip",
  });

  const roleElement = DOMSanitizer.createSafeElement(
    "div",
    {
      class: "nexus-role",
    },
    `Role: ${DOMSanitizer.sanitizeText(data.role)}`
  );

  const nameElement = DOMSanitizer.createSafeElement(
    "div",
    {
      class: "nexus-name",
    },
    `Name: ${DOMSanitizer.sanitizeText(data.name)}`
  );

  container.appendChild(roleElement);
  container.appendChild(nameElement);

  return container;
}
```

````

```markdown
### 4.2 Validate Messages

**File:** `src/background/index.js`
**Issue:** No message validation.

```javascript
// filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/src/background/message-validator.js
export class MessageValidator {
  static ALLOWED_ACTIONS = [
    'getAccessibilityTree',
    'getBackendNodeIdAndAccessibleInfo',
    'AX_TOOLTIP_SHOWN',
    'keepAlive'
  ];

  static validate(msg, sender) {
    // Verify sender is from our extension
    if (sender.id !== chrome.runtime.id) {
      throw new Error('Invalid sender');
    }

    // Validate message structure
    if (!msg || typeof msg !== 'object') {
      throw new Error('Invalid message format');
    }

    // Validate action
    const action = msg.action || msg.type;
    if (!this.ALLOWED_ACTIONS.includes(action)) {
      throw new Error(`Invalid action: ${action}`);
    }

    // Validate specific fields based on action
    switch (action) {
      case 'getBackendNodeIdAndAccessibleInfo':
        if (typeof msg.elementSelector !== 'string') {
          throw new Error('Invalid elementSelector');
        }
        break;
      case 'getAccessibilityTree':
        if (msg.tabId && typeof msg.tabId !== 'number') {
          throw new Error('Invalid tabId');
        }
        break;
    }

    return true;
  }
}
````

````

## 5. Performance Optimizations

```markdown
### 5.1 Implement Simple LRU Cache

**File:** `src/background/cache-manager.js`
**Issue:** Need better cache management.

```javascript
// filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/src/background/lru-cache.js
export class LRUCache {
  constructor(maxSize = 100, ttlMs = 30000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  set(key, value) {
    // Delete and re-add to move to end (most recent)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Check size limit
    if (this.cache.size >= this.maxSize) {
      // Remove oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  clear() {
    this.cache.clear();
  }

  // Periodic cleanup of expired entries
  cleanupExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }
}

// Set up periodic cleanup
setInterval(() => {
  if (globalThis.cacheInstance) {
    globalThis.cacheInstance.cleanupExpired();
  }
}, 60000); // Every minute
````

````

```markdown
### 5.2 Debounce Function Utility

**File:** Create new utility file
**Issue:** Need debouncing for performance.

```javascript
// filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/src/utils/debounce.js
export function debounce(func, wait, immediate = false) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

export function throttle(func, limit) {
  let inThrottle;

  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Debounce with request cancellation
export class DebouncedRequest {
  constructor(func, delay = 150) {
    this.func = func;
    this.delay = delay;
    this.timeout = null;
  }

  execute(...args) {
    this.cancel();

    return new Promise((resolve, reject) => {
      this.timeout = setTimeout(async () => {
        try {
          const result = await this.func(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, this.delay);
    });
  }

  cancel() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}
````

````


## 9. Testing & Error Handling

```markdown
### 9.1 Add Simple Test Runner

**File:** Create test utilities
**Issue:** Need basic testing without build tools.

```html
<!-- filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/tests/test-runner.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Nexus Extension Tests</title>
  <style>
    body { font-family: monospace; padding: 20px; }
    .pass { color: green; }
    .fail { color: red; }
    .test-result { margin: 10px 0; }
  </style>
</head>
<body>
  <h1>Nexus Extension Test Suite</h1>
  <div id="results"></div>

  <script type="module">
    // Simple test framework
    class TestRunner {
      constructor() {
        this.tests = [];
        this.results = [];
      }

      test(name, fn) {
        this.tests.push({ name, fn });
      }

      async run() {
        const resultsEl = document.getElementById('results');

        for (const test of this.tests) {
          try {
            await test.fn();
            this.results.push({ name: test.name, passed: true });
            resultsEl.innerHTML += `
              <div class="test-result pass">✓ ${test.name}</div>
            `;
          } catch (error) {
            this.results.push({ name: test.name, passed: false, error });
            resultsEl.innerHTML += `
              <div class="test-result fail">✗ ${test.name}: ${error.message}</div>
            `;
          }
        }

        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;

        resultsEl.innerHTML += `
          <h2>Results: ${passed}/${total} passed</h2>
        `;
      }
    }

    // Test assertions
    const assert = {
      equal(actual, expected, message) {
        if (actual !== expected) {
          throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
      },

      truthy(value, message) {
        if (!value) {
          throw new Error(message || `Expected truthy value, got ${value}`);
        }
      },

      throws(fn, message) {
        try {
          fn();
          throw new Error(message || 'Expected function to throw');
        } catch (e) {
          // Expected
        }
      }
    };

    // Import modules to test
    import { LRUCache } from '../src/background/lru-cache.js';
    import { DOMSanitizer } from '../src/utils/dom-sanitizer.js';

    // Create test runner
    const runner = new TestRunner();

    // Add tests
    runner.test('LRUCache - should store and retrieve values', () => {
      const cache = new LRUCache(2);
      cache.set('key1', 'value1');
      assert.equal(cache.get('key1'), 'value1');
    });

    runner.test('LRUCache - should evict oldest when full', () => {
      const cache = new LRUCache(2);
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      assert.equal(cache.get('key1'), null);
      assert.equal(cache.get('key2'), 'value2');
    });

    runner.test('DOMSanitizer - should escape HTML', () => {
      const escaped = DOMSanitizer.escapeHtml('<script>alert("xss")</script>');
      assert.equal(escaped.includes('<script>'), false);
    });

    runner.test('DOMSanitizer - should create safe elements', () => {
      const el = DOMSanitizer.createSafeElement('div', {
        class: 'test',
        onclick: 'alert("xss")'
      });
      assert.equal(el.className, 'test');
      assert.equal(el.onclick, null);
    });

    // Run tests
    runner.run();
  </script>
</body>
</html>
````

````

```markdown
### 9.2 Add Error Tracking

**File:** Create error handler
**Issue:** No centralized error handling.

```javascript
// filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/src/utils/error-handler.js
export class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 50;
    this.listeners = [];
  }

  log(error, context = '') {
    const errorInfo = {
      message: error.message || String(error),
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window?.location?.href
    };

    this.errors.push(errorInfo);

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(errorInfo));

    // Log to console in development
    console.error(`[ErrorHandler] ${context}:`, error);

    // Store in chrome.storage for debugging
    this.persistError(errorInfo);
  }

  async persistError(errorInfo) {
    try {
      const { errors = [] } = await chrome.storage.local.get('errors');
      errors.push(errorInfo);

      // Keep only last 20 in storage
      const recentErrors = errors.slice(-20);
      await chrome.storage.local.set({ errors: recentErrors });
    } catch (e) {
      // Fail silently
    }
  }

  onError(listener) {
    this.listeners.push(listener);
  }

  getErrors() {
    return this.errors;
  }

  clear() {
    this.errors = [];
    chrome.storage.local.remove('errors');
  }

  // Wrap function with error handling
  wrap(fn, context) {
    return (...args) => {
      try {
        const result = fn(...args);
        if (result instanceof Promise) {
          return result.catch(error => {
            this.log(error, context);
            throw error;
          });
        }
        return result;
      } catch (error) {
        this.log(error, context);
        throw error;
      }
    };
  }
}

// Global instance
export const errorHandler = new ErrorHandler();

// Set up global error handlers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorHandler.log(event.error, 'window.error');
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.log(event.reason, 'unhandledrejection');
    event.preventDefault();
  });
}
````

````

## 10. Final Integration Steps

```markdown
### 10.1 Update Content Script Imports

**File:** `src/content.js`
**Issue:** Need to properly import modules.

Since content scripts can't use ES6 modules directly, we need to use dynamic imports or inject scripts:

```javascript
// filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/src/content.js
// At the top of content.js
(async function() {
  // Initialize utilities
  let DOMSanitizer, ErrorHandler, AccessibleTooltip;

  try {
    // Dynamic imports for utilities
    const sanitizerModule = await import(chrome.runtime.getURL('src/utils/dom-sanitizer.js'));
    DOMSanitizer = sanitizerModule.DOMSanitizer;

    const errorModule = await import(chrome.runtime.getURL('src/utils/error-handler.js'));
    ErrorHandler = errorModule.errorHandler;

    const tooltipModule = await import(chrome.runtime.getURL('src/components/tooltip.js'));
    AccessibleTooltip = tooltipModule.AccessibleTooltip;
  } catch (error) {
    console.error('Failed to load modules:', error);
    // Fallback to inline implementations if needed
  }

  // Rest of your content script code here...

})();
````

````

```markdown
### 10.2 Update Manifest for Module Access

**File:** `manifest.json`
**Issue:** Need to expose modules for dynamic import.

```json
// filepath: /Users/corey/Projects/tbn-tester-extension/chrome-accessibility-extension/manifest.json
{
  "web_accessible_resources": [
    {
      "resources": [
        "src/utils/*.js",
        "src/components/*.js",
        "src/styles/*.css"
      ],
      "matches": ["<all_urls>"]
    }
  ]
}
````

```

```
