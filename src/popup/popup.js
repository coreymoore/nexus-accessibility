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
  const stateRadios = document.querySelectorAll(
    'input[name="inspector-state"]'
  );

  // Get initial state from storage (migration should be complete)
  try {
    const data = await chromeAsync.storage.sync.get({
      inspectorState: "on", // Default to "on" if not set
    });
    const currentState = data.inspectorState;

    // Set the appropriate radio button
    const stateRadio = document.querySelector(
      `input[name="inspector-state"][value="${currentState}"]`
    );
    if (stateRadio) {
      stateRadio.checked = true;
    }
  } catch (error) {
    console.error("Error loading inspector state:", error);
    // Default to "on" if there's an error
    const defaultRadio = document.querySelector(
      'input[name="inspector-state"][value="on"]'
    );
    if (defaultRadio) {
      defaultRadio.checked = true;
    }
  }

  // Handle state change
  stateRadios.forEach((radio) => {
    radio.addEventListener("change", async (e) => {
      const newState = e.target.value;

      try {
        await chromeAsync.storage.sync.set({ inspectorState: newState });
      } catch (error) {
        console.error("Error saving inspector state:", error);
        return;
      }

      try {
        const tabs = await chromeAsync.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs[0]) {
          await safeSendMessage(tabs[0].id, {
            type: "INSPECTOR_STATE_CHANGE",
            inspectorState: newState,
          });
        }
      } catch (error) {
        console.error("Error sending state change message:", error);
      }
    });
  });

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
