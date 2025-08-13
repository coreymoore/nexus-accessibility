/**
 * Environment Configuration
 *
 * Manages development vs production mode detection and conditional feature exposure.
 */

(function () {
  "use strict";

  /**
   * Determine if we're in development mode
   * @returns {boolean} True if in development mode
   */
  function isDevelopmentMode() {
    try {
      // Check for development indicators
      const manifest = chrome?.runtime?.getManifest?.();
      
      // Check version indicators
      if (manifest?.version_name?.includes('dev') || 
          manifest?.version_name?.includes('beta') ||
          manifest?.version?.includes('dev')) {
        return true;
      }

      // Check for development origin
      if (manifest?.update_url?.includes('localhost') ||
          chrome?.runtime?.getURL?.('')?.includes('chrome-extension://')) {
        // For unpacked extensions, the URL will be chrome-extension://
        // but we can check if it's an unpacked extension
        return !chrome.runtime.getURL('').includes('chrome-extension://');
      }

      // Check for debug flags in manifest
      if (manifest?.name?.toLowerCase().includes('debug') ||
          manifest?.name?.toLowerCase().includes('test') ||
          manifest?.name?.toLowerCase().includes('dev')) {
        return true;
      }

      return false;
    } catch (error) {
      // If we can't determine, default to production for safety
      console.warn('[ENV] Could not determine environment mode:', error);
      return false;
    }
  }

  /**
   * Conditionally expose debugging functions based on environment
   */
  function exposeDebugUtils() {
    const isDev = isDevelopmentMode();
    
    if (isDev) {
      console.log('[ENV] Development mode detected - exposing debug utilities');
      
      // Expose validation functions globally
      if (typeof validateAccessibilityLibraries !== 'undefined') {
        window.validateAccessibilityLibraries = validateAccessibilityLibraries;
      }
      
      if (typeof batchValidateAccessibility !== 'undefined') {
        window.batchValidateAccessibility = batchValidateAccessibility;
      }

      // Expose testing utilities
      if (window.NexusTestUtils) {
        window.debugUtils = window.NexusTestUtils;
      }

      // Add development indicator to testing mode
      if (window.NEXUS_TESTING_MODE) {
        window.NEXUS_TESTING_MODE.developmentMode = true;
      }
    } else {
      console.log('[ENV] Production mode detected - debug utilities restricted');
      
      // Ensure testing mode exists but mark as production
      if (!window.NEXUS_TESTING_MODE) {
        window.NEXUS_TESTING_MODE = {
          useLibraries: true,
          verbose: false,
          developmentMode: false
        };
      } else {
        window.NEXUS_TESTING_MODE.developmentMode = false;
      }
    }

    return isDev;
  }

  /**
   * Get current environment information
   * @returns {Object} Environment information
   */
  function getEnvironmentInfo() {
    const isDev = isDevelopmentMode();
    const manifest = chrome?.runtime?.getManifest?.() || {};
    
    return {
      isDevelopment: isDev,
      version: manifest.version,
      versionName: manifest.version_name,
      extensionId: chrome?.runtime?.id,
      manifestVersion: manifest.manifest_version,
      permissions: manifest.permissions || [],
      debugUtilsExposed: isDev
    };
  }

  // Export to global scope
  if (typeof window !== "undefined") {
    window.EnvironmentConfig = {
      isDevelopmentMode,
      exposeDebugUtils,
      getEnvironmentInfo
    };
  }

  // Auto-expose debug utils
  exposeDebugUtils();

  console.log('[ENV] Environment configuration loaded');
  
})();
