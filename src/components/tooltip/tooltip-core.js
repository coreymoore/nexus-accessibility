/**
 * Tooltip Core Module
 *
 * Main tooltip class that orchestrates all tooltip functionality.
 * This is the primary module that initializes and manages the tooltip system.
 *
 * Dependencies:
 * - tooltip-utils.js (for data processing utilities)
 * - tooltip-content.js (for content generation)
 * - tooltip-positioning.js (for positioning logic)
 * - tooltip-events.js (for event handling)
 * - tooltip-focus.js (for focus management)
 *
 * Global API: window.NexusTooltip.Core
 */

(function () {
  "use strict";

  // Access global dependencies
  const utils = window.NexusTooltip.Utils;
  const content = window.NexusTooltip.Content;
  const positioning = window.NexusTooltip.Positioning;
  const events = window.NexusTooltip.Events;
  const focus = window.NexusTooltip.Focus;

  class TooltipCore {
    constructor() {
      this.logger =
        (window.axLogger &&
          window.axLogger.log.bind(window.axLogger, "tooltip")) ||
        (() => {});
      this.tooltip = null;
      this.connector = null;
      this.inspectorMode = "off"; // "off", "on", or "mini"
      this._mutObserver = null;
      this._isHiding = false;
      this._margin = 32; // Spacing between tooltip and focused element
      this._scrollHandler = null;

      // Store last info for mini mode toggle
      this._lastInfo = null;
      this._lastTarget = null;
      this._lastOptions = null;

      // Initialize dependencies
      this.events = new events.EventManager(this);
      this.focus = new focus.FocusManager(this);
      this.positioning = new positioning.PositioningManager(this);

      // Load saved preferences
      this._loadPreferences();

      // Initialize event handlers
      this.events.initialize();
    }

    _loadPreferences() {
      // Load inspector mode with migration support
      chrome.storage.sync.get(
        { inspectorMode: "off", miniMode: false, extensionEnabled: false },
        (data) => {
          // Migrate from old format if needed
          if (!data.inspectorMode && (data.extensionEnabled || data.miniMode)) {
            if (!data.extensionEnabled) {
              this.inspectorMode = "off";
            } else if (data.miniMode) {
              this.inspectorMode = "mini";
            } else {
              this.inspectorMode = "on";
            }
          } else {
            this.inspectorMode = data.inspectorMode || "off";
          }
        }
      );

      // Listen for real-time storage changes to stay synchronized
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === "sync" && changes.inspectorMode) {
          this.inspectorMode = changes.inspectorMode.newValue || "off";
        }
      });
    }

    // Helper methods
    get miniMode() {
      return this.inspectorMode === "mini";
    }

    get isEnabled() {
      return this.inspectorMode === "on" || this.inspectorMode === "mini";
    }

    ensureStylesInjected() {
      if (document.getElementById("chrome-ax-tooltip-style")) return;
      const link = document.createElement("link");
      link.id = "chrome-ax-tooltip-style";
      link.rel = "stylesheet";
      link.type = "text/css";
      link.href = chrome.runtime.getURL("src/components/tooltip/tooltip.css");
      document.head.appendChild(link);
    }

    showLoadingTooltip(target) {
      this.ensureStylesInjected();
      if (this.tooltip) this.tooltip.remove();

      this.tooltip = document.createElement("div");
      this.tooltip.className = "chrome-ax-tooltip";
      this.tooltip.setAttribute("role", "tooltip");
      this.tooltip.setAttribute("id", "chrome-ax-tooltip");

      // Create safe loading content
      const loadingHtml = content.createLoadingContent();
      this.tooltip.innerHTML = loadingHtml;
      document.body.appendChild(this.tooltip);
      this.tooltip.style.display = "block";

      // Position the loading tooltip
      this.positioning.positionTooltip(target);
    }

    showTooltip(info, target, options = {}) {
      const { onClose, enabled } = options;

      // Debug logging
      console.debug("[Tooltip] showTooltip called:", {
        hasInfo: !!info,
        hasTarget: !!target,
        targetTag: target?.tagName,
        targetId: target?.id,
        miniMode: this.miniMode,
      });

      try {
        console.debug("[AX Tooltip] group info:", info && info.group);
      } catch {}

      // Store state for mode toggles
      this._lastInfo = info;
      this._lastTarget = target;
      this._lastOptions = options;

      this.ensureStylesInjected();
      if (!info) return;

      // Clean up existing tooltip
      if (this.tooltip) {
        this.focus.cleanup();
        this.tooltip.remove();
      }

      // Create new tooltip element
      this._createTooltipElement(target);

      // Add element reference to info for violation checking
      if (target && target.nodeType === Node.ELEMENT_NODE) {
        info.element = target;
      }

      // Generate and set content
      console.debug("[Tooltip] Generating content:", {
        miniMode: this.miniMode,
        hasElement: !!(info && info.element),
        hasAxeIntegration: !!window.AxeIntegration,
      });

      const tooltipContent = content.generateTooltipContent(
        info,
        this.miniMode,
        { onClose, enabled }
      );
      this.tooltip.innerHTML = tooltipContent;

      console.debug(
        "[Tooltip] Content generated and set, checking for alerts placeholder"
      );
      const alertsPlaceholder = this.tooltip.querySelector(
        "#alerts-placeholder"
      );
      console.debug("[Tooltip] Alerts placeholder found:", !!alertsPlaceholder);

      // Setup initial positioning (offscreen for measurement)
      this._setupInitialPosition();
      document.body.appendChild(this.tooltip);

      // Setup event handlers for this tooltip instance
      this._setupTooltipEventHandlers(onClose, enabled);

      // Position tooltip and create connector
      this.positioning.positionTooltipWithConnector(target);

      // Setup focus management and observers
      this.focus.setupFocusManagement({ onClose, enabled });
      this._ensureObserver();

      // Check for accessibility violations asynchronously
      this._checkViolationsAsync(target);
    }

    _createTooltipElement(target) {
      this.tooltip = document.createElement("div");
      this.tooltip.className = "chrome-ax-tooltip";
      this.tooltip.setAttribute("role", "tooltip");
      this.tooltip.setAttribute("id", "chrome-ax-tooltip");
      this.tooltip.setAttribute("aria-live", "polite");
      this.tooltip.setAttribute("aria-atomic", "true");
      this.tooltip.setAttribute("tabindex", "-1");
      this.tooltip.setAttribute("aria-hidden", "true");

      // Establish ARIA relationship with target element if it has an ID
      if (target && target.id) {
        this.tooltip.setAttribute("aria-controls", target.id);
      }
    }

    _setupInitialPosition() {
      this.tooltip.style.position = "fixed";
      this.tooltip.style.left = "-9999px";
      this.tooltip.style.top = "-9999px";
      this.tooltip.style.setProperty("z-index", "2147483648", "important");
      this.tooltip.style.setProperty("display", "block", "important");
    }

    _setupTooltipEventHandlers(onClose, enabled) {
      // Setup scroll handler for repositioning
      this._scrollHandler = () => {
        if (
          this.tooltip &&
          this.tooltip.style.display === "block" &&
          this._lastTarget
        ) {
          this.positioning.repositionTooltipAndConnector(this._lastTarget);
        }
      };
      window.addEventListener("scroll", this._scrollHandler, true);

      // Setup close button functionality
      const closeButton = this.tooltip.querySelector(
        ".chrome-ax-tooltip-close"
      );
      if (closeButton) {
        this.events.setupCloseButton(closeButton, onClose, enabled);
      }
    }

    hideTooltip(options = {}) {
      const { onRefocus } = options;
      this._isHiding = true;

      try {
        // Clean up event listeners
        if (this._scrollHandler) {
          window.removeEventListener("scroll", this._scrollHandler, true);
          this._scrollHandler = null;
        }

        // Clean up focus management
        this.focus.cleanup();

        // Remove tooltip and connector elements
        if (this.tooltip && this.tooltip.parentNode) {
          this.tooltip.parentNode.removeChild(this.tooltip);
          this.tooltip = null;
        }
        if (this.connector && this.connector.parentNode) {
          this.connector.parentNode.removeChild(this.connector);
          this.connector = null;
        }
      } finally {
        this._isHiding = false;
      }

      if (onRefocus) onRefocus();
    }

    toggleMiniMode() {
      // Smart toggle logic for Alt+M shortcut:
      // - If currently "off" → switch to "mini"
      // - If currently "mini" → switch to "on"
      // - If currently "on" → switch to "mini"
      if (this.inspectorMode === "off") {
        this.inspectorMode = "mini";
      } else if (this.inspectorMode === "mini") {
        this.inspectorMode = "on";
      } else if (this.inspectorMode === "on") {
        this.inspectorMode = "mini";
      }
      chrome.storage.sync.set({ inspectorMode: this.inspectorMode });

      // Re-render current tooltip if visible
      if (this.tooltip && this.tooltip.style.display === "block") {
        if (this._lastInfo && this._lastTarget && this._lastOptions) {
          this.showTooltip(this._lastInfo, this._lastTarget, this._lastOptions);
        }
      }
    }

    _ensureObserver() {
      if (this._mutObserver) return;
      try {
        this._mutObserver = new MutationObserver(() => {
          if (this._isHiding) return; // do not auto-restore during intentional hide
          this._restoreIfDetached();
        });
        this._mutObserver.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
      } catch (e) {
        // ignore if observer can't start
      }
    }

    _restoreIfDetached() {
      if (this.tooltip && !document.documentElement.contains(this.tooltip)) {
        document.body.appendChild(this.tooltip);
        this.tooltip.style.setProperty("display", "block", "important");
        this.tooltip.style.zIndex = "2147483648";
      }
      if (
        this.connector &&
        !document.documentElement.contains(this.connector)
      ) {
        document.body.appendChild(this.connector);
      }
    }

    destroy() {
      // Clean up all resources
      this.events.cleanup();
      this.focus.cleanup();

      // Clean up tooltip elements
      if (this.tooltip) {
        this.tooltip.remove();
        this.tooltip = null;
      }
      if (this.connector) {
        this.connector.remove();
        this.connector = null;
      }

      // Clean up observers
      if (this._mutObserver) {
        this._mutObserver.disconnect();
        this._mutObserver = null;
      }

      // Clean up scroll handler
      if (this._scrollHandler) {
        window.removeEventListener("scroll", this._scrollHandler, true);
        this._scrollHandler = null;
      }
    }

    /**
     * Check for accessibility violations asynchronously
     * @param {Element} target - The target element to check
     */
    async _checkViolationsAsync(target) {
      console.debug("[Tooltip] _checkViolationsAsync called:", {
        hasTarget: !!target,
        targetTag: target?.tagName,
        targetId: target?.id,
        targetClass: target?.className,
        hasTooltip: !!this.tooltip,
        hasAxeIntegration: !!window.AxeIntegration,
      });

      // Safety checks
      if (!target || !this.tooltip) {
        console.debug("[Tooltip] Early return: missing target or tooltip");
        return;
      }

      if (!window.AxeIntegration) {
        console.debug(
          "[Tooltip] AxeIntegration not available, removing placeholder"
        );
        // AxeIntegration not available, just remove placeholder
        const placeholder = this.tooltip.querySelector("#alerts-placeholder");
        if (placeholder) {
          console.debug("[Tooltip] Removed placeholder (no AxeIntegration)");
          placeholder.remove();
        }
        return;
      }

      try {
        // Check if the AxeIntegration service has the required methods
        if (
          typeof window.AxeIntegration.getViolationsForElement !== "function"
        ) {
          console.warn(
            "[Tooltip] AxeIntegration.getViolationsForElement not available"
          );
          console.debug("[Tooltip] getViolationsForElement method not found");
          const placeholder = this.tooltip.querySelector("#alerts-placeholder");
          if (placeholder) {
            placeholder.remove();
          }
          return;
        }

        console.debug(
          "[Tooltip] Starting violation check for element:",
          target
        );

        // Get violations for this specific element
        const violations = await window.AxeIntegration.getViolationsForElement(
          target
        );

        console.debug("[Tooltip] Violations check complete:", {
          violationsFound: violations?.length || 0,
          violations,
        });

        if (violations && violations.length > 0) {
          console.debug("[Tooltip] Processing violations for display");
          // Format violations for tooltip display
          let formattedViolations = violations;
          if (
            typeof window.AxeIntegration.formatViolationsForTooltip ===
            "function"
          ) {
            formattedViolations =
              window.AxeIntegration.formatViolationsForTooltip(violations);
          }

          // Update the alerts section in the tooltip
          content.updateAlertsSection(this.tooltip, formattedViolations);
          console.debug("[Tooltip] Alerts section updated with violations");

          // Re-position tooltip if size changed
          if (this._lastTarget) {
            this.positioning.positionTooltipWithConnector(this._lastTarget);
          }
        } else {
          console.debug(
            "[Tooltip] No violations found, cleaning up alerts section"
          );
          // No violations found - use updateAlertsSection to handle proper cleanup
          content.updateAlertsSection(this.tooltip, []);
        }
      } catch (error) {
        this.logger.error("[Tooltip] Failed to check violations:", error);

        // Remove alerts placeholder on error - use updateAlertsSection for proper cleanup
        content.updateAlertsSection(this.tooltip, []);
      }
    }
  }

  // Initialize global namespace
  if (!window.NexusTooltip) {
    window.NexusTooltip = {};
  }

  // Export the TooltipCore class
  window.NexusTooltip.Core = TooltipCore;
})();
