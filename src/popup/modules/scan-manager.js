/**
 * Scan Manager - Handles all accessibility scanning functionality
 */
class ScanManager {
  constructor() {
    this.isScanning = false;
    this.accessibilityDB = null;
  }

  setDatabase(db) {
    this.accessibilityDB = db;
  }

  async getCachedScanResults() {
    console.log("=== NEW DEBUG VERSION - getCachedScanResults ===");
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tabs.length) {
        throw new Error("No active tab found");
      }

      const tab = tabs[0];
      console.log("Target tab ID:", tab.id);

      // First ping the content script to see if it's available
      try {
        const pingResponse = await chrome.tabs.sendMessage(tab.id, {
          type: "ping",
          timestamp: Date.now(),
        });
        console.log("Content script ping response:", pingResponse);
      } catch (pingError) {
        console.log("Content script not available:", pingError);
        throw new Error("Content script communication failed");
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "getCachedResults",
        timestamp: Date.now(),
      });

      // Try multiple ways to log the response
      console.log("=== RESPONSE DEBUG START ===");
      console.log("Raw response:", response);
      console.log(
        "Response keys:",
        response ? Object.keys(response) : "no response"
      );
      console.log("Success value:", response?.success);
      console.log("Data value:", response?.data);
      console.log("Data is null:", response?.data === null);
      console.log("Data is undefined:", response?.data === undefined);
      console.log("Data type:", typeof response?.data);

      if (response?.data) {
        console.log("Data keys:", Object.keys(response.data));
        console.log("Data content:", response.data);
      }
      console.log("=== RESPONSE DEBUG END ===");

      if (response?.success && response?.data) {
        console.log("Condition passed - returning data");
        return response.data;
      }

      console.log(
        "Condition failed - success:",
        response?.success,
        "data:",
        !!response?.data
      );
      return null;
    } catch (error) {
      console.error("Failed to get cached scan results:", error);
      throw error;
    }
  }

  async runAxeScan() {
    console.log("Running new axe scan...");
    this.isScanning = true;

    // Show loading state
    const loadingElement = document.getElementById("alerts-loading");
    const contentElement = document.getElementById("alerts-content");
    const errorElement = document.getElementById("alerts-error");

    if (loadingElement) loadingElement.style.display = "flex";
    if (contentElement) contentElement.style.display = "none";
    if (errorElement) errorElement.style.display = "none";

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Check if the page is a supported URL (allow file:// URLs)
      if (
        !tab ||
        !tab.url ||
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("moz-extension://") ||
        tab.url === "about:blank"
      ) {
        throw new Error("Cannot scan this page type");
      }

      // Try a simple approach first - inject and run axe directly
      try {
        const scanResults = await chrome.tabs.sendMessage(tab.id, {
          action: "runAccessibilityScan",
        });

        if (scanResults?.data?.scanResults) {
          const results = scanResults.data.scanResults;

          // Send badge update message as backup
          try {
            const violationCount = results.violations?.length || 0;
            chrome.runtime.sendMessage({
              action: "scanCompleted",
              violationCount: violationCount,
              tabId: tab.id,
            });
            console.log(
              `[ScanManager] Sent badge update: ${violationCount} violations for tab ${tab.id}`
            );
          } catch (error) {
            console.warn("[ScanManager] Failed to send badge update:", error);
          }

          return results;
        } else if (scanResults?.error) {
          throw new Error(scanResults.error);
        } else {
          throw new Error("No scan results received");
        }
      } catch (directError) {
        console.warn(
          "Direct scan failed, trying fallback approach:",
          directError
        );

        // Fallback to message-based approach
        try {
          // First, run a diagnostic check
          await chrome.tabs.sendMessage(tab.id, { action: "ping" });

          // Use a timeout promise to avoid hanging
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Scan request timed out")), 30000)
          );

          const scanPromise = chrome.tabs.sendMessage(tab.id, {
            action: "runAccessibilityScan",
            options: { timeout: 25000 },
          });

          const response = await Promise.race([scanPromise, timeoutPromise]);

          if (response?.data?.scanResults) {
            const results = response.data.scanResults;

            // Send badge update message as backup
            try {
              const violationCount = results.violations?.length || 0;
              chrome.runtime.sendMessage({
                action: "scanCompleted",
                violationCount: violationCount,
                tabId: tab.id,
              });
              console.log(
                `[ScanManager] Sent fallback badge update: ${violationCount} violations for tab ${tab.id}`
              );
            } catch (error) {
              console.warn(
                "[ScanManager] Failed to send fallback badge update:",
                error
              );
            }

            return results;
          } else if (response?.status === "scanning") {
            // If scan is in progress, wait a bit and check again
            let retryCount = 0;
            const maxRetries = 5;

            while (retryCount < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              retryCount++;

              const retryResponse = await chrome.tabs.sendMessage(tab.id, {
                action: "getCachedResults",
              });

              if (retryResponse?.data?.scanResults) {
                const results = retryResponse.data.scanResults;

                // Send badge update message as backup
                try {
                  const violationCount = results.violations?.length || 0;
                  chrome.runtime.sendMessage({
                    action: "scanCompleted",
                    violationCount: violationCount,
                    tabId: tab.id,
                  });
                  console.log(
                    `[ScanManager] Sent retry badge update: ${violationCount} violations for tab ${tab.id}`
                  );
                } catch (error) {
                  console.warn(
                    "[ScanManager] Failed to send retry badge update:",
                    error
                  );
                }

                return results;
              }
            }
            throw new Error("Scan is taking too long. Please try again.");
          } else {
            throw new Error(
              response?.error || "Failed to run accessibility scan"
            );
          }
        } catch (fallbackError) {
          console.error("Fallback scan also failed:", fallbackError);
          throw fallbackError;
        }
      }
    } catch (error) {
      console.error("Axe scan failed:", error);
      // Update error message
      const errorMessage =
        error.message ||
        "Failed to run accessibility scan. Please refresh the page and try again.";

      if (loadingElement) loadingElement.style.display = "none";
      if (contentElement) contentElement.style.display = "none";
      if (errorElement) {
        errorElement.style.display = "flex";
        const errorMessageEl = errorElement.querySelector(".error-message");
        if (errorMessageEl) {
          errorMessageEl.textContent = errorMessage;
        } else {
          console.warn("Error message element not found");
        }
      }

      throw error;
    } finally {
      this.isScanning = false;
    }
  }

  async saveResultsToDatabase(scanResults, isManual = true) {
    if (!this.accessibilityDB) {
      throw new Error("Database not initialized");
    }

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      await this.accessibilityDB.saveReport(tab.url, scanResults, {
        type: isManual ? "manual" : "auto",
        userAgent: navigator.userAgent,
      });

      console.log("Scan results saved to IndexedDB");
    } catch (error) {
      console.error("Failed to save results to database:", error);
      throw error;
    }
  }

  async loadFromIndexedDB() {
    if (!this.accessibilityDB) {
      return null;
    }

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      const report = await this.accessibilityDB.getLatestReport(tab.url);
      if (report && report.scanResults) {
        console.log("Loaded scan results from IndexedDB");
        return report.scanResults;
      }
    } catch (error) {
      console.error("Failed to load from IndexedDB:", error);
    }
    return null;
  }

  async createManualReport() {
    if (!this.accessibilityDB) {
      throw new Error("Database not initialized");
    }

    const newReportStatus = document.getElementById("new-report-status");

    // Show loading state
    newReportStatus.style.display = "block";
    newReportStatus.className = "status-message info";
    newReportStatus.textContent = "🔄 Creating report...";

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.url) {
        throw new Error("Unable to access current tab");
      }

      // Request a fresh scan from the content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "runAccessibilityScan",
        options: { timeout: 25000 },
      });

      if (!response?.data?.scanResults) {
        throw new Error(
          response?.error || "Failed to get scan results from content script"
        );
      }

      const scanResults = response.data.scanResults;

      // Save as manual report (only type available now)
      await this.saveResultsToDatabase(scanResults, true);

      // Update UI with the results
      if (window.uiManager) {
        window.uiManager.displayAlerts(scanResults);
      }

      // Show success message
      const primaryReportBtn = document.getElementById("primary-report-btn");
      primaryReportBtn.innerHTML =
        '<span class="button-icon">✅</span> Report Created';
      newReportStatus.className = "status-message success";
      newReportStatus.textContent = `✓ Report created successfully for ${
        new URL(tab.url).hostname
      }`;

      // Hide status after 3 seconds and update button state
      setTimeout(async () => {
        newReportStatus.style.display = "none";
        if (window.reportsManager) {
          await window.reportsManager.updateReportButtonState();
        }
      }, 3000);

      return scanResults;
    } catch (error) {
      console.error("Failed to create new report:", error);
      newReportStatus.className = "status-message error";
      newReportStatus.textContent = `✗ Failed to create report: ${error.message}`;

      const primaryReportBtn = document.getElementById("primary-report-btn");
      primaryReportBtn.innerHTML =
        '<span class="button-icon">❌</span> Report Failed';

      setTimeout(async () => {
        if (window.reportsManager) {
          await window.reportsManager.updateReportButtonState();
        }
      }, 3000);

      throw error;
    }
  }
}

window.ScanManager = ScanManager;
