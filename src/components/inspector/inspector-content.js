/**
 * Inspector Content Generation Module
 *
 * Handles the creation and formatting of inspector content including
 * screen reader output, properties lists, and loading states.
 *
 * Dependencies:
 * - inspector-utils.js (for data processing utilities)
 *
 * Global API: window.NexusInspector.Content
 */

(function () {
  "use strict";

  // Access utilities
  const utils = window.NexusInspector.Utils;

  // HTML Templates for consistency and maintainability
  const Templates = {
    // Loading spinner removed to comply with no-animation policy.


    ERROR_ICON: `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 4v4M8 10h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `,

    SCREEN_READER_ICON: `
      <svg width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="Screen Reader Output" focusable="false" style="vertical-align:middle;">
        <rect x="3" y="8" width="5" height="8" rx="1.5" fill="#683ab7"/>
        <polygon points="8,8 14,4 14,20 8,16" fill="#683ab7"/>
        <path d="M17 9a4 4 0 0 1 0 6" stroke="#683ab7" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M19.5 7a7 7 0 0 1 0 10" stroke="#683ab7" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      </svg>
    `,
  };

  /**
   * Content generation functions for inspectors
   */

  /**
   * Content generation functions for inspectors
   */
  const InspectorContent = {
    /**
     * Normalize boolean values from different sources
     * @param {*} value - Value to normalize
     * @returns {boolean|null} Normalized boolean or null if indeterminate
     */
    normalizeBooleanValue(value) {
      if (value === null || value === undefined) return null;
      if (value === true || value === "true") return true;
      if (value === false || value === "false") return false;
      if (value === "mixed") return "mixed";
      return null;
    },

    /**
     * Create a safe HTML span for screen reader output
     * @param {string} className - CSS class for the span
     * @param {string} content - Content to display
     * @returns {string} Safe HTML span
     */
    createSafeSpan(className, content) {
      return `<span class="${utils.escapeHtml(className)}">${utils.escapeHtml(
        String(content)
      )}</span>`;
    },

    /**
     * Create loading content HTML
     * @returns {string} Loading content HTML
     */
    createLoadingContent() {
      return `
  <div class="nexus-accessibility-ui-inspector-body">
    <div class="nexus-accessibility-ui-loading" aria-hidden="false">
      <div class="nexus-skeleton" aria-hidden="true">
        <div class="bar long"></div>
        <div class="bar medium"></div>
        <div class="bar short"></div>
      </div>

      <!-- Accessible-only text for screen readers -->
      <span class="nexus-sr-only">Loading Nexus Accessibility Info</span>
    </div>
  </div>
      `;
    },


    /**
     * Generate screen reader output HTML
     * @param {Object} info - Accessibility information object
     * @returns {string} Screen reader output HTML
     */
    getScreenReaderOutput(info) {
      // Input validation
      if (!info || typeof info !== "object") {
        console.warn(
          "[Inspector] Invalid info object provided to getScreenReaderOutput"
        );
        return '<span class="sr-error">Unable to generate screen reader output</span>';
      }

      // Try sr-preview integration first
      try {
        const srPreview = window.NexusInspector && window.NexusInspector.SrPreview;
        if (srPreview && typeof srPreview.renderPreview === 'function') {
          const preview = srPreview.renderPreview(info, { mode: 'full' });
          if (preview) {
            // Handle preview result based on its type
            if (typeof preview === 'string') {
              // If it's HTML with token classes, sanitize and return
              if (preview.includes('<span class="sr-')) {
                return utils.createSafeInspectorContent(preview);
              } else {
                // Plain text - escape and return as-is
                return utils.escapeHtml(preview);
              }
            } else if (Array.isArray(preview)) {
              // If sr-preview returns segments array, map to token classes
              const mappedSegments = preview.map(segment => {
                const kind = segment.kind;
                const text = segment.text;
                if (!text) return '';
                
                // Map segment kinds to CSS token classes
                let className;
                switch (kind) {
                  case 'role':
                    className = 'sr-role';
                    break;
                  case 'name':
                    className = 'sr-name';
                    break;
                  case 'desc':
                  case 'description':
                    className = 'sr-desc';
                    break;
                  case 'state':
                    // Handle special required state
                    if (text === 'required') {
                      className = 'sr-required';
                    } else {
                      className = 'sr-state';
                    }
                    break;
                  case 'required':
                    className = 'sr-required';
                    break;
                  case 'value':
                    className = 'sr-value';
                    break;
                  case 'meta':
                  case 'group':
                    className = 'sr-group';
                    break;
                  case 'active-descendant':
                    className = 'sr-active-descendant';
                    break;
                  default:
                    className = 'sr-state'; // Default fallback
                }
                
                return this.createSafeSpan(className, text);
              }).filter(Boolean);
              
              return mappedSegments.join(', ');
            }
          }
        }
      } catch (err) {
        console.warn('[NEXUS][SR-PREVIEW] sr-preview failed:', err);
        return '<span class="sr-error">Screen reader preview unavailable</span>';
      }

      // If we get here, sr-preview didn't return a result but didn't throw an error
      console.warn('[NEXUS][SR-PREVIEW] sr-preview returned empty result');
      return '<span class="sr-error">Screen reader preview unavailable</span>';
    },

    /**
     * Create screen reader section HTML
     * @param {Object} info - Accessibility information object
     * @returns {string} Screen reader section HTML
     */
    createScreenReaderSection(info) {
      return `
  <div class="nexus-accessibility-ui-inspector-sr" tabindex="-1">
          ${Templates.SCREEN_READER_ICON}
          ${this.getScreenReaderOutput(info)}
        </div>
      `;
    },

    /**
     * Create error content HTML
     * @param {string} message - Error message to display
     * @returns {string} Error content HTML
     */
    createErrorContent(message) {
      return `
  <div class="nexus-accessibility-ui-inspector-body">
          <div class="nexus-accessibility-ui-error" style="display: flex; align-items: center; gap: 8px; color: #d73a49;">
            ${Templates.ERROR_ICON}
            <span>${utils.escapeHtml(message || "An error occurred")}</span>
          </div>
        </div>
      `;
    },

    /**
     * Get properties list for accessibility information
     * @param {Object} accessibilityInfo - Accessibility information object
     * @returns {Array|string} Properties list or custom HTML string
     */
    getPropertiesList(accessibilityInfo) {
      // Use custom formatter if it exists
      if (typeof window.formatAccessibilityInfo === "function") {
        return window.formatAccessibilityInfo(accessibilityInfo);
      }

      const pairs = [];

      // Add basic properties
      if (accessibilityInfo.role) {
        pairs.push({ label: "Role", value: accessibilityInfo.role });
      }

      if (accessibilityInfo.name) {
        const n = utils.deepUnwrap(accessibilityInfo.name);
        pairs.push({ label: "Name", value: n });
      }

      if (accessibilityInfo.description) {
        const d = utils.deepUnwrap(accessibilityInfo.description);
        pairs.push({ label: "Description", value: d });
      }

      // Add active descendant information if available (before States)
      if (accessibilityInfo.activeDescendant) {
        const activeDesc = accessibilityInfo.activeDescendant;
        let activeDescValue = "";

        if (activeDesc.role) {
          activeDescValue += activeDesc.role;
        }

        if (activeDesc.name) {
          const name = utils.deepUnwrap(activeDesc.name);
          activeDescValue += activeDescValue ? ` "${name}"` : `"${name}"`;
        }

        if (
          activeDesc.states &&
          Array.isArray(activeDesc.states) &&
          activeDesc.states.length > 0
        ) {
          const states = activeDesc.states.join(", ");
          activeDescValue += activeDescValue ? ` (${states})` : states;
        }

        if (activeDescValue) {
          pairs.push({ label: "Active Descendant", value: activeDescValue });
        }
      } else {
        // Fallback: try to derive active descendant from raw states/aria
        try {
          const raw = accessibilityInfo?.states?.activedescendant || accessibilityInfo?.activeDescendantRaw || accessibilityInfo?.ariaProperties?.activedescendant;
          const rawText = raw ? utils.deepUnwrap(raw) : null;
          if (rawText) {
            pairs.push({ label: "Active Descendant", value: rawText });
          }
        } catch (e) {
          // ignore fallback failures
        }
      }

      if (
        accessibilityInfo.states &&
        Array.isArray(accessibilityInfo.states) &&
        accessibilityInfo.states.length > 0
      ) {
        const statesValue = accessibilityInfo.states.join(", ");
        pairs.push({ label: "States", value: statesValue });
      }

      if (accessibilityInfo.group && accessibilityInfo.group !== "(no group)") {
        const g = utils.deepUnwrap(accessibilityInfo.group);
        pairs.push({ label: "Group", value: g });
      }

      if (
        accessibilityInfo.value &&
        accessibilityInfo.value !== null &&
        accessibilityInfo.value !== "(no value)"
      ) {
        const v = utils.deepUnwrap(accessibilityInfo.value);
        pairs.push({ label: "Value", value: v });
      }

      return pairs;
    },

    /**
     * Create properties section HTML
     * @param {Object} info - Accessibility information object
     * @returns {string} Properties section HTML
     */
    createPropertiesSection(info) {
      const propertiesList = this.getPropertiesList(info);

      if (Array.isArray(propertiesList)) {
        return (
          `<dl>` +
          propertiesList
            .map(({ label, value }) => {
              const isActiveDescendant = label === "Active Descendant";
              const ddClass = isActiveDescendant
                ? ' class="active-descendant"'
                : "";
              return `<dt>${utils.escapeHtml(
                label
              )}</dt><dd${ddClass}>${utils.escapeHtml(value)}</dd>`;
            })
            .join("") +
          `</dl>`
        );
      } else {
        // SECURITY FIX: Sanitize custom formatter output to prevent XSS
        return utils.createSafeInspectorContent(propertiesList);
      }
    },

    /**
     * Generate complete inspector content
     * @param {Object} info - Accessibility information object
     * @param {boolean} miniMode - Whether to show mini version
     * @param {Object} options - Options including onClose and enabled callbacks
     * @returns {string} Complete inspector HTML content
     */
    generateInspectorContent(info, miniMode, options = {}) {
      // Input validation
      if (!info || typeof info !== "object") {
        console.error("[Inspector] Invalid accessibility info provided:", info);
        return this.createErrorContent("Invalid accessibility information");
      }

      try {
        const screenReaderSection = this.createScreenReaderSection(info);

        // Create inspector body wrapper
        const bodyOpen = `<div class="nexus-accessibility-ui-inspector-body">`;
        const bodyClose = `</div>`;

        let inspectorContent;
        if (miniMode) {
          // Mini mode: only screen reader output
          inspectorContent = `
            ${bodyOpen}
              ${screenReaderSection}
            ${bodyClose}
          `;
        } else {
          // Full mode: screen reader output + properties
          const propertiesSection = this.createPropertiesSection(info);
          inspectorContent = `
            ${bodyOpen}
              ${screenReaderSection}
              ${propertiesSection}
            ${bodyClose}
          `;
        }

        return inspectorContent;
      } catch (error) {
        console.error("[Inspector] Content generation failed:", error);
        return this.createErrorContent("Unable to generate inspector content");
      }
    },

    /**
     * Safely create inspector content (legacy method for backward compatibility)
     * @param {string} content - Content to make safe
     * @returns {string} Safe content
     */
    createSafeInspectorContent(content) {
      return utils.createSafeInspectorContent(content);
    },
  };

  // Initialize global namespace
  if (!window.NexusInspector) {
    window.NexusInspector = {};
  }

  // Export content functions
  window.NexusInspector.Content = InspectorContent;
})();
