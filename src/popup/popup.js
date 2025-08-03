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

  // Get initial state
  chrome.storage.sync.get({ extensionEnabled: true }, (data) => {
    toggleInput.checked = data.extensionEnabled;
    updateToggleLabel(data.extensionEnabled);
  });

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

  function updateToggleLabel(isEnabled) {
    toggleLabel.textContent = isEnabled
      ? "Disable Nexus Inspector"
      : "Enable Nexus Inspector";
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
});
