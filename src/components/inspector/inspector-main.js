/**
 * Inspector Main Module (Backward Compatibility Layer)
 *
 * This file provides the main initialization and backward compatibility
 * for the refactored inspector system. It maintains the original API
 * while using the new modular architecture underneath.
 *
 * Dependencies: All other inspector modules
 *
 * Global API: window.nexusAccessibilityUiInspector (maintains original interface)
 */

(function () {
  "use strict";

  // Ensure all required modules are loaded
  if (
    !window.NexusInspector ||
    !window.NexusInspector.Utils ||
    !window.NexusInspector.Content ||
    !window.NexusInspector.Positioning ||
    !window.NexusInspector.Events ||
    !window.NexusInspector.Focus ||
    !window.NexusInspector.Core
  ) {
    console.error(
      "Inspector modules not properly loaded. Check script loading order."
    );
    return;
  }

  /**
   * Legacy Inspector class for backward compatibility
   * Wraps the new modular system to maintain the original API
   */
  class LegacyInspector {
    constructor() {
      // Create the new modular inspector core
      this.core = new window.NexusInspector.Core();

      // Expose core properties for backward compatibility
      this.logger = this.core.logger;
      this.inspector = null;
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
      Object.defineProperty(this, "inspector", {
        get: () => this.core.inspector,
        set: (value) => {
          this.core.inspector = value;
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
      return window.NexusInspector.Utils.getFocusableElements(root);
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
      return window.NexusInspector.Utils.deepUnwrap(v);
    }

    // Legacy method: Is true
    _isTrue(v) {
      return window.NexusInspector.Utils.isTrue(v);
    }

    // Legacy method: Get screen reader output
    getScreenReaderOutput(info) {
      return window.NexusInspector.Content.getScreenReaderOutput(info);
    }

    // Legacy method: Get properties list
    getPropertiesList(accessibilityInfo) {
      return window.NexusInspector.Content.getPropertiesList(accessibilityInfo);
    }

    // Legacy method: Create safe inspector content
    createSafeInspectorContent(content) {
      return window.NexusInspector.Content.createSafeInspectorContent(content);
    }

    // Legacy method: Show loading inspector
    showLoadingInspector(target) {
      return this.core.showLoadingInspector(target);
    }

    // Legacy method: Show inspector
    showInspector(info, target, options) {
      return this.core.showInspector(info, target, options);
    }

    // Legacy method: Hide inspector
    hideInspector(options) {
      return this.core.hideInspector(options);
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
  if (
    window.nexusAccessibilityUiInspector &&
    window.nexusAccessibilityUiInspector._initialized
  ) {
    // Already initialized, skip re-initialization but update the instance reference
    if (!window.NexusInspector.instance) {
      window.NexusInspector.instance =
        window.nexusAccessibilityUiInspector.core;
    }
    return;
  }

  // Check if we should destroy existing instance
  if (
    window.nexusAccessibilityUiInspector &&
    typeof window.nexusAccessibilityUiInspector.destroy === "function"
  ) {
    console.warn(
      "Inspector instance already exists. Destroying previous instance."
    );
    window.nexusAccessibilityUiInspector.destroy();
  }

  // Create and expose the legacy inspector instance
  const legacyInspector = new LegacyInspector();
  legacyInspector._initialized = true; // Mark as initialized
  legacyInspector._initTime = Date.now(); // Track when initialized
  window.nexusAccessibilityUiInspector = legacyInspector;

  // Also expose the new modular API for those who want to use it directly
  if (!window.NexusInspector.instance) {
    window.NexusInspector.instance = window.nexusAccessibilityUiInspector.core;
  }

  // Expose utility functions globally for backward compatibility
  window.createSafeInspectorContent =
    window.NexusInspector.Content.createSafeInspectorContent;

  // Only log once when truly initializing, with frame info for debugging
  const frameInfo = window.self === window.top ? "main frame" : "iframe";
  console.log(
    `Nexus Inspector System initialized with modular architecture (${frameInfo})`
  );
})();
