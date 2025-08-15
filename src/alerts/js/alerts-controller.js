/**
 * Alerts Page Controller
 * Main controller for the alerts page functionality
 */

(function () {
  "use strict";

  const AlertsController = {
    loaderStartTime: null,

    /**
     * Initialize the alerts page
     */
    init() {
      // Prevent multiple initializations
      if (window.alertsInitialized) {
        console.log("Alerts already initialized, skipping...");
        return;
      }

      console.log("Initializing alerts page...");
      window.alertsInitialized = true;

      // Record loader start time
      this.loaderStartTime = Date.now();

      // Show loader (content remains visible)
      const loader = document.getElementById("loader");

      if (loader) {
        loader.style.display = "flex";
      }

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

        // Debug: Check axe configuration consistency
        if (window.AxeConfig) {
          console.log("Using AxeConfig, tags:", window.AxeConfig.getTags());
          const debugRules = window.AxeConfig.debugRules();
        } else {
          console.warn("AxeConfig not available, using fallback");
        }

        // Get version info
        const version = axe.version;
        console.log(`Using axe-core v${version}`);

        // Use the centralized axe configuration
        const ruleConfig = window.AxeConfig
          ? window.AxeConfig.getTags()
          : ["wcag2a", "wcag2aa"];
        const processedRules =
          window.RuleProcessor.processRulesComplete(ruleConfig);
        const sortedRules = window.RuleProcessor.sortRules(
          processedRules,
          "id"
        );

        console.log(
          `Processed ${sortedRules.length} WCAG A/AA rules with accurate impact data`
        );

        // Debug: List all rule IDs
        const ruleIds = sortedRules.map((rule) => rule.id);
        console.log("All rule IDs:", ruleIds);

        // Debug: Check which rules have documentation
        const hasDocumentation = ruleIds.filter(
          (id) =>
            typeof window.RULE_DESCRIPTIONS !== "undefined" &&
            window.RULE_DESCRIPTIONS[id]
        );
        const missingDocumentation = ruleIds.filter(
          (id) =>
            typeof window.RULE_DESCRIPTIONS === "undefined" ||
            !window.RULE_DESCRIPTIONS[id]
        );

        console.log(
          `Rules with documentation: ${hasDocumentation.length}`,
          hasDocumentation
        );
        console.log(
          `Rules missing documentation: ${missingDocumentation.length}`,
          missingDocumentation
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

        // Generate and display HTML with basic descriptions first
        const rulesHTML = window.HTMLGenerator.generateAllRules(sortedRules);
        window.HTMLGenerator.updateRulesContainer(rulesHTML);

        console.log("Page generation completed successfully");
        // Rules are rendered, handle URL hash immediately
        setTimeout(() => {
          this._handleUrlHash();
        }, 100);

        // Wait for DOM to render and ensure minimum 2 seconds
        this._hideLoaderWhenReady();

        // Load Markdown descriptions asynchronously to enhance the content
        this._loadMarkdownDescriptions(sortedRules);
      } catch (error) {
        console.error("Error generating alerts page:", error);
        this._hideLoaderOnError();
        window.HTMLGenerator.showError(
          "Error loading rules from axe-core. Please check the console for details."
        );
      }
    },

    /**
     * Hide loader when content is ready with minimum display time
     */
    _hideLoaderWhenReady() {
      const loader = document.getElementById("loader");

      if (!loader) return;

      // Ensure minimum 2 seconds have passed
      const elapsedTime = Date.now() - this.loaderStartTime;
      const minDisplayTime = 2000; // 2 seconds
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

      const hideLoader = () => {
        // Wait for rules to actually render in DOM
        const checkRulesRendered = () => {
          const ruleElements = document.querySelectorAll(
            ".rule-section, .rule-card"
          );
          if (ruleElements.length > 0) {
            // Then hide loader
            loader.style.opacity = "0";
            setTimeout(() => {
              loader.style.display = "none";
              console.log("Loader hidden - content ready");
            }, 500);
          } else {
            // Rules not yet rendered, check again
            setTimeout(checkRulesRendered, 50);
          }
        };

        // Give DOM a moment to update, then check
        setTimeout(checkRulesRendered, 100);
      };

      if (remainingTime > 0) {
        console.log(`Waiting ${remainingTime}ms more for minimum display time`);
        setTimeout(hideLoader, remainingTime);
      } else {
        hideLoader();
      }
    },

    /**
     * Hide loader immediately on error
     */
    _hideLoaderOnError() {
      const loader = document.getElementById("loader");

      if (loader) {
        loader.style.opacity = "0";
        setTimeout(() => {
          loader.style.display = "none";
        }, 500);
      }
    },

    /**
     * Load Markdown descriptions asynchronously and update the page
     * @param {Array} sortedRules - Array of sorted rules
     */
    async _loadMarkdownDescriptions(sortedRules) {
      if (typeof window.RuleLoader === "undefined") {
        console.log(
          "RuleLoader not available, using JavaScript descriptions only"
        );
        return;
      }

      try {
        console.log("Loading enhanced descriptions from Markdown...");
        const ruleIds = sortedRules.map((rule) => rule.id);
        const markdownDescriptions = await window.RuleLoader.loadRules(ruleIds);

        if (Object.keys(markdownDescriptions).length > 0) {
          console.log(
            `Successfully loaded Markdown descriptions for ${
              Object.keys(markdownDescriptions).length
            } rules`
          );

          // Merge and regenerate with enhanced descriptions
          const combinedDescriptions = {
            ...window.RULE_DESCRIPTIONS,
            ...markdownDescriptions,
          };
          const originalDescriptions = window.RULE_DESCRIPTIONS;
          window.RULE_DESCRIPTIONS = combinedDescriptions;

          // Regenerate HTML with enhanced descriptions
          const enhancedHTML =
            window.HTMLGenerator.generateAllRules(sortedRules);
          window.HTMLGenerator.updateRulesContainer(enhancedHTML);

          // Restore original descriptions
          window.RULE_DESCRIPTIONS = originalDescriptions;

          console.log("Page enhanced with Markdown descriptions");
        } else {
          console.log(
            "No Markdown descriptions found, keeping JavaScript descriptions"
          );
        }
      } catch (error) {
        console.warn(
          "Error loading Markdown descriptions, keeping existing content:",
          error
        );
      }
    },

    /**
     * Handle URL hash navigation after content is loaded
     */
    _handleUrlHash() {
      const hash = window.location.hash;
      if (hash) {
        console.log(`Navigating to hash: ${hash}`);

        const targetElement = document.querySelector(hash);
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });

          // Focus the H2 within the target element for accessibility
          const h2Element = targetElement.querySelector("h2");
          if (h2Element) {
            if (h2Element.tabIndex === -1) {
              h2Element.tabIndex = -1;
            }
            h2Element.focus();
          }

          console.log(`Scrolled to ${hash}`);
        } else {
          console.warn(`Target element not found for hash: ${hash}`);
        }
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
          this._hideLoaderOnError();
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
      const required = ["RuleProcessor", "HTMLGenerator"];
      const missing = required.filter(
        (dep) => typeof window[dep] === "undefined"
      );

      if (missing.length > 0) {
        console.error("Missing required dependencies:", missing);
        return false;
      }

      // Check optional dependencies
      if (typeof window.RuleLoader === "undefined") {
        console.warn(
          "RuleLoader not available - will use JavaScript descriptions only"
        );
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
      // Hide loader on dependency error
      AlertsController._hideLoaderOnError();
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
