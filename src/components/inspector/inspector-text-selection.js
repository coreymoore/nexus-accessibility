/**
 * Inspector Text Selection Enabler
 *
 * This module ensures that text selection works properly in the Nexus Inspector
 * by adding the necessary event handlers and CSS overrides.
 */

(function () {
  "use strict";

  /**
   * Enable text selection for an inspector element
   * @param {HTMLElement} inspector - The inspector element
   */
  function enableTextSelection(inspector) {
    if (!inspector) return;

    console.log("[Inspector Selection] Enabling text selection for inspector");

    // Apply CSS styles directly to override any conflicting rules
    const style = inspector.style;
    style.userSelect = "text";
    style.webkitUserSelect = "text";
    style.mozUserSelect = "text";
    style.msUserSelect = "text";

    // Apply to all child elements except close button
    const allElements = inspector.querySelectorAll(
      "*:not(.nexus-accessibility-ui-inspector-close)"
    );
    allElements.forEach((el) => {
      el.style.userSelect = "text";
      el.style.webkitUserSelect = "text";
      el.style.mozUserSelect = "text";
      el.style.msUserSelect = "text";
    });

    // Ensure close button remains non-selectable
    const closeButton = inspector.querySelector(
      ".nexus-accessibility-ui-inspector-close"
    );
    if (closeButton) {
      closeButton.style.userSelect = "none";
      closeButton.style.webkitUserSelect = "none";
      closeButton.style.mozUserSelect = "none";
      closeButton.style.msUserSelect = "none";
    }

    // Add event listeners to prevent any interference with text selection
    inspector.addEventListener(
      "selectstart",
      function (e) {
        // Allow selectstart events unless they're on the close button
        if (
          e.target.classList.contains("nexus-accessibility-ui-inspector-close")
        ) {
          e.preventDefault();
          e.stopPropagation();
        }
        // For all other elements, allow the event to proceed
      },
      true
    );

    inspector.addEventListener(
      "mousedown",
      function (e) {
        // Don't interfere with mousedown events that start text selection
        // Only prevent on close button
        if (
          e.target.classList.contains("nexus-accessibility-ui-inspector-close")
        ) {
          return; // Let the close button handle its own events
        }
      },
      true
    ); // Ensure drag events don't interfere with text selection
    inspector.addEventListener(
      "dragstart",
      function (e) {
        // Allow drag only if it's actually selected text being dragged
        if (window.getSelection().toString().length === 0) {
          e.preventDefault();
        }
      },
      true
    );

    console.log("[Inspector Selection] Text selection enabled for inspector");
  }

  /**
   * Observe for inspector creation and enable text selection
   */
  function observeInspectorCreation() {
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (
              node.classList &&
              node.classList.contains("nexus-accessibility-ui-inspector")
            ) {
              // Inspector was created, enable text selection
              setTimeout(() => enableTextSelection(node), 0);
            } else if (node.querySelector) {
              // Check if an inspector was added as a child
              const inspector = node.querySelector(
                ".nexus-accessibility-ui-inspector"
              );
              if (inspector) {
                setTimeout(() => enableTextSelection(inspector), 0);
              }
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also check if inspector already exists
    const existingInspector = document.querySelector(
      ".nexus-accessibility-ui-inspector"
    );
    if (existingInspector) {
      enableTextSelection(existingInspector);
    }
  }

  // Start observing when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeInspectorCreation);
  } else {
    observeInspectorCreation();
  }

  // Export for manual testing
  window.enableInspectorTextSelection = enableTextSelection;
})();
