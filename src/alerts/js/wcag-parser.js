/**
 * WCAG Parser Module
 * Extracts WCAG success criteria information from axe-core rule tags
 */

(function () {
  "use strict";

  const WCAGParser = {
    /**
     * Parse WCAG information from rule tags
     * @param {string[]} tags - Array of tags from axe-core rule
     * @returns {Object} WCAG information including criteria, level, and version
     */
    parseFromTags(tags) {
      const wcagInfo = {
        criteria: [],
        level: null,
        version: null,
      };

      if (!Array.isArray(tags)) {
        return wcagInfo;
      }

      tags.forEach((tag) => {
        // Match WCAG criteria like wcag111, wcag143, wcag412
        const criteriaMatch = tag.match(/^wcag(\d)(\d+)$/);
        if (criteriaMatch) {
          const major = criteriaMatch[1];
          const minor = criteriaMatch[2];
          const criteria = this._formatCriteria(major, minor);
          if (criteria) {
            wcagInfo.criteria.push(criteria);
          }
        }

        // Match WCAG level tags like wcag2a, wcag2aa, wcag2aaa
        const levelMatch = tag.match(/^wcag2(a{1,3})$/);
        if (levelMatch) {
          wcagInfo.level = levelMatch[1].toUpperCase();
        }

        // Match WCAG version tags like wcag21aa, wcag22aa
        const versionMatch = tag.match(/^wcag(\d{2})(a{1,3})$/);
        if (versionMatch) {
          wcagInfo.version = `2.${versionMatch[1][1]}`;
          wcagInfo.level = versionMatch[2].toUpperCase();
        }
      });

      return wcagInfo;
    },

    /**
     * Format WCAG criteria from major and minor parts
     * @param {string} major - Major version number
     * @param {string} minor - Minor version string
     * @returns {string|null} Formatted criteria (e.g., "1.4.3") or null if invalid
     */
    _formatCriteria(major, minor) {
      if (!major || !minor) return null;

      let criteria = `${major}.`;

      // Format the minor part correctly
      if (minor.length === 1) {
        criteria += `${minor}.1`;
      } else if (minor.length === 2) {
        criteria += `${minor[0]}.${minor[1]}`;
      } else if (minor.length === 3) {
        // Handle cases like 143 -> 1.4.3
        criteria += `${minor[0]}.${minor.substring(1)}`;
      } else {
        return null; // Invalid format
      }

      return criteria;
    },

    /**
     * Generate HTML for WCAG criteria display
     * @param {Object} wcagInfo - WCAG information object
     * @returns {string} HTML string for WCAG criteria section
     */
    generateHTML(wcagInfo) {
      if (!wcagInfo || !wcagInfo.criteria || wcagInfo.criteria.length === 0) {
        return "";
      }

      const criteriaList = wcagInfo.criteria
        .map((c) => `<span class="wcag-criteria">${this._escapeHtml(c)}</span>`)
        .join(" ");
      const level = wcagInfo.level ? ` (Level ${wcagInfo.level})` : "";

      return `
                <div class="rule-wcag">
                    <strong>WCAG Success Criteria:</strong> ${criteriaList}${level}
                </div>
            `;
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
    window.WCAGParser = WCAGParser;
  } else if (typeof module !== "undefined" && module.exports) {
    module.exports = WCAGParser;
  }
})();
