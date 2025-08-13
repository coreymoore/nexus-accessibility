/**
 * Tooltip Main Module (Backward Compatibility Layer)
 *
 * This file provides the main initialization and backward compatibility
 * for the refactored tooltip system. It maintains the original API
 * while using the new modular architecture underneath.
 *
 * Dependencies: All other tooltip modules
 *
 * Global API: window.chromeAxTooltip (maintains original interface)
 */

(function () {
  "use strict";

  // Ensure all required modules are loaded
  if (
    !window.NexusTooltip ||
    !window.NexusTooltip.Utils ||
    !window.NexusTooltip.Content ||
    !window.NexusTooltip.Positioning ||
    !window.NexusTooltip.Events ||
    !window.NexusTooltip.Focus ||
    !window.NexusTooltip.Core
  ) {
    console.error(
      "Tooltip modules not properly loaded. Check script loading order."
    );
    return;
  }

  /**
   * Legacy Tooltip class for backward compatibility
   * Wraps the new modular system to maintain the original API
   */
  class LegacyTooltip {
    constructor() {
      // Create the new modular tooltip core
      this.core = new window.NexusTooltip.Core();

      // Expose core properties for backward compatibility
      this.logger = this.core.logger;
      this.tooltip = null;
      this.connector = null;
      this.miniMode = false;
      this._mutObserver = null;
      this._isHiding = false;
      this._margin = 32;
      this._acceptingFocus = false;
      this._onFocusInCapture = null;
      this._keyboardNavigation = null;
      this._messageListener = null;
      this._shortcutRegistered = false;

      // Sync properties with core
      this._syncWithCore();
    }

    /**
     * Sync properties between legacy wrapper and core
     */
    _syncWithCore() {
      // Create property getters/setters to keep in sync
      Object.defineProperty(this, "tooltip", {
        get: () => this.core.tooltip,
        set: (value) => {
          this.core.tooltip = value;
        },
      });

      Object.defineProperty(this, "connector", {
        get: () => this.core.connector,
        set: (value) => {
          this.core.connector = value;
        },
      });

      Object.defineProperty(this, "miniMode", {
        get: () => this.core.miniMode,
        set: (value) => {
          this.core.miniMode = value;
        },
      });

      Object.defineProperty(this, "_isHiding", {
        get: () => this.core._isHiding,
        set: (value) => {
          this.core._isHiding = value;
        },
      });

      Object.defineProperty(this, "_acceptingFocus", {
        get: () => this.core.focus._acceptingFocus,
        set: (value) => {
          this.core.focus._acceptingFocus = value;
        },
      });
    }

    // Legacy method: Register message listener
    _registerMessageListener() {
      // This is now handled in the core, but we maintain the method for compatibility
      console.warn(
        "_registerMessageListener is deprecated. Message handling is now automatic."
      );
    }

    // Legacy method: Destroy
    destroy() {
      this.core.destroy();
    }

    // Legacy method: Get focusable elements
    _getFocusableElements(root) {
      return window.NexusTooltip.Utils.getFocusableElements(root);
    }

    // Legacy method: Setup focus trap
    _setupFocusTrap(options) {
      this.core.focus._setupFocusTrap(options);
    }

    // Legacy method: Remove focus trap
    _removeFocusTrap() {
      this.core.focus._removeFocusTrap();
    }

    // Legacy method: Ensure styles injected
    ensureStylesInjected() {
      return this.core.ensureStylesInjected();
    }

    // Legacy method: Deep unwrap
    _deepUnwrap(v) {
      return window.NexusTooltip.Utils.deepUnwrap(v);
    }

    // Legacy method: Is true
    _isTrue(v) {
      return window.NexusTooltip.Utils.isTrue(v);
    }

    // Legacy method: Get screen reader output
    getScreenReaderOutput(info) {
      return window.NexusTooltip.Content.getScreenReaderOutput(info);
    }

    // Legacy method: Get properties list
    getPropertiesList(accessibilityInfo) {
      return window.NexusTooltip.Content.getPropertiesList(accessibilityInfo);
    }

    // Legacy method: Create safe tooltip content
    createSafeTooltipContent(content) {
      return window.NexusTooltip.Content.createSafeTooltipContent(content);
    }

    // Legacy method: Show loading tooltip
    showLoadingTooltip(target) {
      return this.core.showLoadingTooltip(target);
    }

    // Legacy method: Show tooltip
    showTooltip(info, target, options) {
      return this.core.showTooltip(info, target, options);
    }

    // Legacy method: Hide tooltip
    hideTooltip(options) {
      return this.core.hideTooltip(options);
    }

    // Legacy method: Register shortcut
    _registerShortcut() {
      // This is now handled automatically, but we maintain the method for compatibility
      console.warn(
        "_registerShortcut is deprecated. Shortcuts are now registered automatically."
      );
    }

    // Legacy method: Ensure observer
    _ensureObserver() {
      return this.core._ensureObserver();
    }

    // Legacy method: Restore if detached
    _restoreIfDetached() {
      return this.core._restoreIfDetached();
    }
  }

  // Prevent multiple initializations with a more robust check
  if (window.chromeAxTooltip && window.chromeAxTooltip._initialized) {
    // Already initialized, skip re-initialization but update the instance reference
    if (!window.NexusTooltip.instance) {
      window.NexusTooltip.instance = window.chromeAxTooltip.core;
    }
    return;
  }

  // Check if we should destroy existing instance
  if (
    window.chromeAxTooltip &&
    typeof window.chromeAxTooltip.destroy === "function"
  ) {
    console.warn(
      "Tooltip instance already exists. Destroying previous instance."
    );
    window.chromeAxTooltip.destroy();
  }

  // Create and expose the legacy tooltip instance
  const legacyTooltip = new LegacyTooltip();
  legacyTooltip._initialized = true; // Mark as initialized
  legacyTooltip._initTime = Date.now(); // Track when initialized
  window.chromeAxTooltip = legacyTooltip;

  // Also expose the new modular API for those who want to use it directly
  if (!window.NexusTooltip.instance) {
    window.NexusTooltip.instance = window.chromeAxTooltip.core;
  }

  // Expose utility functions globally for backward compatibility
  window.createSafeTooltipContent =
    window.NexusTooltip.Content.createSafeTooltipContent;

  // Only log once when truly initializing, with frame info for debugging
  const frameInfo = window.self === window.top ? "main frame" : "iframe";
  console.log(
    `Nexus Tooltip System initialized with modular architecture (${frameInfo})`
  );
})();
