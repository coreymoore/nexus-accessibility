/**
 * HTML Generator Module
 * Generates HTML content for the alerts page
 */

(function () {
  "use strict";

  const HTMLGenerator = {
    /**
     * Generate HTML for a single rule section
     * @param {Object} rule - Processed rule object
     * @returns {string} HTML string for the rule section
     */
    generateRuleSection(rule) {
      if (!rule || !rule.id) {
        return "";
      }

      const impact = rule.impact || "minor";
      const tags = rule.tags || [];

      // Get impact icon
      const impactIcon = this._getImpactIcon(impact);

      // Get WCAG HTML
      const wcagHTML = window.WCAGParser
        ? window.WCAGParser.generateHTML(rule.wcag)
        : "";

      // Generate tags HTML
      const tagsHTML = this._generateTagsHTML(tags);

      return `
                <section id="rule-${
                  rule.id
                }" class="rule-section impact-${impact}">
                    <div class="rule-header">
                        <h2 class="rule-help">${this._escapeHtml(
                          rule.help
                        )}</h2>
                        <span class="impact-badge impact-${impact}">
                            ${impactIcon}
                            <span class="sr-only">Impact: </span>${impact}
                        </span>
                    </div>
                    <div class="rule-content">
                        <p class="rule-description">${this._escapeHtml(
                          rule.description
                        )}</p>
                        ${wcagHTML}
                        ${tagsHTML}
                    </div>
                </section>
            `;
    },

    /**
     * Generate HTML for all rules
     * @param {Array} rules - Array of processed rules
     * @returns {string} Complete HTML for all rule sections
     */
    generateAllRules(rules) {
      if (!Array.isArray(rules)) {
        return '<p class="error">No rules data available.</p>';
      }

      if (rules.length === 0) {
        return '<p class="error">No accessibility rules found.</p>';
      }

      return rules.map((rule) => this.generateRuleSection(rule)).join("");
    },

    /**
     * Generate HTML for rule tags
     * @param {Array} tags - Array of tag strings
     * @returns {string} HTML for tags section
     */
    _generateTagsHTML(tags) {
      if (!Array.isArray(tags) || tags.length === 0) {
        return "";
      }

      const tagSpans = tags
        .map((tag) => `<span class="tag">${this._escapeHtml(tag)}</span>`)
        .join(" ");

      return `
                <div class="rule-tags">
                    <strong>Tags:</strong> ${tagSpans}
                </div>
            `;
    },

    /**
     * Get impact icon HTML
     * @param {string} impact - Impact level
     * @returns {string} Icon HTML or empty string
     */
    _getImpactIcon(impact) {
      if (typeof window.ImpactIcons !== "undefined") {
        return window.ImpactIcons.getIcon(impact, {
          size: 14,
          includeColor: true,
        });
      }
      return "";
    },

    /**
     * Update page metadata
     * @param {Object} metadata - Metadata object
     * @param {string} metadata.version - Axe version
     * @param {number} metadata.ruleCount - Number of rules
     */
    updatePageMetadata(metadata) {
      const { version, ruleCount } = metadata;

      this._updateElementText("axe-version", version || "unknown");
      this._updateElementText(
        "footer-version",
        version ? `v${version}` : "unknown"
      );
      this._updateElementText("rule-count", ruleCount || 0);
      this._updateElementText(
        "generation-date",
        new Date().toLocaleDateString()
      );
    },

    /**
     * Show loading state
     */
    showLoading() {
      const container = document.getElementById("rules-container");
      if (container) {
        container.innerHTML = "<p>Loading rules from axe-core...</p>";
      }
    },

    /**
     * Show error state
     * @param {string} message - Error message to display
     */
    showError(message) {
      const container = document.getElementById("rules-container");
      if (container) {
        container.innerHTML = `<p class="error">${this._escapeHtml(
          message
        )}</p>`;
      }
    },

    /**
     * Update rules container with generated HTML
     * @param {string} html - Generated HTML content
     */
    updateRulesContainer(html) {
      const container = document.getElementById("rules-container");
      if (container) {
        container.innerHTML = html;
      }
    },

    /**
     * Update text content of an element by ID
     * @param {string} elementId - Element ID
     * @param {string} text - Text content
     */
    _updateElementText(elementId, text) {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = text;
      }
    },

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    _escapeHtml(text) {
      if (!text) return "";
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    },
  };

  // Export for use in other modules
  if (typeof window !== "undefined") {
    window.HTMLGenerator = HTMLGenerator;
  } else if (typeof module !== "undefined" && module.exports) {
    module.exports = HTMLGenerator;
  }
})();
