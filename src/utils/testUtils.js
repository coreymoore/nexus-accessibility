/**
 * Extension Testing Utilities
 *
 * Provides utilities for testing extension functionality and performance.
 * Run these from the browser console in the extension's service worker context.
 */

// Test utilities for the service worker context
if (typeof chrome !== "undefined" && chrome.runtime) {
  window.NexusTestUtils = {
    /**
     * Test debugger connection stability
     */
    async testDebuggerStability(iterations = 10) {
      console.log(
        `Testing debugger stability with ${iterations} iterations...`
      );

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tabId = tab.id;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < iterations; i++) {
        try {
          await chrome.debugger.attach({ tabId }, "1.3");
          await chrome.debugger.sendCommand({ tabId }, "Accessibility.enable");
          await chrome.debugger.detach({ tabId });
          successCount++;
          console.log(`✓ Iteration ${i + 1} successful`);
        } catch (error) {
          errorCount++;
          console.error(`✗ Iteration ${i + 1} failed:`, error.message);
        }

        // Small delay between iterations
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            window.NexusConstants?.TIMEOUTS?.DEBUGGER_STABILITY_TEST_DELAY ||
              100
          )
        );
      }

      console.log(`Results: ${successCount} successful, ${errorCount} failed`);
      return {
        successCount,
        errorCount,
        successRate: successCount / iterations,
      };
    },

    /**
     * Test cache performance
     */
    testCachePerformance() {
      const { docRoots, nodeCache } = window;

      if (!docRoots || !nodeCache) {
        console.error("Caches not available");
        return;
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
    },

    /**
     * Test memory usage tracking
     */
    async testMemoryUsage() {
      if (!performance.memory) {
        console.warn("Memory API not available");
        return;
      }

      const initialMemory = performance.memory.usedJSHeapSize;
      console.log(
        "Initial memory usage:",
        (initialMemory / 1024 / 1024).toFixed(2),
        "MB"
      );

      // Simulate some extension activity
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      try {
        await chrome.debugger.attach({ tabId: tab.id }, "1.3");
        await chrome.debugger.sendCommand({ tabId: tab.id }, "DOM.enable");

        const afterAttach = performance.memory.usedJSHeapSize;
        console.log(
          "After debugger attach:",
          (afterAttach / 1024 / 1024).toFixed(2),
          "MB"
        );

        await chrome.debugger.detach({ tabId: tab.id });

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
    },

    /**
     * Test error recovery system
     */
    async testErrorRecovery() {
      console.log("Testing error recovery system...");

      // This should fail and retry
      try {
        await chrome.debugger.sendCommand({ tabId: 99999 }, "DOM.enable");
      } catch (error) {
        console.log("Expected error caught:", error.message);
      }

      console.log("Error recovery test completed");
    },

    /**
     * Run all tests
     */
    async runAllTests() {
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
    },
  };

  // Conditionally expose test utils based on environment
  if (window.EnvironmentConfig?.isDevelopmentMode?.() !== false) {
    console.log(
      "NexusTestUtils loaded. Run window.NexusTestUtils.runAllTests() to test the extension."
    );
  } else {
    console.log(
      "NexusTestUtils loaded in production mode. Some functions may be restricted."
    );
  }
}

export default window.NexusTestUtils || {};
