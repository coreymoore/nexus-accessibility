/**
 * Alerts Page Controller
 * Main controller for the alerts page functionality
 */

(function () {
  "use strict";

  const AlertsController = {
    /**
     * Initialize the alerts page
     */
    init() {
      console.log("Initializing alerts page...");

      // Show loading state immediately
      window.HTMLGenerator.showLoading();

      // Check if axe is already available
      if (typeof axe !== "undefined") {
        console.log("Axe found immediately, generating page...");
        this.generatePage();
      } else {
        console.log("Axe not found, waiting...");
        // Wait for axe-core to load
        this._waitForAxe();
      }
    },

    /**
     * Generate the complete alerts page
     */
    generatePage() {
      try {
        console.log("Starting page generation...");

        // Get version info
        const version = axe.version;
        console.log(`Using axe-core v${version}`);

        // Use the improved rule processing with WCAG A and AA rules only
        const processedRules = window.RuleProcessor.processRulesComplete([
          "wcag2a",
          "wcag2aa",
        ]);
        const sortedRules = window.RuleProcessor.sortRules(
          processedRules,
          "id"
        );

        console.log(
          `Processed ${sortedRules.length} WCAG A/AA rules with accurate impact data`
        );

        // Log impact distribution for debugging
        const impactCounts = sortedRules.reduce((acc, rule) => {
          acc[rule.impact] = (acc[rule.impact] || 0) + 1;
          return acc;
        }, {});
        console.log("Impact distribution (WCAG A/AA only):", impactCounts);

        // Update page metadata
        window.HTMLGenerator.updatePageMetadata({
          version: version,
          ruleCount: sortedRules.length,
        });

        // Generate and display HTML
        const rulesHTML = window.HTMLGenerator.generateAllRules(sortedRules);
        window.HTMLGenerator.updateRulesContainer(rulesHTML);

        console.log("Page generation completed successfully");
      } catch (error) {
        console.error("Error generating alerts page:", error);
        window.HTMLGenerator.showError(
          "Error loading rules from axe-core. Please check the console for details."
        );
      }
    },

    /**
     * Wait for axe-core to load with timeout
     */
    _waitForAxe() {
      let attempts = 0;
      const maxAttempts = 10;
      const checkInterval = 100;

      const checkAxe = () => {
        attempts++;
        console.log(
          `Checking for axe-core... attempt ${attempts}/${maxAttempts}`
        );

        if (typeof axe !== "undefined") {
          console.log("Axe found after waiting, generating page...");
          this.generatePage();
        } else if (attempts >= maxAttempts) {
          console.error("Axe-core failed to load after maximum attempts");
          window.HTMLGenerator.showError(
            "Failed to load axe-core. Please check that axe-core.js is available."
          );
        } else {
          setTimeout(checkAxe, checkInterval);
        }
      };

      setTimeout(checkAxe, checkInterval);
    },

    /**
     * Check if all required dependencies are available
     * @returns {boolean} True if all dependencies are loaded
     */
    _checkDependencies() {
      const required = ["WCAGParser", "RuleProcessor", "HTMLGenerator"];
      const missing = required.filter(
        (dep) => typeof window[dep] === "undefined"
      );

      if (missing.length > 0) {
        console.error("Missing required dependencies:", missing);
        return false;
      }

      return true;
    },
  };

  // Initialize when DOM is ready
  document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM loaded, checking dependencies...");

    if (AlertsController._checkDependencies()) {
      AlertsController.init();
    } else {
      window.HTMLGenerator.showError(
        "Required modules are not loaded. Please check your script includes."
      );
    }
  });

  // Export for manual initialization if needed
  if (typeof window !== "undefined") {
    window.AlertsController = AlertsController;
  }
})();
