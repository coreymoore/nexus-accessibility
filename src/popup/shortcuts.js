// Dynamically inject keyboard shortcuts into the shortcuts tab
(function () {
  const SHORTCUTS = [
    { keys: ["Alt", "X"], desc: "Open Nexus popup" },
    { keys: ["Esc"], desc: "Close tooltip" },
    { keys: ["Shift", "Esc"], desc: "Reopen tooltip for focused element" },
    { keys: ["Alt", "["], desc: "Enter Inspector" },
    { keys: ["Alt", "M"], desc: "Toggle Mini Mode" },
  ];
  function render() {
    const container = document.getElementById("shortcuts-container");
    if (!container) return;
    container.innerHTML =
      '<div class="shortcuts-grid">' +
      SHORTCUTS.map(
        (sc) =>
          `\n      <div class="shortcut-row"><div class="shortcut-keys">${sc.keys
            .map((k) => `<kbd>${k}</kbd>`)
            .join(
              '<span class="plus">+</span>'
            )}</div><div class="shortcut-desc">${sc.desc}</div></div>\n    `
      ).join("") +
      "</div>";
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
