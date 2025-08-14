/**
 * Tooltip Focus Management Module
 *
 * Handles focus trapping, accessibility features, and keyboard navigation
 * within tooltips to ensure proper screen reader and keyboard interaction.
 *
 * Dependencies:
 * - tooltip-utils.js (for getting focusable elements)
 *
 * Global API: window.NexusTooltip.Focus
 */

(function () {
  "use strict";

  // Access utilities
  const utils = window.NexusTooltip.Utils;

  /**
   * Focus manager for tooltip accessibility
   */
  class FocusManager {
    constructor(tooltipCore) {
      this.core = tooltipCore;
      this._acceptingFocus = false;
      this._onFocusInCapture = null;
      this._focusTrapKeydown = null;
      this._originalFocus = null;
    }

    /**
     * Setup focus management for the current tooltip
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
          // Allow interactions with interactive elements (buttons, links, inputs)
          if (
            e.target &&
            (e.target.closest("button") ||
              e.target.closest("a") ||
              e.target.closest("input") ||
              e.target.closest("select") ||
              e.target.closest("textarea") ||
              e.target.closest("[tabindex]"))
          ) {
            return; // Allow normal interaction
          }

          // If user hasn't explicitly enabled focus and tries to focus tooltip content,
          // just let it happen naturally now that we removed inert
          // This allows for text selection and natural interaction
        } catch (error) {
          console.warn("Error in focus guard:", error);
        }
      };

      document.addEventListener("focusin", this._onFocusInCapture, true);
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
        if (!this.core.tooltip) return;

        // Only trap when focus is within the tooltip
        const active = document.activeElement;
        const isInside = active && this.core.tooltip.contains(active);
        if (!isInside) return;

        // Handle Escape to close
        if (this._isEscapeKey(e)) {
          e.preventDefault();
          this._handleEscapeClose(onClose, enabled);
          return;
        }

        // Trap Tab navigation inside the tooltip
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
     * Handle tab navigation within tooltip
     * @param {KeyboardEvent} e - Keyboard event
     */
    _handleTabNavigation(e) {
      const focusables = utils.getFocusableElements(this.core.tooltip);

      if (focusables.length === 0) {
        // If nothing is focusable, do nothing (do not make tooltip itself focusable)
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
     * Focus the first focusable element in tooltip
     */
    focusFirstElement() {
      if (!this.core.tooltip) return false;

      const focusables = utils.getFocusableElements(this.core.tooltip);
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
     * Focus the tooltip's screen reader section
     */
    focusScreenReaderSection() {
      if (!this.core.tooltip) return false;

      const srNode = this.core.tooltip.querySelector(".chrome-ax-tooltip-sr");
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

      // Make tooltip visible to assistive technology
      if (this.core.tooltip) {
        this.core.tooltip.removeAttribute("aria-hidden");
      }
    }

    /**
     * Disable focus acceptance
     */
    disableFocusAcceptance() {
      this._acceptingFocus = false;

      // Hide tooltip from assistive technology
      if (this.core.tooltip) {
        this.core.tooltip.setAttribute("aria-hidden", "true");
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
        // Fallback: create temporary live region
        this._createTemporaryLiveRegion(message, priority);
      }
    }

    /**
     * Create temporary live region for announcements
     * @param {string} message - Message to announce
     * @param {string} priority - Priority level
     */
    _createTemporaryLiveRegion(message, priority = "polite") {
      const liveRegion = document.createElement("div");
      liveRegion.setAttribute("aria-live", priority);
      liveRegion.setAttribute("aria-atomic", "true");
      liveRegion.setAttribute("class", "sr-only");
      liveRegion.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      `;

      document.body.appendChild(liveRegion);

      // Add message after a brief delay to ensure screen reader picks it up
      setTimeout(() => {
        liveRegion.textContent = message;

        // Remove after announcement
        setTimeout(() => {
          if (liveRegion.parentNode) {
            liveRegion.parentNode.removeChild(liveRegion);
          }
        }, 1000);
      }, 100);
    }

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

      // Reset state
      this._acceptingFocus = false;
      this._originalFocus = null;

      // Restore focus using accessibility utilities
      const accessibility = utils.getAccessibility();
      if (accessibility && accessibility.restoreFocus) {
        accessibility.restoreFocus();
      }
    }
  }

  // Initialize global namespace
  if (!window.NexusTooltip) {
    window.NexusTooltip = {};
  }

  // Export focus manager
  window.NexusTooltip.Focus = {
    FocusManager: FocusManager,
  };
})();
