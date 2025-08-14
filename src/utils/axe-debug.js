/**
 * Axe Integration Debug Utilities
 *
 * This file provides debug utilities to test and verify the axe-core integration.
 * It's useful for troubleshooting and can be loaded in the browser console.
 */

(function () {
  "use strict";

  const AxeDebug = {
    /**
     * Check if axe-core is properly loaded and available
     */
    checkAxeAvailability() {
      console.group("🔍 Axe-Core Availability Check");

      if (typeof window.axe === "undefined") {
        console.error("❌ window.axe is not available");
        console.log("Make sure axe-core.js is loaded before this script");
        console.groupEnd();
        return false;
      }

      console.log("✅ window.axe is available");

      // Check for required methods
      const requiredMethods = ["run", "configure", "getRules"];
      const optionalMethods = ["getRule"];

      console.log("\n📋 Required Methods:");
      for (const method of requiredMethods) {
        if (typeof window.axe[method] === "function") {
          console.log(`✅ axe.${method} is available`);
        } else {
          console.error(`❌ axe.${method} is missing`);
        }
      }

      console.log("\n📋 Optional Methods:");
      for (const method of optionalMethods) {
        if (typeof window.axe[method] === "function") {
          console.log(`✅ axe.${method} is available`);
        } else {
          console.warn(`⚠️ axe.${method} is not available (will use fallback)`);
        }
      }

      // List all available methods
      const allMethods = Object.getOwnPropertyNames(window.axe).filter(
        (prop) => typeof window.axe[prop] === "function"
      );
      console.log("\n📋 All Available Methods:", allMethods);

      console.groupEnd();
      return true;
    },

    /**
     * Test basic axe functionality
     */
    async testAxeBasics() {
      console.group("🧪 Axe-Core Basic Tests");

      if (!this.checkAxeAvailability()) {
        console.groupEnd();
        return false;
      }

      try {
        // Test getRules with WCAG A/AA filtering
        console.log("\n🔍 Testing getRules (WCAG A/AA only)...");
        if (typeof window.axe.getRules === "function") {
          const rules = window.axe.getRules(["wcag2a", "wcag2aa"]);
          console.log(`✅ Retrieved ${rules.length} WCAG A/AA rules`);
          if (rules.length > 0) {
            console.log("Sample rule:", rules[0]);
          }
        } else {
          console.warn("⚠️ getRules not available");
        }

        // Test getRule (if available)
        console.log("\n🔍 Testing getRule...");
        if (typeof window.axe.getRule === "function") {
          const rule = window.axe.getRule("color-contrast");
          if (rule) {
            console.log("✅ getRule works - sample rule:", rule);
          } else {
            console.log("⚠️ getRule returned null for color-contrast");
          }
        } else {
          console.warn("⚠️ getRule not available");
        }

        // Test run (basic scan with WCAG A/AA only)
        console.log("\n🔍 Testing run (WCAG A/AA only)...");
        if (typeof window.axe.run === "function") {
          const results = await window.axe.run(document, {
            runOnly: {
              type: "tag",
              values: ["wcag2a", "wcag2aa"],
            },
          });
          console.log("✅ Axe scan completed (WCAG A/AA only)");
          console.log(`Found ${results.violations.length} violations`);
          console.log(`Found ${results.passes.length} passing tests`);

          if (results.violations.length > 0) {
            console.log("Sample violation:", results.violations[0]);
          }
        } else {
          console.error("❌ axe.run not available");
        }
      } catch (error) {
        console.error("❌ Error during axe testing:", error);
      }

      console.groupEnd();
    },

    /**
     * Test AxeIntegration service
     */
    async testAxeIntegration() {
      console.group("🔧 AxeIntegration Service Tests");

      if (typeof window.AxeIntegration === "undefined") {
        console.error("❌ AxeIntegration service is not available");
        console.log("Make sure axe-integration.js is loaded");
        console.groupEnd();
        return false;
      }

      console.log("✅ AxeIntegration service is available");

      try {
        // Test getAllRules
        console.log("\n🔍 Testing AxeIntegration.getAllRules...");
        const rules = window.AxeIntegration.getAllRules();
        console.log(`✅ Retrieved ${rules.length} rules via AxeIntegration`);

        // Test getGuidanceInfo
        console.log("\n🔍 Testing AxeIntegration.getGuidanceInfo...");
        const guidance =
          window.AxeIntegration.getGuidanceInfo("color-contrast");
        console.log("✅ Guidance info retrieved:", guidance);

        // Test runScan
        console.log("\n🔍 Testing AxeIntegration.runScan...");
        const scanResults = await window.AxeIntegration.runScan();
        console.log("✅ Scan completed via AxeIntegration");
        console.log(`Found ${scanResults.violations.length} violations`);

        // Test getViolationsForElement on a specific element
        const testElement = document.querySelector("h1");
        if (testElement) {
          console.log("\n🔍 Testing AxeIntegration.getViolationsForElement...");
          const elementViolations =
            await window.AxeIntegration.getViolationsForElement(testElement);
          console.log(
            `✅ Found ${elementViolations.length} violations for test element`
          );
        }
      } catch (error) {
        console.error("❌ Error during AxeIntegration testing:", error);
      }

      console.groupEnd();
    },

    /**
     * Run all tests
     */
    async runAllTests() {
      console.log("🚀 Starting Axe Integration Debug Tests...\n");

      await this.testAxeBasics();
      await this.testAxeIntegration();

      console.log(
        "\n✨ Debug tests completed. Check the logs above for any issues."
      );
    },
  };

  // Make AxeDebug available globally
  window.AxeDebug = AxeDebug;

  console.log(
    "🛠️ AxeDebug utilities loaded. Run AxeDebug.runAllTests() to test the integration."
  );
})();
