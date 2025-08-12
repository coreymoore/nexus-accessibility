/**
 * Accessibility Utilities
 * Priority 3: Extension accessibility improvements
 *
 * Provides utilities for making the extension itself more accessible,
 * including focus management, ARIA support, and keyboard navigation.
 */

import { logger } from "./logger.js";

class AccessibilityUtils {
  constructor() {
    this.log = logger.tooltip;
    this.focusStack = [];
    this.lastFocusedElement = null;
    this.keyboardListeners = new Map();
  }

  /**
   * Improved focus management with better restoration
   * @param {HTMLElement} element - Element to focus
   * @param {Object} options - Focus options
   */
  manageFocus(element, options = {}) {
    const { savePrevious = true, preventScroll = false } = options;

    if (savePrevious && document.activeElement) {
      this.saveFocus(document.activeElement);
    }

    try {
      element.focus({ preventScroll });
      this.log.debug("Focus set to element", {
        tag: element.tagName,
        id: element.id,
      });
    } catch (error) {
      this.log.warn("Failed to set focus", { error: error.message });
    }
  }

  /**
   * Save current focus to stack for later restoration
   * @param {HTMLElement} element - Element to save
   */
  saveFocus(element) {
    if (element && element !== document.body) {
      this.focusStack.push({
        element,
        timestamp: Date.now(),
        selector: this.generateSelector(element),
      });

      // Limit stack size
      if (this.focusStack.length > 10) {
        this.focusStack.shift();
      }
    }
  }

  /**
   * Restore previous focus from stack
   * @returns {boolean} True if focus was restored
   */
  restoreFocus() {
    while (this.focusStack.length > 0) {
      const focusData = this.focusStack.pop();

      // Check if element still exists and is focusable
      if (focusData.element && document.contains(focusData.element)) {
        try {
          focusData.element.focus();
          this.log.debug("Focus restored to saved element");
          return true;
        } catch (error) {
          this.log.warn("Failed to restore focus to saved element", {
            error: error.message,
          });
        }
      } else {
        // Try to find element by selector
        try {
          const element = document.querySelector(focusData.selector);
          if (element) {
            element.focus();
            this.log.debug("Focus restored using selector");
            return true;
          }
        } catch (error) {
          this.log.warn("Failed to restore focus using selector", {
            selector: focusData.selector,
            error: error.message,
          });
        }
      }
    }

    // Fallback to body
    document.body.focus();
    this.log.debug("Focus restored to body as fallback");
    return false;
  }

  /**
   * Generate a unique selector for an element
   * @param {HTMLElement} element - Element to generate selector for
   * @returns {string} CSS selector
   */
  generateSelector(element) {
    if (!element || element === document.body) {
      return "body";
    }

    // Try ID first
    if (element.id) {
      return `#${element.id}`;
    }

    // Build path with classes and position
    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.className) {
        const classes = current.className.split(" ").filter((c) => c.trim());
        if (classes.length > 0) {
          selector += "." + classes.join(".");
        }
      }

      // Add nth-child if needed for uniqueness
      const siblings = Array.from(current.parentNode?.children || []).filter(
        (el) => el.tagName === current.tagName
      );

      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }

      path.unshift(selector);
      current = current.parentNode;
    }

    return path.join(" > ");
  }

  /**
   * Create a keyboard navigation handler
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Navigation options
   * @returns {Function} Cleanup function
   */
  createKeyboardNavigation(container, options = {}) {
    const {
      selector = "[tabindex], button, input, select, textarea, a[href]",
      loop = true,
      trapFocus = false,
    } = options;

    const handleKeyDown = (event) => {
      const { key, shiftKey } = event;

      if (key === "Tab") {
        const focusableElements = Array.from(
          container.querySelectorAll(selector)
        ).filter((el) => !el.disabled && !el.hidden);

        if (focusableElements.length === 0) return;

        const currentIndex = focusableElements.indexOf(document.activeElement);
        let nextIndex;

        if (shiftKey) {
          nextIndex = currentIndex - 1;
          if (nextIndex < 0) {
            nextIndex = loop ? focusableElements.length - 1 : 0;
          }
        } else {
          nextIndex = currentIndex + 1;
          if (nextIndex >= focusableElements.length) {
            nextIndex = loop ? 0 : focusableElements.length - 1;
          }
        }

        if (
          trapFocus ||
          loop ||
          (nextIndex >= 0 && nextIndex < focusableElements.length)
        ) {
          event.preventDefault();
          focusableElements[nextIndex].focus();
        }
      } else if (key === "Escape") {
        // Allow escape to bubble up for modal close, etc.
        this.log.debug("Escape key pressed in keyboard navigation");
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    this.keyboardListeners.set(container, handleKeyDown);

    // Return cleanup function
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      this.keyboardListeners.delete(container);
    };
  }

  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {string} priority - aria-live priority ('polite' or 'assertive')
   */
  announceToScreenReader(message, priority = "polite") {
    const announcer = this.getOrCreateAnnouncer(priority);

    // Clear and set message
    announcer.textContent = "";
    setTimeout(() => {
      announcer.textContent = message;
      this.log.debug("Screen reader announcement", { message, priority });
    }, 10);
  }

  /**
   * Get or create aria-live announcer element
   * @param {string} priority - aria-live priority
   * @returns {HTMLElement} Announcer element
   */
  getOrCreateAnnouncer(priority = "polite") {
    const id = `nexus-announcer-${priority}`;
    let announcer = document.getElementById(id);

    if (!announcer) {
      announcer = document.createElement("div");
      announcer.id = id;
      announcer.setAttribute("aria-live", priority);
      announcer.setAttribute("aria-atomic", "true");
      announcer.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      document.body.appendChild(announcer);
    }

    return announcer;
  }

  /**
   * Add high contrast support detection
   * @returns {boolean} True if high contrast mode is active
   */
  isHighContrastMode() {
    // Create a test element to detect high contrast
    const testEl = document.createElement("div");
    testEl.style.cssText = `
      position: absolute;
      left: -9999px;
      color: rgb(31, 32, 33);
      background-color: rgb(255, 255, 255);
    `;
    document.body.appendChild(testEl);

    const computed = window.getComputedStyle(testEl);
    const isHighContrast = computed.color !== "rgb(31, 32, 33)";

    document.body.removeChild(testEl);
    return isHighContrast;
  }

  /**
   * Add reduced motion support detection
   * @returns {boolean} True if user prefers reduced motion
   */
  prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /**
   * Create accessible tooltip with proper ARIA
   * @param {HTMLElement} trigger - Trigger element
   * @param {string} content - Tooltip content
   * @param {Object} options - Tooltip options
   * @returns {Object} Tooltip management object
   */
  createAccessibleTooltip(trigger, content, options = {}) {
    const { placement = "top", delay = 500, role = "tooltip" } = options;

    const tooltipId = `nexus-tooltip-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    let tooltip = null;
    let showTimeout = null;
    let hideTimeout = null;

    const show = () => {
      if (tooltip) return;

      tooltip = document.createElement("div");
      tooltip.id = tooltipId;
      tooltip.role = role;
      tooltip.textContent = content;
      tooltip.className = "nexus-accessible-tooltip";

      // Position tooltip
      document.body.appendChild(tooltip);
      this.positionTooltip(tooltip, trigger, placement);

      // Update ARIA
      trigger.setAttribute("aria-describedby", tooltipId);

      this.log.debug("Accessible tooltip shown", { tooltipId, content });
    };

    const hide = () => {
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
        trigger.removeAttribute("aria-describedby");
        this.log.debug("Accessible tooltip hidden", { tooltipId });
      }
    };

    const showWithDelay = () => {
      clearTimeout(hideTimeout);
      showTimeout = setTimeout(show, delay);
    };

    const hideWithDelay = () => {
      clearTimeout(showTimeout);
      hideTimeout = setTimeout(hide, 100);
    };

    // Event listeners
    trigger.addEventListener("mouseenter", showWithDelay);
    trigger.addEventListener("mouseleave", hideWithDelay);
    trigger.addEventListener("focus", show);
    trigger.addEventListener("blur", hide);

    return {
      show,
      hide,
      destroy: () => {
        clearTimeout(showTimeout);
        clearTimeout(hideTimeout);
        hide();
        trigger.removeEventListener("mouseenter", showWithDelay);
        trigger.removeEventListener("mouseleave", hideWithDelay);
        trigger.removeEventListener("focus", show);
        trigger.removeEventListener("blur", hide);
      },
    };
  }

  /**
   * Position tooltip relative to trigger
   * @param {HTMLElement} tooltip - Tooltip element
   * @param {HTMLElement} trigger - Trigger element
   * @param {string} placement - Placement direction
   */
  positionTooltip(tooltip, trigger, placement) {
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let top, left;

    switch (placement) {
      case "top":
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case "bottom":
        top = triggerRect.bottom + 8;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case "left":
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - 8;
        break;
      case "right":
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + 8;
        break;
      default:
        top = triggerRect.bottom + 8;
        left = triggerRect.left;
    }

    // Keep tooltip within viewport
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    top = Math.max(8, Math.min(top, viewport.height - tooltipRect.height - 8));
    left = Math.max(8, Math.min(left, viewport.width - tooltipRect.width - 8));

    tooltip.style.position = "fixed";
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.style.zIndex = "10000";
  }

  /**
   * Clean up all keyboard listeners
   */
  cleanup() {
    for (const [container, handler] of this.keyboardListeners) {
      container.removeEventListener("keydown", handler);
    }
    this.keyboardListeners.clear();
    this.focusStack = [];
  }
}

// Create global accessibility utils instance
const accessibilityUtils = new AccessibilityUtils();

export { AccessibilityUtils };
export const accessibility = accessibilityUtils;
