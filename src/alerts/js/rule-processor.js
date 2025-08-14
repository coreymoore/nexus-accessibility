/**
 * Rule Processor Module
 * Handles processing and formatting of axe-core rules
 */

(function () {
  "use strict";

  const RuleProcessor = {
    /**
     * Process and merge rule data from axe-core (improved version)
     * @param {Array} tags - Optional array of tags to filter rules (e.g., ['wcag2a', 'wcag2aa'])
     * @returns {Array} Processed rules with accurate impact and WCAG data
     */
    processRulesComplete(tags = []) {
      try {
        const completeRules = this.getCompleteRules(tags);

        return completeRules.map((rule) => {
          const wcagInfo = window.WCAGParser
            ? window.WCAGParser.parseFromTags(rule.tags || [])
            : {};

          return {
            id: rule.id,
            description: rule.description || "",
            help: rule.help || "",
            helpUrl: rule.helpUrl || "",
            tags: rule.tags || [],
            impact: rule.impact, // This should now be accurate!
            wcag: wcagInfo,
            // Additional metadata for debugging/future use
            enabled: rule.enabled,
            pageLevel: rule.pageLevel,
            selector: rule.selector,
            _debug: rule._auditRule,
          };
        });
      } catch (error) {
        console.error("Error in processRulesComplete:", error);
        // Fallback to the old method with tag filtering
        return this.processRules(
          typeof axe !== "undefined" ? axe.getRules(tags) : []
        );
      }
    },

    /**
     * Process a single rule
     * @param {Object} rule - Single rule from axe.getRules()
     * @param {Array} auditRules - Internal audit rules with impact data
     * @returns {Object} Processed rule with additional metadata
     */
    _processRule(rule, auditRules) {
      const impact = this._determineImpact(rule, auditRules);
      const wcagInfo = window.WCAGParser
        ? window.WCAGParser.parseFromTags(rule.tags || [])
        : {};

      return {
        id: rule.ruleId,
        description: rule.description || "",
        help: rule.help || "",
        helpUrl: rule.helpUrl || "",
        tags: rule.tags || [],
        impact: impact,
        wcag: wcagInfo,
      };
    },

    /**
     * Get internal audit rules that contain complete rule data including impact
     * @returns {Array} Array of audit rules or empty array if not available
     */
    _getAuditRules() {
      try {
        if (typeof axe !== "undefined" && axe._audit && axe._audit.rules) {
          return axe._audit.rules;
        }
      } catch (error) {
        console.warn("Could not access axe._audit.rules:", error);
      }
      return [];
    },

    /**
     * Get a more complete rule dataset by merging public and internal data
     * @param {Array} tags - Optional array of tags to filter rules (e.g., ['wcag2a', 'wcag2aa'])
     * @returns {Array} Complete rule data with impact and metadata
     */
    getCompleteRules(tags = []) {
      try {
        // Get public rules with official tag filtering
        const publicRules =
          typeof axe !== "undefined" ? axe.getRules(tags) : [];

        // Get internal audit rules (has impact, selector, enabled, etc.)
        const auditRules = this._getAuditRules();

        if (auditRules.length === 0) {
          console.warn("No audit rules available, using public rules only");
          return publicRules.map((rule) => ({
            ...rule,
            impact: "minor", // fallback
          }));
        }

        // Filter audit rules to match the public rules (which are already filtered by tags)
        const publicRuleIds = new Set(publicRules.map((pr) => pr.ruleId));
        const filteredAuditRules = auditRules.filter((auditRule) =>
          publicRuleIds.has(auditRule.id)
        );

        // Merge the data from both sources
        return filteredAuditRules.map((auditRule) => {
          // Find matching public rule for metadata
          const publicRule = publicRules.find(
            (pr) => pr.ruleId === auditRule.id
          );

          return {
            id: auditRule.id,
            impact: auditRule.impact || "minor",
            selector: auditRule.selector,
            enabled: auditRule.enabled !== false,
            pageLevel: auditRule.pageLevel || false,
            tags: auditRule.tags || [],
            description: publicRule?.description || "",
            help: publicRule?.help || auditRule.id,
            helpUrl: publicRule?.helpUrl || "",
            // Include additional audit rule properties for debugging
            _auditRule: {
              matches: auditRule.matches,
              excludeHidden: auditRule.excludeHidden,
              any: auditRule.any?.length || 0,
              all: auditRule.all?.length || 0,
              none: auditRule.none?.length || 0,
            },
          };
        });
      } catch (error) {
        console.error("Error getting complete rules:", error);
        return [];
      }
    },

    /**
     * Determine impact level from rule data
     * @param {Object} rule - Rule object from getRules()
     * @param {Array} auditRules - Internal audit rules with impact data
     * @returns {string} Impact level (critical, serious, moderate, minor)
     */
    _determineImpact(rule, auditRules) {
      // First, try to find the matching audit rule which has the real impact data
      if (Array.isArray(auditRules)) {
        const auditRule = auditRules.find(
          (auditRule) => auditRule.id === rule.ruleId
        );
        if (auditRule && auditRule.impact) {
          return auditRule.impact;
        }
      }

      // Fallback: Check if impact is directly on the rule (shouldn't happen with getRules)
      if (rule.impact) {
        return rule.impact;
      }

      // Last resort: Try to infer from tags (this is less reliable)
      if (rule.tags && Array.isArray(rule.tags)) {
        // Look for explicit impact tags first
        if (rule.tags.some((tag) => tag.includes("critical"))) {
          return "critical";
        } else if (rule.tags.some((tag) => tag.includes("serious"))) {
          return "serious";
        } else if (rule.tags.some((tag) => tag.includes("moderate"))) {
          return "moderate";
        }

        // Try to infer from WCAG conformance levels
        // Note: This is a rough approximation and may not be accurate
        if (rule.tags.includes("wcag2a")) {
          return "serious"; // Level A requirements are important
        } else if (rule.tags.includes("wcag2aa")) {
          return "moderate"; // Level AA requirements
        } else if (rule.tags.includes("wcag2aaa")) {
          return "minor"; // Level AAA requirements are nice-to-have
        }
      }

      // Default impact if we can't determine it
      console.warn(
        `Could not determine impact for rule: ${rule.ruleId}, defaulting to 'minor'`
      );
      return "minor";
    },

    /**
     * Sort rules by specified criteria
     * @param {Array} rules - Array of processed rules
     * @param {string} sortBy - Sort criteria ('id', 'impact', 'help')
     * @returns {Array} Sorted rules
     */
    sortRules(rules, sortBy = "id") {
      if (!Array.isArray(rules)) {
        return [];
      }

      const sortFunctions = {
        id: (a, b) => a.id.localeCompare(b.id),
        impact: (a, b) => this._compareImpact(a.impact, b.impact),
        help: (a, b) => a.help.localeCompare(b.help),
      };

      const sortFunction = sortFunctions[sortBy] || sortFunctions.id;
      return [...rules].sort(sortFunction);
    },

    /**
     * Compare impact levels for sorting
     * @param {string} impactA - First impact level
     * @param {string} impactB - Second impact level
     * @returns {number} Comparison result
     */
    _compareImpact(impactA, impactB) {
      const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
      const orderA = impactOrder[impactA] ?? 999;
      const orderB = impactOrder[impactB] ?? 999;
      return orderA - orderB;
    },

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    escapeHtml(text) {
      if (!text) return "";
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    },
  };

  // Export for use in other modules
  if (typeof window !== "undefined") {
    window.RuleProcessor = RuleProcessor;
  } else if (typeof module !== "undefined" && module.exports) {
    module.exports = RuleProcessor;
  }
})();
