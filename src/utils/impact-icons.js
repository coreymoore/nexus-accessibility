/**
 * Impact Icons Utility
 *
 * Provides SVG icons for accessibility violation impact levels.
 * Icons are designed to be distinguishable by both color and shape,
 * making them accessible to users with color vision differences.
 *
 * Usage:
 * - ImpactIcons.getIcon('critical') - Returns SVG with accessible attributes
 * - ImpactIcons.getIconWithLabel('serious') - Returns icon + text label
 */

(function () {
  "use strict";

  const ImpactIcons = {
    /**
     * Get impact icon SVG with accessibility attributes
     * @param {string} impact - Impact level (critical, serious, moderate)
     * @param {Object} options - Icon options
     * @param {number} options.size - Icon size in pixels (default: 16)
     * @param {boolean} options.includeColor - Whether to include color styling (default: true)
     * @returns {string} Accessible SVG icon HTML
     */
    getIcon(impact, options = {}) {
      const { size = 16, includeColor = true } = options;
      const baseStyle = `width="${size}" height="${size}" role="img" focusable="false"`;

      // Get impact-specific properties
      const impactData = this.getImpactData(impact);
      const colorStyle = includeColor
        ? ` style="color: ${impactData.color};"`
        : "";
      const ariaLabel = `aria-label="${impactData.label}"`;

      return `<svg ${baseStyle} ${ariaLabel} viewBox="0 0 16 16" fill="currentColor"${colorStyle}>
        ${impactData.path}
      </svg>`;
    },

    /**
     * Get impact icon with text label
     * @param {string} impact - Impact level
     * @param {Object} options - Display options
     * @returns {string} Icon with label HTML
     */
    getIconWithLabel(impact, options = {}) {
      const { size = 16, showLabel = true } = options;
      const impactData = this.getImpactData(impact);
      const icon = this.getIcon(impact, { size, includeColor: true });

      if (!showLabel) {
        return icon;
      }

      return `<span class="impact-icon-with-label" style="display: flex; align-items: center; gap: 6px;">
        ${icon}
        <span class="impact-label impact-${impact}" style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
          ${impactData.displayName}
        </span>
      </span>`;
    },

    /**
     * Get impact-specific data (colors, paths, labels)
     * @param {string} impact - Impact level
     * @returns {Object} Impact data object
     */
    getImpactData(impact) {
      switch (impact?.toLowerCase()) {
        case "critical":
          return {
            color: "#991b1b",
            label: "Critical accessibility violation",
            displayName: "Critical",
            description:
              "Complete accessibility blocker - must be fixed immediately",
            path: `<path d="M4.54.146A.5.5 0 0 1 4.893 0h6.214a.5.5 0 0 1 .353.146l4.394 4.394a.5.5 0 0 1 .146.353v6.214a.5.5 0 0 1-.146.353l-4.394 4.394a.5.5 0 0 1-.353.146H4.893a.5.5 0 0 1-.353-.146L.146 11.46A.5.5 0 0 1 0 11.107V4.893a.5.5 0 0 1 .146-.353L4.54.146zM8 4c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995A.905.905 0 0 1 8 4zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>`,
          };

        case "serious":
          return {
            color: "#c2410c",
            label: "Serious accessibility violation",
            displayName: "Serious",
            description:
              "Significant accessibility barrier - high priority fix",
            path: `<path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.146.146 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.163.163 0 0 1-.054.06.116.116 0 0 1-.066.017H1.146a.115.115 0 0 1-.066-.017.163.163 0 0 1-.054-.06.176.176 0 0 1 .002-.183L7.884 2.073a.147.147 0 0 1 .054-.057zm1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566z"/>
            <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995z"/>`,
          };

        case "moderate":
          return {
            color: "#a16207",
            label: "Moderate accessibility violation",
            displayName: "Moderate",
            description: "Accessibility impediment - should be addressed",
            path: `<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>`,
          };

        case "minor":
          return {
            color: "#166534",
            label: "Minor accessibility violation",
            displayName: "Minor",
            description: "Best practice improvement - low priority",
            path: `<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>`,
          };

        default:
          return {
            color: "#666666",
            label: "Unknown accessibility violation level",
            displayName: "Unknown",
            description: "Accessibility issue with unknown severity",
            path: `<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>`,
          };
      }
    },

    /**
     * Get all available impact levels
     * @returns {Array} Array of impact level strings
     */
    getAvailableImpacts() {
      return ["critical", "serious", "moderate", "minor"];
    },

    /**
     * Get CSS class for impact level
     * @param {string} impact - Impact level
     * @returns {string} CSS class name
     */
    getImpactClass(impact) {
      return `impact-${impact?.toLowerCase() || "unknown"}`;
    },
  };

  // Export to global namespace
  if (typeof window !== "undefined") {
    window.ImpactIcons = ImpactIcons;
  }

  // Export for Node.js/modules if needed
  if (typeof module !== "undefined" && module.exports) {
    module.exports = ImpactIcons;
  }
})();
