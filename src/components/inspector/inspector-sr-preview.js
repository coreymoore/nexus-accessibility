/**
 * Inspector SR Preview Integration
 *
 * Provides screen reader preview functionality by wrapping the sr-preview utility
 * and exposing it via the global NexusInspector namespace.
 *
 * This module integrates the sr-preview functionality into the inspector system
 * by providing a renderPreview method that generates screen reader output
 * with appropriate token classes for visual styling.
 *
 * Dependencies: src/utils/sr-preview.js (loaded by contentInjector)
 * Global API: window.NexusInspector.SrPreview
 */

(function () {
  "use strict";

  /**
   * Inspector SR Preview wrapper functionality
   */
  const SrPreview = {
    /**
     * Check if sr-preview is available
     * @returns {boolean} True if available
     */
    isAvailable() {
      return !!(window.NexusSrPreview && window.NexusSrPreview.generateSegments);
    },

    /**
     * Generate segments for inspector display with token classes
     * @param {Object} info - Accessibility information object  
     * @param {Object} options - Rendering options
     * @returns {Array|null} Array of segment objects with kind, text properties
     */
    renderPreview(info, options = {}) {
      if (!info) return null;

      if (!this.isAvailable()) {
        console.warn('[NEXUS][SR-PREVIEW] Core sr-preview.js not available');
        return null;
      }

      try {
        // Generate segments using the core sr-preview functionality
        const segments = window.NexusSrPreview.generateSegments(info, options);
        
        // Core now emits {kind,text}. Older fallback may provide 'type'. Normalize.
        return segments.map(segment => ({
          kind: segment.kind || segment.type,
          text: segment.text
        }));
      } catch (error) {
        console.warn('[NEXUS][SR-PREVIEW] renderPreview failed:', error);
        return null;
      }
    },

    /**
     * Generate plain text preview
     * @param {Object} info - Accessibility information object
     * @param {Object} options - Rendering options
     * @returns {string} Plain text preview
     */
    generateText(info, options = {}) {
      if (!this.isAvailable()) {
        console.warn('[NEXUS][SR-PREVIEW] Core sr-preview.js not available');
        return '';
      }

      try {
        const segments = window.NexusSrPreview.generateSegments(info, options);
        return window.NexusSrPreview.generatePreviewString(segments, options);
      } catch (error) {
        console.warn('[NEXUS][SR-PREVIEW] generateText failed:', error);
        return '';
      }
    }
  };

  // Initialize global namespace
  if (!window.NexusInspector) {
    window.NexusInspector = {};
  }

  // Export sr-preview functionality
  window.NexusInspector.SrPreview = SrPreview;

})();