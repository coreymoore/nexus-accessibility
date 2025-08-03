// Make formatter available globally
window.formatAccessibilityInfo = function (info) {
  console.log("formatAccessibilityInfo called with:", info);
  console.log("info.states:", info.states);
  console.log("info.ariaProperties:", info.ariaProperties);
  console.log("Object.keys(info):", Object.keys(info));
  console.log("Full info object:", JSON.stringify(info, null, 2));

  let dl = "<dl>";

  // Basic properties
  if (info.role) dl += `<dt>Role</dt><dd>${info.role}</dd>`;
  if (info.name) dl += `<dt>Name</dt><dd>${info.name}</dd>`;
  if (info.description && info.description !== "(no description)")
    dl += `<dt>Description</dt><dd>${info.description}</dd>`;
  if (info.value && info.value !== "(no value)")
    dl += `<dt>Value</dt><dd>${info.value}</dd>`;

  // States section
  if (info.states && Object.keys(info.states).length > 0) {
    dl += '<dt>States</dt><dd class="states-list">';
    for (const [state, value] of Object.entries(info.states)) {
      dl += `<span class="state-badge">${state}: ${value}</span>`;
    }
    dl += "</dd>";
  }

  // ARIA properties section
  if (info.ariaProperties && Object.keys(info.ariaProperties).length > 0) {
    dl += '<dt>ARIA</dt><dd class="aria-list">';
    for (const [prop, value] of Object.entries(info.ariaProperties)) {
      dl += `<span class="aria-badge">${prop}: ${value}</span>`;
    }
    dl += "</dd>";
  }

  dl += "</dl>";
  return dl;
};
