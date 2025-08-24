/**
 * Inspector Utilities Module
 *
 * Provides utility functions for data processing, DOM manipulation,
 * and accessibility helpers used throughout the inspector system.
 *
 * Dependencies: None (base module)
 *
 * Global API: window.NexusInspector.Utils
 */

(function () {
  "use strict";

  // Initialize DOMSanitizer with fallback
  const DOMSanitizer = window.DOMSanitizer || {
    sanitizeText: (text) => {
      if (typeof text !== "string") return "";
      return text.replace(/[<>]/g, "");
    },
    createSafeElement: (tag, attrs = {}, content = "") => {
      const el = document.createElement(tag);
      const safeAttributes = [
        "class",
        "id",
        "role",
        "aria-label",
        "aria-describedby",
        "aria-live",
        "aria-atomic",
        "tabindex",
      ];
      for (const [key, value] of Object.entries(attrs)) {
        if (safeAttributes.includes(key.toLowerCase())) {
          el.setAttribute(key, String(value));
        }
      }
      if (content) el.textContent = content;
      return el;
    },
    escapeHtml: (text) => {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    },
  };

  // Access accessibility utilities if available
  const accessibility = window.accessibility || {
    announceToScreenReader: (text) => {
      console.log("[Accessibility]", text);
    },
    restoreFocus: () => {
      // Fallback implementation
    },
  };

  /**
   * Utility functions for inspector data processing and DOM manipulation
   */
  const InspectorUtils = {
    /**
     * Safely escape HTML content
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML string
     */
    escapeHtml(text) {
      if (DOMSanitizer) {
        return DOMSanitizer.sanitizeText(text);
      }
      // Fallback: basic HTML escaping
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    },

    /**
     * Create safe inspector content using DOMSanitizer
     * @param {string} content - Content to sanitize
     * @returns {string} Sanitized content
     */
    createSafeInspectorContent(content) {
      if (!DOMSanitizer) {
        // Fallback: use textContent to prevent XSS
        const div = document.createElement("div");
        div.textContent = typeof content === "string" ? content : "";
        return div.innerHTML;
      }

      // Use enhanced HTML sanitization when available
      if (DOMSanitizer.sanitizeHTML) {
        return DOMSanitizer.sanitizeHTML(content);
      }

      // Fallback to text sanitization
      return DOMSanitizer.sanitizeText(content);
    },

    /**
     * Recursively unwrap CDP-shaped values and node lists to plain text/value
     * @param {*} v - Value to unwrap
     * @returns {string} Unwrapped text value
     */
    deepUnwrap(v) {
      if (v == null) return v;
      if (typeof v !== "object") return v;

      if (Array.isArray(v)) {
        return v
          .map((x) => this.deepUnwrap(x))
          .filter((x) => x != null && x !== "")
          .join(" ");
      }

      if ("value" in v) return this.deepUnwrap(v.value);

      if (v.type === "nodeList" && Array.isArray(v.relatedNodes)) {
        const texts = v.relatedNodes
          .map(
            (n) =>
              n && (n.text ?? n.name ?? n.label ?? n.innerText ?? n.nodeValue)
          )
          .filter((t) => t != null && t !== "");
        if (texts.length) return texts.join(" ");
      }

      // Handle idref / idrefList structures from CDP Accessibility protocol
      // These often only contain idref identifiers without embedded text so we attempt
      // to resolve them to DOM elements and extract a readable label or textContent.
      if ((v.type === "idref" || v.type === "idrefList") && Array.isArray(v.relatedNodes)) {
        const resolved = v.relatedNodes
          .map((n) => {
            if (!n) return null;
            // Prefer any textual fields already present
            const direct = n.text || n.name || n.label || n.innerText || n.nodeValue;
            if (direct) return this.deepUnwrap(direct);
            if (n.idref) {
              try {
                const el = document.getElementById(n.idref);
                if (el) {
                  // Derive an accessible label preference order
                  const ariaLabel = el.getAttribute("aria-label");
                  let labelledbyText = null;
                  const labelledby = el.getAttribute("aria-labelledby");
                  if (!ariaLabel && labelledby) {
                    labelledbyText = labelledby
                      .split(/\s+/)
                      .map((id) => {
                        const ref = document.getElementById(id);
                        if (!ref) return null;
                        return (ref.textContent || "").trim();
                      })
                      .filter(Boolean)
                      .join(" ");
                  }
                  const txt =
                    ariaLabel ||
                    labelledbyText ||
                    (el.textContent || el.innerText || "").trim();
                  if (txt) {
                    return txt.replace(/\s+/g, " ");
                  }
                }
              } catch (e) {
                // Swallow resolution errors silently; fall back to JSON later
              }
            }
            return null;
          })
          .filter((t) => t != null && t !== "");
        if (resolved.length) return resolved.join(" ");
      }

      if ("text" in v) return this.deepUnwrap(v.text);
      if ("name" in v) return this.deepUnwrap(v.name);
      if ("label" in v) return this.deepUnwrap(v.label);
      if ("innerText" in v) return this.deepUnwrap(v.innerText);
      if ("nodeValue" in v) return this.deepUnwrap(v.nodeValue);

      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    },

    /**
     * Check if a value represents boolean true
     * @param {*} v - Value to check
     * @returns {boolean} True if value represents true
     */
    isTrue(v) {
      return v === true || v === "true" || v === 1 || v === "1";
    },

    /**
     * Get all focusable elements within a container
     * @param {Element} root - Root container to search within
     * @returns {Element[]} Array of focusable elements
     */
    getFocusableElements(root) {
      if (!root) return [];

      const candidates = root.querySelectorAll(
        [
          "a[href]",
          "area[href]",
          "button:not([disabled])",
          'input:not([disabled]):not([type="hidden"])',
          "select:not([disabled])",
          "textarea:not([disabled])",
          '[tabindex]:not([tabindex="-1"])',
        ].join(", ")
      );

      const isVisible = (el) => {
        const style = window.getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none")
          return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      return Array.from(candidates).filter((el) => isVisible(el));
    },

    /**
     * Calculate the closest edge points between two rectangles
     * @param {Object} rect1 - First rectangle
     * @param {Object} rect2 - Second rectangle
     * @returns {Array} Array containing [point1, point2] with closest edge coordinates
     */
    getClosestEdgePoint(rect1, rect2) {
      const points1 = [
        { x: rect1.left, y: rect1.top },
        { x: rect1.right, y: rect1.top },
        { x: rect1.left, y: rect1.bottom },
        { x: rect1.right, y: rect1.bottom },
        { x: rect1.left + rect1.width / 2, y: rect1.top },
        { x: rect1.left + rect1.width / 2, y: rect1.bottom },
        { x: rect1.left, y: rect1.top + rect1.height / 2 },
        { x: rect1.right, y: rect1.top + rect1.height / 2 },
      ];

      const points2 = [
        { x: rect2.left, y: rect2.top },
        { x: rect2.right, y: rect2.top },
        { x: rect2.left, y: rect2.bottom },
        { x: rect2.right, y: rect2.bottom },
        { x: rect2.left + rect2.width / 2, y: rect2.top },
        { x: rect2.left + rect2.width / 2, y: rect2.bottom },
        { x: rect2.left, y: rect2.top + rect2.height / 2 },
        { x: rect2.right, y: rect2.top + rect2.height / 2 },
      ];

      let minDist = Infinity;
      let best1 = points1[0],
        best2 = points2[0];

      for (const p1 of points1) {
        for (const p2 of points2) {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = dx * dx + dy * dy;
          if (dist < minDist) {
            minDist = dist;
            best1 = p1;
            best2 = p2;
          }
        }
      }

      return [best1, best2];
    },

    /**
     * Get accessibility utilities
     * @returns {Object} Accessibility utilities object
     */
    getAccessibility() {
      return accessibility;
    },

    /**
     * Get DOM sanitizer
     * @returns {Object} DOM sanitizer object
     */
    getDOMSanitizer() {
      return DOMSanitizer;
    },

    /**
     * Debounce function to limit rapid function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    /**
     * Check if an element is visible in the viewport
     * @param {Element} element - Element to check
     * @returns {boolean} True if element is visible
     */
    isElementVisible(element) {
      if (!element) return false;

      const style = window.getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none")
        return false;

      const rect = element.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
      );
    },

    /**
     * Safely get text content from an element
     * @param {Element} element - Element to get text from
     * @returns {string} Safe text content
     */
    getSafeTextContent(element) {
      if (!element) return "";

      try {
        return element.textContent || element.innerText || "";
      } catch {
        return "";
      }
    },

    /**
     * Create a namespace object if it doesn't exist
     * @param {string} namespace - Dot-separated namespace string
     * @param {Object} root - Root object to create namespace on
     * @returns {Object} The namespace object
     */
    createNamespace(namespace, root = window) {
      const parts = namespace.split(".");
      let current = root;

      for (const part of parts) {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }

      return current;
    },
  };

  // Initialize global namespace
  if (!window.NexusInspector) {
    window.NexusInspector = {};
  }

  // Export utilities
  window.NexusInspector.Utils = InspectorUtils;

  // Also expose getClosestEdgePoint globally for backward compatibility
  window.getClosestEdgePoint = InspectorUtils.getClosestEdgePoint;
})();
