/**
 * Split Button Menu - Simple, accessible dropdown menu for split buttons
 * Follows WAI-ARIA menu button pattern
 */
(function () {
  "use strict";

  function initSplitButton(container) {
    console.log("[split-menu] Initializing split button:", container);

    if (container.dataset.splitInitialized) {
      console.log("[split-menu] Already initialized, skipping");
      return;
    }

    const primaryBtn = container.querySelector(".report-main-btn");
    const caretBtn = container.querySelector(".report-dropdown-btn");
    const menu = container.querySelector(".dropdown-menu");

    if (!primaryBtn || !caretBtn || !menu) {
      console.warn("[split-menu] Missing required elements:", {
        primary: !!primaryBtn,
        caret: !!caretBtn,
        menu: !!menu,
      });
      return;
    }

    // Set up ARIA attributes
    if (!menu.id) {
      menu.id = "split-menu-" + Math.random().toString(36).substr(2, 9);
    }

    caretBtn.setAttribute("aria-haspopup", "menu");
    caretBtn.setAttribute("aria-controls", menu.id);
    caretBtn.setAttribute("aria-expanded", "false");
    menu.setAttribute("role", "menu");
    menu.hidden = true;

    // Menu state management
    function openMenu() {
      // Close any other open menus
      closeAllMenus();

      menu.hidden = false;
      caretBtn.setAttribute("aria-expanded", "true");

      // Focus first menu item
      const firstItem = menu.querySelector('[role="menuitem"]');
      if (firstItem) {
        firstItem.focus();
      }

      // Add document listeners
      document.addEventListener("click", handleDocumentClick, true);
      document.addEventListener("keydown", handleMenuKeydown, true);

      console.log("[split-menu] Menu opened");
    }

    function closeMenu() {
      menu.hidden = true;
      caretBtn.setAttribute("aria-expanded", "false");

      // Remove document listeners
      document.removeEventListener("click", handleDocumentClick, true);
      document.removeEventListener("keydown", handleMenuKeydown, true);

      console.log("[split-menu] Menu closed");
    }

    function handleDocumentClick(event) {
      if (!container.contains(event.target)) {
        closeMenu();
      }
    }

    function handleMenuKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        caretBtn.focus();
      }
    }

    // Caret button click handler
    caretBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      const isOpen = caretBtn.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Caret button keyboard handler
    caretBtn.addEventListener("keydown", function (event) {
      if (
        event.key === "ArrowDown" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        openMenu();
      }
    });

    // Menu item click handler
    menu.addEventListener("click", function (event) {
      const menuItem = event.target.closest('[role="menuitem"]');
      if (menuItem) {
        // Close menu after a brief delay to allow the click handler to execute
        setTimeout(closeMenu, 0);
      }
    });

    container.dataset.splitInitialized = "true";
    console.log("[split-menu] Split button initialized successfully");
  }

  function closeAllMenus() {
    document
      .querySelectorAll('.report-dropdown-btn[aria-expanded="true"]')
      .forEach((btn) => {
        const menuId = btn.getAttribute("aria-controls");
        const menu = menuId && document.getElementById(menuId);
        if (menu) {
          menu.hidden = true;
          btn.setAttribute("aria-expanded", "false");
        }
      });
  }

  function initAllSplitButtons() {
    console.log("[split-menu] Initializing all split buttons...");
    const containers = document.querySelectorAll(
      ".report-button-group, .overlay-split-group"
    );
    console.log(
      "[split-menu] Found",
      containers.length,
      "split button containers"
    );

    containers.forEach(initSplitButton);
  }

  function reinitSplitButtons() {
    console.log("[split-menu] Reinitializing split buttons...");
    // Clear previous initialization
    document
      .querySelectorAll(".report-button-group, .overlay-split-group")
      .forEach((container) => {
        delete container.dataset.splitInitialized;
      });

    // Reinitialize
    initAllSplitButtons();
  }

  // Export functions to global scope
  window.initSplitMenus = initAllSplitButtons;
  window.reinitSplitMenus = reinitSplitButtons;

  // Auto-initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      console.log("[split-menu] DOM loaded, auto-initializing...");
      setTimeout(initAllSplitButtons, 0);
    });
  } else {
    console.log("[split-menu] DOM already ready, auto-initializing...");
    setTimeout(initAllSplitButtons, 0);
  }
})();
