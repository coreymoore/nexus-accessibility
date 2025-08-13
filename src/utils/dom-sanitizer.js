// DOM Sanitizer Utility - No Build Process Version
// Exposes window.DOMSanitizer for use in content scripts

(function () {
  "use strict";

  class DOMSanitizer {
    static escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }

    static createSafeElement(tag, attributes = {}, content = "") {
      const element = document.createElement(tag);

      // Whitelist safe attributes
      const safeAttributes = [
        "class",
        "id",
        "role",
        "aria-label",
        "aria-describedby",
        "aria-live",
        "aria-atomic",
        "tabindex",
        "data-nexus-id",
      ];

      for (const [key, value] of Object.entries(attributes)) {
        if (safeAttributes.includes(key.toLowerCase())) {
          element.setAttribute(key, String(value));
        }
      }

      if (content) {
        element.textContent = content;
      }

      return element;
    }

    static sanitizeText(text) {
      if (typeof text !== "string") return "";
      return text.replace(/[<>]/g, "");
    }

    /**
     * Sanitize HTML content more thoroughly
     * @param {string} html - HTML content to sanitize
     * @returns {string} Sanitized HTML
     */
    static sanitizeHTML(html) {
      if (typeof html !== "string") return "";

      // Create a temporary DOM element to parse and sanitize
      const temp = document.createElement("div");
      temp.innerHTML = html;

      // Allowed tags for accessibility tooltip content
      const allowedTags = [
        "div",
        "span",
        "dl",
        "dt",
        "dd",
        "svg",
        "path",
        "circle",
        "button",
      ];
      const allowedAttributes = [
        "class",
        "id",
        "role",
        "aria-label",
        "aria-describedby",
        "aria-live",
        "aria-atomic",
        "tabindex",
        "data-nexus-id",
        "width",
        "height",
        "viewBox",
        "fill",
        "stroke",
        "stroke-width",
        "stroke-linecap",
        "d",
        "cx",
        "cy",
        "r",
        "type",
      ];

      // Remove all script tags and event handlers
      const scripts = temp.querySelectorAll("script");
      scripts.forEach((script) => script.remove());

      // Clean all elements
      const allElements = temp.querySelectorAll("*");
      allElements.forEach((el) => {
        // Remove disallowed tags
        if (!allowedTags.includes(el.tagName.toLowerCase())) {
          el.replaceWith(...el.childNodes);
          return;
        }

        // Clean attributes
        const attrs = [...el.attributes];
        attrs.forEach((attr) => {
          if (
            !allowedAttributes.includes(attr.name.toLowerCase()) ||
            attr.value.includes("javascript:") ||
            attr.value.includes("data:") ||
            attr.name.startsWith("on")
          ) {
            el.removeAttribute(attr.name);
          }
        });
      });

      return temp.innerHTML;
    }
  }

  // Expose to global scope for content script use
  window.DOMSanitizer = DOMSanitizer;
})();
