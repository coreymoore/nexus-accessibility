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
      this.miniMode = false;
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
      chrome.storage.sync.get({ miniMode: false }, (data) => {
        this.miniMode = !!data.miniMode;
      });
    }

    ensureStylesInjected() {
      if (document.getElementById("chrome-ax-tooltip-style")) return;
      const link = document.createElement("link");
      link.id = "chrome-ax-tooltip-style";
      link.rel = "stylesheet";
      link.type = "text/css";
      link.href = chrome.runtime.getURL("src/components/tooltip/tooltip.css");
      document.head.appendChild(link);

      // Inject shared stylesheet (focus ring, shared tokens) if not present
      if (!document.getElementById("nexus-shared-style")) {
        const shared = document.createElement("link");
        shared.id = "nexus-shared-style";
        shared.rel = "stylesheet";
        shared.type = "text/css";
        shared.href = chrome.runtime.getURL("src/assets/shared.css");
        document.head.appendChild(shared);
      }
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

      // Generate and set content
      const tooltipContent = content.generateTooltipContent(
        info,
        this.miniMode,
        { onClose, enabled }
      );
      this.tooltip.innerHTML = tooltipContent;

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
    }

    _createTooltipElement(target) {
      this.tooltip = document.createElement("div");
      this.tooltip.className = "chrome-ax-tooltip";
      this.tooltip.setAttribute("role", "tooltip");
      this.tooltip.setAttribute("id", "chrome-ax-tooltip");
      // Per AI_CONTEXT_RULES: do NOT use aria-live / live regions in injected tooltip.
      // Also avoid aria-hidden on container; expose only on explicit focus interaction.
      this.tooltip.setAttribute("tabindex", "-1");

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
      this.miniMode = !this.miniMode;
      chrome.storage.sync.set({ miniMode: this.miniMode });

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
  }

  // Initialize global namespace
  if (!window.NexusTooltip) {
    window.NexusTooltip = {};
  }

  // Export the TooltipCore class
  window.NexusTooltip.Core = TooltipCore;
})();
