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
     * @returns {string} HTML string for the     /**
     * Update page metadata (version info, rule count, etc.)
     * @param {Object} metadata - Page metadata
     * @param {string} metadata.version - Axe version
     * @param {number} metadata.ruleCount - Number of rules
     */
    updatePageMetadata(metadata) {
      // Since we've simplified the page, we no longer display version info,
      // rule counts, or generation dates. This method is kept for compatibility
      // but doesn't update any elements.
      console.log(
        `Page generated with axe-core v${metadata.version}, ${metadata.ruleCount} rules`
      );
    },
    generateRuleSection(rule) {
      if (!rule || !rule.id) {
        return "";
      }

      const impact = rule.impact || "minor";

      // Get impact icon
      const impactIcon = this._getImpactIcon(impact);

      // Generate comprehensive description HTML
      const comprehensiveHTML = this._generateComprehensiveDescription(rule.id);

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
                        ${comprehensiveHTML}
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
     * Generate comprehensive description HTML for a rule
     * @param {string} ruleId - The rule ID
     * @returns {string} HTML for comprehensive description
     */
    _generateComprehensiveDescription(ruleId) {
      console.log(`🔍 Generating comprehensive description for: ${ruleId}`);

      // Check if comprehensive descriptions are available
      if (typeof window.RULE_DESCRIPTIONS === "undefined") {
        console.warn(
          `⚠️ window.RULE_DESCRIPTIONS is undefined for rule: ${ruleId}`
        );
        return "";
      }

      if (!window.RULE_DESCRIPTIONS[ruleId]) {
        console.warn(
          `⚠️ Rule ${ruleId} not found in RULE_DESCRIPTIONS. Available rules:`,
          Object.keys(window.RULE_DESCRIPTIONS)
        );
        return "";
      }

      console.log(`✅ Found rule description for: ${ruleId}`);
      const desc = window.RULE_DESCRIPTIONS[ruleId];

      return `
        <div class="comprehensive-description" role="region" aria-labelledby="enhanced-${ruleId}">
          <h3 id="enhanced-${ruleId}" class="sr-only">Enhanced Documentation for ${ruleId}</h3>
          ${this._generatePlainLanguageSection(desc.plainLanguage)}
          ${this._generateWhyItMattersSection(desc.whyItMatters)}
          ${this._generateHowToFixSection(desc.howToFix)}
          ${this._generateExamplesSection(desc.examples)}
          ${this._generateWcagMappingSection(desc.wcagMapping)}
        </div>
      `;
    },

    /**
     * Generate plain language section HTML
     * @param {Object} plainLanguage - Plain language object
     * @returns {string} HTML for plain language section
     */
    _generatePlainLanguageSection(plainLanguage) {
      if (!plainLanguage) return "";

      return `
        <div class="plain-language-section">
          <h4>In Plain Language</h4>
          <ul class="plain-language-list">
            <li class="what-it-means"><strong>What it means:</strong> ${this._escapeHtml(
              plainLanguage.whatItMeans
            )}</li>
            <li class="why-it-matters"><strong>Why it matters:</strong> ${this._escapeHtml(
              plainLanguage.whyItMatters
            )}</li>
            <li class="who-it-affects"><strong>Who it affects:</strong> ${this._escapeHtml(
              plainLanguage.whoItAffects
            )}</li>
          </ul>
        </div>
      `;
    },

    /**
     * Generate "Why It Matters" section HTML
     * @param {Array} reasons - Array of reasons
     * @returns {string} HTML for why it matters section
     */
    _generateWhyItMattersSection(reasons) {
      if (!Array.isArray(reasons) || reasons.length === 0) return "";

      const reasonsList = reasons
        .map((reason) => `<li>${this._escapeHtml(reason)}</li>`)
        .join("");

      return `
        <div class="why-matters-section">
          <h4>Why This Rule Matters</h4>
          <ul class="reasons-list">
            ${reasonsList}
          </ul>
        </div>
      `;
    },

    /**
     * Generate "How to Fix" section HTML
     * @param {Object} howToFix - How to fix object
     * @returns {string} HTML for how to fix section
     */
    _generateHowToFixSection(howToFix) {
      if (!howToFix) return "";

      const methodsHTML = Array.isArray(howToFix.methods)
        ? howToFix.methods
            .map(
              (method) => `
            <div class="fix-method">
              <strong>${this._escapeHtml(method.approach)}:</strong>
              <p>${this._escapeHtml(method.description)}</p>
              ${
                method.code
                  ? `<pre><code>${this._escapeHtml(method.code)}</code></pre>`
                  : ""
              }
            </div>
          `
            )
            .join("")
        : "";

      return `
        <div class="how-to-fix-section">
          <h4>How to Fix</h4>
          <p>${this._escapeHtml(howToFix.overview)}</p>
          ${methodsHTML}
        </div>
      `;
    },

    /**
     * Generate examples section HTML
     * @param {Object} examples - Examples object with failing and passing arrays
     * @returns {string} HTML for examples section
     */
    _generateExamplesSection(examples) {
      if (!examples) return "";

      const failingHTML = Array.isArray(examples.failing)
        ? examples.failing
            .map(
              (example) => `
            <div class="example-item">
              <h6>${this._escapeHtml(example.description)}</h6>
              <pre><code>${this._escapeHtml(example.code)}</code></pre>
              <div class="example-issue">${this._escapeHtml(
                example.issue
              )}</div>
            </div>
          `
            )
            .join("")
        : "";

      const passingHTML = Array.isArray(examples.passing)
        ? examples.passing
            .map(
              (example) => `
            <div class="example-item">
              <h6>${this._escapeHtml(example.description)}</h6>
              <pre><code>${this._escapeHtml(example.code)}</code></pre>
              <div class="example-explanation">${this._escapeHtml(
                example.explanation
              )}</div>
            </div>
          `
            )
            .join("")
        : "";

      return `
        <div class="examples-section">
          <h4>Examples</h4>
          <div class="failing-examples">
            <h5>Failing Examples</h5>
            ${failingHTML || "<p>No failing examples available.</p>"}
          </div>
          <div class="passing-examples">
            <h5>Passing Examples</h5>
            ${passingHTML || "<p>No passing examples available.</p>"}
          </div>
        </div>
      `;
    },

    /**
     * Generate WCAG mapping section HTML
     * @param {Object} wcagMapping - WCAG mapping object
     * @returns {string} HTML for WCAG mapping section
     */
    _generateWCAGMappingSection(wcagMapping) {
      if (!wcagMapping) return "";

      const guidelinesHTML = Array.isArray(wcagMapping.guidelines)
        ? wcagMapping.guidelines
            .map(
              (guideline) => `
            <li class="wcag-guideline">
              <strong><a href="${
                guideline.link
              }" target="_blank" rel="noopener">${this._escapeHtml(
                guideline.criterion
              )}</a></strong>
              <p>${this._escapeHtml(guideline.relationship)}</p>
            </li>
          `
            )
            .join("")
        : "";

      const techniquesHTML = Array.isArray(wcagMapping.techniques)
        ? wcagMapping.techniques
            .map(
              (technique) =>
                `<li><a href="${
                  technique.link
                }" target="_blank" rel="noopener">${
                  technique.id
                }: ${this._escapeHtml(technique.title)}</a></li>`
            )
            .join("")
        : "";

      return `
        <div class="wcag-mapping-section">
          <h4>WCAG Guidelines</h4>
          ${
            guidelinesHTML
              ? `
            <div class="wcag-guidelines">
              <strong>Related Success Criteria:</strong>
              <ul class="guidelines-list">
                ${guidelinesHTML}
              </ul>
            </div>
          `
              : ""
          }
          ${
            techniquesHTML
              ? `
            <div class="wcag-techniques">
              <strong>Related Techniques:</strong>
              <ul class="techniques-list">${techniquesHTML}</ul>
            </div>
          `
              : ""
          }
        </div>
      `;
    },

    /**
     * Generate WCAG mapping section HTML (updated method)
     * @param {Object} wcagMapping - WCAG mapping object
     * @returns {string} HTML for WCAG mapping section
     */
    _generateWcagMappingSection(wcagMapping) {
      if (!wcagMapping) return "";

      const guidelinesHTML = Array.isArray(wcagMapping.guidelines)
        ? wcagMapping.guidelines
            .map(
              (guideline) => `
            <li class="guideline-item">
              <a href="${
                guideline.link
              }" target="_blank" rel="noopener" class="guideline-link">
                ${this._escapeHtml(guideline.criterion)}
              </a>
              <div class="guideline-relationship">${this._escapeHtml(
                guideline.relationship
              )}</div>
            </li>
          `
            )
            .join("")
        : "";

      const techniquesHTML = Array.isArray(wcagMapping.techniques)
        ? wcagMapping.techniques
            .map(
              (technique) => `
            <li class="technique-item">
              <a href="${
                technique.link
              }" target="_blank" rel="noopener" class="technique-link">
                ${technique.id}: ${this._escapeHtml(technique.title)}
              </a>
            </li>
          `
            )
            .join("")
        : "";

      return `
        <div class="wcag-mapping-section">
          <h4>WCAG Guidelines & Techniques</h4>
          ${
            guidelinesHTML
              ? `
            <div class="wcag-guidelines">
              <h6>Success Criteria</h6>
              <ul class="guidelines-list">
                ${guidelinesHTML}
              </ul>
            </div>
          `
              : ""
          }
          ${
            techniquesHTML
              ? `
            <div class="wcag-techniques">
              <h6>Related Techniques</h6>
              <ul class="techniques-list">
                ${techniquesHTML}
              </ul>
            </div>
          `
              : ""
          }
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
