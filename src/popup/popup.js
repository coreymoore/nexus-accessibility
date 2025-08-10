const popup = document.getElementById("popup");
const accessibilityDataContainer =
  document.getElementById("accessibility-data");

function fetchAccessibilityData() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "getAccessibilityData" },
      (response) => {
        if (response && response.data) {
          displayAccessibilityData(response.data);
        } else {
          accessibilityDataContainer.textContent =
            "No accessibility data found.";
        }
      }
    );
  });
}

function displayAccessibilityData(data) {
  accessibilityDataContainer.textContent = JSON.stringify(data, null, 2);
}

document.addEventListener("DOMContentLoaded", () => {
  fetchAccessibilityData();

  const toggleInput = document.getElementById("toggle-extension");
  const toggleLabel = document.getElementById("toggle-label");
  const miniModeInput = document.getElementById("toggle-mini-mode");
  const miniModeLabel = document.getElementById("mini-mode-label");

  // Get initial state
  chrome.storage.sync.get(
    { extensionEnabled: true, miniMode: false },
    (data) => {
      toggleInput.checked = data.extensionEnabled;
      updateToggleLabel(data.extensionEnabled);
      miniModeInput.checked = data.miniMode;
      updateMiniModeLabel(data.miniMode);
    }
  );

  // Handle toggle changes
  toggleInput.addEventListener("change", (e) => {
    const isEnabled = e.target.checked;
    chrome.storage.sync.set({ extensionEnabled: isEnabled });
    updateToggleLabel(isEnabled);

    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: isEnabled ? "ENABLE_EXTENSION" : "DISABLE_EXTENSION",
        });
      }
    });
  });

  miniModeInput.addEventListener("change", (e) => {
    const miniMode = e.target.checked;
    chrome.storage.sync.set({ miniMode });
    updateMiniModeLabel(miniMode);
    // Send message to content script to update mini mode
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          miniMode,
        });
      }
    });
  });

  function updateToggleLabel(isEnabled) {
    toggleLabel.textContent = isEnabled
      ? "Nexus Inspector Enabled"
      : "Nexus Inspector Disabled";
  }

  function updateMiniModeLabel(miniMode) {
    miniModeLabel.textContent = miniMode ? "Mini Mode (On)" : "Mini Mode (Off)";
  }

  // Update page info
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const title = document.getElementById("page-title");
      const lang = document.getElementById("page-lang");
      title.textContent = tabs[0].title || "No title";
      lang.textContent = document.documentElement?.lang || "Not specified";
    }
  });

  // Accessible Tabs Logic (WAI-ARIA APG)
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));
  function activateTab(tab, persist = true) {
    tabs.forEach((t, i) => {
      const selected = t === tab;
      t.setAttribute("aria-selected", selected ? "true" : "false");
      t.tabIndex = selected ? 0 : -1;
      panels[i].hidden = !selected;
    });
    tab.focus();
    if (persist) {
      chrome.storage.sync.set({ nexusSelectedTab: tabs.indexOf(tab) });
    }
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (e) => {
      let idx = tabs.indexOf(tab);
      if (e.key === "ArrowRight" || e.key === "Right") {
        e.preventDefault();
        activateTab(tabs[(idx + 1) % tabs.length]);
      } else if (e.key === "ArrowLeft" || e.key === "Left") {
        e.preventDefault();
        activateTab(tabs[(idx - 1 + tabs.length) % tabs.length]);
      } else if (e.key === "Home") {
        e.preventDefault();
        activateTab(tabs[0]);
      } else if (e.key === "End") {
        e.preventDefault();
        activateTab(tabs[tabs.length - 1]);
      }
    });
  });
  // Restore selected tab from storage, default to first tab
  chrome.storage.sync.get({ nexusSelectedTab: 0 }, (data) => {
    const idx = Math.max(0, Math.min(tabs.length - 1, data.nexusSelectedTab));
    activateTab(tabs[idx], false);
  });
});
