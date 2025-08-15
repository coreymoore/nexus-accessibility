/**
 * Centralized Axe Configuration
 *
 * This module provides a single source of truth for axe-core configuration
 * across the entire extension to ensure consistency between popup and alerts.
 */

(function () {
  "use strict";

  // Central axe configuration
  const AXE_CONFIG = {
    // Standard WCAG A and AA rules only
    tags: ["wcag2a", "wcag2aa"],

    // Run options for axe.run()
    runOptions: {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa"],
      },
      // Include only violations and passes
      resultTypes: ["violations", "passes", "incomplete", "inapplicable"],
    },

    // Options for axe.getRules()
    ruleOptions: {
      tags: ["wcag2a", "wcag2aa"],
    },
  };

  // Export configuration
  window.AxeConfig = {
    /**
     * Get the standard configuration for axe.run()
     */
    getRunConfig() {
      return {
        tags: AXE_CONFIG.tags,
        ...AXE_CONFIG.runOptions,
      };
    },

    /**
     * Get the standard configuration for axe.getRules()
     */
    getRuleConfig() {
      return AXE_CONFIG.ruleOptions;
    },

    /**
     * Get tags only
     */
    getTags() {
      return [...AXE_CONFIG.tags];
    },

    /**
     * Run axe scan with standard configuration
     */
    async runScan(element = document) {
      if (typeof window.axe === "undefined") {
        throw new Error("Axe-core not available");
      }

      return window.axe.run(element, this.getRunConfig());
    },

    /**
     * Get rules with standard configuration
     */
    getRules() {
      if (typeof window.axe === "undefined") {
        console.warn("Axe-core not available");
        return [];
      }

      if (typeof window.axe.getRules !== "function") {
        console.warn("axe.getRules not available");
        return [];
      }

      const rules = window.axe.getRules(AXE_CONFIG.tags);
      console.log(
        `AxeConfig.getRules() found ${rules.length} rules for tags:`,
        AXE_CONFIG.tags
      );

      // Log first few rule IDs for debugging
      if (rules.length > 0) {
        const ruleIds = rules.map((r) => r.ruleId || r.id).slice(0, 10);
        console.log("First 10 rule IDs:", ruleIds);
      }

      return rules;
    },

    /**
     * Debug function to show what rules are available
     */
    debugRules() {
      const rules = this.getRules();
      console.log(
        `Found ${rules.length} WCAG A/AA rules:`,
        rules.map((r) => r.ruleId || r.id)
      );
      return rules;
    },
  };

  console.log("AxeConfig loaded with tags:", AXE_CONFIG.tags);
})();
