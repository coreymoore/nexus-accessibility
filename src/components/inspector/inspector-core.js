/**
 * Inspector Core Module
 *
 * Main inspector class that orchestrates all inspector functionality.
 * This is the primary module that initializes and manages the inspector system.
 *
 * Dependencies:
 * - inspector-utils.js (for data processing utilities)
 * - inspector-content.js (for content generation)
 * - inspector-positioning.js (for positioning logic)
 * - inspector-events.js (for event handling)
 * - inspector-focus.js (for focus management)
 *
 * Global API: window.NexusInspector.Core
 */

(function () {
  "use strict";

  // Access global dependencies
  const utils = window.NexusInspector.Utils;
  const content = window.NexusInspector.Content;
  const positioning = window.NexusInspector.Positioning;
  const events = window.NexusInspector.Events;
  const focus = window.NexusInspector.Focus;

  class InspectorCore {
    constructor() {
      this.logger =
        (window.axLogger &&
          window.axLogger.log.bind(window.axLogger, "inspector")) ||
        (() => {});
      this.inspector = null;
      this.connector = null;
      this.miniMode = false;
      this._mutObserver = null;
      this._isHiding = false;
      this._margin = 32; // Spacing between inspector and focused element
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
      // Use both new and legacy storage for compatibility during transition
      chrome.storage.sync.get(
        {
          inspectorState: null,
          miniMode: false, // fallback for legacy
        },
        (data) => {
          if (data.inspectorState) {
            this.miniMode = data.inspectorState === "mini";
          } else {
            // Legacy fallback
            this.miniMode = !!data.miniMode;
          }
        }
      );
    }

    ensureStylesInjected() {
      if (document.getElementById("nexus-accessibility-ui-inspector-style"))
        return;
      const link = document.createElement("link");
      link.id = "nexus-accessibility-ui-inspector-style";
      link.rel = "stylesheet";
      link.type = "text/css";
      link.href = chrome.runtime.getURL(
        "src/components/inspector/inspector.css"
      );
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

    showLoadingInspector(target) {
      this.ensureStylesInjected();
      if (this.inspector) this.inspector.remove();

      this.inspector = document.createElement("div");
      this.inspector.className = "nexus-accessibility-ui-inspector";
      this.inspector.setAttribute("role", "group");
      this.inspector.setAttribute(
        "aria-roledescription",
        "Accessibility Inspector"
      );
      this.inspector.setAttribute("id", "nexus-accessibility-ui-inspector");

      // Create safe loading content
      const loadingHtml = content.createLoadingContent();
      this.inspector.innerHTML = loadingHtml;
      document.body.appendChild(this.inspector);
      this.inspector.style.display = "block";

      // Position the loading inspector
      this.positioning.positionInspector(target);
    }

    showInspector(info, target, options = {}) {
      const { onClose, enabled } = options;

      // Debug logging
      try {
        console.debug("[AX Inspector] group info:", info && info.group);
      } catch {}

      // Store state for mode toggles
      this._lastInfo = info;
      this._lastTarget = target;
      this._lastOptions = options;

      this.ensureStylesInjected();
      if (!info) return;

      // Clean up existing inspector
      if (this.inspector) {
        this.focus.cleanup();
        this.inspector.remove();
      }

      // Create new inspector element
      this._createInspectorElement(target);

      // Generate and set content
      const inspectorContent = content.generateInspectorContent(
        info,
        this.miniMode,
        { onClose, enabled }
      );
      this.inspector.innerHTML = inspectorContent;

      // Setup initial positioning (offscreen for measurement)
      this._setupInitialPosition();
      document.body.appendChild(this.inspector);

      // Enable text selection
      this._enableTextSelection();

      // Setup event handlers for this inspector instance
      this._setupInspectorEventHandlers(onClose, enabled);

      // Position inspector and create connector
      this.positioning.positionInspectorWithConnector(target);

      // Setup focus management and observers
      this.focus.setupFocusManagement({ onClose, enabled });
      this._ensureObserver();
    }

    _createInspectorElement(target) {
      this.inspector = document.createElement("div");
      this.inspector.className = "nexus-accessibility-ui-inspector";
      this.inspector.setAttribute("role", "group");
      this.inspector.setAttribute(
        "aria-roledescription",
        "Accessibility Inspector"
      );
      this.inspector.setAttribute("id", "nexus-accessibility-ui-inspector");
      // Per AI_CONTEXT_RULES: do NOT use aria-live / live regions in injected inspector.
      // Also avoid aria-hidden on container; expose only on explicit focus interaction.
      this.inspector.setAttribute("tabindex", "-1");

      // Establish ARIA relationship with target element if it has an ID
      if (target && target.id) {
        this.inspector.setAttribute("aria-controls", target.id);
      }
    }

    _setupInitialPosition() {
      this.inspector.style.position = "fixed";
      this.inspector.style.left = "-9999px";
      this.inspector.style.top = "-9999px";
      this.inspector.style.setProperty("z-index", "2147483648", "important");
      this.inspector.style.setProperty("display", "block", "important");
    }

    _setupInspectorEventHandlers(onClose, enabled) {
      // Setup scroll handler for repositioning
      this._scrollHandler = () => {
        if (
          this.inspector &&
          this.inspector.style.display === "block" &&
          this._lastTarget
        ) {
          this.positioning.repositionInspectorAndConnector(this._lastTarget);
        }
      };
      window.addEventListener("scroll", this._scrollHandler, true);

      // Setup close button functionality
      const closeButton = this.inspector.querySelector(
        ".nexus-accessibility-ui-inspector-close"
      );
      if (closeButton) {
        this.events.setupCloseButton(closeButton, onClose, enabled);
      }
    }

    hideInspector(options = {}) {
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

        // Remove inspector and connector elements
        if (this.inspector && this.inspector.parentNode) {
          this.inspector.parentNode.removeChild(this.inspector);
          this.inspector = null;
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

      // Update the unified state
      const newState = this.miniMode ? "mini" : "on";
      chrome.storage.sync.set({ inspectorState: newState });

      // Re-render current inspector if visible
      if (this.inspector && this.inspector.style.display === "block") {
        if (this._lastInfo && this._lastTarget && this._lastOptions) {
          this.showInspector(
            this._lastInfo,
            this._lastTarget,
            this._lastOptions
          );
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
      if (
        this.inspector &&
        !document.documentElement.contains(this.inspector)
      ) {
        document.body.appendChild(this.inspector);
        this.inspector.style.setProperty("display", "block", "important");
        this.inspector.style.zIndex = "2147483648";
      }
      if (
        this.connector &&
        !document.documentElement.contains(this.connector)
      ) {
        document.body.appendChild(this.connector);
      }
    }

    /**
     * Enable text selection for the inspector
     */
    _enableTextSelection() {
      if (!this.inspector) return;

      console.log("[Inspector] Enabling text selection");

      // Apply CSS styles directly to override any conflicting rules
      const style = this.inspector.style;
      style.userSelect = "text";
      style.webkitUserSelect = "text";
      style.mozUserSelect = "text";
      style.msUserSelect = "text";

      // Apply to all child elements except close button
      const allElements = this.inspector.querySelectorAll(
        "*:not(.nexus-accessibility-ui-inspector-close)"
      );
      allElements.forEach((el) => {
        el.style.userSelect = "text";
        el.style.webkitUserSelect = "text";
        el.style.mozUserSelect = "text";
        el.style.msUserSelect = "text";
      });

      // Ensure close button remains non-selectable
      const closeButton = this.inspector.querySelector(
        ".nexus-accessibility-ui-inspector-close"
      );
      if (closeButton) {
        closeButton.style.userSelect = "none";
        closeButton.style.webkitUserSelect = "none";
        closeButton.style.mozUserSelect = "none";
        closeButton.style.msUserSelect = "none";
      }

      console.log("[Inspector] Text selection enabled");
    }

    destroy() {
      // Clean up all resources
      this.events.cleanup();
      this.focus.cleanup();

      // Clean up inspector elements
      if (this.inspector) {
        this.inspector.remove();
        this.inspector = null;
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
  if (!window.NexusInspector) {
    window.NexusInspector = {};
  }

  // Export the InspectorCore class
  window.NexusInspector.Core = InspectorCore;
})();
