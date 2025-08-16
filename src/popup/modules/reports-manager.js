/**
 * Reports Manager - Handles all report management functionality
 */
class ReportsManager {
  constructor() {
    this.accessibilityDB = null;
    this.pendingImportData = null;
    this.selectedReportId = null;
    this.currentViewingReport = null;
    this.isInitialized = false;
  }

  setDatabase(db) {
    this.accessibilityDB = db;
  }

  init() {
    console.log("ReportsManager: Initializing...");

    // Listen for modal events
    document.addEventListener("modalConfirm", (e) => {
      if (e.detail.modal === "append-report") {
        this.handleAppendConfirm();
      }
    });

    document.addEventListener("modalExport", (e) => {
      if (e.detail.modal === "report-viewer") {
        this.handleExportCurrentReport();
      }
    });

    // Listen for tab activation to update report button state
    document.addEventListener("tabActivated", async (e) => {
      if (e.detail.panelId === "panel-reports" && this.isInitialized) {
        await this.updateReportButtonState();
      }
    });

    this.setupEventListeners();

    // Mark as initialized after a brief delay to prevent race conditions
    setTimeout(() => {
      this.isInitialized = true;
      console.log("ReportsManager: Initialization complete");

      // Check if Reports tab is currently active and load table
      const reportsPanel = document.getElementById("tabpanel-reports");
      if (
        reportsPanel &&
        reportsPanel.style.display !== "none" &&
        !reportsPanel.hasAttribute("hidden")
      ) {
        console.log(
          "[Reports Manager] Reports tab is active during initialization, loading table"
        );
        setTimeout(() => this.loadReportsTable(), 50);
      }
    }, 100);
  }

  setupEventListeners() {
    console.log("ReportsManager: Setting up event listeners...");

    // Export/Import buttons
    const exportBtn = document.getElementById("export-data-btn");
    const importBtn = document.getElementById("import-data-btn");
    const importFileInput = document.getElementById("import-file-input");
    const confirmImportBtn = document.getElementById("confirm-import-btn");
    const cancelImportBtn = document.getElementById("cancel-import-btn");
    const closeResultsBtn = document.getElementById("close-results-btn");
    const clearAllBtn = document.getElementById("clear-all-data-btn");
    const confirmClearBtn = document.getElementById("confirm-clear-btn");
    const cancelClearBtn = document.getElementById("cancel-clear-btn");

    // Add listener for Reports tab to load table when activated
    const reportsTab = document.getElementById("tab-reports");
    if (reportsTab) {
      console.log("[Reports Manager] Adding click listener to reports tab");
      reportsTab.addEventListener("click", () => {
        console.log("[Reports Manager] Reports tab clicked, loading table...");
        // Load reports table when Reports tab is clicked
        setTimeout(() => this.loadReportsTable(), 100);
      });
    }

    // Listen for tab activation events to load reports table
    document.addEventListener("tabActivated", (event) => {
      console.log(
        "[Reports Manager] Tab activated event received:",
        event.detail
      );
      if (
        event.detail &&
        (event.detail.tabId === "tab-reports" ||
          event.detail.panelId === "tabpanel-reports" ||
          event.detail.tab?.id === "tab-reports")
      ) {
        console.log(
          "[Reports Manager] Reports tab activated, loading table..."
        );
        // Load reports table when Reports tab is activated
        setTimeout(() => this.loadReportsTable(), 100);
      }
    });

    // Add a direct event listener to the primary report button as backup
    const primaryReportBtn = document.getElementById("primary-report-btn");
    if (primaryReportBtn) {
      console.log("Adding direct event listener to primary report button");
      primaryReportBtn.addEventListener("click", (e) => {
        console.log("DIRECT: Primary report button clicked!", e);
        e.preventDefault();
        e.stopPropagation();
        this.handleNewReport();
      });
    } else {
      console.error("Primary report button not found during setup!");
    }

    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.handleExportData());
    }

    if (importBtn) {
      importBtn.addEventListener("click", () => importFileInput?.click());
    }

    if (importFileInput) {
      importFileInput.addEventListener("change", (e) =>
        this.handleImportFile(e)
      );
    }

    if (confirmImportBtn) {
      confirmImportBtn.addEventListener("click", () =>
        this.handleConfirmImport()
      );
    }

    if (cancelImportBtn) {
      cancelImportBtn.addEventListener("click", () =>
        this.handleCancelImport()
      );
    }

    if (closeResultsBtn) {
      closeResultsBtn.addEventListener("click", () =>
        this.handleCloseResults()
      );
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", () => this.handleClearAll());
    }

    if (confirmClearBtn) {
      confirmClearBtn.addEventListener("click", () =>
        this.handleConfirmClear()
      );
    }

    if (cancelClearBtn) {
      cancelClearBtn.addEventListener("click", () => this.handleCancelClear());
    }

    // Initial normalization of create report buttons
    if (window.CreateReportButtons) {
      window.CreateReportButtons.refresh({
        onCreate: () => this.handleNewReport(),
      });
    }
  }

  async updateReportButtonState() {
    console.log("updateReportButtonState called");

    try {
      // Ensure database is initialized and ReportsManager is ready
      if (!this.accessibilityDB || !this.isInitialized) {
        console.warn(
          "Database not initialized or ReportsManager not ready, skipping updateReportButtonState"
        );
        return;
      }

      const primaryReportBtn = document.getElementById("primary-report-btn");
      const reportDropdownBtn = document.getElementById("report-dropdown-btn");
      const reportDropdown = document.getElementById("report-dropdown");
      // Overlay split controls (may not exist in early versions)
      const overlayPrimaryBtn = document.getElementById(
        "overlay-primary-report-btn"
      );
      const overlayDropdownBtn = document.getElementById(
        "overlay-report-dropdown-btn"
      );
      const overlayDropdown = document.getElementById(
        "overlay-report-dropdown"
      );

      console.log("Button elements found:", {
        primaryReportBtn: !!primaryReportBtn,
        reportDropdownBtn: !!reportDropdownBtn,
        reportDropdown: !!reportDropdown,
        overlayPrimaryBtn: !!overlayPrimaryBtn,
        overlayDropdownBtn: !!overlayDropdownBtn,
        overlayDropdown: !!overlayDropdown,
      });

      if (!primaryReportBtn || !reportDropdownBtn || !reportDropdown) {
        console.warn(
          "Primary report split button group missing; continuing (overlay may still exist)"
        );
      }

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (
        !tab ||
        !tab.url ||
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("moz-extension://") ||
        tab.url === "about:blank"
      ) {
        // Unsupported page - disable buttons
        primaryReportBtn.disabled = true;
        reportDropdownBtn.disabled = true;
        primaryReportBtn.innerHTML =
          '<span class="button-icon" data-icon="unsupported" aria-hidden="true"></span> <span class="btn-label">Unsupported Page</span>';
        return;
      }

      const hasReports = await this.accessibilityDB.hasReportsForUrl(tab.url);
      let reportsForUrl = [];
      if (hasReports) {
        try {
          reportsForUrl = await this.accessibilityDB.getAllReportsForUrl(
            tab.url
          );
        } catch (_) {}
      }

      // Clear all existing event listeners to prevent duplicates
      let newPrimaryBtn = primaryReportBtn;
      if (primaryReportBtn) {
        newPrimaryBtn = primaryReportBtn.cloneNode(true);
        primaryReportBtn.parentNode.replaceChild(
          newPrimaryBtn,
          primaryReportBtn
        );
      }
      let newOverlayPrimaryBtn = overlayPrimaryBtn;
      if (overlayPrimaryBtn) {
        newOverlayPrimaryBtn = overlayPrimaryBtn.cloneNode(true);
        overlayPrimaryBtn.parentNode.replaceChild(
          newOverlayPrimaryBtn,
          overlayPrimaryBtn
        );
      }

      // Build dropdown based on state
      if (hasReports) {
        newPrimaryBtn.innerHTML =
          '<span class="button-icon" data-icon="clipboard" aria-hidden="true"></span> <span class="btn-label">View Report</span>';
        if (newOverlayPrimaryBtn) {
          newOverlayPrimaryBtn.innerHTML =
            '<span class="button-icon" data-icon="clipboard" aria-hidden="true"></span> <span class="btn-label">View Report</span>';
        }
        // When reports exist, show both New Report and Add to Existing Report
        reportDropdown.innerHTML = `
          <ul role="none">
            <li><button id="new-report-option" class="dropdown-item" role="menuitem"><span class="button-icon" data-icon="plus" aria-hidden="true"></span><span class="btn-label">New Report</span></button></li>
            <li><button id="append-report-option" class="dropdown-item" role="menuitem"><span class="button-icon" data-icon="append" aria-hidden="true"></span><span class="btn-label">Add to Existing Report</span></button></li>
          </ul>`;
        if (overlayDropdown) {
          overlayDropdown.innerHTML = `
            <ul role="none">
              <li><button id="overlay-new-report-option" class="dropdown-item" role="menuitem"><span class="button-icon" data-icon="plus" aria-hidden="true"></span><span class="btn-label">New Report</span></button></li>
              <li><button id="overlay-append-report-option" class="dropdown-item" role="menuitem"><span class="button-icon" data-icon="append" aria-hidden="true"></span><span class="btn-label">Add to Existing Report</span></button></li>
            </ul>`;
        }
      } else {
        newPrimaryBtn.innerHTML =
          '<span class="button-icon" data-icon="plus" aria-hidden="true"></span> <span class="btn-label">Create Report</span>';
        if (newOverlayPrimaryBtn) {
          newOverlayPrimaryBtn.innerHTML =
            '<span class="button-icon" data-icon="plus" aria-hidden="true"></span> <span class="btn-label">Create Report</span>';
        }
        // When no reports exist, show both options
        reportDropdown.innerHTML = `
          <ul role="none">
            <li><button id="new-report-option" class="dropdown-item" role="menuitem"><span class="button-icon" data-icon="plus" aria-hidden="true"></span><span class="btn-label">New Report</span></button></li>
            <li><button id="append-report-option" class="dropdown-item" role="menuitem"><span class="button-icon" data-icon="append" aria-hidden="true"></span><span class="btn-label">Add to Existing Report</span></button></li>
          </ul>`;
        if (overlayDropdown) {
          overlayDropdown.innerHTML = `
            <ul role="none">
              <li><button id="overlay-new-report-option" class="dropdown-item" role="menuitem"><span class="button-icon" data-icon="plus" aria-hidden="true"></span><span class="btn-label">New Report</span></button></li>
              <li><button id="overlay-append-report-option" class="dropdown-item" role="menuitem"><span class="button-icon" data-icon="append" aria-hidden="true"></span><span class="btn-label">Add to Existing Report</span></button></li>
            </ul>`;
        }
      }

      // Dropdown listeners
      const newReportBtn = document.getElementById("new-report-option");
      if (newReportBtn)
        newReportBtn.addEventListener("click", () => this.handleNewReport());
      const overlayNewReportBtn = document.getElementById(
        "overlay-new-report-option"
      );
      if (overlayNewReportBtn)
        overlayNewReportBtn.addEventListener("click", () =>
          this.handleNewReport()
        );

      const appendBtn = document.getElementById("append-report-option");
      if (appendBtn)
        appendBtn.addEventListener("click", () => this.handleAppendReport());
      const overlayAppendBtn = document.getElementById(
        "overlay-append-report-option"
      );
      if (overlayAppendBtn)
        overlayAppendBtn.addEventListener("click", () =>
          this.handleAppendReport()
        );

      // Primary button action
      if (hasReports) {
        newPrimaryBtn &&
          newPrimaryBtn.addEventListener("click", () =>
            this.handleViewReportMultiAware(reportsForUrl)
          );
        newOverlayPrimaryBtn &&
          newOverlayPrimaryBtn.addEventListener("click", () =>
            this.handleViewReportMultiAware(reportsForUrl)
          );
      } else {
        if (window.CreateReportButtons) {
          window.CreateReportButtons.refresh({
            onCreate: () => this.handleNewReport(),
            hasReport: false,
            onView: () => this.handleViewReport(),
          });
        }
      }

      // Also update overlay & any other create-report buttons to View state when reports exist
      if (window.CreateReportButtons) {
        window.CreateReportButtons.refresh({
          onCreate: () => this.handleNewReport(),
          hasReport: hasReports,
          onView: () => this.handleViewReport(),
        });
      }

      // Re-initialize split menus after DOM changes
      if (window.reinitSplitMenus) {
        try {
          window.reinitSplitMenus();
        } catch (e) {
          console.warn("reinitSplitMenus failed", e);
        }
      }

      newPrimaryBtn.disabled = false;
      reportDropdownBtn.disabled = false;
      // Ensure icons applied
      if (window.injectIcons) {
        try {
          window.injectIcons();
        } catch (_) {}
      }
    } catch (error) {
      console.error("Failed to update report button state:", error);
    }
  }

  // Decide whether to show a picker modal or open single report directly
  async handleViewReportMultiAware(reportsForUrl) {
    try {
      if (!Array.isArray(reportsForUrl) || reportsForUrl.length === 0) {
        await this.handleViewReport();
        return;
      }
      if (reportsForUrl.length === 1) {
        await this.handleViewReport(reportsForUrl[0].id);
        return;
      }
      // Multiple reports -> show modal selector
      this.showReportsForUrlModal(reportsForUrl);
    } catch (e) {
      console.error("Failed multi-aware view:", e);
    }
  }

  showReportsForUrlModal(reports) {
    if (!window.modalManager) {
      console.warn("ModalManager not available");
      return;
    }
    const id = "reports-for-url-modal";
    if (!modalManager.modals || !modalManager.modals.has(id)) {
      modalManager.createModal(id, {
        title: "Select Report",
        content: "<div>Loading...</div>",
        buttons: [],
      });
    }
    const listHtml = `<div class="reports-url-list">${reports
      .map((r) => {
        const ts = new Date(r.timestamp || Date.now()).toLocaleString();
        const violationCount =
          r.scanResults?.violations?.length ||
          (r.pages
            ? r.pages.reduce(
                (s, p) => s + (p.scanResults?.violations?.length || 0),
                0
              )
            : 0);
        return `<button class="report-url-choice" data-report-id="${r.id}">
        <span class="choice-title">Report ${ts}</span>
        <span class="choice-meta">Violations: ${violationCount}</span>
      </button>`;
      })
      .join("")}</div>`;
    modalManager.setContent(id, listHtml);
    modalManager.openModal(id);
    setTimeout(() => {
      const container = document.querySelector("#" + id + "-content");
      if (!container) return;
      container.addEventListener("click", (e) => {
        const btn = e.target.closest(".report-url-choice");
        if (!btn) return;
        const rid = btn.getAttribute("data-report-id");
        modalManager.closeModal(id);
        this.handleViewReport(rid);
      });
    }, 50);
  }

  async handleNewReport() {
    console.log("handleNewReport called");

    try {
      // Check if chrome.tabs is available
      if (!chrome.tabs || !chrome.tabs.create) {
        throw new Error(
          "chrome.tabs.create is not available - trying window.open instead"
        );
      }

      // Determine active page URL to seed report
      let activePageUrl = null;
      try {
        const [activeTab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (activeTab && activeTab.url) activePageUrl = activeTab.url;
      } catch (e) {
        console.warn("Could not get active tab URL for new report:", e);
      }

      const base = chrome.runtime.getURL("src/report.html");
      const reportUrl = activePageUrl
        ? `${base}?sourceUrl=${encodeURIComponent(activePageUrl)}`
        : base;
      console.log("Opening report URL:", reportUrl);

      // Create new tab with report interface
      const tab = await chrome.tabs.create({
        url: reportUrl,
        active: true,
      });

      console.log("New tab created:", tab.id);

      // Close the popup
      window.close();
    } catch (error) {
      console.error("Failed to open new report:", error);

      // Try using window.open as fallback
      try {
        const base = chrome.runtime.getURL("src/report.html");
        let activePageUrl = null;
        try {
          const [activeTab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (activeTab && activeTab.url) activePageUrl = activeTab.url;
        } catch (e2) {
          console.warn("Fallback: cannot get active tab URL:", e2);
        }
        const fallbackUrl = activePageUrl
          ? `${base}?sourceUrl=${encodeURIComponent(activePageUrl)}`
          : base;
        console.log("Trying window.open with URL:", fallbackUrl);
        const newWindow = window.open(fallbackUrl, "_blank");
        if (newWindow) {
          console.log("Window opened successfully");
          window.close();
        } else {
          throw new Error("window.open was blocked");
        }
      } catch (windowError) {
        console.error("window.open also failed:", windowError);
        alert(
          `Failed to open report interface: ${error.message}. Please check that popups are allowed.`
        );
      }
    }
  }

  async handleViewReport() {
    console.log("handleViewReport called");

    // Prevent execution during initialization
    if (!this.isInitialized) {
      console.log("ReportsManager not initialized, skipping handleViewReport");
      return;
    }

    try {
      // Ensure database is initialized
      if (!this.accessibilityDB) {
        console.error("Database not initialized");
        return;
      }

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.url) {
        throw new Error("Unable to access current tab");
      }

      const latestReport = await this.accessibilityDB.getLatestReport(tab.url);
      if (latestReport) {
        this.showReportViewer(latestReport);
      } else {
        throw new Error("No report found for this URL");
      }
    } catch (error) {
      console.error("Failed to view report:", error);
      const newReportStatus = document.getElementById("new-report-status");
      if (newReportStatus) {
        newReportStatus.style.display = "block";
        newReportStatus.className = "status-message error";
        newReportStatus.textContent = `✗ Failed to load report: ${error.message}`;

        setTimeout(() => {
          newReportStatus.style.display = "none";
        }, 3000);
      }
    }
  }

  async handleAppendReport() {
    try {
      // Open an append-to-report modal using the new showModal function
      const content = `
        <div id="append-report-container">
          <p>Select an existing report to append the current page's scan results.</p>
          <div id="existing-reports-list" class="existing-reports-list loading">Loading reports...</div>
          <div class="append-actions">
            <button id="confirm-append" class="primary-button" disabled>Append Page</button>
            <button id="cancel-append" class="secondary-button">Cancel</button>
          </div>
        </div>`;

      showModal({
        id: "append-report",
        title: "Append to Existing Report",
        content,
        size: "medium",
        buttons: [
          {
            text: "Close",
            variant: "secondary",
            action: (close) => close(),
          },
        ],
      });

      await this.loadExistingReports();

      // Wire up buttons after content is injected
      setTimeout(() => {
        const confirmBtn = document.getElementById("confirm-append");
        const cancelBtn = document.getElementById("cancel-append");
        if (confirmBtn)
          confirmBtn.addEventListener("click", () =>
            this.handleAppendConfirm()
          );
        if (cancelBtn)
          cancelBtn.addEventListener("click", () => {
            const modalEl = document.getElementById("append-report");
            if (modalEl && modalEl.parentNode)
              modalEl.parentNode.removeChild(modalEl);
          });
      }, 0);
    } catch (error) {
      console.error("Failed to load existing reports:", error);
    }
  }

  showReportViewer(report) {
    console.log("showReportViewer called with report:", report);

    // Prevent modal from showing during initialization
    if (!this.isInitialized) {
      console.log("ReportsManager not fully initialized, skipping modal");
      return;
    }

    this.currentViewingReport = report;

    const hostname = new URL(report.url).hostname;
    const initialContent = `<div id="report-viewer-content" class="report-viewer-loading">Loading report...</div>`;
    showModal({
      id: "report-viewer",
      title: `Report for ${hostname}`,
      content: initialContent,
      size: "large",
      buttons: [
        {
          text: "Close",
          variant: "primary",
          action: (close) => close(),
        },
      ],
    });
    this.renderReportContent(report);
  }

  renderReportContent(report) {
    const pages = report.pages || [
      {
        url: report.url,
        timestamp: report.timestamp,
        scanResults: report.scanResults,
      },
    ];
    const allViolations = [];
    const allPasses = [];

    // Collect all violations and passes from all pages
    pages.forEach((page) => {
      if (page.scanResults) {
        if (page.scanResults.violations)
          allViolations.push(...page.scanResults.violations);
        if (page.scanResults.passes) allPasses.push(...page.scanResults.passes);
      }
    });

    const totalViolations = allViolations.length;
    const totalPasses = allPasses.length;
    const totalPages = pages.length;

    // Group violations by impact
    const violationsByImpact = allViolations.reduce((acc, violation) => {
      const impact = violation.impact || "minor";
      acc[impact] = (acc[impact] || 0) + 1;
      return acc;
    }, {});

    const content = `
      <div class="report-summary">
        <div class="report-header">
          <h4><span class="button-icon" data-icon="clipboard" aria-hidden="true"></span> Report Summary</h4>
          <div class="report-metadata">
            <p><span class="button-icon" data-icon="view" aria-hidden="true"></span> <strong>URL:</strong> ${
              report.url
            }</p>
            <p><span class="button-icon" data-icon="pages" aria-hidden="true"></span> <strong>Created:</strong> ${new Date(
              report.timestamp
            ).toLocaleString()}</p>
            <p><span class="button-icon" data-icon="pages" aria-hidden="true"></span> <strong>Pages:</strong> ${totalPages}</p>
            <p><span class="button-icon" data-icon="language" aria-hidden="true"></span> <strong>Device ID:</strong> ${
              report.deviceId
            }</p>
          </div>
        </div>

        <div class="report-stats">
          <div class="stat-item violations">
            <span class="button-icon" data-icon="violations" aria-hidden="true"></span>
            <span class="stat-number">${totalViolations}</span>
            <span class="stat-label">Violations</span>
          </div>
          <div class="stat-item passes">
            <span class="button-icon" data-icon="passes" aria-hidden="true"></span>
            <span class="stat-number">${totalPasses}</span>
            <span class="stat-label">Passes</span>
          </div>
        </div>

        ${
          totalViolations > 0
            ? `
          <div class="violations-by-impact">
            <h5><span class="button-icon" data-icon="violations" aria-hidden="true"></span> Violations by Impact Level</h5>
            <div class="impact-breakdown">
              ${Object.entries(violationsByImpact)
                .map(
                  ([impact, count]) => `
                  <div class="impact-item ${impact}">
                    ${
                      window.ImpactIcons && window.ImpactIcons[impact]
                        ? `<span class="impact-icon">${window.ImpactIcons[impact]}</span>`
                        : `<span class="impact-label">${impact}:</span>`
                    }
                    <span class="impact-count">${count}</span>
                  </div>
                `
                )
                .join("")}
            </div>
          </div>
        `
            : '<p class="no-violations">🎉 No violations found in this report!</p>'
        }

        <div class="pages-summary">
          <h5><span class="button-icon" data-icon="pages" aria-hidden="true"></span> Pages in Report</h5>
          ${pages
            .map(
              (page, index) => `
            <div class="page-summary">
              <div class="page-header">
                <strong>Page ${index + 1}:</strong> ${
                page.url === report.url
                  ? "Original page"
                  : new URL(page.url).pathname
              }
                <small>(${new Date(page.timestamp).toLocaleString()})</small>
              </div>
              <div class="page-stats">
                <span class="violations">${
                  page.scanResults?.violations?.length || 0
                } violations</span>
                <span class="passes">${
                  page.scanResults?.passes?.length || 0
                } passes</span>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    // Replace the content inside the active report-viewer modal
    const container = document.getElementById("report-viewer-content");
    if (container) {
      container.innerHTML = content;
      // Populate any newly added icon placeholders
      if (typeof injectIcons === "function") {
        try {
          injectIcons();
        } catch (e) {
          /* ignore */
        }
      }
    }
  }

  async loadExistingReports() {
    const existingReportsList = document.getElementById(
      "existing-reports-list"
    );
    if (!existingReportsList) return;

    try {
      const reports = await this.accessibilityDB.getAllReports();

      if (reports.length === 0) {
        existingReportsList.innerHTML =
          '<p class="no-reports">No existing reports found.</p>';
        return;
      }

      const reportsHTML = reports
        .map((report) => {
          const hostname = new URL(report.url).hostname;
          const pageCount = report.pages ? report.pages.length : 1;
          const violationCount = report.pages
            ? report.pages.reduce(
                (sum, page) =>
                  sum + (page.scanResults?.violations?.length || 0),
                0
              )
            : report.scanResults?.violations?.length || 0;

          return `
          <div class="report-item" data-report-id="${report.id}">
            <div class="report-info">
              <div class="report-title">${hostname}</div>
              <div class="report-metadata">
                <span class="page-count">${pageCount} page${
            pageCount !== 1 ? "s" : ""
          }</span>
                <span class="violation-count">${violationCount} violation${
            violationCount !== 1 ? "s" : ""
          }</span>
                <span class="report-date">${new Date(
                  report.timestamp
                ).toLocaleDateString()}</span>
              </div>
            </div>
            <input type="radio" name="selected-report" value="${
              report.id
            }" class="report-selector">
          </div>
        `;
        })
        .join("");

      existingReportsList.innerHTML = reportsHTML;

      // Add click handlers for report selection
      existingReportsList.querySelectorAll(".report-item").forEach((item) => {
        item.addEventListener("click", () => {
          const radio = item.querySelector('input[type="radio"]');
          radio.checked = true;
          this.selectedReportId = radio.value;

          // Update confirm button state
          const confirmBtn = document.getElementById("confirm-append");
          if (confirmBtn) {
            confirmBtn.disabled = false;
          }
        });
      });
    } catch (error) {
      console.error("Failed to load reports:", error);
      existingReportsList.innerHTML =
        '<p class="error">Failed to load reports.</p>';
    }
  }

  async handleAppendConfirm() {
    if (!this.selectedReportId) {
      console.error("No report selected");
      return;
    }

    try {
      // Get current tab info
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.url) {
        throw new Error("Unable to access current tab");
      }

      // Run a fresh scan
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "runAccessibilityScan",
        options: { timeout: 25000 },
      });

      if (!response?.data?.scanResults) {
        throw new Error("Failed to get scan results");
      }

      // Append to the selected report
      await this.accessibilityDB.appendToReport(
        this.selectedReportId,
        response.data.scanResults,
        tab.url
      );

      // Close modal and show success
      // Close append modal if present
      const appendModal = document.getElementById("append-report");
      if (appendModal && appendModal.parentNode)
        appendModal.parentNode.removeChild(appendModal);

      const newReportStatus = document.getElementById("new-report-status");
      if (newReportStatus) {
        newReportStatus.style.display = "block";
        newReportStatus.className = "status-message success";
        newReportStatus.textContent = `✓ Page appended to existing report`;

        setTimeout(() => {
          newReportStatus.style.display = "none";
        }, 3000);
      }

      await this.updateReportButtonState();
    } catch (error) {
      console.error("Failed to append to report:", error);
      const newReportStatus = document.getElementById("new-report-status");
      if (newReportStatus) {
        newReportStatus.style.display = "block";
        newReportStatus.className = "status-message error";
        newReportStatus.textContent = `✗ Failed to append: ${error.message}`;

        setTimeout(() => {
          newReportStatus.style.display = "none";
        }, 3000);
      }
    } finally {
      this.selectedReportId = null;
    }
  }

  async handleExportCurrentReport() {
    if (!this.currentViewingReport) {
      console.error("No report to export");
      return;
    }

    try {
      const hostname = new URL(this.currentViewingReport.url).hostname;
      const filename = `accessibility-report-${hostname}-${
        new Date(this.currentViewingReport.timestamp)
          .toISOString()
          .split("T")[0]
      }.json`;

      const blob = new Blob(
        [JSON.stringify(this.currentViewingReport, null, 2)],
        {
          type: "application/json",
        }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      console.log(`Report exported as ${filename}`);
    } catch (error) {
      console.error("Failed to export report:", error);
    }
  }

  async handleExportData() {
    if (!this.accessibilityDB) {
      console.error("Database not initialized");
      return;
    }

    try {
      const data = await this.accessibilityDB.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `accessibility-reports-${
        new Date().toISOString().split("T")[0]
      }.json`;
      a.click();
      URL.revokeObjectURL(url);

      console.log("Data exported successfully");
    } catch (error) {
      console.error("Failed to export data:", error);
    }
  }

  handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        this.pendingImportData = JSON.parse(e.target.result);

        const importOptions = document.getElementById("import-options");
        if (importOptions) {
          importOptions.style.display = "block";
        }

        const reportCount = this.pendingImportData.reports?.length || 0;
        const importInfo = document.getElementById("import-info");
        if (importInfo) {
          importInfo.textContent = `Found ${reportCount} report${
            reportCount !== 1 ? "s" : ""
          } to import`;
        }
      } catch (error) {
        console.error("Failed to parse import file:", error);
        alert("Invalid file format. Please select a valid JSON export file.");
      }
    };
    reader.readAsText(file);
  }

  async handleConfirmImport() {
    if (!this.pendingImportData) {
      console.error("No import data available");
      return;
    }

    try {
      const result = await this.accessibilityDB.importData(
        this.pendingImportData
      );

      const importResults = document.getElementById("import-results");
      const importOptions = document.getElementById("import-options");

      if (importResults && importOptions) {
        importOptions.style.display = "none";
        importResults.style.display = "block";

        document.getElementById("import-summary").innerHTML = `
          <p><strong>Import completed successfully!</strong></p>
          <p>Imported: ${result.imported} reports</p>
          <p>Skipped: ${result.skipped} duplicates</p>
        `;
      }

      await this.updateReportButtonState();

      // Refresh the reports table if it's currently visible
      const reportsContainer = document.getElementById(
        "reports-table-container"
      );
      if (reportsContainer && reportsContainer.offsetParent !== null) {
        await this.loadReportsTable();
      }
    } catch (error) {
      console.error("Failed to import data:", error);
      alert(`Import failed: ${error.message}`);
    } finally {
      this.pendingImportData = null;
    }
  }

  handleCancelImport() {
    this.pendingImportData = null;
    const importOptions = document.getElementById("import-options");
    if (importOptions) {
      importOptions.style.display = "none";
    }
  }

  handleCloseResults() {
    const importResults = document.getElementById("import-results");
    if (importResults) {
      importResults.style.display = "none";
    }
  }

  handleClearAll() {
    const clearConfirmation = document.getElementById("clear-confirmation");
    if (clearConfirmation) {
      clearConfirmation.style.display = "block";
    }
  }

  async handleConfirmClear() {
    try {
      await this.accessibilityDB.clearAllData();

      const clearConfirmation = document.getElementById("clear-confirmation");
      if (clearConfirmation) {
        clearConfirmation.style.display = "none";
      }

      await this.updateReportButtonState();

      // Refresh the reports table if it's currently visible
      const reportsContainer = document.getElementById(
        "reports-table-container"
      );
      if (reportsContainer && reportsContainer.offsetParent !== null) {
        await this.loadReportsTable();
      }

      console.log("All data cleared successfully");
    } catch (error) {
      console.error("Failed to clear data:", error);
      alert(`Failed to clear data: ${error.message}`);
    }
  }

  handleCancelClear() {
    const clearConfirmation = document.getElementById("clear-confirmation");
    if (clearConfirmation) {
      clearConfirmation.style.display = "none";
    }
  }

  /**
   * Load reports table directly into the Reports tab
   */
  async loadReportsTable() {
    console.log("[Reports Manager] loadReportsTable() called");
    const container = document.getElementById("reports-table-container");
    if (!container) {
      console.warn("[Reports Manager] reports-table-container not found");
      return;
    }

    try {
      console.log("[Reports Manager] Loading reports table...");

      if (!this.accessibilityDB) {
        console.error("[Reports Manager] Database not available");
        container.innerHTML = `
          <div class="error-state">
            <span>Database not available. Please try again.</span>
          </div>
        `;
        return;
      }

      // Show loading state
      container.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Loading reports...</span>
        </div>
      `;

      // Get all reports from the database
      const allReports = await this.accessibilityDB.getAllReports();
      console.log(
        `[Reports Manager] Found ${allReports.length} reports for table`,
        allReports
      );

      // Create and insert the table content
      const tableContent = this.createReportsTableContent(allReports);
      container.innerHTML = tableContent;

      // Set up event listeners for report actions
      this.setupReportActionListeners();

      // Inject icons for action buttons
      setTimeout(() => {
        if (window.PopupIcons) {
          container.querySelectorAll("[data-icon]").forEach((el) => {
            if (!el._iconInjected) {
              const svg = window.PopupIcons.get(el.getAttribute("data-icon"));
              if (svg) {
                el.innerHTML = svg;
                el._iconInjected = true;
              }
            }
          });
        }
      }, 50);
    } catch (error) {
      console.error("[Reports Manager] Failed to load reports table:", error);
      container.innerHTML = `
        <div class="error-state">
          <span>Failed to load reports: ${error.message}</span>
        </div>
      `;
    }
  }

  /**
   * Public method to refresh/reload the reports table
   */
  async refreshReportsTable() {
    return this.loadReportsTable();
  }

  /**
   * Handle viewing all reports in a modal
   */
  async handleViewAllReports() {
    try {
      console.log("Loading all reports for view...");

      if (!this.accessibilityDB) {
        console.error("Database not available");
        alert("Database not available. Please try again.");
        return;
      }

      // Get all reports from the database
      const allReports = await this.accessibilityDB.getAllReports();
      console.log(`Found ${allReports.length} reports`, allReports);

      // Create the modal content
      const modalContent = this.createReportsTableContent(allReports);

      // Use the new modal function to show the reports
      showModal({
        id: "view-all-reports",
        title: `All Reports (${allReports.length})`,
        content: modalContent,
        size: "large",
        buttons: [
          {
            text: "Close",
            variant: "primary",
            action: (close) => close(),
          },
        ],
      });

      // Set up event listeners for report actions
      this.setupReportActionListeners();
      // Inject icons for action buttons
      setTimeout(() => {
        if (window.PopupIcons) {
          document
            .querySelectorAll("#view-all-reports [data-icon]")
            .forEach((el) => {
              if (!el._iconInjected) {
                const svg = window.PopupIcons.get(el.getAttribute("data-icon"));
                if (svg) {
                  el.innerHTML = svg;
                  el._iconInjected = true;
                }
              }
            });
        }
      }, 50);
    } catch (error) {
      console.error("Failed to load reports:", error);
      alert(`Failed to load reports: ${error.message}`);
    }
  }

  /**
   * Create the HTML content for the reports table
   */
  createReportsTableContent(reports) {
    if (!reports || reports.length === 0) {
      return `
        <div class="no-reports">
          <h3>No Reports Found</h3>
          <p>No accessibility reports have been saved yet. Create your first report by scanning a page and saving the results.</p>
        </div>
      `;
    }

    // Calculate summary statistics
    const totalReports = reports.length;
    const totalViolations = reports.reduce((sum, report) => {
      return sum + (report.scanResults?.violations?.length || 0);
    }, 0);

    const totalPages = reports.reduce((sum, report) => {
      return sum + (report.pages?.length || 1);
    }, 0);

    // Create the table HTML
    const tableRows = reports
      .map((report) => {
        try {
          // Safely extract URLs with better error handling
          let urls = [];
          if (Array.isArray(report.urls)) {
            urls = report.urls.filter((url) => url && typeof url === "string");
          } else if (report.url && typeof report.url === "string") {
            urls = [report.url];
          }

          const primaryUrl = urls[0] || "Unknown URL";
          const violationCount = report.scanResults?.violations?.length || 0;
          const date = new Date(report.timestamp).toLocaleDateString();
          const time = new Date(report.timestamp).toLocaleTimeString();

          // Determine violation severity class
          let severityClass = "low";
          if (violationCount > 10) severityClass = "high";
          else if (violationCount > 5) severityClass = "medium";

          // Create URL list for multi-URL reports
          const urlList =
            urls.length > 1
              ? `<ul class="report-url-list">${urls
                  .slice(1)
                  .map((url) => `<li>${this.truncateUrl(url)}</li>`)
                  .join("")}</ul>`
              : "";

          return `
        <tr data-report-id="${report.id}">
          <td class="report-url">
            <div>${this.truncateUrl(primaryUrl)}</div>
            ${urlList}
            ${urls.length > 1 ? `<small>(${urls.length} URLs)</small>` : ""}
          </td>
          <td class="report-date">
            <div>${date}</div>
            <div style="font-size: 11px; color: #999;">${time}</div>
          </td>
          <td class="report-violations">
            <span class="violation-count ${severityClass}">${violationCount}</span>
          </td>
          <td class="report-actions">
            <button class="report-action-btn view-btn" data-report-id="${
              report.id
            }" title="View Report">👁️</button>
            <button class="report-action-btn export-btn" data-report-id="${
              report.id
            }" title="Export Report">📥</button>
            <button class="report-action-btn delete-btn" data-report-id="${
              report.id
            }" title="Delete Report">🗑️</button>
          </td>
        </tr>
      `;
        } catch (error) {
          console.error("Error rendering report row:", error, report);
          return `
          <tr>
            <td colspan="4" style="color: red; text-align: center;">Error loading report</td>
          </tr>
        `;
        }
      })
      .join("");

    return `
      <div class="reports-summary">
        <div class="summary-stats">
          <div class="summary-stat">
            <span class="summary-stat-value">${totalReports}</span>
            <span class="summary-stat-label">Reports</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-value">${totalPages}</span>
            <span class="summary-stat-label">Pages Scanned</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-value">${totalViolations}</span>
            <span class="summary-stat-label">Total Issues</span>
          </div>
        </div>
      </div>
      
      <table class="reports-table">
        <thead>
          <tr>
            <th>URL(s)</th>
            <th>Date</th>
            <th>Issues</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;
  }

  /**
   * Truncate long URLs for display
   */
  truncateUrl(url, maxLength = 40) {
    if (!url) return "Unknown URL";

    // Ensure url is a string
    const urlStr = String(url);

    if (urlStr.length <= maxLength) return urlStr;
    return urlStr.substring(0, maxLength - 3) + "...";
  }

  /**
   * Set up event listeners for report action buttons
   */
  setupReportActionListeners() {
    // Wait for modal to be fully rendered
    setTimeout(() => {
      const modal = document.querySelector("#view-all-reports");
      if (!modal) return;

      // Event delegation for action buttons
      modal.addEventListener("click", (e) => {
        const target = e.target.closest(".report-action-btn");
        if (!target) return;

        const reportId = target.dataset.reportId;
        if (target.classList.contains("view-btn")) {
          this.handleViewReport(reportId);
        } else if (target.classList.contains("export-btn")) {
          this.handleExportSingleReport(reportId);
        } else if (target.classList.contains("delete-btn")) {
          this.handleDeleteReport(reportId);
        }
      });
    }, 100);
  }

  /**
   * Handle viewing a single report
   */
  async handleViewReport(reportId) {
    try {
      const report = await this.accessibilityDB.getReportById(reportId);
      if (!report) {
        alert("Report not found");
        return;
      }

      // Open report in new tab using the report interface
      const reportUrl = chrome.runtime.getURL("src/report.html");
      chrome.tabs.create({
        url: `${reportUrl}?reportId=${reportId}`,
        active: true,
      });
    } catch (error) {
      console.error("Failed to view report:", error);
      alert(`Failed to view report: ${error.message}`);
    }
  }

  /**
   * Handle exporting a single report
   */
  async handleExportSingleReport(reportId) {
    try {
      const report = await this.accessibilityDB.getReportById(reportId);
      if (!report) {
        alert("Report not found");
        return;
      }

      // Create export data for single report
      const exportData = {
        version: "1.0",
        exported: new Date().toISOString(),
        reports: [report],
      };

      // Generate filename
      const urls = report.urls || (report.url ? [report.url] : ["report"]);
      const primaryUrl = urls[0] || "report";
      const domain = this.extractDomain(primaryUrl);
      const date = new Date(report.timestamp).toISOString().split("T")[0];
      const filename = `accessibility-report-${domain}-${date}.json`;

      // Download the file
      this.downloadJSON(exportData, filename);

      console.log(`Report ${reportId} exported successfully`);
    } catch (error) {
      console.error("Failed to export report:", error);
      alert(`Failed to export report: ${error.message}`);
    }
  }

  /**
   * Handle deleting a single report
   */
  async handleDeleteReport(reportId) {
    try {
      const report = await this.accessibilityDB.getReportById(reportId);
      if (!report) {
        alert("Report not found");
        return;
      }

      const urls = report.urls || (report.url ? [report.url] : ["Unknown"]);
      const primaryUrl = urls[0];

      showModal({
        id: "delete-confirm-modal",
        title: "Confirm Deletion",
        content: `<p>Are you sure you want to delete the report for "<strong>${this.truncateUrl(
          primaryUrl,
          30
        )}</strong>"?</p><p>This action cannot be undone.</p>`,
        size: "small",
        buttons: [
          {
            text: "Delete Report",
            variant: "danger",
            action: async (close) => {
              close();
              await this.accessibilityDB.deleteReport(reportId);
              console.log(`Report ${reportId} deleted successfully`);

              // Check if we're in a modal or the Reports tab and refresh accordingly
              const currentModal = document.querySelector("#view-all-reports");
              if (currentModal && currentModal.parentNode) {
                // We're in a modal - refresh the modal content
                currentModal.parentNode.removeChild(currentModal);
                await this.handleViewAllReports();
              } else {
                // We're in the Reports tab - refresh the table
                await this.loadReportsTable();
              }

              await this.updateReportButtonState();
            },
          },
          {
            text: "Cancel",
            variant: "secondary",
            action: (close) => close(),
          },
        ],
      });
    } catch (error) {
      console.error("Failed to delete report:", error);
      alert(`Failed to delete report: ${error.message}`);
    }
  }

  /**
   * Extract domain from URL for filename
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/[^a-zA-Z0-9.-]/g, "_");
    } catch {
      return url.replace(/[^a-zA-Z0-9.-]/g, "_").substring(0, 20);
    }
  }
}

window.ReportsManager = ReportsManager;
