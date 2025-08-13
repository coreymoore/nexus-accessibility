/**
 * Tooltip Content Generation Module
 *
 * Handles the creation and formatting of tooltip content including
 * screen reader output, properties lists, and loading states.
 *
 * Dependencies:
 * - tooltip-utils.js (for data processing utilities)
 *
 * Global API: window.NexusTooltip.Content
 */

(function () {
  "use strict";

  // Access utilities
  const utils = window.NexusTooltip.Utils;

  /**
   * Content generation functions for tooltips
   */
  const TooltipContent = {
    /**
     * Create loading content HTML
     * @returns {string} Loading content HTML
     */
    createLoadingContent() {
      return `
        <div class="chrome-ax-tooltip-body" inert>
          <div role="status" aria-live="polite" aria-atomic="true" style="display: flex; align-items: center; gap: 8px; color: #683ab7;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="animation: spin 1s linear infinite;" aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
              </circle>
            </svg>
            <span>Loading Nexus Accessibility Info</span>
          </div>
        </div>
      `;
    },

    /**
     * Create close button HTML
     * @returns {string} Close button HTML
     */
    createCloseButton() {
      return `
        <button class="chrome-ax-tooltip-close" 
                aria-label="Close Nexus Inspector" 
                type="button"
                tabindex="0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
          </svg>
        </button>
      `;
    },

    /**
     * Generate screen reader output HTML
     * @param {Object} info - Accessibility information object
     * @returns {string} Screen reader output HTML
     */
    getScreenReaderOutput(info) {
      // Debug logging to understand the data structure
      console.debug("[Tooltip] Accessibility info received:", {
        role: info.role,
        name: info.name,
        ariaProperties: info.ariaProperties,
        normalizedExpanded: info.normalizedExpanded,
        states: info.states,
      });

      // Base: role, name, description
      const base = [];
      if (info.role) {
        base.push(
          `<span class="sr-role">${utils.escapeHtml(info.role)}</span>`
        );
      }
      if (info.name && info.name !== "(no accessible name)") {
        base.push(
          `<span class="sr-name">${utils.escapeHtml(info.name)}</span>`
        );
      }
      if (info.description && info.description !== "(no description)") {
        base.push(
          `<span class="sr-desc">${utils.escapeHtml(info.description)}</span>`
        );
      }

      // Extras: states, aria-derived states, group, value, required
      const extras = [];

      if (
        info.ariaProperties ||
        info.states ||
        info.normalizedExpanded !== null
      ) {
        // Handle aria-expanded (prioritize normalizedExpanded field)
        let expandedValue = null;

        // First try the normalized expanded field (this is the canonical source)
        if (
          info.normalizedExpanded !== null &&
          info.normalizedExpanded !== undefined
        ) {
          expandedValue = info.normalizedExpanded;
        }
        // Fallback to aria-expanded from ariaProperties
        else if (
          info.ariaProperties &&
          "aria-expanded" in info.ariaProperties
        ) {
          expandedValue = utils.deepUnwrap(
            info.ariaProperties["aria-expanded"]
          );
        }
        // Fallback to expanded from states
        else if (info.states && "expanded" in info.states) {
          expandedValue = utils.deepUnwrap(info.states.expanded);
        }

        // Add expanded/collapsed state if we have a meaningful value
        if (expandedValue !== null && expandedValue !== undefined) {
          // Debug logging to understand the data
          console.debug(
            "[Tooltip] Expanded value found:",
            expandedValue,
            "type:",
            typeof expandedValue
          );

          if (expandedValue === true || expandedValue === "true") {
            extras.push(`<span class="sr-state">expanded</span>`);
          } else if (expandedValue === false || expandedValue === "false") {
            extras.push(`<span class="sr-state">collapsed</span>`);
          }
        }

        // Handle aria-pressed
        if (info.ariaProperties && "aria-pressed" in info.ariaProperties) {
          const prs = utils.deepUnwrap(info.ariaProperties["aria-pressed"]);
          extras.push(
            `<span class="sr-state">${
              utils.isTrue(prs) ? "pressed" : "not pressed"
            }</span>`
          );
        }

        // Handle checked state
        if (info.states && "checked" in info.states) {
          const checked = utils.deepUnwrap(info.states.checked);
          if (utils.isTrue(checked)) {
            extras.push(`<span class="sr-state">checked</span>`);
          } else if (checked === false || checked === "false") {
            extras.push(`<span class="sr-state">unchecked</span>`);
          } else if (checked === "mixed") {
            extras.push(`<span class="sr-state">mixed</span>`);
          } else {
            extras.push(`<span class="sr-state">unchecked</span>`);
          }
        }

        // Handle disabled state
        if (info.states) {
          const dis = utils.deepUnwrap(info.states.disabled);
          if (utils.isTrue(dis)) {
            extras.push(`<span class="sr-state">disabled</span>`);
          }

          // Handle required state
          const ariaReq =
            info.ariaProperties &&
            utils.isTrue(
              utils.deepUnwrap(info.ariaProperties["aria-required"])
            );
          const req = utils.deepUnwrap(info.states.required);
          if (utils.isTrue(req) || ariaReq) {
            extras.push(`<span class="sr-required">required</span>`);
          }
        }
      }

      // Value
      if (info.value && info.value !== "(no value)") {
        const v = utils.deepUnwrap(info.value);
        extras.push(`<span class="sr-value">${String(v)}</span>`);
      }

      // Group
      if (info.group && info.group.role) {
        if (info.group.label) {
          extras.push(
            `<span class="sr-group">${info.group.role}, ${info.group.label}</span>`
          );
        } else {
          extras.push(`<span class="sr-group">${info.group.role}</span>`);
        }
      }

      // Compose: base joined by space; if extras exist, add a comma, then extras joined by ", "
      const baseStr = base.join(" ");
      if (extras.length > 0) {
        return (baseStr ? baseStr + ", " : "") + extras.join(", ");
      }
      return baseStr;
    },

    /**
     * Create screen reader section HTML
     * @param {Object} info - Accessibility information object
     * @returns {string} Screen reader section HTML
     */
    createScreenReaderSection(info) {
      return `
        <div class="chrome-ax-tooltip-sr" tabindex="-1">
          <svg width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="Screen Reader Output" focusable="false" style="vertical-align:middle;">
            <rect x="3" y="8" width="5" height="8" rx="1.5" fill="#7851a9"/>
            <polygon points="8,8 14,4 14,20 8,16" fill="#78551a9"/>
            <path d="M17 9a4 4 0 0 1 0 6" stroke="#7851a9" stroke-width="2" fill="none" stroke-linecap="round"/>
            <path d="M19.5 7a7 7 0 0 1 0 10" stroke="#78551a9" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          </svg>
          ${this.getScreenReaderOutput(info)}
        </div>
      `;
    },

    /**
     * Get properties list for accessibility information
     * @param {Object} accessibilityInfo - Accessibility information object
     * @returns {Array|string} Properties list or formatted HTML string
     */
    getPropertiesList(accessibilityInfo) {
      if (!window.formatAccessibilityInfo) {
        const pairs = [
          { label: "Role", value: accessibilityInfo.role },
          { label: "Name", value: accessibilityInfo.name },
        ];

        // Add description if it exists and is meaningful
        const hasDesc =
          accessibilityInfo.description !== "(no description)" &&
          !String(accessibilityInfo.description).includes(
            "Screen Reader Output"
          );
        if (hasDesc) {
          pairs.push({
            label: "Description",
            value: accessibilityInfo.description,
          });
        }

        // Place Group immediately after Description (or at this position if no description)
        if (accessibilityInfo.group && accessibilityInfo.group.role) {
          let groupText = accessibilityInfo.group.role;
          if (accessibilityInfo.group.label) {
            groupText += ` (${accessibilityInfo.group.label})`;
          }
          pairs.push({ label: "Group", value: groupText });
        }

        // Value appears after Group
        if (
          accessibilityInfo.value &&
          accessibilityInfo.value !== "(no value)"
        ) {
          const v = utils.deepUnwrap(accessibilityInfo.value);
          pairs.push({ label: "Value", value: v });
        }

        return pairs;
      }

      // If custom formatter exists, use it but append Group if present
      let html = window.formatAccessibilityInfo(accessibilityInfo);
      return html;
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
            .map(
              ({ label, value }) =>
                `<dt>${utils.escapeHtml(label)}</dt><dd>${utils.escapeHtml(
                  value
                )}</dd>`
            )
            .join("") +
          `</dl>`
        );
      } else {
        return propertiesList;
      }
    },

    /**
     * Generate complete tooltip content
     * @param {Object} info - Accessibility information object
     * @param {boolean} miniMode - Whether to show mini version
     * @param {Object} options - Options including onClose and enabled callbacks
     * @returns {string} Complete tooltip HTML content
     */
    generateTooltipContent(info, miniMode, options = {}) {
      const closeButtonHtml = this.createCloseButton();
      const screenReaderSection = this.createScreenReaderSection(info);

      // Create tooltip body wrapper
      const bodyOpen = `<div class="chrome-ax-tooltip-body" inert style="pointer-events: none;">`;
      const bodyClose = `</div>`;

      let tooltipContent;
      if (miniMode) {
        // Mini mode: only screen reader output
        tooltipContent = `
          ${closeButtonHtml}
          ${bodyOpen}
            ${screenReaderSection}
          ${bodyClose}
        `;
      } else {
        // Full mode: screen reader output + properties
        const propertiesSection = this.createPropertiesSection(info);
        tooltipContent = `
          ${closeButtonHtml}
          ${bodyOpen}
            ${screenReaderSection}
            ${propertiesSection}
          ${bodyClose}
        `;
      }

      return tooltipContent;
    },

    /**
     * Safely create tooltip content (legacy method for backward compatibility)
     * @param {string} content - Content to make safe
     * @returns {string} Safe content
     */
    createSafeTooltipContent(content) {
      return utils.createSafeTooltipContent(content);
    },
  };

  // Initialize global namespace
  if (!window.NexusTooltip) {
    window.NexusTooltip = {};
  }

  // Export content functions
  window.NexusTooltip.Content = TooltipContent;
})();
