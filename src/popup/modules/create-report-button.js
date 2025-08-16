/**
 * Shared Create Report Button Manager
 * Manages the state of create/view report buttons across the popup
 */
(function () {
  "use strict";

  function updateButton(btn, hasReport, onCreate, onView) {
    if (!btn) return;

    // Clear existing handlers
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    // Set appropriate content and handler
    if (hasReport) {
      newBtn.innerHTML =
        '<span class="button-icon" data-icon="clipboard" aria-hidden="true"></span><span class="btn-label">View Report</span>';
      if (onView) {
        newBtn.addEventListener("click", (e) => {
          e.preventDefault();
          onView(e, newBtn);
        });
      }
    } else {
      newBtn.innerHTML =
        '<span class="button-icon" data-icon="plus" aria-hidden="true"></span><span class="btn-label">Create Report</span>';
      if (onCreate) {
        newBtn.addEventListener("click", (e) => {
          e.preventDefault();
          onCreate(e, newBtn);
        });
      }
    }

    // Ensure icon injection
    if (window.injectIcons) {
      try {
        window.injectIcons();
      } catch (_) {}
    }
  }

  function refresh(options = {}) {
    const { onCreate, onView, hasReport = false } = options;

    // Update all create report buttons
    document.querySelectorAll(".component-create-report").forEach((btn) => {
      updateButton(btn, hasReport, onCreate, onView);
    });
  }

  // Export to global scope
  window.CreateReportButtons = { refresh };
})();
