/**
 * Content Script Utilities
 *
 * This module provides common utility functions used throughout the content script.
 * It includes DOM helpers, debouncing, error handling, and other shared functionality.
 *
 * Dependencies: None (should be loaded first)
 */

(function () {
  "use strict";

  // Ensure our namespace exists
  window.ContentExtension = window.ContentExtension || {};
  const CE = window.ContentExtension;

  // Initialize logger reference
  const logger = window.logger ||
    window.axLogger || {
      content: {
        log: console.log.bind(console),
        error: console.error.bind(console),
      },
    };

  // Initialize error handler reference
  const errorHandler = window.errorHandler || {
    log: (error, context) => console.error(`[${context}]`, error),
    wrap: (fn, context) => fn,
  };

  // Access debounce utilities if available
  const { debounce, throttle, DebouncedRequest } = window.debounceUtils || {
    debounce: (fn, delay) => fn,
    throttle: (fn, delay) => fn,
    DebouncedRequest: null,
  };

  // Unique token for this frame to coordinate tooltips across frames
  const frameToken = Math.random().toString(36).substr(2, 9);

  /**
   * Global element storage for CDP accessibility retrieval
   * IMPORTANT: Do not change this approach! This method uses Runtime.evaluate with direct element
   * references followed by DOM.requestNode, which is the most reliable way to get nodeIds for CDP.
   */
  window.nexusTargetElement = null;

  /**
   * Store an element reference globally for CDP access
   * @param {Element} element - The element to store for CDP access
   * @param {string} selectionType - The type of selection ('focus', 'hover', 'click', etc.)
   */
  function storeElementForCDP(element, selectionType = "focus") {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      console.warn("Invalid element provided to storeElementForCDP");
      return;
    }

    window.nexusTargetElement = element;
    console.log(
      `[NEXUS] Element stored for CDP access (${selectionType}):`,
      element
    );
    console.log(
      "[NEXUS] This element should be accessible via document.activeElement in CDP context"
    );
  }

  /**
   * Generate a unique CSS selector for an element
   * @param {Element} el - The element to generate a selector for
   * @returns {string} CSS selector string
   */
  function getUniqueSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;

    let path = [];
    while (el && el.nodeType === 1 && el !== document.body) {
      let selector = el.nodeName.toLowerCase();

      if (el.classList && el.classList.length) {
        selector +=
          "." +
          Array.from(el.classList)
            .map((cls) => CSS.escape(cls))
            .join(".");
      }

      let sibling = el;
      let nth = 1;
      while ((sibling = sibling.previousElementSibling)) {
        if (sibling.nodeName === el.nodeName) nth++;
      }
      selector += `:nth-of-type(${nth})`;
      path.unshift(selector);
      el = el.parentElement;
    }

    return path.length ? path.join(" > ") : ":focus";
  }

  /**
   * Get text content from an element by ID
   * @param {string} id - The element ID
   * @returns {string} Text content or empty string
   */
  function getTextFromId(id) {
    if (!id) return "";
    const el = document.getElementById(id);
    return (el && el.textContent ? el.textContent : "").trim();
  }

  /**
   * Get ARIA label from an element, including aria-labelledby resolution
   * @param {Element} el - The element to get label from
   * @returns {string} ARIA label or empty string
   */
  function getAriaLabel(el) {
    if (!el) return "";

    const ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel) return ariaLabel.trim();

    const labelledby = el.getAttribute("aria-labelledby");
    if (labelledby) {
      return labelledby
        .split(/\s+/)
        .map(getTextFromId)
        .filter(Boolean)
        .join(" ");
    }

    return "";
  }

  /**
   * Get fieldset legend text
   * @param {Element} el - The fieldset element
   * @returns {string} Legend text or empty string
   */
  function getFieldsetLegend(el) {
    const legend = el.querySelector(":scope > legend");
    return (legend && legend.textContent ? legend.textContent : "").trim();
  }

  /**
   * Check if an element is in a shadow root
   * @param {Element} el - The element to check
   * @returns {boolean} True if element is in shadow root
   */
  function isInShadowRoot(el) {
    return el.getRootNode() instanceof ShadowRoot;
  }

  /**
   * Get the tooltip element created by the tooltip module
   * @returns {Element|null} The tooltip element or null
   */
  function getTooltipElement() {
    return document.querySelector(".chrome-ax-tooltip");
  }

  /**
   * Manual debounce implementation as fallback
   * @param {Function} func - Function to debounce
   * @param {number} wait - Debounce delay in milliseconds
   * @returns {Function} Debounced function
   */
  function manualDebounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Manual throttle implementation as fallback
   * @param {Function} func - Function to throttle
   * @param {number} limit - Throttle limit in milliseconds
   * @returns {Function} Throttled function
   */
  function manualThrottle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Safe element focus with fallback options
   * @param {Element} element - Element to focus
   * @param {Object} options - Focus options
   */
  function safeFocus(element, options = {}) {
    if (!element || typeof element.focus !== "function") {
      return;
    }

    try {
      element.focus({ preventScroll: true, ...options });
    } catch (e) {
      try {
        element.focus();
      } catch (e2) {
        console.warn("Failed to focus element:", e2);
      }
    }
  }

  /**
   * Safe attribute getter with fallback
   * @param {Element} element - Element to get attribute from
   * @param {string} attributeName - Name of the attribute
   * @param {string} defaultValue - Default value if attribute doesn't exist
   * @returns {string} Attribute value or default
   */
  function safeGetAttribute(element, attributeName, defaultValue = "") {
    try {
      return element.getAttribute(attributeName) || defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  /**
   * Safe element contains check
   * @param {Element} container - Container element
   * @param {Element} contained - Element to check if contained
   * @returns {boolean} True if contained within container
   */
  function safeContains(container, contained) {
    try {
      return container && contained && container.contains(contained);
    } catch (e) {
      return false;
    }
  }

  /**
   * Get frame token for cross-frame coordination
   * @returns {string} Unique frame token
   */
  function getFrameToken() {
    return frameToken;
  }

  // Export the utils module
  CE.utils = {
    // References to external utilities
    logger,
    errorHandler,
    debounce: debounce || manualDebounce,
    throttle: throttle || manualThrottle,
    DebouncedRequest,

    // Frame coordination
    frameToken,
    getFrameToken,

    // Element utilities
    storeElementForCDP,
    getUniqueSelector,
    getTextFromId,
    getAriaLabel,
    getFieldsetLegend,
    isInShadowRoot,
    getTooltipElement,
    safeFocus,
    safeGetAttribute,
    safeContains,

    // Manual implementations for fallback
    manualDebounce,
    manualThrottle,
  };

  console.log("[ContentExtension.utils] Module loaded");
})();
