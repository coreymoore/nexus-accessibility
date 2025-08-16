/**
 * AccessibilityDatabase - IndexedDB wrapper for accessibility scan results
 * Handles persistent storage with conflict resolution and export/import capabilities
 */
class AccessibilityDatabase {
  constructor() {
    this.dbName = "AccessibilityReports";
    this.version = 2; // Increment version for schema change
    this.db = null;
    this.deviceId = null;
  }

  /**
   * Initialize the database and device ID
   */
  async init() {
    if (this.db) return; // Already initialized

    // Initialize database first
    await this.initDatabase();

    // Then get or generate device ID
    this.deviceId = await this.getOrCreateDeviceId();
  }

  /**
   * Initialize just the IndexedDB connection
   */
  async initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const transaction = event.target.transaction;

        // Create reports store if it doesn't exist
        let reportsStore;
        if (!db.objectStoreNames.contains("reports")) {
          reportsStore = db.createObjectStore("reports", { keyPath: "id" });
          reportsStore.createIndex("urls", "urls", {
            unique: false,
            multiEntry: true,
          });
          reportsStore.createIndex("timestamp", "timestamp", { unique: false });
          reportsStore.createIndex("deviceId", "deviceId", { unique: false });
        } else {
          reportsStore = transaction.objectStore("reports");
        }

        // Handle version upgrades
        if (event.oldVersion < 2) {
          // Migrate from url (string) to urls (array)
          if (reportsStore.indexNames.contains("url")) {
            reportsStore.deleteIndex("url");
          }

          // Add new urls index if it doesn't exist
          if (!reportsStore.indexNames.contains("urls")) {
            reportsStore.createIndex("urls", "urls", {
              unique: false,
              multiEntry: true,
            });
          }

          // Migration will happen after the upgrade is complete
          transaction.oncomplete = () => {
            this.migrateUrlToUrls();
          };
        }

        // Create settings store for device ID and other metadata
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      };
    });
  }

  /**
   * Migrate existing reports from url (string) to urls (array)
   */
  async migrateUrlToUrls() {
    if (!this.db) return;

    console.log("Migrating database from url to urls format...");

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["reports"], "readwrite");
      const store = transaction.objectStore("reports");
      const request = store.getAll();

      request.onsuccess = () => {
        const reports = request.result;
        const updatePromises = [];

        reports.forEach((report) => {
          if (report.url && !report.urls) {
            // Collect all URLs from the report
            const urls = new Set([report.url]);

            // Add URLs from pages if they exist
            if (report.pages && Array.isArray(report.pages)) {
              report.pages.forEach((page) => {
                if (page.url) urls.add(page.url);
              });
            }

            // Update the report
            report.urls = Array.from(urls);
            delete report.url; // Remove old field

            const updateRequest = store.put(report);
            updatePromises.push(
              new Promise((res, rej) => {
                updateRequest.onsuccess = () => res();
                updateRequest.onerror = () => rej(updateRequest.error);
              })
            );
          }
        });

        Promise.all(updatePromises)
          .then(() => {
            console.log(
              `Migrated ${updatePromises.length} reports to new format`
            );
            resolve();
          })
          .catch(reject);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get or generate a unique device ID (doesn't call init to avoid recursion)
   */
  async getOrCreateDeviceId() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["settings"], "readwrite");
      const store = transaction.objectStore("settings");
      const request = store.get("deviceId");

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.value);
        } else {
          // Generate new device ID
          const newDeviceId =
            "device_" +
            Date.now() +
            "_" +
            Math.random().toString(36).substr(2, 9);
          const putRequest = store.put({ key: "deviceId", value: newDeviceId });
          putRequest.onsuccess = () => resolve(newDeviceId);
          putRequest.onerror = () => reject(putRequest.error);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get or generate a unique device ID for conflict resolution (legacy method for compatibility)
   */
  async getDeviceId() {
    if (!this.db) {
      throw new Error("Database not initialized. Call init() first.");
    }

    return this.deviceId || (await this.getOrCreateDeviceId());
  }

  /**
   * Save a scan result to the database (all reports are now manual)
   */
  async saveReport(url, scanResults) {
    if (!this.db) await this.init();

    const urls = Array.isArray(url) ? url : [url];
    const primaryUrl = urls[0];

    const report = {
      id: `${primaryUrl}_${this.deviceId}_${Date.now()}`,
      urls: urls,
      deviceId: this.deviceId,
      timestamp: Date.now(),
      scanResults: scanResults,
      isManual: true,
      version: 2,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["reports"], "readwrite");
      const store = transaction.objectStore("reports");
      const request = store.put(report);

      request.onsuccess = () => resolve(report.id);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get the most recent report for a URL
   */
  async getLatestReport(url) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["reports"], "readonly");
      const store = transaction.objectStore("reports");
      const index = store.index("urls");
      const request = index.getAll(url);

      request.onsuccess = () => {
        const reports = request.result;
        if (reports.length === 0) {
          resolve(null);
        } else {
          // Sort by timestamp descending and return the most recent
          reports.sort((a, b) => b.timestamp - a.timestamp);
          resolve(reports[0]);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all reports for a specific URL
   */
  async getAllReportsForUrl(url) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["reports"], "readonly");
      const store = transaction.objectStore("reports");
      const index = store.index("urls");
      const request = index.getAll(url);

      request.onsuccess = () => {
        const reports = request.result;
        // Sort by timestamp descending (most recent first)
        reports.sort((a, b) => b.timestamp - a.timestamp);
        resolve(reports);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if a URL has existing reports
   */
  async hasReportsForUrl(url) {
    const reports = await this.getAllReportsForUrl(url);
    return reports.length > 0;
  }

  /**
   * Get a report by ID
   */
  async getReportById(reportId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["reports"], "readonly");
      const store = transaction.objectStore("reports");
      const request = store.get(reportId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Append scan results to an existing report
   */
  async appendToReport(reportId, newScanResults, currentUrl) {
    if (!this.db) await this.init();

    const existingReport = await this.getReportById(reportId);
    if (!existingReport) {
      throw new Error("Report not found");
    }

    // Create a new entry for this URL within the report
    const urlEntry = {
      url: currentUrl,
      timestamp: Date.now(),
      scanResults: newScanResults,
    };

    // Initialize pages array if it doesn't exist (for backwards compatibility)
    if (!existingReport.pages) {
      const originalUrl = existingReport.urls
        ? existingReport.urls[0]
        : existingReport.url;
      existingReport.pages = [
        {
          url: originalUrl,
          timestamp: existingReport.timestamp,
          scanResults: existingReport.scanResults,
        },
      ];
    }

    // Add the new page
    existingReport.pages.push(urlEntry);

    // Update the report's timestamp, URL list, and URLs array
    existingReport.lastUpdated = Date.now();
    existingReport.urlCount = existingReport.pages.length;

    // Update the urls array to include all unique URLs from pages
    const allUrls = existingReport.pages.map((page) => page.url);
    existingReport.urls = [...new Set(allUrls)]; // Remove duplicates

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["reports"], "readwrite");
      const store = transaction.objectStore("reports");
      const request = store.put(existingReport);

      request.onsuccess = () => resolve(existingReport);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all reports with basic info (for selection lists)
   */
  async getReportSummaries() {
    const reports = await this.getAllReports();

    return reports.map((report) => ({
      id: report.id,
      urls: report.urls || (report.url ? [report.url] : []), // Handle migration from single url
      primaryUrl: report.urls ? report.urls[0] : report.url, // For backward compatibility
      timestamp: report.timestamp,
      lastUpdated: report.lastUpdated || report.timestamp,
      urlCount: report.urlCount || 1,
      violationCount: report.scanResults?.violations?.length || 0,
      pages: report.pages || [],
    }));
  }

  /**
   * Get all reports from all devices (for export)
   */
  async getAllReports() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["reports"], "readonly");
      const store = transaction.objectStore("reports");
      const request = store.getAll();

      request.onsuccess = () => {
        const reports = request.result.map((r) => {
          // Normalize legacy structure to ensure urls exists
          if (!r.urls) {
            const urls = [];
            if (r.url) urls.push(r.url);
            if (r.pages && Array.isArray(r.pages)) {
              r.pages.forEach((p) => {
                if (p.url) urls.push(p.url);
              });
            }
            r.urls = [...new Set(urls)];
          }
          return r;
        });
        reports.sort((a, b) => b.timestamp - a.timestamp);
        resolve(reports);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Export all data as JSON
   */
  async exportData() {
    const reports = await this.getAllReports();
    const settings = await this.getSettings();

    return {
      version: 1,
      exportTimestamp: Date.now(),
      deviceId: this.deviceId,
      reports: reports,
      settings: settings,
    };
  }

  /**
   * Import data from JSON with conflict resolution
   */
  async importData(importData, conflictStrategy = "timestamp") {
    if (!this.db) await this.init();

    const results = {
      imported: 0,
      skipped: 0,
      conflicts: 0,
      errors: [],
    };

    for (const report of importData.reports) {
      try {
        // Handle both old format (single url) and new format (urls array) for import
        const reportUrls = report.urls || (report.url ? [report.url] : []);
        const primaryUrl = reportUrls[0] || "unknown";

        const existingReports = await this.getAllReportsForUrl(primaryUrl);
        const conflict = existingReports.find(
          (existing) =>
            existing.deviceId !== report.deviceId &&
            Math.abs(existing.timestamp - report.timestamp) < 60000 // Within 1 minute
        );

        if (conflict) {
          results.conflicts++;

          switch (conflictStrategy) {
            case "timestamp":
              // Keep the newer report
              if (report.timestamp > conflict.timestamp) {
                await this.saveImportedReport(report);
                results.imported++;
              } else {
                results.skipped++;
              }
              break;
            case "device":
              // Always import, keeping device-specific reports
              await this.saveImportedReport(report);
              results.imported++;
              break;
            case "skip":
              results.skipped++;
              break;
          }
        } else {
          await this.saveImportedReport(report);
          results.imported++;
        }
      } catch (error) {
        const reportUrls =
          report.urls || (report.url ? [report.url] : ["unknown"]);
        const primaryUrl = reportUrls[0];
        results.errors.push(
          `Error importing report for ${primaryUrl}: ${error.message}`
        );
      }
    }

    return results;
  }

  /**
   * Save an imported report (preserving original device ID and timestamp)
   */
  async saveImportedReport(report) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["reports"], "readwrite");
      const store = transaction.objectStore("reports");
      const request = store.put(report);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all settings
   */
  async getSettings() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["settings"], "readonly");
      const store = transaction.objectStore("settings");
      const request = store.getAll();

      request.onsuccess = () => {
        const settings = {};
        request.result.forEach((item) => {
          settings[item.key] = item.value;
        });
        resolve(settings);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data (for fresh import)
   */
  async clearAllData() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["reports"], "readwrite");
      const store = transaction.objectStore("reports");
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a report by ID (alias for getReportById for compatibility)
   */
  async getReport(reportId) {
    return await this.getReportById(reportId);
  }

  /**
   * Update an existing report
   */
  async updateReport(reportId, updatedData) {
    if (!this.db) await this.init();

    const existingReport = await this.getReportById(reportId);
    if (!existingReport) {
      throw new Error("Report not found");
    }

    // Merge the updated data with the existing report
    const updatedReport = {
      ...existingReport,
      ...updatedData,
      id: reportId, // Ensure ID doesn't change
      lastModified: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["reports"], "readwrite");
      const store = transaction.objectStore("reports");
      const request = store.put(updatedReport);

      request.onsuccess = () => resolve(updatedReport);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a report by ID
   */
  async deleteReport(reportId) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["reports"], "readwrite");
      const store = transaction.objectStore("reports");
      const request = store.delete(reportId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save a complete report object (for report interface)
   */
  async saveReportObject(reportData) {
    if (!this.db) await this.init();

    // Ensure required fields
    const urls = Array.isArray(reportData.urls)
      ? reportData.urls
      : reportData.url
      ? [reportData.url]
      : [];
    const primaryUrl = urls[0] || "unknown";
    const report = {
      ...reportData,
      urls,
      id: reportData.id || `${primaryUrl}_${this.deviceId}_${Date.now()}`,
      deviceId: reportData.deviceId || this.deviceId,
      timestamp: reportData.timestamp || Date.now(),
      isManual: true,
      version: reportData.version || 2,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["reports"], "readwrite");
      const store = transaction.objectStore("reports");
      const request = store.put(report);

      request.onsuccess = () => resolve(report);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const reports = await this.getAllReports();
    const uniqueUrls = [
      ...new Set(
        reports.flatMap((r) => {
          // Handle both old format (single URL) and new format (multiple pages)
          if (r.pages && Array.isArray(r.pages)) {
            return r.pages.map((p) => p.url);
          } else {
            return [r.url];
          }
        })
      ),
    ];
    const uniqueDevices = [...new Set(reports.map((r) => r.deviceId))];

    // Calculate total violations and passes
    const totalViolations = reports.reduce((sum, report) => {
      if (report.pages && Array.isArray(report.pages)) {
        return (
          sum +
          report.pages.reduce(
            (pageSum, page) =>
              pageSum + (page.scanResults?.violations?.length || 0),
            0
          )
        );
      } else {
        return sum + (report.scanResults?.violations?.length || 0);
      }
    }, 0);

    const totalPasses = reports.reduce((sum, report) => {
      if (report.pages && Array.isArray(report.pages)) {
        return (
          sum +
          report.pages.reduce(
            (pageSum, page) =>
              pageSum + (page.scanResults?.passes?.length || 0),
            0
          )
        );
      } else {
        return sum + (report.scanResults?.passes?.length || 0);
      }
    }, 0);

    const totalPages = reports.reduce((sum, report) => {
      if (report.pages && Array.isArray(report.pages)) {
        return sum + report.pages.length;
      } else {
        return sum + 1;
      }
    }, 0);

    return {
      totalReports: reports.length,
      totalPages: totalPages,
      totalViolations: totalViolations,
      totalPasses: totalPasses,
      uniqueUrls: uniqueUrls.length,
      uniqueDevices: uniqueDevices.length,
      oldestReport:
        reports.length > 0
          ? Math.min(...reports.map((r) => new Date(r.timestamp).getTime()))
          : null,
      newestReport:
        reports.length > 0
          ? Math.max(...reports.map((r) => new Date(r.timestamp).getTime()))
          : null,
    };
  }
}

// Export the class
window.AccessibilityDatabase = AccessibilityDatabase;
