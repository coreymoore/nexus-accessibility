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

  // HTML Templates for consistency and maintainability
  const Templates = {
    LOADING_SPINNER: `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="animation: spin 1s linear infinite;" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
          <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
          <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
        </circle>
      </svg>
    `,

    CLOSE_BUTTON_ICON: `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
        <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      </svg>
    `,

    ERROR_ICON: `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 4v4M8 10h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `,

    SCREEN_READER_ICON: `
      <svg width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="Screen Reader Output" focusable="false" style="vertical-align:middle;">
        <rect x="3" y="8" width="5" height="8" rx="1.5" fill="#7851a9"/>
        <polygon points="8,8 14,4 14,20 8,16" fill="#78551a9"/>
        <path d="M17 9a4 4 0 0 1 0 6" stroke="#7851a9" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M19.5 7a7 7 0 0 1 0 10" stroke="#78551a9" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      </svg>
    `,

    ALERT_ICON: `
      <svg width="20" height="20" viewBox="0 0 20 20" role="img" aria-label="Accessibility Alert" focusable="false" style="vertical-align:middle;">
        <path d="M8.257 3.099c.765-1.36 2.722-1.36 3.487 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92z" fill="#dc2626"/>
        <path d="M10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zM10 13a1 1 0 100 2 1 1 0 000-2z" fill="white"/>
      </svg>
    `,
  };

  /**
   * Content generation functions for tooltips
   */

  /**
   * Content generation functions for tooltips
   */
  const TooltipContent = {
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
        <div class="chrome-ax-tooltip-body">
          <div role="status" aria-live="polite" aria-atomic="true" style="display: flex; align-items: center; gap: 8px; color: #683ab7;">
            ${Templates.LOADING_SPINNER}
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
          ${Templates.CLOSE_BUTTON_ICON}
        </button>
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
          "[Tooltip] Invalid info object provided to getScreenReaderOutput"
        );
        return '<span class="sr-error">Unable to generate screen reader output</span>';
      }

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
        base.push(this.createSafeSpan("sr-role", info.role));
      }
      if (info.name && info.name !== "(no accessible name)") {
        base.push(this.createSafeSpan("sr-name", info.name));
      }
      if (info.description && info.description !== "(no description)") {
        base.push(this.createSafeSpan("sr-desc", info.description));
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

        // Normalize and add expanded/collapsed state
        const normalizedExpanded = this.normalizeBooleanValue(expandedValue);
        if (normalizedExpanded === true) {
          extras.push(`<span class="sr-state">expanded</span>`);
        } else if (normalizedExpanded === false) {
          extras.push(`<span class="sr-state">collapsed</span>`);
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
          const normalizedChecked = this.normalizeBooleanValue(checked);
          if (normalizedChecked === true) {
            extras.push(`<span class="sr-state">checked</span>`);
          } else if (normalizedChecked === false) {
            extras.push(`<span class="sr-state">unchecked</span>`);
          } else if (normalizedChecked === "mixed") {
            extras.push(`<span class="sr-state">mixed</span>`);
          } else {
            // Fallback to unchecked for unrecognized values to match screen reader behavior
            // Per ARIA spec, checkboxes without explicit aria-checked default to false/unchecked
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
          ${Templates.SCREEN_READER_ICON}
          ${this.getScreenReaderOutput(info)}
        </div>
      `;
    },

    /**
     * Filter violations by impact level, excluding minor issues and duplicates
     * @param {Array} violations - Array of violations
     * @returns {Array} Filtered violations (excludes minor impact and duplicate messages)
     */
    filterViolationsByImpact(violations) {
      if (!violations || !Array.isArray(violations)) {
        return [];
      }

      // Filter out minor violations - only show critical, serious, and moderate
      const filteredByImpact = violations.filter((violation) => {
        const impact = violation.impact?.toLowerCase();
        return impact !== "minor";
      });

      // Deduplicate by cleaned message content
      const seenMessages = new Set();
      return filteredByImpact.filter((violation) => {
        const cleanedMessage = this.cleanViolationMessage(violation.message);
        if (seenMessages.has(cleanedMessage)) {
          return false;
        }
        seenMessages.add(cleanedMessage);
        return true;
      });
    },

    /**
     * Get impact icon SVG based on violation level (uses shared utility)
     * @param {string} impact - Impact level (critical, serious, moderate)
     * @returns {string} SVG icon HTML with accessibility attributes
     */
    getImpactIcon(impact) {
      // Use the shared ImpactIcons utility if available, fallback to inline
      if (window.ImpactIcons) {
        return window.ImpactIcons.getIcon(impact, { size: 16 });
      }

      // Fallback implementation (should not be reached if utility is loaded)
      return `<span class="impact-fallback" style="color: #666; font-weight: bold;">[${impact}]</span>`;
    },

    /**
     * Create alerts content for definition list format
     * @param {Array} violations - Array of accessibility violations
     * @returns {string} Alerts content HTML for <dd>
     */
    createAlertsContent(violations) {
      if (!violations || violations.length === 0) {
        return "";
      }

      // Filter out minor violations before processing
      const filteredViolations = this.filterViolationsByImpact(violations);

      if (filteredViolations.length === 0) {
        return "";
      }

      const alertsList = filteredViolations
        .map(
          (violation) => `
        <div class="chrome-ax-tooltip-alert" data-rule-id="${utils.escapeHtml(
          violation.id
        )}">
          <a href="${this.getGuidanceUrl(violation.id)}" 
             target="_blank" 
             rel="noopener noreferrer"
             class="alert-link">
            <span class="alert-impact-icon">
              ${this.getImpactIcon(violation.impact)}
            </span>
            <span class="alert-message">${utils.escapeHtml(
              this.cleanViolationMessage(violation.message)
            )}</span>
          </a>
        </div>
      `
        )
        .join("");

      return `
        <div class="chrome-ax-tooltip-alerts-list">
          ${alertsList}
        </div>
      `;
    },

    /**
     * Create alerts section HTML for accessibility violations
     * @param {Array} violations - Array of accessibility violations
     * @returns {string} Alerts section HTML
     */
    createAlertsSection(violations) {
      if (!violations || violations.length === 0) {
        return "";
      }

      const alertsList = violations
        .map(
          (violation) => `
        <li class="chrome-ax-tooltip-alert" data-rule-id="${utils.escapeHtml(
          violation.id
        )}">
          <a href="${this.getGuidanceUrl(violation.id)}" 
             target="_blank" 
             rel="noopener noreferrer"
             class="alert-link">
            <span class="alert-impact impact-${violation.impact}">${
            violation.impact
          }</span>
            <span class="alert-description">${utils.escapeHtml(
              violation.description
            )}</span>
            <span class="alert-message">${utils.escapeHtml(
              violation.message
            )}</span>
          </a>
        </li>
      `
        )
        .join("");

      return `
        <div class="chrome-ax-tooltip-alerts">
          ${Templates.ALERT_ICON}
          <div class="alerts-content">
            <h3>Alerts (${violations.length})</h3>
            <ul class="alerts-list">
              ${alertsList}
            </ul>
          </div>
        </div>
      `;
    },

    /**
     * Clean violation message by removing unwanted prefixes
     * @param {string} message - Original violation message
     * @returns {string} Cleaned message
     */
    cleanViolationMessage(message) {
      if (!message) return message;

      // Remove "Fix all of the following:" and "Fix any of the following:" prefixes
      return message
        .replace(/^Fix all of the following:\s*/i, "")
        .replace(/^Fix any of the following:\s*/i, "")
        .trim();
    },

    /**
     * Get guidance URL for a rule
     * @param {string} ruleId - Axe rule ID
     * @returns {string} URL to guidance page
     */
    getGuidanceUrl(ruleId) {
      // Try to use AxeIntegration service if available
      if (
        window.AxeIntegration &&
        typeof window.AxeIntegration.getGuidanceUrl === "function"
      ) {
        return window.AxeIntegration.getGuidanceUrl(ruleId);
      }

      // Fallback: generate URL directly
      // Check if we're in an extension context
      if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        chrome.runtime.getURL
      ) {
        return chrome.runtime.getURL(
          `src/alerts/dynamic-index.html#rule-${ruleId}`
        );
      }
      // Fallback for testing or other contexts
      return `../alerts/dynamic-index.html#rule-${ruleId}`;
    },

    /**
     * Create error content HTML
     * @param {string} message - Error message to display
     * @returns {string} Error content HTML
     */
    createErrorContent(message) {
      return `
        <div class="chrome-ax-tooltip-body">
          <div role="alert" aria-live="assertive" style="display: flex; align-items: center; gap: 8px; color: #d73a49;">
            ${Templates.ERROR_ICON}
            <span>${utils.escapeHtml(message || "An error occurred")}</span>
          </div>
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
     * @param {boolean} includeAlertsPlaceholder - Whether to include alerts placeholder
     * @returns {string} Properties section HTML
     */
    createPropertiesSection(info, includeAlertsPlaceholder = false) {
      const propertiesList = this.getPropertiesList(info);
      let finalHtml;

      if (Array.isArray(propertiesList)) {
        let dlContent = propertiesList
          .map(
            ({ label, value }) =>
              `<dt>${utils.escapeHtml(label)}</dt><dd>${utils.escapeHtml(
                value
              )}</dd>`
          )
          .join("");
        finalHtml = `<dl>${dlContent}</dl>`;
      } else {
        // SECURITY FIX: Sanitize custom formatter output to prevent XSS
        finalHtml = utils.createSafeTooltipContent(propertiesList);
      }

      // Add alerts placeholder if needed, regardless of the format
      if (includeAlertsPlaceholder) {
        // Create a subtle loading placeholder
        const alertsPlaceholder = `<dt>Alerts</dt><dd id="alerts-placeholder" class="alerts-loading" style="opacity: 0.7; font-style: italic; color: #666;">
          <span style="display: inline-block; width: 12px; height: 12px; border: 2px solid #ddd; border-top: 2px solid #666; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 6px;"></span>
          Scanning...
        </dd>`;

        // Remove closing </dl> tag, add alerts, then close again
        if (finalHtml.endsWith("</dl>")) {
          finalHtml = finalHtml.slice(0, -5) + alertsPlaceholder + "</dl>";
        } else {
          // Fallback: append to the end
          finalHtml += `<div><strong>Alerts:</strong> <span id="alerts-placeholder" class="alerts-loading" style="opacity: 0.7; font-style: italic; color: #666;">
            <span style="display: inline-block; width: 12px; height: 12px; border: 2px solid #ddd; border-top: 2px solid #666; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 6px;"></span>
            Scanning...
          </span></div>`;
        }
      }

      return finalHtml;
    },

    /**
     * Generate complete tooltip content
     * @param {Object} info - Accessibility information object
     * @param {boolean} miniMode - Whether to show mini version
     * @param {Object} options - Options including onClose and enabled callbacks
     * @returns {string} Complete tooltip HTML content
     */
    generateTooltipContent(info, miniMode, options = {}) {
      // Input validation
      if (!info || typeof info !== "object") {
        console.error("[Tooltip] Invalid accessibility info provided:", info);
        return this.createErrorContent("Invalid accessibility information");
      }

      try {
        const closeButtonHtml = this.createCloseButton();
        const screenReaderSection = this.createScreenReaderSection(info);

        // Determine if we should include alerts based on mode and availability
        const shouldIncludeAlerts = !miniMode && !!window.AxeIntegration;

        // Create tooltip body wrapper (removed inert for better interaction)
        const bodyOpen = `<div class="chrome-ax-tooltip-body">`;
        const bodyClose = `</div>`;

        let tooltipContent;
        if (miniMode) {
          // Mini mode: only screen reader output (no alerts)
          tooltipContent = `
            ${closeButtonHtml}
            ${bodyOpen}
              ${screenReaderSection}
            ${bodyClose}
          `;
        } else {
          // Full mode: screen reader output + properties (with alerts placeholder if available)
          const propertiesSection = this.createPropertiesSection(
            info,
            shouldIncludeAlerts
          );
          tooltipContent = `
            ${closeButtonHtml}
            ${bodyOpen}
              ${screenReaderSection}
              ${propertiesSection}
            ${bodyClose}
          `;
        }

        return tooltipContent;
      } catch (error) {
        console.error("[Tooltip] Content generation failed:", error);
        return this.createErrorContent("Unable to generate tooltip content");
      }
    },

    /**
     * Create alerts placeholder while loading violations
     * @returns {string} Alerts placeholder HTML
     */
    createAlertsPlaceholder() {
      return `
        <div class="chrome-ax-tooltip-alerts" id="alerts-placeholder">
          <div class="alerts-loading">
            <span>Checking for accessibility violations...</span>
          </div>
        </div>
      `;
    },

    /**
     * Safely create tooltip content (legacy method for backward compatibility)
     * @param {string} content - Content to make safe
     * @returns {string} Safe content
     */
    createSafeTooltipContent(content) {
      return utils.createSafeTooltipContent(content);
    },

    /**
     * Update alerts section with actual violations (now in definition list format)
     * @param {Element} tooltipElement - The tooltip element
     * @param {Array} violations - Array of violations
     */
    updateAlertsSection(tooltipElement, violations) {
      console.debug("[Tooltip] updateAlertsSection called:", {
        hasTooltipElement: !!tooltipElement,
        violationsCount: violations?.length || 0,
        violations,
      });

      const placeholder = tooltipElement.querySelector("#alerts-placeholder");

      if (!placeholder) {
        // No placeholder found - alerts might not be enabled or tooltip structure changed
        return;
      }

      // Filter violations to exclude minor issues
      const filteredViolations = this.filterViolationsByImpact(violations);

      if (filteredViolations && filteredViolations.length > 0) {
        const alertsContent = this.createAlertsContent(filteredViolations);
        placeholder.innerHTML = alertsContent;
        placeholder.removeAttribute("id");
        placeholder.classList.remove("alerts-loading");
        placeholder.classList.add("alerts-content-dd");
        console.debug("[Tooltip] Alerts content updated successfully");
      } else {
        console.debug(
          "[Tooltip] No violations after filtering, removing alerts section"
        );
        // Remove the entire dt/dd pair if no violations after filtering
        const alertsDt = placeholder.previousElementSibling;
        if (
          alertsDt &&
          alertsDt.tagName === "DT" &&
          alertsDt.textContent === "Alerts"
        ) {
          console.debug("[Tooltip] Removing Alerts dt element");
          alertsDt.remove();
        }
        console.debug("[Tooltip] Removing placeholder dd element");
        placeholder.remove();
      }
    },
  };

  // Initialize global namespace
  if (!window.NexusTooltip) {
    window.NexusTooltip = {};
  }

  // Export content functions
  window.NexusTooltip.Content = TooltipContent;
})();
