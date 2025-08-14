/**
 * Tooltip Events Module
 *
 * Handles all event management for tooltips including keyboard shortcuts,
 * close button functionality, and Chrome extension message handling.
 *
 * Dependencies: None (interacts with core through passed instance)
 *
 * Global API: window.NexusTooltip.Events
 */

(function () {
  "use strict";

  /**
   * Event manager for tooltip interactions
   */
  class EventManager {
    constructor(tooltipCore) {
      this.core = tooltipCore;
      this._messageListener = null;
      this._shortcutRegistered = false;
      this._keydownHandler = null;
    }

    /**
     * Initialize all event handlers
     */
    initialize() {
      this._registerMessageListener();
      this._registerKeyboardShortcuts();
    }

    /**
     * Register Chrome extension message listener
     */
    _registerMessageListener() {
      if (this._messageListener) return; // Prevent duplicate listeners

      this._messageListener = (msg, sender, sendResponse) => {
        if (msg && typeof msg.miniMode === "boolean") {
          this.core.miniMode = msg.miniMode;
          if (
            this.core.tooltip &&
            this.core.tooltip.style.display === "block"
          ) {
            this.core.showTooltip(
              this.core._lastInfo,
              this.core._lastTarget,
              this.core._lastOptions
            );
          }
        }
      };

      chrome.runtime.onMessage.addListener(this._messageListener);
    }

    /**
     * Register global keyboard shortcuts
     */
    _registerKeyboardShortcuts() {
      // Check both instance-level and global flags to prevent multiple registrations
      if (this._shortcutRegistered || window.chromeAxTooltipShortcutRegistered)
        return;

      this._keydownHandler = (e) => {
        this._handleKeyboardShortcuts(e);
      };

      document.addEventListener("keydown", this._keydownHandler, true);
      this._shortcutRegistered = true;

      // Set global flag to prevent multiple registrations
      window.chromeAxTooltipShortcutRegistered = true;
    }

    /**
     * Handle keyboard shortcut events
     * @param {KeyboardEvent} e - Keyboard event
     */
    _handleKeyboardShortcuts(e) {
      // Alt+[ shortcut for focusing screen reader section
      if (
        this._isAltBracketLeft(e) &&
        this.core.tooltip &&
        this.core.tooltip.style.display === "block"
      ) {
        this._handleFocusShortcut(e);
        return;
      }

      // Alt+M shortcut for toggling mini mode
      if (this._isAltM(e)) {
        this._handleMiniModeToggle(e);
        return;
      }
    }

    /**
     * Check if Alt+[ was pressed
     * @param {KeyboardEvent} e - Keyboard event
     * @returns {boolean} True if Alt+[ was pressed
     */
    _isAltBracketLeft(e) {
      return (
        e.altKey &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        e.code === "BracketLeft"
      );
    }

    /**
     * Check if Alt+M was pressed
     * @param {KeyboardEvent} e - Keyboard event
     * @returns {boolean} True if Alt+M was pressed
     */
    _isAltM(e) {
      return (
        e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === "KeyM"
      );
    }

    /**
     * Handle focus shortcut (Alt+[)
     * @param {KeyboardEvent} e - Keyboard event
     */
    _handleFocusShortcut(e) {
      // Enable focus management for keyboard navigation
      this.core.focus.enableFocusAcceptance();

      const srNode = this.core.tooltip.querySelector(".chrome-ax-tooltip-sr");
      const closeButton = this.core.tooltip.querySelector(
        ".chrome-ax-tooltip-close"
      );

      if (closeButton) {
        // Upgrade close control to an accessible button
        closeButton.setAttribute("role", "button");
        closeButton.setAttribute("tabindex", "0");
        closeButton.setAttribute("aria-hidden", "false");
      }

      this.core.tooltip.removeAttribute("aria-hidden");
      this.core.focus._acceptingFocus = true;

      if (srNode) {
        srNode.focus();
        e.preventDefault();
        e.stopPropagation();
      }
    }

    /**
     * Handle mini mode toggle shortcut (Alt+M)
     * @param {KeyboardEvent} e - Keyboard event
     */
    _handleMiniModeToggle(e) {
      this.core.toggleMiniMode();
      e.preventDefault();
      e.stopPropagation();
    }

    /**
     * Setup close button event handlers
     * @param {Element} closeButton - Close button element
     * @param {Function} onClose - Close callback function
     * @param {Function} enabled - Enabled check function
     */
    setupCloseButton(closeButton, onClose, enabled) {
      if (!closeButton) return;

      // Enhanced close button functionality
      const handleClose = (e) => {
        e.preventDefault();
        try {
          if (enabled && enabled()) {
            onClose && onClose();
          }
        } catch (error) {
          console.warn("Error in close handler:", error);
        }
      };

      // Handle click events
      closeButton.addEventListener("click", handleClose);

      // Handle keyboard activation
      closeButton.addEventListener("keydown", (e) => {
        if (this._isEnterOrSpace(e)) {
          e.preventDefault();
          handleClose(e);
        }
      });

      // Prevent mouse events from affecting focus
      closeButton.addEventListener("mousedown", (e) => {
        e.preventDefault();
      });

      closeButton.addEventListener("pointerdown", (e) => {
        e.preventDefault();
      });
    }

    /**
     * Check if Enter or Space key was pressed
     * @param {KeyboardEvent} e - Keyboard event
     * @returns {boolean} True if Enter or Space was pressed
     */
    _isEnterOrSpace(e) {
      const isEnter = e.key === "Enter" || e.keyCode === 13;
      const isSpace = e.key === " " || e.key === "Spacebar" || e.keyCode === 32;
      return isEnter || isSpace;
    }

    /**
     * Create debounced scroll handler
     * @param {Function} callback - Callback function to debounce
     * @param {number} delay - Debounce delay in milliseconds
     * @returns {Function} Debounced function
     */
    createDebouncedScrollHandler(callback, delay = 16) {
      let timeoutId;
      return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => callback.apply(this, args), delay);
      };
    }

    /**
     * Setup window event listeners
     * @param {Object} handlers - Object containing event handler functions
     */
    setupWindowEvents(handlers = {}) {
      const { onResize, onScroll, onVisibilityChange } = handlers;

      if (onResize) {
        const debouncedResize = this.createDebouncedScrollHandler(
          onResize,
          100
        );
        window.addEventListener("resize", debouncedResize);
      }

      if (onScroll) {
        const debouncedScroll = this.createDebouncedScrollHandler(onScroll);
        window.addEventListener("scroll", debouncedScroll, true);
      }

      if (onVisibilityChange) {
        document.addEventListener("visibilitychange", onVisibilityChange);
      }
    }

    /**
     * Cleanup all event listeners
     */
    cleanup() {
      // Clean up message listener
      if (this._messageListener) {
        chrome.runtime.onMessage.removeListener(this._messageListener);
        this._messageListener = null;
      }

      // Clean up keyboard shortcuts
      if (this._keydownHandler) {
        document.removeEventListener("keydown", this._keydownHandler, true);
        this._keydownHandler = null;
        this._shortcutRegistered = false;
        // Reset global flag if this was the active instance
        if (window.chromeAxTooltipShortcutRegistered) {
          window.chromeAxTooltipShortcutRegistered = false;
        }
      }
    }

    /**
     * Handle custom events
     * @param {string} eventType - Type of event to handle
     * @param {Function} handler - Event handler function
     * @param {Object} options - Event listener options
     */
    on(eventType, handler, options = {}) {
      if (typeof handler !== "function") {
        console.warn("Event handler must be a function");
        return;
      }

      switch (eventType) {
        case "miniModeChange":
          // Store handler for mini mode changes
          this._miniModeChangeHandler = handler;
          break;
        case "tooltipShow":
          this._tooltipShowHandler = handler;
          break;
        case "tooltipHide":
          this._tooltipHideHandler = handler;
          break;
        default:
          console.warn(`Unknown event type: ${eventType}`);
      }
    }

    /**
     * Emit custom events
     * @param {string} eventType - Type of event to emit
     * @param {*} data - Event data
     */
    emit(eventType, data) {
      switch (eventType) {
        case "miniModeChange":
          if (this._miniModeChangeHandler) {
            this._miniModeChangeHandler(data);
          }
          break;
        case "tooltipShow":
          if (this._tooltipShowHandler) {
            this._tooltipShowHandler(data);
          }
          break;
        case "tooltipHide":
          if (this._tooltipHideHandler) {
            this._tooltipHideHandler(data);
          }
          break;
      }
    }
  }

  // Initialize global namespace
  if (!window.NexusTooltip) {
    window.NexusTooltip = {};
  }

  // Export event manager
  window.NexusTooltip.Events = {
    EventManager: EventManager,
  };
})();
