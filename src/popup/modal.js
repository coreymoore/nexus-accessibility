/**
 * Simple, Accessible Modal (ARIA APG Compliant)
 *
 * This script provides a function to show an accessible modal dialog.
 * It handles focus trapping, Escape key closing, and proper ARIA attributes.
 *
 * Usage:
 * import { showModal } from './modal.js'; // Or include via <script>
 *
 * showModal({
 *   title: 'My Modal',
 *   content: '<p>This is the modal content.</p>',
 *   buttons: [
 *     { text: 'OK', variant: 'primary', action: (close) => { console.log('OK clicked'); close(); } },
 *     { text: 'Cancel', variant: 'secondary', action: (close) => { console.log('Cancel clicked'); close(); } }
 *   ]
 * });
 */

function showModal({
  id = `modal-${Date.now()}`,
  title,
  content,
  buttons = [],
  size = "medium", // 'small', 'medium', 'large'
}) {
  // --- Create Modal Elements ---
  const overlay = document.createElement("div");
  overlay.id = id;
  overlay.className = "modal-overlay";
  overlay.setAttribute("role", "presentation");
  // Start hidden for CSS selector then reveal
  overlay.setAttribute("aria-hidden", "true");

  const dialog = document.createElement("div");
  // Match CSS naming: .modal-dialog--small|medium|large
  dialog.className = `modal-dialog modal-dialog--${size}`;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", `${id}-title`);

  const header = document.createElement("header");
  header.className = "modal-header";

  const titleEl = document.createElement("h2");
  titleEl.id = `${id}-title`;
  titleEl.className = "modal-title";
  titleEl.textContent = title;

  const closeBtn = document.createElement("button");
  // Match CSS .modal-close
  closeBtn.className = "modal-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.setAttribute("aria-label", "Close dialog");

  const body = document.createElement("div");
  body.className = "modal-body";
  body.innerHTML = content;

  header.appendChild(titleEl);
  header.appendChild(closeBtn);
  dialog.appendChild(header);
  dialog.appendChild(body);

  if (buttons.length > 0) {
    const footer = document.createElement("footer");
    footer.className = "modal-footer";
    buttons.forEach((btnConfig) => {
      const button = document.createElement("button");
      button.textContent = btnConfig.text;
      button.className = `modal-button ${btnConfig.variant || "secondary"}`;
      button.addEventListener("click", () => {
        if (btnConfig.action) {
          btnConfig.action(close);
        } else {
          close();
        }
      });
      footer.appendChild(button);
    });
    dialog.appendChild(footer);
  }

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // --- Accessibility & Focus Management ---
  const focusableElementsSelector =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  let focusableElements = Array.from(
    dialog.querySelectorAll(focusableElementsSelector)
  );
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  const previouslyFocused = document.activeElement;

  function trapFocus(e) {
    if (e.key !== "Tab") return;
    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        lastFocusable.focus();
        e.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        firstFocusable.focus();
        e.preventDefault();
      }
    }
  }

  // --- Show & Close Logic ---
  function show() {
    // Reveal overlay via aria-hidden toggle (CSS uses attribute selector)
    overlay.setAttribute("aria-hidden", "false");
    // Ensure it's flex in case CSS mismatch
    overlay.style.display = "flex";
    firstFocusable?.focus();
    document.addEventListener("keydown", keydownHandler);
  }

  function close() {
    overlay.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", keydownHandler);
    previouslyFocused?.focus();
    // Allow animation (if any) to complete
    setTimeout(() => {
      if (overlay.parentNode) {
        document.body.removeChild(overlay);
      }
    }, 150);
  }

  function keydownHandler(e) {
    if (e.key === "Escape") {
      close();
    }
    trapFocus(e);
  }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      close();
    }
  });

  // --- Finalize ---
  show();

  return {
    close,
  };
}

// Make it globally available if not using modules
if (typeof window !== "undefined") {
  window.showModal = showModal;
}
