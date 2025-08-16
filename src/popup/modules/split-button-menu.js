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

    // Set up ARIA attributes following ARIA APG
    if (!menu.id) {
      menu.id = "split-menu-" + Math.random().toString(36).substr(2, 9);
    }

    caretBtn.setAttribute("aria-haspopup", "menu");
    caretBtn.setAttribute("aria-controls", menu.id);
    caretBtn.setAttribute("aria-expanded", "false");
    caretBtn.setAttribute("aria-label", "Additional report options");
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-labelledby", caretBtn.id || "report-dropdown-btn");
    menu.hidden = true;

    // Ensure menu items are properly initialized after DOM insertion
    function ensureMenuItems() {
      if (menu.innerHTML.trim() === "") {
        console.warn("[split-menu] Menu is empty, may need content injection");
        // Try to trigger menu content population
        if (
          window.reportsManager &&
          window.reportsManager.updateReportButtonState
        ) {
          setTimeout(() => window.reportsManager.updateReportButtonState(), 0);
        }
      }
    }

    // Menu state management
    function openMenu() {
      ensureMenuItems(); // Check menu content before opening

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
        return;
      }

      // Arrow key navigation following ARIA APG
      const menuItems = Array.from(menu.querySelectorAll('[role="menuitem"]'));
      if (menuItems.length === 0) return;

      const currentIndex = menuItems.indexOf(document.activeElement);
      let nextIndex = currentIndex;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          nextIndex =
            currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
          break;
        case "ArrowUp":
          event.preventDefault();
          nextIndex =
            currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
          break;
        case "Home":
          event.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          event.preventDefault();
          nextIndex = menuItems.length - 1;
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          if (document.activeElement && document.activeElement.click) {
            document.activeElement.click();
          }
          return;
        default:
          return;
      }

      if (menuItems[nextIndex]) {
        menuItems[nextIndex].focus();
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

    // Caret button keyboard handler - ARIA APG compliant
    caretBtn.addEventListener("keydown", function (event) {
      switch (event.key) {
        case "ArrowDown":
        case "ArrowUp":
          event.preventDefault();
          openMenu();
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          const isOpen = caretBtn.getAttribute("aria-expanded") === "true";
          if (isOpen) {
            closeMenu();
          } else {
            openMenu();
          }
          break;
        case "Escape":
          if (caretBtn.getAttribute("aria-expanded") === "true") {
            event.preventDefault();
            closeMenu();
          }
          break;
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
