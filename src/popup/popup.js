const popup = document.getElementById("popup");

function fetchAccessibilityData() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "getAccessibilityData" },
      (response) => {
        if (response && response.data) {
          console.log("Accessibility data:", response.data);
        } else {
          console.log("No accessibility data found.");
        }
      }
    );
  });
}

async function runAxeScan() {
  const loadingElement = document.getElementById("alerts-loading");
  const contentElement = document.getElementById("alerts-content");
  const errorElement = document.getElementById("alerts-error");

  // Show loading state
  loadingElement.style.display = "flex";
  contentElement.style.display = "none";
  errorElement.style.display = "none";

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    // Check if the page is a supported URL
    if (
      !tab.url ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("chrome-extension://") ||
      tab.url.startsWith("moz-extension://") ||
      tab.url === "about:blank"
    ) {
      throw new Error("Cannot scan this page type");
    }

    // Try a simple approach first - inject and run axe directly
    console.log("Attempting direct axe injection and scan...");

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Check if axe and config are available
          if (
            typeof window.axe !== "undefined" &&
            typeof window.AxeConfig !== "undefined"
          ) {
            return window.AxeConfig.runScan()
              .then((results) => ({
                success: true,
                violations: results.violations,
                passes: results.passes.length,
                incomplete: results.incomplete.length,
                inapplicable: results.inapplicable.length,
                url: window.location.href,
                timestamp: Date.now(),
              }))
              .catch((error) => ({
                success: false,
                error: error.message,
              }));
          } else if (typeof window.axe !== "undefined") {
            // Fallback to direct axe usage if config not available
            return window.axe
              .run({
                tags: ["wcag2a", "wcag2aa"],
              })
              .then((results) => ({
                success: true,
                violations: results.violations,
                passes: results.passes.length,
                incomplete: results.incomplete.length,
                inapplicable: results.inapplicable.length,
                url: window.location.href,
                timestamp: Date.now(),
              }))
              .catch((error) => ({
                success: false,
                error: error.message,
              }));
          } else {
            return {
              success: false,
              error: "Axe-core not available",
            };
          }
        },
      });

      if (results && results[0] && results[0].result) {
        const result = results[0].result;
        if (result.success) {
          displayAlerts(result);
          return;
        } else {
          console.log("Direct injection failed:", result.error);
        }
      }
    } catch (injectionError) {
      console.log("Script injection failed:", injectionError);
    }

    // Fallback to message-based approach
    console.log("Falling back to message-based approach...");

    // First, run a diagnostic check
    const diagnostic = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: "Diagnostic timeout" });
      }, 3000);

      chrome.tabs.sendMessage(tab.id, { action: "diagnostic" }, (response) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: `Diagnostic failed: ${chrome.runtime.lastError.message}`,
          });
        } else {
          resolve(
            response || { success: false, error: "No diagnostic response" }
          );
        }
      });
    });

    console.log("Diagnostic result:", diagnostic);

    if (diagnostic.success) {
      // Content script is responding, try to get accessibility data
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout: No response from content script"));
        }, 5000);

        chrome.tabs.sendMessage(
          tab.id,
          { action: "getPageAccessibilityData" },
          (response) => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) {
              reject(
                new Error(
                  `Content script error: ${chrome.runtime.lastError.message}`
                )
              );
            } else if (!response) {
              reject(new Error("No response from content script"));
            } else {
              resolve(response);
            }
          }
        );
      });

      if (response && response.success) {
        displayAlerts(response.data);
        return;
      } else {
        const errorMsg = response?.error || "No scan data available";

        // If scan is in progress or not yet complete, retry after a delay
        if (
          errorMsg.includes("in progress") ||
          errorMsg.includes("not yet complete")
        ) {
          console.log("Scan in progress, retrying in 2 seconds...");
          setTimeout(() => runAxeScan(), 2000);
          return;
        }

        throw new Error(errorMsg);
      }
    } else {
      throw new Error(diagnostic.error || "Content script not responding");
    }
  } catch (error) {
    console.error("Error getting page accessibility data:", error);
    loadingElement.style.display = "none";
    errorElement.style.display = "block";

    // Update error message
    const errorText = errorElement.querySelector("span");
    if (errorText) {
      if (error.message.includes("Cannot scan this page type")) {
        errorText.textContent = "Cannot scan this page (system page)";
      } else if (
        error.message.includes("not responding") ||
        error.message.includes("port closed")
      ) {
        errorText.textContent = "Extension not ready. Try refreshing the page.";
      } else if (
        error.message.includes("loading") ||
        error.message.includes("progress")
      ) {
        errorText.textContent = "Extension loading. Please wait...";
        setTimeout(() => runAxeScan(), 3000);
      } else if (error.message.includes("Timeout")) {
        errorText.textContent = "Request timed out. Please try again.";
      } else {
        errorText.textContent = `Scan error: ${error.message}`;
      }
    }
  }
}

function displayAlerts(scanResults) {
  // Update both overview summary and detailed alerts tab
  updateOverviewSummary(scanResults);
  updateDetailedAlerts(scanResults);
}

function updateOverviewSummary(scanResults) {
  const loadingElement = document.getElementById("alerts-summary-loading");
  const contentElement = document.getElementById("alerts-summary-content");
  const errorElement = document.getElementById("alerts-summary-error");
  const summaryElement = document.getElementById("alerts-overview-summary");
  const viewAllBtn = document.getElementById("view-all-alerts-btn");

  loadingElement.style.display = "none";
  contentElement.style.display = "block";

  if (scanResults.error) {
    errorElement.style.display = "block";
    contentElement.style.display = "none";
    return;
  }

  const violations = scanResults.violations || [];
  const totalAlerts = violations.reduce(
    (sum, violation) => sum + violation.nodes.length,
    0
  );

  // Group violations by impact
  const impactCounts = violations.reduce((counts, violation) => {
    const impact = violation.impact || "minor";
    counts[impact] = (counts[impact] || 0) + violation.nodes.length;
    return counts;
  }, {});

  // Display overview summary
  if (totalAlerts === 0) {
    summaryElement.innerHTML = `
      <div style="text-align: center; color: #4caf50; font-weight: 500;">
        🎉 No accessibility alerts found!
      </div>
    `;
    viewAllBtn.style.display = "none";
  } else {
    // Check if ImpactIcons is available
    const hasIcons =
      window.ImpactIcons && typeof window.ImpactIcons.getIcon === "function";

    summaryElement.innerHTML = `
      <div class="overview-stats">
        <div class="overview-stat" style="border-left-color: ${
          hasIcons
            ? window.ImpactIcons.getImpactData("critical").color
            : "#991b1b"
        };">
          <span class="overview-stat-count">${impactCounts.critical || 0}</span>
          <span class="overview-stat-label">Critical</span>
        </div>
        <div class="overview-stat" style="border-left-color: ${
          hasIcons
            ? window.ImpactIcons.getImpactData("serious").color
            : "#c2410c"
        };">
          <span class="overview-stat-count">${impactCounts.serious || 0}</span>
          <span class="overview-stat-label">Serious</span>
        </div>
        <div class="overview-stat" style="border-left-color: ${
          hasIcons
            ? window.ImpactIcons.getImpactData("moderate").color
            : "#a16207"
        };">
          <span class="overview-stat-count">${impactCounts.moderate || 0}</span>
          <span class="overview-stat-label">Moderate</span>
        </div>
        <div class="overview-stat" style="border-left-color: ${
          hasIcons ? window.ImpactIcons.getImpactData("minor").color : "#166534"
        };">
          <span class="overview-stat-count">${impactCounts.minor || 0}</span>
          <span class="overview-stat-label">Minor</span>
        </div>
      </div>
    `;
    viewAllBtn.style.display = "block";
  }
}

function updateDetailedAlerts(scanResults) {
  const loadingElement = document.getElementById("alerts-loading");
  const contentElement = document.getElementById("alerts-content");
  const listElement = document.getElementById("alerts-list");

  loadingElement.style.display = "none";
  contentElement.style.display = "block";

  if (scanResults.error) {
    document.getElementById("alerts-error").style.display = "block";
    contentElement.style.display = "none";
    return;
  }

  const violations = scanResults.violations || [];
  const totalAlerts = violations.reduce(
    (sum, violation) => sum + violation.nodes.length,
    0
  );

  // Display detailed alerts list
  if (totalAlerts === 0) {
    listElement.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #4caf50; font-weight: 500;">
        🎉 No accessibility alerts found!
      </div>
    `;
  } else {
    // Sort violations by impact severity
    const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    violations.sort((a, b) => {
      const aImpact = impactOrder[a.impact] ?? 4;
      const bImpact = impactOrder[b.impact] ?? 4;
      return aImpact - bImpact;
    });

    listElement.innerHTML = violations
      .map((violation) => {
        const impact = violation.impact || "minor";
        const hasIcons =
          window.ImpactIcons &&
          typeof window.ImpactIcons.getIcon === "function";
        const impactData = hasIcons
          ? window.ImpactIcons.getImpactData(impact)
          : {
              color:
                impact === "critical"
                  ? "#991b1b"
                  : impact === "serious"
                  ? "#c2410c"
                  : impact === "moderate"
                  ? "#a16207"
                  : "#166534",
              displayName: impact.charAt(0).toUpperCase() + impact.slice(1),
            };

        const nodeCount = violation.nodes.length;
        const pluralText = nodeCount === 1 ? "element" : "elements";

        // Get a preview of the affected elements (first 3)
        const elementPreviews = violation.nodes.slice(0, 3).map((node) => {
          const selector = node.target
            ? node.target.join(", ")
            : "Unknown element";
          const html = node.html || "No HTML available";
          return { selector, html };
        });

        const hasMoreElements = nodeCount > 3;

        return `
        <div class="alert-item ${impact}" style="border-left-color: ${
          impactData.color
        };">
          <div class="alert-header">
            ${
              hasIcons
                ? `<div style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">${window.ImpactIcons.getIcon(
                    impact,
                    { size: 20 }
                  )}</div>`
                : ""
            }
            <div style="flex: 1; min-width: 0;">
              <h3 class="alert-title">${violation.id}</h3>
            </div>
            <span class="impact-badge" style="background-color: ${
              impactData.color
            }15; color: ${impactData.color}; border: 1px solid ${
          impactData.color
        }30; padding: 4px 10px; border-radius: 16px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
              ${impactData.displayName}
            </span>
          </div>
          <p class="alert-description">${violation.description}</p>
          <div style="margin: 12px 0 8px 0;">
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; padding: 8px; margin-bottom: 8px;">
              <div style="font-size: 12px; color: #92400e; font-weight: 600;">
                ${nodeCount} affected ${pluralText}
              </div>
            </div>
            <a href="../alerts/index.html#rule-${
              violation.id
            }" target="_blank" rel="noopener" class="rule-link">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
                <path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
              </svg>
              View Rule Details
            </a>
          </div>
          <div style="margin-top: 12px;">
            <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Affected Elements Preview:</div>
            ${elementPreviews
              .map(
                (preview, index) => `
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px; margin-bottom: 4px;">
                <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 4px;">Element ${
                  index + 1
                }</div>
                <div style="font-family: 'Monaco', 'Menlo', monospace; font-size: 10px; color: #475569; word-break: break-all; margin-bottom: 4px;">${
                  preview.selector
                }</div>
                ${
                  preview.html.length > 100
                    ? `
                <div style="font-family: 'Monaco', 'Menlo', monospace; font-size: 10px; color: #64748b; max-height: 40px; overflow-y: auto; word-break: break-all;">${preview.html.substring(
                  0,
                  150
                )}${preview.html.length > 150 ? "..." : ""}</div>
                `
                    : ""
                }
              </div>
            `
              )
              .join("")}
            ${
              hasMoreElements
                ? `
              <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px; text-align: center;">
                <div style="font-size: 11px; color: #64748b;">... and ${
                  nodeCount - 3
                } more ${nodeCount - 3 === 1 ? "element" : "elements"}</div>
              </div>
            `
                : ""
            }
          </div>
        </div>
      `;
      })
      .join("");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fetchAccessibilityData();

  // Run axe scan when popup opens
  runAxeScan();

  const toggleInput = document.getElementById("toggle-extension");
  const toggleLabel = document.getElementById("toggle-label");
  const miniModeInput = document.getElementById("toggle-mini-mode");
  const miniModeLabel = document.getElementById("mini-mode-label");

  // Get initial state
  chrome.storage.sync.get(
    { extensionEnabled: true, miniMode: false },
    (data) => {
      toggleInput.checked = data.extensionEnabled;
      updateToggleLabel(data.extensionEnabled);
      miniModeInput.checked = data.miniMode;
      updateMiniModeLabel(data.miniMode);
    }
  );

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

  miniModeInput.addEventListener("change", (e) => {
    const miniMode = e.target.checked;
    chrome.storage.sync.set({ miniMode });
    updateMiniModeLabel(miniMode);
    // Send message to content script to update mini mode
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          miniMode,
        });
      }
    });
  });

  function updateToggleLabel(isEnabled) {
    toggleLabel.textContent = isEnabled
      ? "Nexus Inspector Enabled"
      : "Nexus Inspector Disabled";
  }

  function updateMiniModeLabel(miniMode) {
    miniModeLabel.textContent = miniMode ? "Mini Mode (On)" : "Mini Mode (Off)";
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

  // Accessible Tabs Logic (WAI-ARIA APG)
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
      chrome.storage.sync.set({ nexusSelectedTab: tabs.indexOf(tab) });
    }
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (e) => {
      let idx = tabs.indexOf(tab);
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
  // Restore selected tab from storage, default to first tab
  chrome.storage.sync.get({ nexusSelectedTab: 0 }, (data) => {
    const idx = Math.max(0, Math.min(tabs.length - 1, data.nexusSelectedTab));
    activateTab(tabs[idx], false);
  });

  // Add event handler for "View All Alerts" button
  const viewAllAlertsBtn = document.getElementById("view-all-alerts-btn");
  if (viewAllAlertsBtn) {
    viewAllAlertsBtn.addEventListener("click", () => {
      // Switch to the Alerts tab
      const alertsTab = document.getElementById("tab-alerts");
      if (alertsTab) {
        activateTab(alertsTab);
      }
    });
  }
});
