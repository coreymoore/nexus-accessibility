/**
 * Modal Manager - ARIA APG compliant modal dialogs
 * Follows W3C ARIA Authoring Practices Guide for modal dialogs
 * https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 */
class ModalManager {
  constructor() {
    this.modals = new Map();
    this.activeModal = null;
    this.previouslyFocused = null;
    this.modalCount = 0;
  }

  /**
   * Initialize the modal manager
   */
  init() {
    console.log("ModalManager: Initializing with ARIA APG compliance...");

    // Global keyboard event handler
    this.handleKeyDown = this.handleKeyDown.bind(this);

    console.log("ModalManager: Initialization complete");
  }

  /**
   * Create a new modal dialog
   * @param {string} id - Unique identifier for the modal
   * @param {Object} config - Modal configuration
   * @param {string} config.title - Modal title
   * @param {string} config.content - Modal content (HTML string)
   * @param {Array} config.buttons - Array of button configurations
   * @param {boolean} config.closeOnEscape - Allow escape key to close (default: true)
   * @param {boolean} config.closeOnBackdrop - Allow backdrop click to close (default: true)
   * @param {string} config.size - Modal size: 'small', 'medium', 'large' (default: 'medium')
   */
  createModal(id, config = {}) {
    if (this.modals.has(id)) {
      console.warn(`Modal with id "${id}" already exists`);
      return this.modals.get(id);
    }

    const {
      title = "Dialog",
      content = "",
      buttons = [],
      closeOnEscape = true,
      closeOnBackdrop = true,
      size = "medium",
    } = config;

    // Create modal structure
    const modal = this.createModalElement(id, {
      title,
      content,
      buttons,
      closeOnEscape,
      closeOnBackdrop,
      size,
    });

    // Store modal configuration
    this.modals.set(id, {
      element: modal,
      config: { title, content, buttons, closeOnEscape, closeOnBackdrop, size },
      isOpen: false,
    });

    // Append to body
    document.body.appendChild(modal);

    console.log(`Modal "${id}" created successfully`);
    return modal;
  }

  /**
   * Create the modal DOM element with proper ARIA structure
   */
  createModalElement(id, config) {
    const { title, content, buttons, size } = config;

    // Main modal overlay
    const overlay = document.createElement("div");
    overlay.className = `modal-overlay modal-overlay--${size}`;
    overlay.id = `${id}-overlay`;
    overlay.setAttribute("role", "presentation");
    overlay.setAttribute("aria-hidden", "true");

    // Modal dialog
    const dialog = document.createElement("div");
    dialog.className = `modal-dialog modal-dialog--${size}`;
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", `${id}-title`);
    dialog.setAttribute("tabindex", "-1");

    // Modal content container
    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";

    // Header
    const header = document.createElement("div");
    header.className = "modal-header";

    const titleElement = document.createElement("h2");
    titleElement.className = "modal-title";
    titleElement.id = `${id}-title`;
    titleElement.textContent = title;

    const closeButton = document.createElement("button");
    closeButton.className = "modal-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close dialog");
    closeButton.innerHTML = "×";
    closeButton.addEventListener("click", () => this.closeModal(id));

    header.appendChild(titleElement);
    header.appendChild(closeButton);

    // Body
    const body = document.createElement("div");
    body.className = "modal-body";
    body.id = `${id}-content`;
    body.innerHTML = content;

    // Footer with buttons
    const footer = document.createElement("div");
    footer.className = "modal-footer";

    buttons.forEach((buttonConfig, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `modal-button modal-button--${
        buttonConfig.type || "secondary"
      }`;
      button.textContent = buttonConfig.text;

      if (buttonConfig.primary) {
        button.setAttribute("data-primary", "true");
      }

      if (buttonConfig.onClick) {
        button.addEventListener("click", (e) => {
          buttonConfig.onClick(e, id);
        });
      }

      if (buttonConfig.autoFocus) {
        button.setAttribute("data-autofocus", "true");
      }

      footer.appendChild(button);
    });

    // Assemble modal
    modalContent.appendChild(header);
    modalContent.appendChild(body);
    if (buttons.length > 0) {
      modalContent.appendChild(footer);
    }

    dialog.appendChild(modalContent);
    overlay.appendChild(dialog);

    // Event handlers
    this.attachModalEventHandlers(overlay, dialog, id, config);

    return overlay;
  }

  /**
   * Attach event handlers to modal
   */
  attachModalEventHandlers(overlay, dialog, id, config) {
    // Backdrop click handler
    if (config.closeOnBackdrop) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          this.closeModal(id);
        }
      });
    }

    // Prevent clicks inside dialog from bubbling to overlay
    dialog.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Open a modal dialog
   * @param {string} id - Modal identifier
   * @param {Object} data - Optional data to pass to the modal
   */
  openModal(id, data = {}) {
    const modalData = this.modals.get(id);
    if (!modalData) {
      console.error(
        `Modal "${id}" not found. Create it first using createModal()`
      );
      return;
    }

    if (modalData.isOpen) {
      console.warn(`Modal "${id}" is already open`);
      return;
    }

    // Store previously focused element
    this.previouslyFocused = document.activeElement;

    // Close any other open modal first
    if (this.activeModal) {
      this.closeModal(this.activeModal);
    }

    const { element, config } = modalData;

    // Show modal
    element.setAttribute("aria-hidden", "false");
    element.style.display = "flex";

    // Add to body and increment z-index for stacking
    this.modalCount++;
    element.style.zIndex = 1000 + this.modalCount;

    // Update state
    modalData.isOpen = true;
    this.activeModal = id;

    // Add global event listeners
    document.addEventListener("keydown", this.handleKeyDown);

    // Trap focus and set initial focus
    this.trapFocus(element);

    // Prevent body scroll
    document.body.style.overflow = "hidden";

    // Emit custom event
    this.emitModalEvent("modalOpened", { id, data });

    // Announce to screen readers
    this.announceModalOpened(config.title);

    console.log(`Modal "${id}" opened`);
  }

  /**
   * Close a modal dialog
   * @param {string} id - Modal identifier
   */
  closeModal(id) {
    const modalData = this.modals.get(id);
    if (!modalData || !modalData.isOpen) {
      return;
    }

    const { element } = modalData;

    // Hide modal
    element.setAttribute("aria-hidden", "true");
    element.style.display = "none";

    // Update state
    modalData.isOpen = false;
    this.activeModal = null;

    // Remove global event listeners
    document.removeEventListener("keydown", this.handleKeyDown);

    // Restore body scroll
    document.body.style.overflow = "";

    // Return focus to previously focused element
    if (this.previouslyFocused && this.previouslyFocused.focus) {
      this.previouslyFocused.focus();
      this.previouslyFocused = null;
    }

    // Emit custom event
    this.emitModalEvent("modalClosed", { id });

    console.log(`Modal "${id}" closed`);
  }

  /**
   * Update modal content
   * @param {string} id - Modal identifier
   * @param {string} content - New content HTML
   */
  setContent(id, content) {
    const modalData = this.modals.get(id);
    if (!modalData) {
      console.error(`Modal "${id}" not found`);
      return;
    }

    const contentElement = modalData.element.querySelector(`#${id}-content`);
    if (contentElement) {
      contentElement.innerHTML = content;
    }
  }

  /**
   * Update modal title
   * @param {string} id - Modal identifier
   * @param {string} title - New title text
   */
  setTitle(id, title) {
    const modalData = this.modals.get(id);
    if (!modalData) {
      console.error(`Modal "${id}" not found`);
      return;
    }

    const titleElement = modalData.element.querySelector(`#${id}-title`);
    if (titleElement) {
      titleElement.textContent = title;
    }
  }

  /**
   * Handle global keyboard events
   */
  handleKeyDown(e) {
    if (!this.activeModal) return;

    const modalData = this.modals.get(this.activeModal);
    if (!modalData || !modalData.config.closeOnEscape) return;

    // Close on Escape key
    if (e.key === "Escape") {
      e.preventDefault();
      this.closeModal(this.activeModal);
    }

    // Tab trapping is handled by trapFocus method
  }

  /**
   * Trap focus within the modal
   */
  trapFocus(modalElement) {
    const focusableElements = modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Set initial focus to first autofocus element or first focusable element
    const autofocusElement = modalElement.querySelector(
      '[data-autofocus="true"]'
    );
    const initialFocus = autofocusElement || firstFocusable;

    // Small delay to ensure modal is rendered
    setTimeout(() => {
      initialFocus.focus();
    }, 100);

    // Tab trapping
    modalElement.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    });
  }

  /**
   * Announce modal opened to screen readers
   */
  announceModalOpened(title) {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";
    announcement.textContent = `Dialog opened: ${title}`;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Emit custom modal events
   */
  emitModalEvent(eventName, detail) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
  }

  /**
   * Destroy a modal
   * @param {string} id - Modal identifier
   */
  destroyModal(id) {
    const modalData = this.modals.get(id);
    if (!modalData) return;

    // Close if open
    if (modalData.isOpen) {
      this.closeModal(id);
    }

    // Remove from DOM
    if (modalData.element.parentNode) {
      modalData.element.parentNode.removeChild(modalData.element);
    }

    // Remove from registry
    this.modals.delete(id);

    console.log(`Modal "${id}" destroyed`);
  }

  /**
   * Check if a modal is open
   * @param {string} id - Modal identifier
   * @returns {boolean}
   */
  isModalOpen(id) {
    const modalData = this.modals.get(id);
    return modalData ? modalData.isOpen : false;
  }

  /**
   * Get the currently active modal
   * @returns {string|null}
   */
  getActiveModal() {
    return this.activeModal;
  }

  /**
   * Close all open modals
   */
  closeAll() {
    this.modals.forEach((modalData, id) => {
      if (modalData.isOpen) {
        this.closeModal(id);
      }
    });
  }

  /**
   * Clean up - close all modals and remove event listeners
   */
  destroy() {
    this.closeAll();
    document.removeEventListener("keydown", this.handleKeyDown);
    console.log("ModalManager destroyed");
  }
}

window.ModalManager = ModalManager;

window.ModalManager = ModalManager;

window.ModalManager = ModalManager;

// Export to global scope
window.ModalManager = ModalManager;
