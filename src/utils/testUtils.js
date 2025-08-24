/**
 * Extension Testing Utilities
 *
 * Provides utilities for testing extension functionality and performance.
 * Run these from the browser console in the extension's service worker context.
 */

// Resolve a safe global object in any JS environment
const _G =
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
    ? window
    : typeof self !== "undefined"
    ? self
    : {};

  // Import the chromeAsync promise wrapper so test utils can use it at runtime
  import { chromeAsync } from "./chromeAsync.js";
  // Import centralized CDP helper for consistent correlation logging
  import { sendCdp } from "../background/cdp.js";

// Provide a compatibility alias for `window` in non-window globals (service worker / worker)
// so callers using `window.NexusTestUtils` from the service worker console won't see
// `window is not defined`. This points `window` to the current global object only
// when `window` doesn't already exist.
try {
  if (typeof window === "undefined" && typeof _G !== "undefined") {
    // Use defineProperty to avoid accidental overwrites
    Object.defineProperty(_G, "window", {
      value: _G,
      writable: false,
      configurable: true,
      enumerable: false,
    });
  }
} catch (e) {
  // If we fail to define the alias (rare), continue without breaking functionality
  // The test utils will still be available via globalThis or self
}

// Build a stable NexusTestUtils object and attach to the global immediately.
const NexusTestUtils = {};

const _unavailableReason =
  "NexusTestUtils is only available in the extension service worker. Open the service worker console to run tests.";

if (typeof chrome !== "undefined" && chrome.runtime) {
  // Real implementations using chromeAsync
  NexusTestUtils._unavailable = false;

  // Helpers to save/restore a test tab id when the extension lacks 'tabs' permission
  NexusTestUtils.setTestTabId = async function (tabId) {
    try {
      await chromeAsync.storage.local.set({ nexus_test_tabId: tabId });
      console.log("Saved test tabId:", tabId);
      return true;
    } catch (e) {
      console.warn("Failed to save test tabId:", e && e.message ? e.message : e);
      return false;
    }
  };

  NexusTestUtils.getTestTabId = async function () {
    try {
      const data = await chromeAsync.storage.local.get({ nexus_test_tabId: null });
      return data.nexus_test_tabId || null;
    } catch (e) {
      console.warn("Failed to read saved test tabId:", e && e.message ? e.message : e);
      return null;
    }
  };

  NexusTestUtils.clearTestTabId = async function () {
    try {
      await chromeAsync.storage.local.set({ nexus_test_tabId: null });
      console.log("Cleared saved test tabId");
      return true;
    } catch (e) {
      console.warn("Failed to clear saved test tabId:", e && e.message ? e.message : e);
      return false;
    }
  };

  NexusTestUtils.testDebuggerStability = async function (
    iterations = 10,
    explicitTabId = undefined
  ) {
    console.log(`Testing debugger stability with ${iterations} iterations...`);

    // Diagnostic: log whether the 'tabs' permission is present (helps debugging)
    try {
      if (chrome && chrome.permissions && chrome.permissions.contains) {
        chrome.permissions.contains({ permissions: ["tabs"] }, (has) =>
          console.log("[TESTUTILS] tabs permission present:", !!has)
        );
      }
    } catch (e) {}

    // Resolve tabId with fallbacks. If 'tabs' permission isn't present, prefer
    // the explicitTabId parameter or a previously saved test tabId (setTestTabId).
    let tabId = explicitTabId;
    let hasTabsPerm = false;
    try {
      if (chrome && chrome.permissions && chrome.permissions.contains) {
        hasTabsPerm = await new Promise((res) =>
          chrome.permissions.contains({ permissions: ["tabs"] }, (v) => res(!!v))
        );
      }
    } catch (e) {
      hasTabsPerm = false;
    }

    if (!hasTabsPerm) {
      // Try saved tabId
      if (!tabId) {
        try {
          tabId = await NexusTestUtils.getTestTabId();
          if (tabId) console.log("Using saved testTabId:", tabId);
        } catch (e) {
          // ignore
        }
      }

      if (!tabId) {
        throw new Error(
          "No 'tabs' permission and no explicit/saved tabId provided. Call setTestTabId(tabId) or pass an explicit tabId to this function."
        );
      }
    } else {
      // We have tabs permission; if no explicit tabId was provided, resolve one via queries
      if (!tabId) {
        // Primary: try active tab in current window (may return none if console window is focused)
        let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        let tab = Array.isArray(tabs) && tabs.length ? tabs[0] : undefined;

        // Fallback: try lastFocusedWindow
        if (!tab) {
          try {
            tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            tab = Array.isArray(tabs) && tabs.length ? tabs[0] : undefined;
            if (tab) console.warn("[TESTUTILS] Using tab from lastFocusedWindow as fallback:", tab.id);
          } catch (e) {
            // ignore
          }
        }

        // Final fallback: pick the first normal http(s) tab available
        if (!tab) {
          try {
            tabs = await chrome.tabs.query({});
            tab = (tabs || []).find(
              (t) => t && t.url && /^https?:\/\//.test(t.url) && t.windowType !== "devtools"
            );
            if (tab) console.warn("[TESTUTILS] Falling back to first normal tab:", tab.id, tab.url);
          } catch (e) {
            // ignore
          }
        }

        if (!tab || typeof tab.id === "undefined") {
          throw new Error(
            "No active tab found. Open a normal browser tab and run this from the service worker console, or pass an explicit tabId as the second argument."
          );
        }
        tabId = tab.id;
      }
    }
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < iterations; i++) {
      try {
        if (!chromeAsync || !chromeAsync.debugger) {
          throw new Error("chromeAsync.debugger is not available in this context");
        }
  await chromeAsync.debugger.attach({ tabId }, "1.3");
  await sendCdp(tabId, "Accessibility.enable");
  await chromeAsync.debugger.detach({ tabId });
        successCount++;
        console.log(`✓ Iteration ${i + 1} successful`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Iteration ${i + 1} failed:`, error && error.message ? error.message : error);
      }

      // Small delay between iterations
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          (_G.NexusConstants?.TIMEOUTS?.DEBUGGER_STABILITY_TEST_DELAY) || 100
        )
      );
    }

    console.log(`Results: ${successCount} successful, ${errorCount} failed`);
    return {
      successCount,
      errorCount,
      successRate: successCount / iterations,
    };
  };

  NexusTestUtils.testCachePerformance = function () {
    const { docRoots, nodeCache } = _G;

    // Some tests are intended to run from the content script or page context
    // where caches are initialized; when running from the service worker
    // console those caches may be absent. Detect that and skip cleanly.
    if (!docRoots || !nodeCache) {
      console.info(
        "Cache test skipped: docRoots/nodeCache not present in this context (expected in content scripts)."
      );
      return { skipped: true };
    }

    console.log("Cache Statistics:");
    console.log("Document roots cache size:", docRoots.size);
    console.log("Node cache size:", nodeCache.size);

    // Test cache operations
    const testKey = "test-key";
    const testValue = { test: "data", timestamp: Date.now() };

    console.time("Cache write");
    docRoots.set(testKey, testValue);
    console.timeEnd("Cache write");

    console.time("Cache read");
    const retrieved = docRoots.get(testKey);
    console.timeEnd("Cache read");

    console.log("Cache read/write successful:", retrieved === testValue);

    // Cleanup
    docRoots.delete(testKey);
    return { skipped: false, docRootsSize: docRoots.size, nodeCacheSize: nodeCache.size };
  };

  NexusTestUtils.testMemoryUsage = async function (explicitTabId = undefined) {
    // Prefer the high-resolution JS heap memory API when available (renderer contexts)
    if (performance && performance.memory && typeof performance.memory.usedJSHeapSize === "number") {
      const initialMemory = performance.memory.usedJSHeapSize;
      console.log(
        "Initial memory usage:",
        (initialMemory / 1024 / 1024).toFixed(2),
        "MB"
      );

      // Simulate some extension activity
      // mirror the tab resolution logic from testDebuggerStability
      let tabId = explicitTabId;
      let hasTabsPerm = false;
      try {
        if (chrome && chrome.permissions && chrome.permissions.contains) {
          hasTabsPerm = await new Promise((res) =>
            chrome.permissions.contains({ permissions: ["tabs"] }, (v) => res(!!v))
          );
        }
      } catch (e) {
        hasTabsPerm = false;
      }

      if (!hasTabsPerm) {
        if (!tabId) {
          tabId = await NexusTestUtils.getTestTabId();
          if (!tabId) {
            throw new Error(
              "No 'tabs' permission and no explicit/saved tabId provided. Call setTestTabId(tabId) or pass an explicit tabId to this function."
            );
          }
        }
      } else {
        if (!tabId) {
          // resolve via tabs.query as before
          let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          let tab = Array.isArray(tabs) && tabs.length ? tabs[0] : undefined;
          if (!tab) {
            try {
              tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
              tab = Array.isArray(tabs) && tabs.length ? tabs[0] : undefined;
              if (tab) console.warn("[TESTUTILS] Using tab from lastFocusedWindow as fallback:", tab.id);
            } catch (e) {}
          }
          if (!tab) {
            try {
              tabs = await chrome.tabs.query({});
              tab = (tabs || []).find(
                (t) => t && t.url && /^https?:\/\//.test(t.url) && t.windowType !== "devtools"
              );
              if (tab) console.warn("[TESTUTILS] Falling back to first normal tab:", tab.id, tab.url);
            } catch (e) {}
          }
          if (!tab || typeof tab.id === "undefined") {
            throw new Error(
              "No active tab found. Open a normal browser tab and run this from the service worker console, or pass an explicit tabId as the first argument."
            );
          }
          tabId = tab.id;
        }
      }

      try {
        await chromeAsync.debugger.attach({ tabId }, "1.3");
        await sendCdp(tabId, "DOM.enable");

        const afterAttach = performance.memory.usedJSHeapSize;
        console.log(
          "After debugger attach:",
          (afterAttach / 1024 / 1024).toFixed(2),
          "MB"
        );

        await chromeAsync.debugger.detach({ tabId });

        const afterDetach = performance.memory.usedJSHeapSize;
        console.log(
          "After debugger detach:",
          (afterDetach / 1024 / 1024).toFixed(2),
          "MB"
        );

        const memoryGrowth = afterDetach - initialMemory;
        console.log("Memory growth:", (memoryGrowth / 1024).toFixed(2), "KB");

        return {
          initial: initialMemory,
          afterAttach,
          afterDetach,
          growth: memoryGrowth,
        };
      } catch (error) {
        console.error("Memory test failed:", error);
      }

      // End performance.memory branch
    }

    // If we reach here, performance.memory is not available (common in service workers).
    // Try chrome.system.memory.getInfo() if the API is present (requires the
    // "system.memory" permission in manifest.json). Do this safely at runtime.
    if (chrome && chrome.system && chrome.system.memory && chrome.system.memory.getInfo) {
      try {
        // Ask for the optional permission if not already granted
        let hasPerm = false;
        try {
          hasPerm = await new Promise((res) =>
            chrome.permissions.contains({ permissions: ["system.memory"] }, (v) => res(!!v))
          );
        } catch (e) {
          // ignore
        }

        if (!hasPerm) {
          console.log("Requesting optional 'system.memory' permission to provide detailed memory info...");
          try {
            const granted = await new Promise((res) =>
              chrome.permissions.request({ permissions: ["system.memory"] }, (gr) => res(!!gr))
            );
            if (!granted) {
              console.warn("'system.memory' permission denied by user. Falling back to navigator/deviceMemory.");
            } else {
              console.log("'system.memory' permission granted");
              hasPerm = true;
            }
          } catch (reqErr) {
            console.warn("Permission request failed:", reqErr && reqErr.message ? reqErr.message : reqErr);
          }
        }

        if (hasPerm) {
          const info = await new Promise((res) => chrome.system.memory.getInfo(res));
          // chrome.system.memory.getInfo returns capacity (bytes) and availableCapacity (bytes)
          const totalMB = (info.capacity / 1024 / 1024).toFixed(2);
          const availMB = (info.availableCapacity / 1024 / 1024).toFixed(2);
          console.log("chrome.system.memory info (approx): total:", totalMB, "MB, available:", availMB, "MB");
          return { total: info.capacity, available: info.availableCapacity };
        }
      } catch (e) {
        console.warn("chrome.system.memory.getInfo() failed:", e && e.message ? e.message : e);
      }
    }

    // As a last resort, use navigator.deviceMemory (gives an approximate GB value)
    if (typeof navigator !== "undefined" && navigator.deviceMemory) {
      console.log("Using navigator.deviceMemory as an approximation:", navigator.deviceMemory, "GB");
      return { deviceMemoryGB: navigator.deviceMemory };
    }

    console.warn(
      "Memory API not available. For more detailed memory metrics consider adding the 'system.memory' permission to manifest.json and using chrome.system.memory.getInfo()."
    );
    return null;
  };

  NexusTestUtils.testErrorRecovery = async function () {
    console.log("Testing error recovery system...");

    try {
      await sendCdp(99999, "DOM.enable");
    } catch (error) {
      console.log("Expected error caught:", error.message);
    }

    console.log("Error recovery test completed");
  };

  NexusTestUtils.runAllTests = async function () {
    console.log("🧪 Starting Nexus Extension Tests");
    console.log("=====================================");

    try {
      console.log("\n1. Testing Cache Performance...");
      this.testCachePerformance();

      console.log("\n2. Testing Memory Usage...");
      await this.testMemoryUsage();

      console.log("\n3. Testing Debugger Stability...");
      await this.testDebuggerStability(5);

      console.log("\n4. Testing Error Recovery...");
      await this.testErrorRecovery();

      console.log("\n✅ All tests completed!");
    } catch (error) {
      console.error("❌ Test suite failed:", error);
    }
  };
} else {
  // Stub implementations for non-service-worker contexts
  NexusTestUtils._unavailable = true;
  NexusTestUtils._reason = _unavailableReason;
  NexusTestUtils.testDebuggerStability = async function () {
    throw new Error(_unavailableReason);
  };
  NexusTestUtils.testCachePerformance = function () {
    throw new Error(_unavailableReason);
  };
  NexusTestUtils.testMemoryUsage = async function () {
    throw new Error(_unavailableReason);
  };
  NexusTestUtils.testErrorRecovery = async function () {
    throw new Error(_unavailableReason);
  };
  NexusTestUtils.runAllTests = async function () {
    throw new Error(_unavailableReason);
  };
}

// Attach to the global so callers (console or code) can access it directly
try {
  if (!_G.NexusTestUtils) _G.NexusTestUtils = NexusTestUtils;
} catch (e) {
  // ignore attach failures
}

// Also ensure globalThis has the reference (workers have globalThis)
try {
  if (typeof globalThis !== "undefined") {
    if (!globalThis.NexusTestUtils) globalThis.NexusTestUtils = NexusTestUtils;
    try {
      // Add a diagnostic timestamp to help with debugging load order
      globalThis.__nexus_testutils_loadedAt = Date.now();
    } catch (e) {}
    console.log("[TESTUTILS] NexusTestUtils module initialized, attached:", !!globalThis.NexusTestUtils);
  }
} catch (e) {}

export default NexusTestUtils;
