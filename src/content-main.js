/**
 * Content Script Main Entry Point
 * 
 * This is the main entry point for the content script. It initializes the extension,
 * coordinates between modules, and manages the overall extension state.
 * 
 * Dependencies (load order):
 * 1. content-utils.js - Utility functions and helpers
 * 2. content-cache.js - Caching and performance management
 * 3. content-events.js - Event handling and listeners
 * 4. content-accessibility.js - Accessibility data fetching
 * 5. content-observers.js - DOM mutation observers
 * 6. content-tooltip.js - Tooltip management
 * 7. content-validation.js - Testing and validation (optional)
 * 8. content-main.js - This file (initialization and coordination)
 */

(function() {
  'use strict';

  console.log("Content script loading... v2.1 - Refactored modular architecture");

  // Ensure our namespace exists
  window.ContentExtension = window.ContentExtension || {};
  const CE = window.ContentExtension;

  // Extension state
  let extensionEnabled = true;
  let initialized = false;

  /**
   * Initialize the content script extension
   */
  function initialize() {
    if (initialized) {
      console.warn('[ContentExtension] Already initialized');
      return;
    }

    try {
      // Initialize logger if available
      if (window.initializeLogger) {
        window.initializeLogger();
      }

      // Verify all required modules are loaded
      const requiredModules = [
        'utils', 'cache', 'events', 'accessibility', 
        'observers', 'tooltip'
      ];
      
      const missingModules = requiredModules.filter(module => !CE[module]);
      if (missingModules.length > 0) {
        throw new Error(`Missing required modules: ${missingModules.join(', ')}`);
      }

      // Initialize modules in order
      CE.cache.initialize();
      CE.events.initialize();
      CE.accessibility.initialize();
      CE.observers.initialize();
      CE.tooltip.initialize();

      // Set up extension state management
      setupExtensionState();
      
      // Set up cleanup handlers
      setupCleanup();

      initialized = true;
      console.log('[ContentExtension] Initialized successfully');

    } catch (error) {
      console.error('[ContentExtension] Initialization failed:', error);
      // Attempt graceful degradation
      fallbackInitialization();
    }
  }

  /**
   * Set up extension state management
   */
  function setupExtensionState() {
    // Get initial state from storage
    chrome.storage.sync.get({ extensionEnabled: true }, (data) => {
      extensionEnabled = !!data.extensionEnabled;
      updateExtensionState(extensionEnabled);
    });

    // Listen for state change messages from popup
    chrome.runtime.onMessage.addListener((msg) => {
      try {
        switch (msg.type) {
          case 'ENABLE_EXTENSION':
            extensionEnabled = true;
            updateExtensionState(true);
            break;
          case 'DISABLE_EXTENSION':
            extensionEnabled = false;
            updateExtensionState(false);
            break;
          case 'AX_TOOLTIP_SHOWN':
            // Handle tooltip coordination between frames
            if (CE.tooltip && CE.tooltip.handleCrossFrameTooltip) {
              CE.tooltip.handleCrossFrameTooltip(msg);
            }
            break;
          default:
            console.warn('[ContentExtension] Unknown message type:', msg.type);
        }
      } catch (error) {
        console.error('[ContentExtension] Error handling message:', error);
      }
    });
  }

  /**
   * Update extension state across all modules
   */
  function updateExtensionState(enabled) {
    extensionEnabled = enabled;
    
    if (enabled) {
      CE.events.enableEventListeners();
    } else {
      CE.events.disableEventListeners();
      CE.tooltip.hideTooltip();
    }

    // Notify all modules of state change
    Object.keys(CE).forEach(moduleName => {
      const module = CE[moduleName];
      if (module && typeof module.onStateChange === 'function') {
        try {
          module.onStateChange(enabled);
        } catch (error) {
          console.error(`[ContentExtension] Error updating ${moduleName} state:`, error);
        }
      }
    });
  }

  /**
   * Set up cleanup handlers for page unload
   */
  function setupCleanup() {
    const cleanup = () => {
      console.log('[ContentExtension] Cleaning up...');
      
      // Clean up all modules
      Object.keys(CE).forEach(moduleName => {
        const module = CE[moduleName];
        if (module && typeof module.cleanup === 'function') {
          try {
            module.cleanup();
          } catch (error) {
            console.error(`[ContentExtension] Error cleaning up ${moduleName}:`, error);
          }
        }
      });

      initialized = false;
    };

    // Set up cleanup listeners
    window.addEventListener('pagehide', cleanup, { once: true });
    window.addEventListener('beforeunload', cleanup, { once: true });
  }

  /**
   * Fallback initialization for when modules are missing
   */
  function fallbackInitialization() {
    console.warn('[ContentExtension] Using fallback initialization');
    
    // Basic tooltip functionality
    if (!CE.tooltip) {
      CE.tooltip = {
        hideTooltip: () => {
          const tooltip = document.querySelector('.chrome-ax-tooltip');
          if (tooltip) {
            tooltip.remove();
          }
        }
      };
    }

    // Basic event handling
    if (!CE.events) {
      CE.events = {
        enableEventListeners: () => console.log('Events would be enabled'),
        disableEventListeners: () => console.log('Events would be disabled')
      };
    }
  }

  /**
   * Get current extension state
   */
  function isEnabled() {
    return extensionEnabled;
  }

  /**
   * Get initialization status
   */
  function isInitialized() {
    return initialized;
  }

  // Export public API
  CE.main = {
    initialize,
    isEnabled,
    isInitialized,
    updateExtensionState
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    // DOM is already ready
    setTimeout(initialize, 0);
  }

})();
