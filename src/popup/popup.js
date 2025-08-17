import { chromeAsync } from "../utils/chromeAsync.js";
import { popupStateManager } from "./nexus-popup-state.js";

const popup = document.getElementById("popup");
let activeTabId = null;

async function safeSendMessage(tabId, message) {
  try {
    return await chromeAsync.tabs.sendMessage(tabId, message);
  } catch (e) {
    return { error: e.message };
  }
}

// Tab management for popup
function setupTabs() {
  const tabs = document.querySelectorAll('[role="tab"]');
  const tabpanels = document.querySelectorAll('[role="tabpanel"]');

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      // Update tab states
      tabs.forEach((t, i) => {
        const isSelected = i === index;
        t.setAttribute("aria-selected", isSelected);
        t.tabIndex = isSelected ? 0 : -1;
      });

      // Update tabpanel states
      tabpanels.forEach((panel, i) => {
        panel.hidden = i !== index;
      });

      // Persist selected tab
      chromeAsync.storage.sync
        .set({ nexusSelectedTab: index })
        .catch((error) => {
          console.error("Error saving selected tab:", error);
        });
    });

    // Keyboard navigation
    tab.addEventListener("keydown", (e) => {
      let nextIndex = -1;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        nextIndex = (index + 1) % tabs.length;
        e.preventDefault();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
        e.preventDefault();
      } else if (e.key === "Home") {
        nextIndex = 0;
        e.preventDefault();
      } else if (e.key === "End") {
        nextIndex = tabs.length - 1;
        e.preventDefault();
      }

      if (nextIndex >= 0) {
        tabs[nextIndex].click();
        tabs[nextIndex].focus();
      }
    });
  });

  // Restore selected tab
  chromeAsync.storage.sync
    .get({ nexusSelectedTab: 0 })
    .then((data) => {
      const index = Math.max(
        0,
        Math.min(tabs.length - 1, data.nexusSelectedTab)
      );
      if (tabs[index]) {
        tabs[index].click();
      }
    })
    .catch((error) => {
      console.error("Error restoring selected tab:", error);
    });
}

// Legacy inspector state control (maintain backward compatibility)
function setupLegacyInspectorControls() {
  const stateRadios = document.querySelectorAll(
    'input[name="inspector-state"]'
  );

  // Get initial state from storage
  chromeAsync.storage.sync
    .get({ inspectorState: "on" })
    .then((data) => {
      const currentState = data.inspectorState;
      const stateRadio = document.querySelector(
        `input[name="inspector-state"][value="${currentState}"]`
      );
      if (stateRadio) {
        stateRadio.checked = true;
      }
    })
    .catch((error) => {
      console.error("Error loading inspector state:", error);
      const defaultRadio = document.querySelector(
        'input[name="inspector-state"][value="on"]'
      );
      if (defaultRadio) {
        defaultRadio.checked = true;
      }
    });

  // Handle state changes
  stateRadios.forEach((radio) => {
    radio.addEventListener("change", async (e) => {
      const newState = e.target.value;

      try {
        await chromeAsync.storage.sync.set({ inspectorState: newState });

        if (activeTabId) {
          await safeSendMessage(activeTabId, {
            action: "updateInspectorState",
            state: newState,
          });
        }
      } catch (error) {
        console.error("Error updating inspector state:", error);
      }
    });
  });
}

// Load page information
async function loadPageInfo() {
  try {
    const tabs = await chromeAsync.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tabs[0]) {
      activeTabId = tabs[0].id;

      // Update page info
      const titleElement = document.getElementById("page-title");
      const langElement = document.getElementById("page-lang");

      if (titleElement) {
        titleElement.textContent = tabs[0].title || "Unknown";
      }

      // Try to get language from content script
      try {
        const response = await safeSendMessage(activeTabId, {
          action: "getPageInfo",
        });

        if (response && !response.error && langElement) {
          langElement.textContent = response.language || "Not specified";
        }
      } catch (error) {
        if (langElement) {
          langElement.textContent = "Unable to detect";
        }
      }
    }
  } catch (error) {
    console.error("Error loading page info:", error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Initialize state manager
    await popupStateManager.initialize();

    console.log("Popup state manager initialized");

    // Set up UI components
    setupTabs();
    setupLegacyInspectorControls();

    // Load page information
    await loadPageInfo();

    // State manager should handle the rest of the UI updates
    console.log("Popup initialization complete");
  } catch (error) {
    console.error("Popup initialization error:", error);

    // Fallback: still set up basic functionality
    setupTabs();
    setupLegacyInspectorControls();
    await loadPageInfo();
  }
});

// Handle popup close
window.addEventListener("beforeunload", () => {
  if (popupStateManager.isInitialized) {
    popupStateManager.cleanup();
  }
});

// Export for debugging
window.popupStateManager = popupStateManager;
