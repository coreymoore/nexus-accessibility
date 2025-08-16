/**
 * Tab Manager - Handles tab functionality and navigation
 */
class TabManager {
  constructor() {
    this.tabs = [];
    this.currentTab = null;
  }

  init() {
    // Initialize all tabs
    this.tabs = Array.from(document.querySelectorAll('[role="tab"]'));

    // Add click listeners for tab navigation
    this.tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        this.activateTab(tab);
      });
    });

    // Add keyboard navigation
    this.tabs.forEach((tab) => {
      tab.addEventListener("keydown", (e) => {
        this.handleTabKeydown(e, tab);
      });
    });

    // Restore selected tab from storage, default to first tab
    chrome.storage.sync.get({ nexusSelectedTab: 0 }, (data) => {
      const idx = Math.max(
        0,
        Math.min(this.tabs.length - 1, data.nexusSelectedTab)
      );
      this.activateTab(this.tabs[idx], false);
    });

    // Add event handler for "View All Alerts" button
    const viewAllAlertsBtn = document.getElementById("view-all-alerts-btn");
    if (viewAllAlertsBtn) {
      viewAllAlertsBtn.addEventListener("click", () => {
        // Switch to the Alerts tab
        const alertsTab = document.getElementById("tab-alerts");
        if (alertsTab) {
          this.activateTab(alertsTab);
        }
      });
    }
  }

  activateTab(tab, saveSelection = true) {
    if (!tab) return;

    // Update ARIA states and visual styles
    this.tabs.forEach((t) => {
      t.setAttribute("aria-selected", "false");
      t.classList.remove("active");
    });

    tab.setAttribute("aria-selected", "true");
    tab.classList.add("active");

    // Show the associated tabpanel
    const tabpanels = document.querySelectorAll('[role="tabpanel"]');
    tabpanels.forEach((panel) => {
      panel.setAttribute("aria-hidden", "true");
      panel.style.display = "none";
    });

    const targetPanelId = tab.getAttribute("aria-controls");
    const targetPanel = document.getElementById(targetPanelId);
    if (targetPanel) {
      targetPanel.setAttribute("aria-hidden", "false");
      targetPanel.style.display = "block";
    }

    // Save the selected tab index
    if (saveSelection) {
      const tabIndex = this.tabs.indexOf(tab);
      chrome.storage.sync.set({ nexusSelectedTab: tabIndex });
    }

    // Focus management
    tab.focus();

    this.currentTab = tab;

    // Dispatch custom event for other modules to listen to
    document.dispatchEvent(
      new CustomEvent("tabActivated", {
        detail: {
          tab: tab,
          panelId: targetPanelId,
        },
      })
    );
  }

  handleTabKeydown(e, tab) {
    let idx = this.tabs.indexOf(tab);
    if (e.key === "ArrowRight" || e.key === "Right") {
      e.preventDefault();
      this.activateTab(this.tabs[(idx + 1) % this.tabs.length]);
    } else if (e.key === "ArrowLeft" || e.key === "Left") {
      e.preventDefault();
      this.activateTab(
        this.tabs[(idx - 1 + this.tabs.length) % this.tabs.length]
      );
    } else if (e.key === "Home") {
      e.preventDefault();
      this.activateTab(this.tabs[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      this.activateTab(this.tabs[this.tabs.length - 1]);
    }
  }

  getActiveTab() {
    return this.currentTab;
  }

  switchToAlertsTab() {
    const alertsTab = document.getElementById("tab-alerts");
    if (alertsTab) {
      this.activateTab(alertsTab);
    }
  }

  switchToReportsTab() {
    const reportsTab = document.getElementById("tab-reports");
    if (reportsTab) {
      this.activateTab(reportsTab);
    }
  }

  switchToOverviewTab() {
    const overviewTab = document.getElementById("tab-overview");
    if (overviewTab) {
      this.activateTab(overviewTab);
    }
  }
}

window.TabManager = TabManager;
