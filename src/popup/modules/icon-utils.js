// Icon Utilities: provides injectIcons global helper used by various modules
(function () {
  function injectIcons() {
    if (!window.PopupIcons) return;
    document.querySelectorAll("[data-icon]").forEach((el) => {
      const name = el.getAttribute("data-icon");
      if (!name) return;
      // Only inject once or if empty
      if (!el._iconInjected || !el.innerHTML.trim()) {
        const svg = window.PopupIcons.get(name);
        if (svg) {
          el.innerHTML = svg;
          el._iconInjected = true;
        }
      }
    });
  }
  window.injectIcons = injectIcons;
})();
