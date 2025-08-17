/**
 * Debug script for testing Nexus Accessibility Extension observer functionality
 *
 * To use this script:
 * 1. Load a page with the extension installed
 * 2. Open browser console
 * 3. Copy and paste this entire script
 * 4. Follow the instructions in the console output
 */

console.log("=== Nexus Accessibility Extension Observer Debug Script ===");

// Check if the extension is loaded
if (!window.ContentExtension) {
  console.error(
    "❌ ContentExtension not found. Is the extension loaded on this page?"
  );
} else {
  console.log("✅ ContentExtension found");

  // Check if observers module is available
  if (!window.ContentExtension.observers) {
    console.error("❌ Observers module not found");
  } else {
    console.log("✅ Observers module found");

    // Get observer stats
    const stats = window.ContentExtension.observers.getObserverStats();
    console.log("📊 Observer stats:", stats);

    // Test function to debug a specific element
    window.testNexusObserver = function (selector) {
      const element = document.querySelector(selector);
      if (!element) {
        console.error("❌ Element not found with selector:", selector);
        return;
      }

      console.log(
        "🔍 Testing observer on element:",
        element.tagName,
        element.id || element.className
      );

      // Check if it has aria-expanded
      const originalExpanded = element.getAttribute("aria-expanded");
      console.log("🏷️ Current aria-expanded:", originalExpanded);

      // Focus the element first (this should set up observers)
      console.log("🎯 Focusing element to set up observers...");
      element.focus();

      // Wait a moment, then test the observer
      setTimeout(() => {
        console.log("🧪 Testing observer...");
        window.ContentExtension.observers.testObserver(element);
      }, 500);
    };

    // Test function to manually create a combobox for testing
    window.createTestCombobox = function () {
      const existing = document.getElementById("nexus-test-combobox");
      if (existing) {
        existing.remove();
      }

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.top = "10px";
      container.style.right = "10px";
      container.style.zIndex = "10000";
      container.style.background = "white";
      container.style.border = "2px solid #683ab7";
      container.style.padding = "10px";
      container.style.borderRadius = "4px";
      container.innerHTML = `
                <label for="nexus-test-combobox">Test Combobox:</label>
                <input type="text" 
                       id="nexus-test-combobox" 
                       role="combobox"
                       aria-expanded="false"
                       aria-haspopup="listbox"
                       placeholder="Click to test">
                <button onclick="toggleTestCombobox()" style="margin-left: 5px;">Toggle</button>
                <button onclick="document.getElementById('nexus-test-container').remove()" style="margin-left: 5px;">Remove</button>
            `;
      container.id = "nexus-test-container";
      document.body.appendChild(container);

      window.toggleTestCombobox = function () {
        const combobox = document.getElementById("nexus-test-combobox");
        const current = combobox.getAttribute("aria-expanded") === "true";
        const newValue = !current;
        console.log(
          `🔄 Toggling combobox aria-expanded from ${current} to ${newValue}`
        );
        combobox.setAttribute("aria-expanded", newValue.toString());
      };

      console.log(
        "✅ Test combobox created! Try focusing it and then clicking Toggle."
      );

      return document.getElementById("nexus-test-combobox");
    };

    console.log(`
🚀 Debug functions available:

1. testNexusObserver('selector') - Test observer on any element
2. createTestCombobox() - Create a test combobox for debugging

Example usage:
- testNexusObserver('input[role="combobox"]')
- createTestCombobox()

The test combobox will appear in the top-right corner of the page.
Focus it, then click Toggle to test aria-expanded changes.
        `);
  }
}

// Also add a global function to check focus state
window.checkNexusFocusState = function () {
  if (window.ContentExtension?.events?.getFocusState) {
    const state = window.ContentExtension.events.getFocusState();
    console.log("🎯 Current focus state:", {
      lastFocusedElement:
        state.lastFocusedElement?.tagName +
        "#" +
        (state.lastFocusedElement?.id || "no-id"),
      inspectedElement:
        state.inspectedElement?.tagName +
        "#" +
        (state.inspectedElement?.id || "no-id"),
      suppressNextFocusIn: state.suppressNextFocusIn,
    });
    return state;
  }
  console.error("❌ Cannot access focus state - events module not available");
};

console.log("🔍 Type checkNexusFocusState() to see current focus state");
