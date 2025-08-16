/**
 * Report Interface - Handles the report creation and editing interface
 */
class ReportInterface {
  constructor() {
    this.accessibilityDB = null;
    this.reportData = null;
    this.reportId = null;
    this.isNewReport = false;
  }

  async init() {
    console.log("Initializing Report Interface...");

    try {
      // Initialize database
      await this.initializeDatabase();

      // Parse URL parameters
      this.parseUrlParameters();

      // Set up form handlers
      this.setupEventListeners();

      // Set default values
      this.setDefaultValues();

      // Load report data if editing existing report
      if (this.reportId) {
        await this.loadExistingReport();
      } else {
        await this.loadScanData();
        // Automatically create & persist a new report record so user doesn't need to press Save initially
        await this.autoPersistNewReport();
      }

      // Initial preview update
      this.updatePreview();

      console.log("Report Interface initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Report Interface:", error);
      this.showError("Failed to initialize report interface");
    }
  }

  /**
   * Automatically persist a brand new report so the user does not have to click Save first.
   * Only runs if we are in new-report mode and no reportId yet.
   */
  async autoPersistNewReport() {
    if (!this.isNewReport || this.reportId) return; // Already persisted or editing existing
    if (!this.accessibilityDB) return;

    try {
      // Try to capture the current active tab URL via background (requires activeTab permission)
      let activeUrl = null;
      try {
        if (this.sourceUrl) {
          activeUrl = this.sourceUrl;
        } else {
          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (tabs && tabs[0] && tabs[0].url) activeUrl = tabs[0].url;
        }
      } catch (e) {
        console.warn(
          "Unable to obtain active tab URL for report initialization:",
          e
        );
      }

      // Derive base URLs
      const derivedUrls = Array.isArray(this.reportData?.urls)
        ? this.reportData.urls
        : this.reportData?.pages
        ? this.reportData.pages.map((p) => p.url).filter(Boolean)
        : [];
      if (activeUrl && !derivedUrls.includes(activeUrl))
        derivedUrls.unshift(activeUrl);

      // Create initial page entry if none exists
      let pages = Array.isArray(this.reportData?.pages)
        ? [...this.reportData.pages]
        : [];
      if (pages.length === 0 && activeUrl) {
        pages.push({
          url: activeUrl,
          timestamp: Date.now(),
          scanResults: null, // Placeholder; a future scan can populate
        });
      }

      const initialReport = {
        ...this.reportData,
        title: this.reportData?.title || "Untitled Accessibility Report",
        urls: derivedUrls,
        pages,
        timestamp: Date.now(),
        lastModified: Date.now(),
        autoCreated: true,
      };

      const saved = await this.accessibilityDB.saveReportObject(initialReport);
      this.reportId = saved.id;
      this.reportData = saved;
      this.isNewReport = false; // Subsequent saves become updates

      // Reflect new ID in URL for deep-linking
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("reportId", this.reportId);
      window.history.replaceState({}, "", newUrl.toString());

      console.log("Auto-created new report with ID:", this.reportId);
    } catch (e) {
      console.error("Failed to auto-persist new report:", e);
    }
  }

  async initializeDatabase() {
    this.accessibilityDB = new AccessibilityDatabase();
    await this.accessibilityDB.init();
  }

  parseUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    this.reportId = urlParams.get("reportId");
    this.sourceUrl = urlParams.get("sourceUrl");
    this.isNewReport = !this.reportId;

    console.log(
      "Report mode:",
      this.isNewReport ? "New Report" : `Editing Report ${this.reportId}`
    );
  }

  setupEventListeners() {
    // Form change listeners
    const form = document.getElementById("report-form");
    form.addEventListener("input", () => this.updatePreview());
    form.addEventListener("change", () => this.updatePreview());

    // Button handlers
    document
      .getElementById("save-report-btn")
      .addEventListener("click", () => this.saveReport());
    document
      .getElementById("export-report-btn")
      .addEventListener("click", () => this.exportReport());
    document
      .getElementById("reset-form-btn")
      .addEventListener("click", () => this.resetForm());
    document
      .getElementById("close-report-btn")
      .addEventListener("click", () => this.closeReport());

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        this.saveReport();
      }
    });
  }

  setDefaultValues() {
    // Set current date
    const dateInput = document.getElementById("report-date");
    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;

    // Set default title
    const titleInput = document.getElementById("report-title");
    if (!titleInput.value) {
      titleInput.value = `Accessibility Audit Report - ${new Date().toLocaleDateString()}`;
    }

    // Set default version
    const versionInput = document.getElementById("report-version");
    if (!versionInput.value) {
      versionInput.value = "1.0";
    }
  }

  async loadExistingReport() {
    try {
      this.showLoading("Loading report data...");

      const report = await this.accessibilityDB.getReport(this.reportId);
      if (!report) {
        throw new Error("Report not found");
      }

      this.reportData = report;
      this.populateForm(report);
    } catch (error) {
      console.error("Failed to load existing report:", error);
      this.showError("Failed to load report data");
    } finally {
      this.hideLoading();
    }
  }

  async loadScanData() {
    try {
      this.showLoading("Loading accessibility scan data...");

      // Get current tab data from extension storage or latest scan
      const reports = await this.accessibilityDB.getAllReports();

      if (reports.length > 0) {
        // Use the most recent report as base data
        const latestReport = reports.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        )[0];
        // Normalize URLs
        const urls = Array.isArray(latestReport.urls)
          ? latestReport.urls
          : latestReport.url
          ? [latestReport.url]
          : [];
        this.reportData = { ...latestReport, urls };
      } else {
        // Create empty report structure
        this.reportData = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          title: "",
          pages: [],
          deviceId: "web-interface",
          totalViolations: 0,
          totalPasses: 0,
          urls: [],
        };
      }
    } catch (error) {
      console.error("Failed to load scan data:", error);
      this.showError("Failed to load accessibility data");
    } finally {
      this.hideLoading();
    }
  }

  populateForm(report) {
    // Populate form with report data
    const form = document.getElementById("report-form");
    const formData = new FormData(form);

    // Set basic fields
    document.getElementById("report-title").value = report.title || "";
    document.getElementById("report-date").value =
      report.date || new Date(report.timestamp).toISOString().split("T")[0];
    document.getElementById("report-version").value = report.version || "1.0";
    document.getElementById("report-description").value =
      report.description || "";
    document.getElementById("auditor-name").value = report.auditor || "";
    document.getElementById("organization").value = report.organization || "";

    // Set checkboxes
    document.getElementById("include-passes").checked =
      report.includePasses !== false;
    document.getElementById("group-by-page").checked =
      report.groupByPage !== false;

    // Set select fields
    if (report.guidelines && Array.isArray(report.guidelines)) {
      const guidelinesSelect = document.getElementById("guidelines");
      Array.from(guidelinesSelect.options).forEach((option) => {
        option.selected = report.guidelines.includes(option.value);
      });
    }

    if (report.format) {
      document.getElementById("report-format").value = report.format;
    }
  }

  getFormData() {
    const form = document.getElementById("report-form");
    const formData = new FormData(form);

    // Get selected guidelines
    const guidelinesSelect = document.getElementById("guidelines");
    const guidelines = Array.from(guidelinesSelect.selectedOptions).map(
      (option) => option.value
    );

    return {
      title: formData.get("title") || "Accessibility Report",
      date: formData.get("date"),
      version: formData.get("version") || "1.0",
      description: formData.get("description") || "",
      auditor: formData.get("auditor") || "",
      organization: formData.get("organization") || "",
      guidelines: guidelines,
      includePasses: formData.get("includePasses") === "on",
      groupByPage: formData.get("groupByPage") === "on",
      format: formData.get("format") || "html",
    };
  }

  updatePreview() {
    const formData = this.getFormData();
    const previewContainer = document.getElementById("report-preview");

    if (!this.reportData) {
      previewContainer.innerHTML = `
        <div class="preview-loading">
          <div class="spinner"></div>
          <span>Loading report data...</span>
        </div>
      `;
      return;
    }

    // Calculate statistics
    const totalPages = this.reportData.pages?.length || 0;
    const totalViolations =
      this.reportData.pages?.reduce(
        (sum, page) => sum + (page.scanResults?.violations?.length || 0),
        0
      ) || 0;
    const totalPasses =
      this.reportData.pages?.reduce(
        (sum, page) => sum + (page.scanResults?.passes?.length || 0),
        0
      ) || 0;

    previewContainer.innerHTML = `
      <div class="report-content">
        <h1 class="report-title">${formData.title}</h1>
        
        <div class="report-meta">
          <div class="meta-item">
            <span class="meta-label">Date</span>
            <span class="meta-value">${new Date(
              formData.date
            ).toLocaleDateString()}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Version</span>
            <span class="meta-value">${formData.version}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Auditor</span>
            <span class="meta-value">${
              formData.auditor || "Not specified"
            }</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Organization</span>
            <span class="meta-value">${
              formData.organization || "Not specified"
            }</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Guidelines</span>
            <span class="meta-value">${
              formData.guidelines.join(", ") || "Not specified"
            }</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Format</span>
            <span class="meta-value">${formData.format.toUpperCase()}</span>
          </div>
        </div>

        ${
          formData.description
            ? `
          <div class="report-summary">
            <h3>Description</h3>
            <p>${formData.description}</p>
          </div>
        `
            : ""
        }
        
        <div class="report-summary">
          <h3>Summary</h3>
          <div class="summary-stats">
            <div class="stat-card">
              <span class="stat-number pages">${totalPages}</span>
              <span class="stat-label">Pages Scanned</span>
            </div>
            <div class="stat-card">
              <span class="stat-number violations">${totalViolations}</span>
              <span class="stat-label">Violations Found</span>
            </div>
            ${
              formData.includePasses
                ? `
              <div class="stat-card">
                <span class="stat-number passes">${totalPasses}</span>
                <span class="stat-label">Checks Passed</span>
              </div>
            `
                : ""
            }
          </div>
          
          ${
            totalPages > 0
              ? `
            <div class="pages-preview">
              <h4>Pages in Report</h4>
              <ul>
                ${this.reportData.pages
                  .slice(0, 5)
                  .map(
                    (page) => `
                  <li>${new URL(page.url).pathname} (${
                      page.scanResults?.violations?.length || 0
                    } violations)</li>
                `
                  )
                  .join("")}
                ${
                  this.reportData.pages.length > 5
                    ? `<li>... and ${
                        this.reportData.pages.length - 5
                      } more pages</li>`
                    : ""
                }
              </ul>
            </div>
          `
              : "<p>No pages available for this report.</p>"
          }
        </div>
      </div>
    `;
  }

  async saveReport() {
    try {
      this.showLoading("Saving report...");

      const formData = this.getFormData();

      // Update report data with form values
      const updatedReport = {
        ...this.reportData,
        ...formData,
        timestamp: this.isNewReport
          ? new Date().toISOString()
          : this.reportData.timestamp,
        lastModified: new Date().toISOString(),
      };

      if (this.isNewReport) {
        // Save as new report using saveReportObject (passing full report)
        const saved = await this.accessibilityDB.saveReportObject(
          updatedReport
        );
        this.reportId = saved.id;
        this.isNewReport = false;

        // Update URL without page reload
        const newUrl = new URL(window.location);
        newUrl.searchParams.set("reportId", this.reportId);
        window.history.replaceState({}, "", newUrl);
      } else {
        // Update existing report
        await this.accessibilityDB.updateReport(this.reportId, updatedReport);
      }

      this.reportData = updatedReport;
      this.showSuccess("Report saved successfully!");
    } catch (error) {
      console.error("Failed to save report:", error);
      this.showError("Failed to save report");
    } finally {
      this.hideLoading();
    }
  }

  async exportReport() {
    try {
      const formData = this.getFormData();
      this.showLoading(`Generating ${formData.format.toUpperCase()} report...`);

      // Create export data
      const exportData = {
        ...this.reportData,
        ...formData,
        generatedAt: new Date().toISOString(),
      };

      switch (formData.format) {
        case "html":
          this.exportAsHTML(exportData);
          break;
        case "json":
          this.exportAsJSON(exportData);
          break;
        case "csv":
          this.exportAsCSV(exportData);
          break;
        case "pdf":
          this.showError("PDF export is not yet implemented");
          break;
        default:
          this.exportAsJSON(exportData);
      }
    } catch (error) {
      console.error("Failed to export report:", error);
      this.showError("Failed to export report");
    } finally {
      this.hideLoading();
    }
  }

  exportAsHTML(data) {
    // Create HTML report content
    const htmlContent = this.generateHTMLReport(data);
    const blob = new Blob([htmlContent], { type: "text/html" });
    this.downloadFile(
      blob,
      `${data.title.replace(/[^a-z0-9]/gi, "_")}_report.html`
    );
  }

  exportAsJSON(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    this.downloadFile(
      blob,
      `${data.title.replace(/[^a-z0-9]/gi, "_")}_report.json`
    );
  }

  exportAsCSV(data) {
    let csv = "Page URL,Rule ID,Impact,Description,Target Elements,Help URL\n";

    data.pages?.forEach((page) => {
      page.scanResults?.violations?.forEach((violation) => {
        violation.nodes?.forEach((node) => {
          const target = node.target?.join(", ") || "";
          csv += `"${page.url}","${violation.id}","${violation.impact}","${violation.description}","${target}","${violation.helpUrl}"\n`;
        });
      });
    });

    const blob = new Blob([csv], { type: "text/csv" });
    this.downloadFile(
      blob,
      `${data.title.replace(/[^a-z0-9]/gi, "_")}_report.csv`
    );
  }

  generateHTMLReport(data) {
    // This would generate a complete HTML report
    // For now, return a basic template
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #333; border-bottom: 3px solid #4f46e5; padding-bottom: 10px; }
          .meta { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .stat { display: inline-block; margin: 10px; padding: 15px; background: white; border: 1px solid #ddd; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>${data.title}</h1>
        <div class="meta">
          <p><strong>Date:</strong> ${new Date(
            data.date
          ).toLocaleDateString()}</p>
          <p><strong>Version:</strong> ${data.version}</p>
          ${
            data.auditor
              ? `<p><strong>Auditor:</strong> ${data.auditor}</p>`
              : ""
          }
          ${
            data.organization
              ? `<p><strong>Organization:</strong> ${data.organization}</p>`
              : ""
          }
          <p><strong>Guidelines:</strong> ${data.guidelines.join(", ")}</p>
        </div>
        ${data.description ? `<p>${data.description}</p>` : ""}
        <h2>Summary</h2>
        <div class="stat">Pages: ${data.pages?.length || 0}</div>
        <div class="stat">Violations: ${data.pages?.reduce(
          (sum, page) => sum + (page.scanResults?.violations?.length || 0),
          0
        )}</div>
        ${
          data.includePasses
            ? `<div class="stat">Passes: ${data.pages?.reduce(
                (sum, page) => sum + (page.scanResults?.passes?.length || 0),
                0
              )}</div>`
            : ""
        }
        <p><em>Generated by Nexus Accessibility Testing Toolkit on ${new Date().toLocaleString()}</em></p>
      </body>
      </html>
    `;
  }

  downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showSuccess(`Report exported as ${filename}`);
  }

  resetForm() {
    if (confirm("Are you sure you want to reset the form to default values?")) {
      document.getElementById("report-form").reset();
      this.setDefaultValues();
      this.updatePreview();
    }
  }

  closeReport() {
    if (
      confirm(
        "Are you sure you want to close this report? Any unsaved changes will be lost."
      )
    ) {
      window.close();
    }
  }

  showLoading(message = "Loading...") {
    const overlay = document.getElementById("loading-overlay");
    const messageEl = document.getElementById("loading-message");
    messageEl.textContent = message;
    overlay.style.display = "flex";
  }

  hideLoading() {
    const overlay = document.getElementById("loading-overlay");
    overlay.style.display = "none";
  }

  showSuccess(message) {
    // Simple success notification
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      font-weight: 500;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  showError(message) {
    // Simple error notification
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      font-weight: 500;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  const reportInterface = new ReportInterface();
  await reportInterface.init();
});
