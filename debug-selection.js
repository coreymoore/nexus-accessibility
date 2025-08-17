/**
 * Debug script for testing text selection in Nexus Inspector
 *
 * To use this script:
 * 1. Load a page with the extension installed
 * 2. Focus on an element to trigger the inspector
 * 3. Open browser console
 * 4. Copy and paste this entire script
 * 5. Run the debug functions
 */

console.log("=== Nexus Inspector Text Selection Debug ===");

// Function to test if text selection is working
window.testInspectorSelection = function () {
  const inspector = document.querySelector(".nexus-accessibility-ui-inspector");
  if (!inspector) {
    console.error("❌ Inspector not found. Focus on an element first.");
    return;
  }

  console.log("✅ Inspector found:", inspector);

  // Check computed styles
  const inspectorStyles = window.getComputedStyle(inspector);
  const bodyEl = inspector.querySelector(
    ".nexus-accessibility-ui-inspector-body"
  );
  const srEl = inspector.querySelector(".nexus-accessibility-ui-inspector-sr");

  console.log("📊 Inspector container styles:", {
    userSelect: inspectorStyles.userSelect,
    webkitUserSelect: inspectorStyles.webkitUserSelect,
    pointerEvents: inspectorStyles.pointerEvents,
    position: inspectorStyles.position,
  });

  if (bodyEl) {
    const bodyStyles = window.getComputedStyle(bodyEl);
    console.log("📊 Inspector body styles:", {
      userSelect: bodyStyles.userSelect,
      webkitUserSelect: bodyStyles.webkitUserSelect,
      pointerEvents: bodyStyles.pointerEvents,
    });
  }

  if (srEl) {
    const srStyles = window.getComputedStyle(srEl);
    console.log("📊 Screen reader section styles:", {
      userSelect: srStyles.userSelect,
      webkitUserSelect: srStyles.webkitUserSelect,
      pointerEvents: srStyles.pointerEvents,
    });
  }

  // Test by attempting programmatic selection
  if (srEl && srEl.textContent) {
    console.log("🧪 Testing programmatic selection...");
    const range = document.createRange();
    const selection = window.getSelection();

    try {
      selection.removeAllRanges();
      range.selectNodeContents(srEl);
      selection.addRange(range);

      const selectedText = selection.toString();
      console.log(
        "✅ Programmatic selection successful:",
        selectedText.substring(0, 50) + "..."
      );

      // Clear selection after test
      setTimeout(() => {
        selection.removeAllRanges();
      }, 2000);
    } catch (error) {
      console.error("❌ Programmatic selection failed:", error);
    }
  }

  // Check for any event listeners that might interfere
  console.log(
    "🔍 Inspector event listeners (if any):",
    getEventListeners
      ? getEventListeners(inspector)
      : "getEventListeners not available"
  );

  return { inspector, bodyEl, srEl };
};

// Function to force enable selection
window.forceEnableSelection = function () {
  const inspector = document.querySelector(".nexus-accessibility-ui-inspector");
  if (!inspector) {
    console.error("❌ Inspector not found.");
    return;
  }

  console.log("🔧 Force enabling selection...");

  // Apply styles directly via JavaScript
  inspector.style.userSelect = "text";
  inspector.style.webkitUserSelect = "text";
  inspector.style.mozUserSelect = "text";
  inspector.style.pointerEvents = "all";

  // Apply to all child elements
  const allElements = inspector.querySelectorAll("*");
  allElements.forEach((el) => {
    if (!el.classList.contains("nexus-accessibility-ui-inspector-close")) {
      el.style.userSelect = "text";
      el.style.webkitUserSelect = "text";
      el.style.mozUserSelect = "text";
    }
  });

  console.log("✅ Force enabled selection on inspector and all children");

  // Test selection again
  setTimeout(() => {
    testInspectorSelection();
  }, 100);
};

// Function to check for interfering CSS
window.checkInterferingCSS = function () {
  const inspector = document.querySelector(".nexus-accessibility-ui-inspector");
  if (!inspector) {
    console.error("❌ Inspector not found.");
    return;
  }

  console.log("🔍 Checking for interfering CSS rules...");

  // Get all applied CSS rules
  const allRules = [];
  for (let i = 0; i < document.styleSheets.length; i++) {
    try {
      const sheet = document.styleSheets[i];
      const rules = sheet.cssRules || sheet.rules;
      for (let j = 0; j < rules.length; j++) {
        const rule = rules[j];
        if (rule.selectorText && rule.selectorText.includes("inspector")) {
          allRules.push({
            selector: rule.selectorText,
            cssText: rule.cssText,
          });
        }
      }
    } catch (e) {
      // Skip cross-origin stylesheets
    }
  }

  console.log("📋 Inspector-related CSS rules:", allRules);
  return allRules;
};

console.log(`
🚀 Debug functions available:

1. testInspectorSelection() - Check current selection state and test programmatic selection
2. forceEnableSelection() - Force enable text selection via JavaScript
3. checkInterferingCSS() - Look for CSS rules that might interfere with selection

Instructions:
1. Focus on an element to show the inspector
2. Try to select text in the inspector manually
3. If that doesn't work, run testInspectorSelection()
4. If needed, run forceEnableSelection() to override any issues
`);
