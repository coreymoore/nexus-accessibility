// Make formatter available globally
/**
 * Format accessibility information for display
 * @param {Object} info - Accessibility information object
 * @returns {string} Formatted HTML string
 */
window.formatAccessibilityInfo = function (info) {
  console.log("formatAccessibilityInfo called with:", info);
  console.log("info.states:", info.states);
  console.log("info.ariaProperties:", info.ariaProperties);
  console.log("Object.keys(info):", Object.keys(info));
  console.log("Full info object:", JSON.stringify(info, null, 2));

  // Deeply unwrap CDP/AX values (handles { value }, nodeList.relatedNodes[].text, arrays)
  const deepUnwrap = (v) => {
    if (v == null) return v;
    if (typeof v !== "object") return v;
    if (Array.isArray(v))
      return v
        .map(deepUnwrap)
        .filter((x) => x != null && x !== "")
        .join(" ");
    if ("value" in v) return deepUnwrap(v.value);
    // Handle nodeList & idref (activedescendant) structures with relatedNodes
    if (
      Array.isArray(v.relatedNodes) &&
      (v.type === "nodeList" || v.type === "idref")
    ) {
      const texts = v.relatedNodes
        .map((n) => {
          if (!n) return null;
          // Prefer provided textual fields from CDP first
          let textCandidate =
            n.text ?? n.name ?? n.label ?? n.innerText ?? n.nodeValue;
          // If none, try resolving by idref in current document
          if (!textCandidate && n.idref && typeof document !== "undefined") {
            try {
              const el = document.getElementById(n.idref);
              if (el) {
                textCandidate = (
                  el.getAttribute("aria-label") ||
                  el.textContent ||
                  ""
                )
                  .trim()
                  .substring(0, 80);
              }
            } catch (e) {
              // Ignore DOM access errors safely
            }
          }
          // Final fallback: idref itself
          if (!textCandidate && n.idref) textCandidate = n.idref;
          return textCandidate && textCandidate !== "" ? textCandidate : null;
        })
        .filter((t) => t != null && t !== "");
      if (texts.length) return texts.join(" ");
      // If still nothing and it's an idref type, show list of idrefs to avoid raw JSON
      if (v.type === "idref") {
        const idrefs = v.relatedNodes.map((n) => n && n.idref).filter(Boolean);
        if (idrefs.length) return idrefs.join(" ");
      }
    }
    if ("text" in v) return deepUnwrap(v.text);
    if ("name" in v) return deepUnwrap(v.name);
    if ("label" in v) return deepUnwrap(v.label);
    if ("innerText" in v) return deepUnwrap(v.innerText);
    if ("nodeValue" in v) return deepUnwrap(v.nodeValue);
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  };

  let dl = "<dl>";

  // Basic properties
  if (info.role) dl += `<dt>Role</dt><dd>${info.role}</dd>`;
  if (info.name) dl += `<dt>Name</dt><dd>${info.name}</dd>`;
  if (info.description && info.description !== "(no description)")
    dl += `<dt>Description</dt><dd>${info.description}</dd>`;

  // Active Descendant (placed immediately after Name/Description block per request)
  if (info.activeDescendant) {
    try {
      const ad = info.activeDescendant;
      let adText = "";
      if (ad.role) adText += ad.role;
      if (ad.name) {
        const n = deepUnwrap(ad.name);
        adText += adText ? ` "${n}"` : `"${n}"`;
      }
      if (ad.states && Array.isArray(ad.states) && ad.states.length) {
        adText += adText ? ` (${ad.states.join(", ")})` : ad.states.join(", ");
      }
      if (adText) {
        // Match styling of Name and Description: no extra class
        dl += `<dt>Active Descendant</dt><dd>${adText}</dd>`;
      }
    } catch (e) {
      // Fail silently; do not break overall formatting
      console.warn("[Formatter] Failed to render active descendant entry", e);
    }
  }
  // Group (immediately after Description)
  if (info.group && info.group.role) {
    let groupText = info.group.role;
    if (info.group.label) groupText += ` (${info.group.label})`;
    dl += `<dt>Group</dt><dd>${groupText}</dd>`;
  }
  if (info.value && info.value !== "(no value)")
    dl += `<dt>Value</dt><dd>${deepUnwrap(info.value)}</dd>`;

  // States section
  if (info.states && Object.keys(info.states).length > 0) {
    dl += '<dt>States</dt><dd class="states-list">';
    for (const [state, value] of Object.entries(info.states)) {
      const v = deepUnwrap(value);
      dl += `<span class="state-badge">${state}: ${v}</span>`;
    }
    dl += "</dd>";
  }

  // ARIA properties section
  if (info.ariaProperties && Object.keys(info.ariaProperties).length > 0) {
    dl += '<dt>ARIA</dt><dd class="aria-list">';
    for (const [prop, value] of Object.entries(info.ariaProperties)) {
      const v = deepUnwrap(value);
      dl += `<span class="aria-badge">${prop}: ${v}</span>`;
    }
    dl += "</dd>";
  }

  dl += "</dl>";
  return dl;
};
