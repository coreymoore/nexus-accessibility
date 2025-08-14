/**
 * Axe-Core Integration Module
 *
 * This module handles integration with axe-core for accessibility scanning.
 * It provides functions to run scans, cache results, and format violations
 * for display in the tooltip system.
 *
 * Dependencies:
 * - axe-core.js (bundled library)
 * - logger-content.js (for logging)
 * - debounce.js (for performance optimization)
 *
 * Global API: window.AxeIntegration
 */

(function () {
  "use strict";

  // Ensure axe is available
  if (typeof window.axe === "undefined") {
    console.error(
      "[AxeIntegration] axe-core is not available. Make sure axe-core.js is loaded first."
    );
    return;
  }

  // Access logger if available
  const logger = window.ContentLogger || console;

  // Cache for scan results to avoid re-scanning unchanged content
  const scanCache = new Map();
  const CACHE_TTL = 30000; // 30 seconds

  /**
   * Configuration for axe-core scans
   * Only include WCAG A and AA rules as per extension requirements
   */
  const AXE_CONFIG = {
    tags: ["wcag2a", "wcag2aa"], // Only WCAG A and AA rules
    options: {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa"],
      },
    },
  };

  /**
   * Debounced scan function to prevent excessive scanning
   */
  const debouncedScan = window.debounce
    ? window.debounce(performScan, 500)
    : performScan;

  /**
   * Main AxeIntegration object
   */
  const AxeIntegration = {
    /**
     * Initialize axe-core with custom configuration
     * @param {Object} config - Optional custom configuration
     */
    initialize(config = {}) {
      try {
        // Debug: Log available axe methods
        if (window.axe) {
          const axeMethods = Object.getOwnPropertyNames(window.axe).filter(
            (prop) => typeof window.axe[prop] === "function"
          );
          logger.debug("[AxeIntegration] Available axe methods:", axeMethods);

          // Specifically check for the methods we need
          logger.debug("[AxeIntegration] Method availability:", {
            run: typeof window.axe.run,
            configure: typeof window.axe.configure,
            getRules: typeof window.axe.getRules,
            getRule: typeof window.axe.getRule,
          });
        }

        // Merge custom config with defaults, ensuring rules is array if present
        const mergedConfig = {
          ...AXE_CONFIG,
          ...config,
        };

        // Validate configuration before passing to axe
        if (mergedConfig.rules && !Array.isArray(mergedConfig.rules)) {
          logger.warn(
            "[AxeIntegration] Invalid rules property (must be array), removing from config"
          );
          delete mergedConfig.rules;
        }

        logger.debug("[AxeIntegration] Final axe configuration:", mergedConfig);

        // Configure axe-core
        if (typeof window.axe.configure === "function") {
          window.axe.configure(mergedConfig);
          logger.debug("[AxeIntegration] axe-core configured successfully");
        } else {
          logger.warn("[AxeIntegration] axe.configure method not available");
        }

        logger.info("[AxeIntegration] Initialized successfully");

        // Try to load rule metadata for fallback alerts information
        this.loadRuleMetadata();
      } catch (error) {
        logger.error("[AxeIntegration] Failed to initialize:", error);
      }
    },

    /**
     * Load rule metadata for fallback alerts information
     */
    async loadRuleMetadata() {
      try {
        // Try to load the rules metadata JSON file
        let metadataUrl;
        if (
          typeof chrome !== "undefined" &&
          chrome.runtime &&
          chrome.runtime.getURL
        ) {
          metadataUrl = chrome.runtime.getURL("src/alerts/rules-metadata.json");
        } else {
          metadataUrl = "../alerts/rules-metadata.json";
        }

        const response = await fetch(metadataUrl);
        if (response.ok) {
          const metadata = await response.json();
          window.AxeRuleMetadata = metadata;
          logger.debug("[AxeIntegration] Rule metadata loaded successfully");
        }
      } catch (error) {
        logger.debug(
          "[AxeIntegration] Could not load rule metadata (this is optional):",
          error
        );
      }
    },

    /**
     * Run accessibility scan on the current page or specific element
     * @param {Element} [context] - Optional element to scan (defaults to document)
     * @param {Object} [options] - Optional scan options
     * @returns {Promise<Object>} Scan results
     */
    async runScan(context = document, options = {}) {
      try {
        // Create cache key
        const cacheKey = this.createCacheKey(context, options);

        // Check cache first
        const cachedResult = this.getCachedResult(cacheKey);
        if (cachedResult) {
          logger.debug("[AxeIntegration] Using cached scan result");
          return cachedResult;
        }

        // Run the scan
        logger.debug("[AxeIntegration] Running accessibility scan...");
        const results = await window.axe.run(context, {
          ...AXE_CONFIG.options,
          ...options,
        });

        // Process and cache results
        const processedResults = this.processResults(results);
        this.cacheResult(cacheKey, processedResults);

        logger.info(
          `[AxeIntegration] Scan completed. Found ${processedResults.violations.length} violations`
        );
        return processedResults;
      } catch (error) {
        logger.error("[AxeIntegration] Scan failed:", error);
        return {
          violations: [],
          passes: [],
          incomplete: [],
          inapplicable: [],
          error: error.message,
        };
      }
    },

    /**
     * Get violations for a specific element
     * @param {Element} element - Target element
     * @param {Object} [scanResults] - Optional pre-computed scan results
     * @returns {Promise<Array>} Array of violations for the element
     */
    async getViolationsForElement(element, scanResults = null) {
      try {
        logger.debug(
          "[AxeIntegration] getViolationsForElement called for:",
          element?.tagName,
          element?.id
        );

        // If no scan results provided, run a targeted scan
        if (!scanResults) {
          logger.debug(
            "[AxeIntegration] No scan results provided, running new scan"
          );
          scanResults = await this.runScan();
        }

        logger.debug(
          "[AxeIntegration] Total violations in scan results:",
          scanResults?.violations?.length || 0
        );

        // Find violations that affect this element
        const elementViolations = [];

        for (const violation of scanResults.violations) {
          logger.debug(
            "[AxeIntegration] Checking violation:",
            violation.id,
            "with",
            violation.nodes.length,
            "nodes"
          );

          for (const node of violation.nodes) {
            // Check if this node matches our target element
            if (this.doesNodeMatchElement(node, element)) {
              logger.debug(
                "[AxeIntegration] Found matching violation:",
                violation.id,
                "for element"
              );
              elementViolations.push({
                ...violation,
                nodeInfo: node,
                alerts: this.getAlertsInfo(violation.id),
              });
            }
          }
        }

        logger.debug(
          "[AxeIntegration] Element violations found:",
          elementViolations.length
        );
        return elementViolations;
      } catch (error) {
        logger.error(
          "[AxeIntegration] Failed to get violations for element:",
          error
        );
        return [];
      }
    },

    /**
     * Check if an axe node matches a DOM element
     * @param {Object} node - Axe node object
     * @param {Element} element - DOM element
     * @returns {boolean} True if they match
     */
    doesNodeMatchElement(node, element) {
      try {
        logger.debug(
          "[AxeIntegration] Matching node target:",
          node.target[0],
          "against element:",
          element?.tagName,
          element?.id
        );

        // Try to resolve the element using axe's selector
        const nodeElement = document.querySelector(node.target[0]);
        const matches = nodeElement === element;

        logger.debug("[AxeIntegration] querySelector match result:", matches);
        return matches;
      } catch (error) {
        logger.debug(
          "[AxeIntegration] querySelector failed, trying fallback selector match"
        );
        // Fallback: try to match by comparing selectors
        try {
          const elementSelector = this.generateSelector(element);
          const selectorMatches = node.target[0] === elementSelector;
          logger.debug(
            "[AxeIntegration] Selector comparison:",
            node.target[0],
            "vs",
            elementSelector,
            "=",
            selectorMatches
          );
          return selectorMatches;
        } catch (fallbackError) {
          logger.warn(
            "[AxeIntegration] Could not match node to element:",
            fallbackError
          );
          return false;
        }
      }
    },

    /**
     * Generate a CSS selector for an element
     * @param {Element} element - Target element
     * @returns {string} CSS selector
     */
    generateSelector(element) {
      if (element.id) {
        return `#${element.id}`;
      }

      let selector = element.tagName.toLowerCase();

      if (element.className) {
        selector += "." + element.className.split(" ").join(".");
      }

      // Add nth-child if needed for uniqueness
      const parent = element.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (child) => child.tagName === element.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(element) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      return selector;
    },

    /**
     * Get alerts information for a rule
     * @param {string} ruleId - Axe rule ID
     * @returns {Object} Alerts information
     */
    getAlertsInfo(ruleId) {
      try {
        let rule = null;

        // Try different methods to get rule information
        if (typeof window.axe.getRule === "function") {
          rule = window.axe.getRule(ruleId);
        } else if (typeof window.axe.getRules === "function") {
          // Get only WCAG A/AA rules and find the matching one
          const allRules = window.axe.getRules(["wcag2a", "wcag2aa"]);
          rule = allRules.find((r) => r.ruleId === ruleId || r.id === ruleId);
        }

        // If we still don't have rule info, try the static metadata
        if (!rule) {
          rule = this.getStaticRuleInfo(ruleId);
        }

        if (!rule) {
          return {
            id: ruleId,
            description: "Rule information not available",
            helpUrl: this.getAlertsUrl(ruleId),
            impact: "unknown",
          };
        }

        return {
          id: rule.ruleId || rule.id || ruleId,
          description: rule.description || "No description available",
          help: rule.help || "No help available",
          helpUrl: rule.helpUrl || this.getAlertsUrl(ruleId),
          impact: rule.impact || "unknown",
          tags: rule.tags || [],
          wcag: this.extractWcagInfo(rule.tags || []),
        };
      } catch (error) {
        logger.error("[AxeIntegration] Failed to get alerts info:", error);
        return {
          id: ruleId,
          description: "Rule information not available",
          helpUrl: this.getAlertsUrl(ruleId),
          impact: "unknown",
        };
      }
    },

    /**
     * Get static rule information from our metadata (fallback)
     * @param {string} ruleId - Axe rule ID
     * @returns {Object|null} Rule information or null
     */
    getStaticRuleInfo(ruleId) {
      // Try to load rule metadata if available
      try {
        if (window.AxeRuleMetadata && window.AxeRuleMetadata.rules) {
          return window.AxeRuleMetadata.rules[ruleId];
        }
      } catch (error) {
        // Metadata not available, continue with fallback
      }

      // Basic fallback rule info based on common rules
      const commonRules = {
        "color-contrast": {
          id: "color-contrast",
          description:
            "Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds",
          help: "Elements must have sufficient color contrast",
          impact: "serious",
          tags: ["cat.color", "wcag2aa", "wcag143"],
        },
        "image-alt": {
          id: "image-alt",
          description:
            "Ensures img elements have alternate text or a role of none or presentation",
          help: "Images must have alternate text",
          impact: "critical",
          tags: ["cat.text-alternatives", "wcag2a", "wcag111"],
        },
        label: {
          id: "label",
          description: "Ensures every form element has a label",
          help: "Form elements must have labels",
          impact: "critical",
          tags: ["cat.forms", "wcag2a", "wcag412"],
        },
        "link-name": {
          id: "link-name",
          description: "Ensures links have discernible text",
          help: "Links must have discernible text",
          impact: "serious",
          tags: ["cat.name-role-value", "wcag2a", "wcag412"],
        },
      };

      return commonRules[ruleId] || null;
    },

    /**
     * Get guidance URL for a rule (helper method)
     * @param {string} ruleId - Axe rule ID
     * @returns {string} URL to guidance page
     */
    getAlertsUrl(ruleId) {
      // Check if we're in an extension context
      if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        chrome.runtime.getURL
      ) {
        return chrome.runtime.getURL(`src/alerts/index.html#rule-${ruleId}`);
      }
      // Fallback for testing or other contexts
      return `../alerts/index.html#rule-${ruleId}`;
    },

    /**
     * Extract WCAG information from rule tags
     * @param {Array} tags - Rule tags
     * @returns {Array} WCAG criteria
     */
    extractWcagInfo(tags) {
      return tags
        .filter((tag) => tag.startsWith("wcag"))
        .map((tag) => {
          const matches = tag.match(/wcag(\d+)(\w+)/);
          if (matches) {
            return {
              level: matches[1],
              criteria: matches[2],
              tag: tag,
            };
          }
          return { tag };
        });
    },

    /**
     * Process raw axe results
     * @param {Object} results - Raw axe results
     * @returns {Object} Processed results
     */
    processResults(results) {
      return {
        violations: results.violations.map((violation) => ({
          ...violation,
          guidance: this.getGuidanceInfo(violation.id),
        })),
        passes: results.passes,
        incomplete: results.incomplete,
        inapplicable: results.inapplicable,
        timestamp: Date.now(),
        url: window.location.href,
      };
    },

    /**
     * Create cache key for results
     * @param {Element} context - Scan context
     * @param {Object} options - Scan options
     * @returns {string} Cache key
     */
    createCacheKey(context, options) {
      const contextKey =
        context === document ? "document" : this.generateSelector(context);
      const optionsKey = JSON.stringify(options);
      return `${contextKey}:${optionsKey}`;
    },

    /**
     * Get cached scan result
     * @param {string} key - Cache key
     * @returns {Object|null} Cached result or null
     */
    getCachedResult(key) {
      const cached = scanCache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
      if (cached) {
        scanCache.delete(key);
      }
      return null;
    },

    /**
     * Cache scan result
     * @param {string} key - Cache key
     * @param {Object} data - Result data
     */
    cacheResult(key, data) {
      scanCache.set(key, {
        data,
        timestamp: Date.now(),
      });
    },

    /**
     * Clear the scan cache
     */
    clearCache() {
      scanCache.clear();
      logger.debug("[AxeIntegration] Cache cleared");
    },

    /**
     * Get all available WCAG A/AA rules from axe-core
     * @returns {Array} Array of rule objects
     */
    getAllRules() {
      try {
        if (typeof window.axe.getRules === "function") {
          return window.axe.getRules(["wcag2a", "wcag2aa"]);
        } else {
          logger.warn(
            "[AxeIntegration] getRules method not available, returning empty array"
          );
          return [];
        }
      } catch (error) {
        logger.error("[AxeIntegration] Failed to get rules:", error);
        return [];
      }
    },

    /**
     * Format violations for tooltip display
     * @param {Array} violations - Array of violations
     * @returns {Array} Formatted violations for display
     */
    formatViolationsForTooltip(violations) {
      return violations.map((violation) => ({
        id: violation.id,
        description:
          violation.description ||
          violation.help ||
          "Accessibility violation detected",
        impact: violation.impact || "unknown",
        helpUrl: violation.helpUrl || `#${violation.id}`,
        message:
          violation.nodeInfo?.failureSummary ||
          violation.nodeInfo?.any?.[0]?.message ||
          "See guidance for details",
      }));
    },
  };

  // Perform the actual scan (used by debounced function)
  async function performScan(context, options) {
    return await AxeIntegration.runScan(context, options);
  }

  // Initialize the module
  AxeIntegration.initialize();

  // Export to global namespace
  window.AxeIntegration = AxeIntegration;

  logger.info("[AxeIntegration] Module loaded successfully");
})();
