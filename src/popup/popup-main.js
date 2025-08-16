/**
 * Main Popup Controller - Orchestrates all modules
 */
class PopupController {
  constructor() {
    this.accessibilityDB = null;
    this.scanManager = null;
    this.uiManager = null;
    this.tabManager = null;
    this.reportsManager = null;
  }

  async init() {
    try {
      console.log("Initializing popup controller...");

      // Initialize database first
      await this.initializeDatabase();

      // Initialize all managers
      this.initializeManagers();

      // Populate page info (title & language)
      await this.updatePageInfo();

      // Normalize shared Create Report buttons early
      if (window.CreateReportButtons && this.accessibilityDB) {
        try {
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          const hasReports = tab?.url
            ? await this.accessibilityDB.hasReportsForUrl(tab.url)
            : false;
          window.CreateReportButtons.refresh({
            onCreate: () => this.reportsManager.handleNewReport(),
            onView: () => this.reportsManager.handleViewReport(),
            hasReport: hasReports,
          });
          if (window.reinitSplitMenus) {
            setTimeout(() => {
              try {
                window.reinitSplitMenus();
              } catch (e) {}
            }, 0);
          }
        } catch (e) {
          window.CreateReportButtons.refresh({
            onCreate: () => this.reportsManager.handleNewReport(),
          });
        }
      }

      // Re-run page info update when tabs inside popup indicate main panel activated
      document.addEventListener("tabActivated", (e) => {
        if (e.detail?.panelId === "tabpanel-main") {
          this.updatePageInfo();
        }
      });

      // Get cached scan results when popup opens
      this.getCachedScanResults();

      // Set up extension toggle functionality
      this.setupNexusInspectorControl();

      console.log("Popup controller initialized successfully");

      // Initialize split button menus (after DOM and managers ready)
      if (window.initSplitMenus) {
        try {
          window.initSplitMenus();
        } catch (e) {
          console.warn("initSplitMenus failed", e);
        }
      }

      // Check if Reports tab is initially active and load table if needed
      setTimeout(() => {
        const reportsPanel = document.getElementById("tabpanel-reports");
        if (
          reportsPanel &&
          reportsPanel.style.display !== "none" &&
          !reportsPanel.hasAttribute("hidden")
        ) {
          console.log(
            "[PopupController] Reports tab is initially active, loading table"
          );
          this.reportsManager.loadReportsTable();
        }
      }, 200);
    } catch (error) {
      console.error("Failed to initialize popup controller:", error);
    }
  }

  async updatePageInfo() {
    const titleEl = document.getElementById("page-title");
    const langEl = document.getElementById("page-lang");
    if (!titleEl && !langEl) return; // Nothing to update

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (titleEl) {
        const tabTitle =
          tab?.title && tab.title.trim() ? tab.title.trim() : "(no title)";
        titleEl.textContent = tabTitle;
      }

      if (langEl) {
        let pageLang = "(no language)";
        if (tab && tab.id) {
          try {
            const [resultObj] = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => (document.documentElement.lang || "").trim(),
            });
            if (
              resultObj &&
              typeof resultObj.result === "string" &&
              resultObj.result
            ) {
              pageLang = resultObj.result;
            }
          } catch (injErr) {
            // Restricted pages or injection failure - keep fallback
          }
        }
        langEl.textContent = pageLang || "(no language)";
      }
    } catch (err) {
      if (titleEl) titleEl.textContent = "(no title)";
      if (langEl) langEl.textContent = "(no language)";
    }
  }

  async initializeDatabase() {
    try {
      this.accessibilityDB = new AccessibilityDatabase();
      await this.accessibilityDB.init();
      console.log("IndexedDB initialized successfully");
    } catch (error) {
      console.error("Failed to initialize IndexedDB:", error);
      throw error;
    }
  }

  initializeManagers() {
    // Initialize managers
    this.scanManager = new ScanManager();
    this.uiManager = new UIManager();
    this.tabManager = new TabManager();
    this.reportsManager = new ReportsManager();

    // Set database references
    this.scanManager.setDatabase(this.accessibilityDB);
    this.reportsManager.setDatabase(this.accessibilityDB);

    // Initialize managers
    this.tabManager.init();
    this.reportsManager.init();

    // Make managers available globally for inter-module communication
    window.scanManager = this.scanManager;
    window.uiManager = this.uiManager;
    window.tabManager = this.tabManager;
    window.reportsManager = this.reportsManager;
  }

  async getCachedScanResults() {
    console.log("[PopupMain] getCachedScanResults() called");
    try {
      const scanResults = await this.scanManager.getCachedScanResults();
      console.log("[PopupMain] Scan results received:", scanResults);

      if (scanResults) {
        console.log("[PopupMain] Calling displayAlerts with results");
        this.uiManager.displayAlerts(scanResults);
      } else {
        console.log("[PopupMain] No scan results - showing blur with message");
        // No scan results available - show blur with inspector message
        this.uiManager.updateOverviewSummary(null);
        this.uiManager.showError(
          "alerts-content",
          "No accessibility scan data available. Enable the inspector to scan for accessibility alerts."
        );
      }
    } catch (error) {
      console.error("Failed to get cached scan results:", error);
      // Show blur with inspector message on error too
      this.uiManager.updateOverviewSummary(null);
      this.uiManager.showError(
        "alerts-content",
        "Unable to load scan results. Enable the inspector to scan for accessibility alerts."
      );
    }
  }

  setupNexusInspectorControl() {
    const inspectorControl = document.getElementById("nexus-inspector-control");
    if (!inspectorControl) {
      console.warn("Nexus inspector control not found");
      return;
    }

    const updateState = (inspectorMode) => {
      console.log("[PopupMain] updateState called with mode:", inspectorMode);

      // Update UI to reflect the current state
      let valueToSelect = inspectorMode; // "off", "on", or "mini"

      const radioToSelect = document.querySelector(
        `input[name="inspector"][value="${valueToSelect}"]`
      );
      if (radioToSelect) {
        radioToSelect.checked = true;
      }

      // Send messages to content script
      console.log(
        "[PopupMain] Sending SET_INSPECTOR_MODE message to content script"
      );
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          const tabId = tabs[0].id;
          console.log("[PopupMain] Sending message to tab:", tabId);
          chrome.tabs
            .sendMessage(tabId, {
              type: "SET_INSPECTOR_MODE",
              mode: inspectorMode,
            })
            .then((response) => {
              console.log("[PopupMain] Content script response:", response);
            })
            .catch((e) =>
              console.error("Error sending inspector mode message:", e)
            );
        } else {
          console.error("[PopupMain] No active tab found for message sending");
        }
      });
    };

    // Get initial state - migrate from old format if needed
    chrome.storage.sync.get(
      { inspectorMode: "off", extensionEnabled: false, miniMode: false },
      (data) => {
        console.log("[PopupMain] Initial storage data:", data);
        let mode = data.inspectorMode;

        // Migration: if we have old format, convert to new format
        if (!data.inspectorMode && (data.extensionEnabled || data.miniMode)) {
          console.log("[PopupMain] Migrating from old format");
          if (!data.extensionEnabled) {
            mode = "off";
          } else if (data.miniMode) {
            mode = "mini";
          } else {
            mode = "on";
          }

          console.log("[PopupMain] Migrated mode:", mode);
          // Save the new format and clean up old keys
          chrome.storage.sync.set({ inspectorMode: mode }, () => {
            chrome.storage.sync.remove(["extensionEnabled", "miniMode"]);
            console.log("[PopupMain] Migration complete, old keys removed");
          });
        }

        console.log("[PopupMain] Final mode to use:", mode);
        updateState(mode);
      }
    );

    inspectorControl.addEventListener("change", (event) => {
      console.log(
        "[PopupMain] Inspector control changed to:",
        event.target.value
      );
      const inspectorMode = event.target.value; // "off", "on", or "mini"

      console.log("[PopupMain] Setting inspector mode:", inspectorMode);

      chrome.storage.sync.set({ inspectorMode }, () => {
        console.log(
          "[PopupMain] Inspector mode saved to storage, calling updateState"
        );
        updateState(inspectorMode);
      });
    });
  }
}

// Initialize popup when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  const popupController = new PopupController();
  await popupController.init();

  // Make controller available globally if needed
  window.popupController = popupController;
});
