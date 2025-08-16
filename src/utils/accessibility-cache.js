/**
 * Enhanced Accessibility Cache System
 *
 * This module provides improved caching for accessibility scan results
 * with both page-level and element-level storage capabilities.
 */

(function () {
  "use strict";

  // Ensure our namespace exists
  window.ContentExtension = window.ContentExtension || {};
  const CE = window.ContentExtension;

  /**
   * Enhanced accessibility cache with element-level storage
   */
  class AccessibilityCache {
    constructor() {
      // Page-level scan results (full axe scan)
      this.pageResults = null;
      this.pageLastScanTime = null;
      this.pageUrl = null;

      // Element-level cache: Map of selector -> scan results
      this.elementCache = new Map();

      // Cache for element selectors to avoid recalculation
      this.selectorCache = new WeakMap();

      // Track scanning state
      this.isScanning = false;
      this.elementsScanningCount = 0;

      console.log("[AccessibilityCache] Enhanced cache system initialized");
    }

    /**
     * Store page-level scan results (additive mode)
     * @param {Object} results - Axe scan results
     * @param {boolean} replace - If true, replace existing data. If false, merge with existing data
     */
    setPageResults(results, replace = null) {
      // Use internal flag if replace not explicitly specified
      const shouldReplace = replace !== null ? replace : this._shouldReplace();

      if (shouldReplace || !this.pageResults) {
        // Replace mode or first scan
        this.pageResults = results;
        console.log(
          `[AccessibilityCache] Replaced page results: ${
            results.violations?.length || 0
          } violations`
        );
      } else {
        // Additive mode - merge new results with existing
        this.pageResults = this._mergeResults(this.pageResults, results);
        console.log(
          `[AccessibilityCache] Merged page results: ${
            this.pageResults.violations?.length || 0
          } total violations`
        );
      }

      this.pageLastScanTime = Date.now();
      this.pageUrl = window.location.href;

      // Index violations by element for quick lookup (always additive)
      this._indexElementViolations(results);
    }

    /**
     * Merge two axe results objects, combining violations while avoiding duplicates
     * @private
     */
    _mergeResults(existingResults, newResults) {
      if (!existingResults) return newResults;
      if (!newResults) return existingResults;

      const merged = {
        ...existingResults,
        violations: [...(existingResults.violations || [])],
        passes: [...(existingResults.passes || [])],
        incomplete: [...(existingResults.incomplete || [])],
        inapplicable: [...(existingResults.inapplicable || [])],
      };

      // Merge violations (avoid duplicates by rule + target combination)
      if (newResults.violations) {
        newResults.violations.forEach((newViolation) => {
          const existingViolationIndex = merged.violations.findIndex(
            (v) => v.id === newViolation.id
          );

          if (existingViolationIndex >= 0) {
            // Merge nodes for existing violation
            const existingViolation = merged.violations[existingViolationIndex];
            const mergedNodes = [...(existingViolation.nodes || [])];

            if (newViolation.nodes) {
              newViolation.nodes.forEach((newNode) => {
                // Check if this node target already exists
                const nodeExists = mergedNodes.some(
                  (existingNode) =>
                    JSON.stringify(existingNode.target) ===
                    JSON.stringify(newNode.target)
                );

                if (!nodeExists) {
                  mergedNodes.push(newNode);
                }
              });
            }

            merged.violations[existingViolationIndex] = {
              ...existingViolation,
              nodes: mergedNodes,
            };
          } else {
            // Add new violation type
            merged.violations.push(newViolation);
          }
        });
      }

      // Merge other categories (simple deduplication by stringifying)
      ["passes", "incomplete", "inapplicable"].forEach((category) => {
        if (newResults[category]) {
          newResults[category].forEach((newItem) => {
            const exists = merged[category].some(
              (existingItem) =>
                existingItem.id === newItem.id &&
                JSON.stringify(existingItem.nodes?.[0]?.target) ===
                  JSON.stringify(newItem.nodes?.[0]?.target)
            );

            if (!exists) {
              merged[category].push(newItem);
            }
          });
        }
      });

      console.log(
        `[AccessibilityCache] Merged results - Violations: ${merged.violations.length}, Passes: ${merged.passes.length}`
      );
      return merged;
    }

    /**
     * Get page-level scan results
     * @returns {Object|null} Cached page results
     */
    getPageResults() {
      return this.pageResults;
    }

    /**
     * Check if element has cached accessibility data
     * @param {Element} element - DOM element to check
     * @returns {Object|null} Cached element data or null
     */
    getElementData(element) {
      if (!element) return null;

      const selector = this._getElementSelector(element);
      if (!selector) return null;

      return this.elementCache.get(selector);
    }

    /**
     * Store element-specific accessibility data
     * @param {Element} element - DOM element
     * @param {Object} data - Accessibility data for the element
     */
    setElementData(element, data) {
      if (!element || !data) return;

      const selector = this._getElementSelector(element);
      if (!selector) return;

      this.elementCache.set(selector, {
        ...data,
        cachedAt: Date.now(),
        selector: selector,
      });

      console.log(`[AccessibilityCache] Cached element data for: ${selector}`);
    }

    /**
     * Check if element has violations in page results
     * @param {Element} element - DOM element to check
     * @returns {Array} Array of violations for this element
     */
    getElementViolations(element) {
      if (!element || !this.pageResults) return [];

      const selector = this._getElementSelector(element);
      if (!selector) return [];

      const cachedData = this.elementCache.get(selector);
      if (cachedData && cachedData.violations) {
        return cachedData.violations;
      }

      return [];
    }

    /**
     * Check if element needs scanning
     * @param {Element} element - DOM element to check
     * @returns {boolean} True if element needs scanning
     */
    elementNeedsScanning(element) {
      if (!element) return false;

      // If we don't have page results yet, we need scanning
      if (!this.pageResults) return true;

      // Check if we have specific data for this element
      const elementData = this.getElementData(element);
      if (!elementData) {
        // Check if element was part of page scan violations
        const violations = this.getElementViolations(element);
        if (violations.length === 0) {
          // Element wasn't in violations, may need individual scan
          return true;
        }
      }

      return false;
    }

    /**
     * Index violations by element selectors for quick lookup
     * @private
     */
    _indexElementViolations(results) {
      if (!results || !results.violations) return;

      results.violations.forEach((violation) => {
        if (!violation.nodes) return;

        violation.nodes.forEach((node) => {
          if (!node.target) return;

          const selector = node.target.join(", ");
          const existingData = this.elementCache.get(selector) || {
            violations: [],
          };

          // Add this violation to the element's data
          if (!existingData.violations.some((v) => v.id === violation.id)) {
            existingData.violations.push({
              id: violation.id,
              impact: violation.impact,
              description: violation.description,
              help: violation.help,
              helpUrl: violation.helpUrl,
              tags: violation.tags,
              node: node,
            });
          }

          this.elementCache.set(selector, existingData);
        });
      });

      console.log(
        `[AccessibilityCache] Indexed ${this.elementCache.size} elements with violations`
      );
    }

    /**
     * Get reliable selector for element
     * @private
     */
    _getElementSelector(element) {
      if (!element) return null;

      // Check cache first
      if (this.selectorCache.has(element)) {
        return this.selectorCache.get(element);
      }

      let selector = null;

      // Try to create a selector that axe-core would generate
      try {
        // Use axe-core's internal selector generation if available
        if (window.axe && window.axe.utils && window.axe.utils.getSelector) {
          // Ensure axe._selectorData is available before using getSelector
          if (!window.axe._selectorData && window.axe.utils.getSelectorData) {
            // Initialize selector data with current DOM
            const domTree = window.axe.utils.getFlattenedTree(
              document.documentElement
            );
            window.axe._selectorData =
              window.axe.utils.getSelectorData(domTree);
          }
          selector = window.axe.utils.getSelector(element);
        } else {
          // Fallback to simple selector generation
          selector = this._generateSelector(element);
        }

        if (selector) {
          this.selectorCache.set(element, selector);
        }
      } catch (error) {
        console.warn(
          "[AccessibilityCache] Failed to generate selector:",
          error
        );
        // Always fallback to simple selector generation
        try {
          selector = this._generateSelector(element);
          if (selector) {
            this.selectorCache.set(element, selector);
          }
        } catch (fallbackError) {
          console.warn(
            "[AccessibilityCache] Fallback selector generation also failed:",
            fallbackError
          );
        }
      }

      return selector;
    }

    /**
     * Generate a selector for an element (fallback)
     * @private
     */
    _generateSelector(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return null;

      // If element has unique ID, use it
      if (element.id) {
        return `#${CSS.escape(element.id)}`;
      }

      // Build path from root
      const path = [];
      let current = element;

      while (
        current &&
        current.nodeType === Node.ELEMENT_NODE &&
        current !== document.body
      ) {
        let selector = current.tagName.toLowerCase();

        // Add classes if available
        if (current.className) {
          const classes = current.className.split(/\s+/).filter(Boolean);
          if (classes.length > 0) {
            selector += "." + classes.map((c) => CSS.escape(c)).join(".");
          }
        }

        // Add nth-child if needed for uniqueness
        const siblings = Array.from(
          current.parentElement?.children || []
        ).filter((el) => el.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-child(${index})`;
        }

        path.unshift(selector);
        current = current.parentElement;
      }

      return path.join(" > ");
    }

    /**
     * Clear cached data
     * @param {Object} options - Clear options
     * @param {boolean} options.pageResults - Clear page results
     * @param {boolean} options.elementCache - Clear element cache
     * @param {boolean} options.all - Clear everything (default: true)
     */
    clear(options = { all: true }) {
      if (options.all || options.pageResults) {
        this.pageResults = null;
        this.pageLastScanTime = null;
        this.pageUrl = null;
        console.log("[AccessibilityCache] Page results cleared");
      }

      if (options.all || options.elementCache) {
        this.elementCache.clear();
        this.selectorCache = new WeakMap();
        console.log("[AccessibilityCache] Element cache cleared");
      }

      console.log("[AccessibilityCache] Cache cleared");
    }

    /**
     * Force next scan to replace rather than merge data
     */
    forceReplaceOnNextScan() {
      this._forceReplace = true;
      console.log("[AccessibilityCache] Next scan will replace existing data");
    }

    /**
     * Check if next scan should replace data
     * @private
     */
    _shouldReplace() {
      const shouldReplace = this._forceReplace || false;
      this._forceReplace = false; // Reset flag
      return shouldReplace;
    }

    /**
     * Get cache statistics
     */
    getStats() {
      return {
        hasPageResults: !!this.pageResults,
        pageLastScanTime: this.pageLastScanTime,
        elementsCached: this.elementCache.size,
        isScanning: this.isScanning,
        elementsScanningCount: this.elementsScanningCount,
      };
    }
  }

  // Create global cache instance
  if (!window.AccessibilityCache) {
    window.AccessibilityCache = new AccessibilityCache();
  }

  // Export to content extension namespace
  CE.accessibilityCache = window.AccessibilityCache;

  console.log(
    "[AccessibilityCache] Enhanced accessibility cache module loaded"
  );
})();
