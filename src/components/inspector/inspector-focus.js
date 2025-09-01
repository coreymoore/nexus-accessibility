/**
 * Inspector Focus Management Module
 *
 * Handles focus trapping, accessibility features, and keyboard navigation
 * within inspectors to ensure proper screen reader and keyboard interaction.
 *
 * Dependencies:
 * - inspector-utils.js (for getting focusable elements)
 *
 * Global API: window.NexusInspector.Focus
 */

(function () {
  "use strict";

  // Access utilities
  const utils = window.NexusInspector.Utils;

  /**
   * Focus manager for inspector accessibility
   */
  class FocusManager {
    constructor(inspectorCore) {
      this.core = inspectorCore;
      this._acceptingFocus = false;
      this._onFocusInCapture = null;
      this._focusTrapKeydown = null;
      this._originalFocus = null;
      this._selectionActive = false;
      this._selectionMouseUpHandler = null;
    }

    /**
     * Setup focus management for the current inspector
     * @param {Object} options - Options including onClose and enabled callbacks
     */
    setupFocusManagement(options = {}) {
      this._setupFocusGuard();
      this._setupFocusTrap(options);
    }

    /**
     * Setup focus guard to prevent accidental focus
     */
    _setupFocusGuard() {
      // Clean up existing guard
      if (this._onFocusInCapture) {
        document.removeEventListener("focusin", this._onFocusInCapture, true);
      }

      this._onFocusInCapture = (e) => {
        try {
          const inspector = this.core.inspector;
          if (!inspector || inspector.style.display !== "block") return;

          // Use composedPath to correctly identify target inside shadow DOM
          const target = e.composedPath ? e.composedPath()[0] : e.target;
          const inside = inspector.contains(target) || (this.core._shadow && this.core._shadow.contains(target));

          if (!inside) return; // ignore outside events

          if (this._acceptingFocus) return; // user explicitly enabled focus

          // Allow selection gesture to proceed without interference
          if (this._selectionActive) return;

          // If focus moved into inspector unintentionally, redirect it back to last target
          e.stopPropagation();
          e.preventDefault();

          // Preserve any existing text selection – don't collapse ranges
          const sel = window.getSelection && window.getSelection();
          if (sel && sel.rangeCount > 0) {
            // Leave selection as-is (no action) so copy works
          }

          // Attempt to restore focus to last target element
          if (
            this.core._lastTarget &&
            typeof this.core._lastTarget.focus === "function"
          ) {
            try {
              this.core._lastTarget.focus({ preventScroll: true });
            } catch {}
          } else {
            // Fallback: blur active element to avoid sticky focus on inspector
            if (
              document.activeElement &&
              document.activeElement !== document.body
            ) {
              try {
                document.activeElement.blur();
              } catch {}
            }
          }
        } catch (error) {
          console.warn("Error in focus guard:", error);
        }
      };

      document.addEventListener("focusin", this._onFocusInCapture, true);

      // Install selection gesture listeners (capture to run early)
      const inspector = this.core.inspector;
      if (inspector) {
        const listenTarget = this.core._shadow || inspector;
        listenTarget.addEventListener(
          "mousedown",
          (e) => {
            if (e.button !== 0) return;
            this._selectionActive = true;
            // Clear existing selection state gracefully (not mandatory)
          },
          true
        );

        // Mouseup on document to ensure cleanup even if mouse leaves inspector
        this._selectionMouseUpHandler = (e) => {
          if (this._selectionActive) {
            // Defer clearing flag slightly to let selection finalize
            setTimeout(() => {
              this._selectionActive = false;
            }, 0);
          }
        };
        document.addEventListener(
          "mouseup",
          this._selectionMouseUpHandler,
          true
        );
      }
    }

    /**
     * Setup focus trap for keyboard navigation
     * @param {Object} options - Options including onClose and enabled callbacks
     */
    _setupFocusTrap(options = {}) {
      const { onClose, enabled } = options;

      // Remove any previous trap first to avoid duplicates
      this._removeFocusTrap();

      this._focusTrapKeydown = (e) => {
        if (!this.core.inspector) return;

        // Only trap when focus is within the inspector
        const active = document.activeElement;
        const isInside = active && this.core.inspector.contains(active);
        if (!isInside) return;

        // Handle Escape to close
        if (this._isEscapeKey(e)) {
          e.preventDefault();
          this._handleEscapeClose(onClose, enabled);
          return;
        }

        // Trap Tab navigation inside the inspector
        if (this._isTabKey(e)) {
          this._handleTabNavigation(e);
        }
      };

      // Use capture to catch early and be robust across shadow DOM boundaries
      document.addEventListener("keydown", this._focusTrapKeydown, true);
    }

    /**
     * Check if escape key was pressed
     * @param {KeyboardEvent} e - Keyboard event
     * @returns {boolean} True if escape key was pressed
     */
    _isEscapeKey(e) {
      return e.key === "Escape" || e.key === "Esc" || e.keyCode === 27;
    }

    /**
     * Check if tab key was pressed
     * @param {KeyboardEvent} e - Keyboard event
     * @returns {boolean} True if tab key was pressed
     */
    _isTabKey(e) {
      return e.key === "Tab" || e.keyCode === 9;
    }

    /**
     * Handle escape key close action
     * @param {Function} onClose - Close callback function
     * @param {Function} enabled - Enabled check function
     */
    _handleEscapeClose(onClose, enabled) {
      try {
        if (enabled && enabled()) {
          onClose && onClose();
        }
      } catch (error) {
        console.warn("Error in escape close handler:", error);
      }
    }

    /**
     * Handle tab navigation within inspector
     * @param {KeyboardEvent} e - Keyboard event
     */
    _handleTabNavigation(e) {
      const queryRoot = this.core._shadow || this.core.inspector;
      const focusables = utils.getFocusableElements(queryRoot);

      if (focusables.length === 0) {
        // If nothing is focusable, do nothing (do not make inspector itself focusable)
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      // If focus somehow left the list but is still inside, default to first
      let current = active && focusables.includes(active) ? active : first;
      const goingBack = !!e.shiftKey;

      if (!goingBack && current === last) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      } else if (goingBack && current === first) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      }
    }

    /**
     * Remove focus trap
     */
    _removeFocusTrap() {
      if (this._focusTrapKeydown) {
        document.removeEventListener("keydown", this._focusTrapKeydown, true);
        this._focusTrapKeydown = null;
      }
    }

    /**
     * Store original focus for restoration
     * @param {Element} element - Element that currently has focus
     */
    storeOriginalFocus(element = document.activeElement) {
      this._originalFocus = element;
    }

    /**
     * Restore focus to original element
     */
    restoreOriginalFocus() {
      if (
        this._originalFocus &&
        typeof this._originalFocus.focus === "function"
      ) {
        try {
          this._originalFocus.focus({ preventScroll: true });
        } catch (error) {
          console.warn("Failed to restore original focus:", error);
        }
      }
      this._originalFocus = null;
    }

    /**
     * Focus the first focusable element in inspector
     */
    focusFirstElement() {
      if (!this.core.inspector) return false;
      const queryRoot = this.core._shadow || this.core.inspector;

      const focusables = utils.getFocusableElements(queryRoot);
      if (focusables.length > 0) {
        try {
          focusables[0].focus({ preventScroll: true });
          return true;
        } catch (error) {
          console.warn("Failed to focus first element:", error);
        }
      }
      return false;
    }

    /**
     * Focus the inspector's screen reader section
     */
    focusScreenReaderSection() {
      if (!this.core.inspector) return false;
      const queryRoot = this.core._shadow || this.core.inspector;

      const srNode = queryRoot.querySelector(
        ".nexus-accessibility-ui-inspector-sr"
      );
      if (srNode) {
        try {
          srNode.focus({ preventScroll: true });
          return true;
        } catch (error) {
          console.warn("Failed to focus screen reader section:", error);
        }
      }
      return false;
    }

    /**
     * Enable focus acceptance (called by keyboard shortcut)
     */
    enableFocusAcceptance() {
      this._acceptingFocus = true;

      // Remove inert attribute from inspector body
      if (this.core.inspector) {
        const queryRoot = this.core._shadow || this.core.inspector;
        const body = queryRoot.querySelector(
          ".nexus-accessibility-ui-inspector-body"
        );
        if (body) {
          body.removeAttribute("inert");
          body.style.pointerEvents = "";
        }

        // Make inspector visible to assistive technology
        this.core.inspector.removeAttribute("aria-hidden");
      }
    }

    /**
     * Disable focus acceptance
     */
    disableFocusAcceptance() {
      this._acceptingFocus = false;

      // Add inert attribute to inspector body (correct class name)
      if (this.core.inspector) {
        const queryRoot = this.core._shadow || this.core.inspector;
        const body = queryRoot.querySelector(
          ".nexus-accessibility-ui-inspector-body"
        );
        if (body) {
          body.setAttribute("inert", "");
          body.style.pointerEvents = "none";
        }

        // Hide inspector from assistive technology until user explicitly re-enables
        this.core.inspector.setAttribute("aria-hidden", "true");
      }
    }

    /**
     * Check if focus is currently accepted
     * @returns {boolean} True if focus is accepted
     */
    isFocusAccepted() {
      return this._acceptingFocus;
    }

    /**
     * Announce message to screen readers
     * @param {string} message - Message to announce
     * @param {string} priority - Priority level (polite, assertive)
     */
    announceToScreenReader(message, priority = "polite") {
      const accessibility = utils.getAccessibility();
      if (accessibility && accessibility.announceToScreenReader) {
        accessibility.announceToScreenReader(message);
      } else {
        // Per AI_CONTEXT_RULES: avoid creating live regions in injected page context.
        // Intentionally no-op to prevent interfering with host page accessibility tree.
      }
    }

    // Removed _createTemporaryLiveRegion implementation per rules (no live regions in injected inspector)

    /**
     * Cleanup all focus management resources
     */
    cleanup() {
      // Clean up focus trap
      this._removeFocusTrap();

      // Clean up focus guard
      if (this._onFocusInCapture) {
        document.removeEventListener("focusin", this._onFocusInCapture, true);
        this._onFocusInCapture = null;
      }
      if (this._selectionMouseUpHandler) {
        document.removeEventListener(
          "mouseup",
          this._selectionMouseUpHandler,
          true
        );
        this._selectionMouseUpHandler = null;
      }

      // Reset state
      this._acceptingFocus = false;
      this._originalFocus = null;
      this._selectionActive = false;

      // Restore focus using accessibility utilities
      const accessibility = utils.getAccessibility();
      if (accessibility && accessibility.restoreFocus) {
        accessibility.restoreFocus();
      }
    }
  }

  // Initialize global namespace
  if (!window.NexusInspector) {
    window.NexusInspector = {};
  }

  // Export focus manager
  window.NexusInspector.Focus = {
    FocusManager: FocusManager,
  };
})();
