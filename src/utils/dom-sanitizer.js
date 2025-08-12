export class DOMSanitizer {
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
}
