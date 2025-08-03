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

  const toggle = document.getElementById("toggle-extension");
  // Load state from storage
  chrome.storage.sync.get(["extensionEnabled"], (result) => {
    const enabled = result.extensionEnabled !== false; // default ON
    toggle.checked = enabled;
    toggle.setAttribute("aria-checked", enabled ? "true" : "false");
  });

  toggle.addEventListener("change", () => {
    const enabled = toggle.checked;
    chrome.storage.sync.set({ extensionEnabled: enabled });
    toggle.setAttribute("aria-checked", enabled ? "true" : "false");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: enabled ? "ENABLE_EXTENSION" : "DISABLE_EXTENSION",
        });
      }
    });
  });

  // Fetch page info
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        func: () => ({
          title: document.title,
          lang: document.documentElement.lang || "not set",
        }),
      },
      (results) => {
        if (results && results[0] && results[0].result) {
          document.getElementById("page-title").textContent =
            results[0].result.title;
          document.getElementById("page-lang").textContent =
            results[0].result.lang;
        } else {
          document.getElementById("page-title").textContent = "Unavailable";
          document.getElementById("page-lang").textContent = "Unavailable";
        }
      }
    );
  });
});
