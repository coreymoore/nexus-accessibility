import { chromeAsync } from "../utils/chromeAsync.js";

const popup = document.getElementById("popup");

async function safeSendMessage(tabId, message) {
  try {
    return await chromeAsync.tabs.sendMessage(tabId, message);
  } catch (e) {
    return { error: e.message };
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const toggleInput = document.getElementById("toggle-extension");
  const toggleLabel = document.getElementById("toggle-label");
  const miniModeInput = document.getElementById("toggle-mini-mode");
  const miniModeLabel = document.getElementById("mini-mode-label");

  // Get initial state via promise wrappers
  try {
    const data = await chromeAsync.storage.sync.get({
      extensionEnabled: true,
      miniMode: false,
    });
    toggleInput.checked = data.extensionEnabled;
    updateToggleLabel(data.extensionEnabled);
    miniModeInput.checked = data.miniMode;
    updateMiniModeLabel(data.miniMode);
  } catch {}

  // Handle enabled toggle
  toggleInput.addEventListener("change", async (e) => {
    const isEnabled = e.target.checked;
    try {
      await chromeAsync.storage.sync.set({ extensionEnabled: isEnabled });
    } catch {}
    updateToggleLabel(isEnabled);
    try {
      const tabs = await chromeAsync.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]) {
        await safeSendMessage(tabs[0].id, {
          type: isEnabled ? "ENABLE_EXTENSION" : "DISABLE_EXTENSION",
        });
      }
    } catch {}
  });

  // Handle mini mode toggle
  miniModeInput.addEventListener("change", async (e) => {
    const miniMode = e.target.checked;
    try {
      await chromeAsync.storage.sync.set({ miniMode });
    } catch {}
    updateMiniModeLabel(miniMode);
    try {
      const tabs = await chromeAsync.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]) {
        await safeSendMessage(tabs[0].id, { miniMode });
      }
    } catch {}
  });

  function updateToggleLabel(isEnabled) {
    toggleLabel.textContent = isEnabled
      ? "Nexus Inspector Enabled"
      : "Nexus Inspector Disabled";
  }

  function updateMiniModeLabel(miniMode) {
    miniModeLabel.textContent = miniMode ? "Mini Mode (On)" : "Mini Mode (Off)";
  }

  // Page info
  try {
    const tabs = await chromeAsync.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tabs[0]) {
      const title = document.getElementById("page-title");
      const lang = document.getElementById("page-lang");
      title.textContent = tabs[0].title || "No title";
      lang.textContent = document.documentElement?.lang || "Not specified";
    }
  } catch {}

  // Accessible Tabs (WAI-ARIA APG pattern)
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
      chromeAsync.storage.sync.set({ nexusSelectedTab: tabs.indexOf(tab) });
    }
  }
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (e) => {
      const idx = tabs.indexOf(tab);
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

  // Restore selected tab
  try {
    const data = await chromeAsync.storage.sync.get({ nexusSelectedTab: 0 });
    const idx = Math.max(0, Math.min(tabs.length - 1, data.nexusSelectedTab));
    activateTab(tabs[idx], false);
  } catch {}
});
