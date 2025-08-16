/**
 * UI Manager - Handles all UI updates and display functionality
 */
class UIManager {
  constructor() {
    this.impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  }

  displayAlerts(scanResults) {
    console.log("[UIManager] displayAlerts called with:", scanResults);
    // Update both overview summary and detailed alerts tab
    this.updateOverviewSummary(scanResults);
    this.updateDetailedAlerts(scanResults);

    // Note: Removed automatic saving - users must manually create reports
  }

  updateOverviewSummary(scanResults) {
    const overviewSummary = document.getElementById("alerts-overview-summary");
    if (!overviewSummary) return;

    const summaryWrapper = document.getElementById("alerts-summary-content");
    const blurOverlay = document.getElementById("alerts-blur-overlay");

    console.log("[UIManager] updateOverviewSummary called with:", scanResults);
    console.log("[UIManager] scanResults type:", typeof scanResults);
    console.log(
      "[UIManager] scanResults keys:",
      scanResults ? Object.keys(scanResults) : "no keys"
    );
    console.log("[UIManager] scanResults.violations:", scanResults?.violations);
    console.log("[UIManager] scanResults.passes:", scanResults?.passes);
    console.log("[UIManager] scanResults.error:", scanResults?.error);

    // Debug: Let's see what that single key contains
    if (scanResults && Object.keys(scanResults).length === 1) {
      const singleKey = Object.keys(scanResults)[0];
      console.log("[UIManager] Single key name:", singleKey);
      console.log("[UIManager] Single key value:", scanResults[singleKey]);
      console.log(
        "[UIManager] Single key value type:",
        typeof scanResults[singleKey]
      );
      if (
        typeof scanResults[singleKey] === "object" &&
        scanResults[singleKey]
      ) {
        console.log(
          "[UIManager] Single key value keys:",
          Object.keys(scanResults[singleKey])
        );
        // Let's see what violations and passes look like in the nested object
        console.log(
          "[UIManager] Nested violations:",
          scanResults[singleKey].violations
        );
        console.log(
          "[UIManager] Nested passes:",
          scanResults[singleKey].passes
        );
        console.log("[UIManager] Nested error:", scanResults[singleKey].error);
      }
    }

    // Fix the data access - the data is wrapped in a scanResults key
    const actualData = scanResults?.scanResults || scanResults;

    // Check if we have valid scan results with actual data
    const hasValidResults =
      actualData &&
      !actualData.error &&
      (actualData.violations !== undefined || actualData.passes !== undefined);

    console.log("[UIManager] actualData:", actualData);
    console.log("[UIManager] hasValidResults:", hasValidResults);
    console.log("[UIManager] Detailed check:", {
      hasActualData: !!actualData,
      noError: !actualData?.error,
      hasViolations: actualData?.violations !== undefined,
      hasPasses: actualData?.passes !== undefined,
    });

    if (!hasValidResults) {
      // No scan results - show default content with blur and inspector message
      console.log("[UIManager] No valid results - showing blur overlay");
      overviewSummary.innerHTML = `
        <div class="overview-stats">
          <div class="overview-stat" style="border-left-color: #dc2626">
            <span class="overview-stat-count">3</span>
            <span class="overview-stat-label">Critical</span>
          </div>
          <div class="overview-stat" style="border-left-color: #ea580c">
            <span class="overview-stat-count">2</span>
            <span class="overview-stat-label">Serious</span>
          </div>
          <div class="overview-stat" style="border-left-color: #d97706">
            <span class="overview-stat-count">1</span>
            <span class="overview-stat-label">Moderate</span>
          </div>
        </div>
        <div class="overview-meta" style="margin-top: 8px; font-size: 12px; color: #64748b">
          <strong>6</strong> violation rules, <strong>12</strong> passes
        </div>`;

      // Apply blur and show overlay
      if (summaryWrapper) {
        summaryWrapper.style.display = "block";
        summaryWrapper.classList.add("blurred");
        summaryWrapper.style.filter = "blur(3px)";
        summaryWrapper.style.pointerEvents = "none";
        summaryWrapper.style.userSelect = "none";
      }

      if (blurOverlay) {
        blurOverlay.style.display = "flex";

        // Update the CTA message for no cached scan
        const ctaMessage = document.querySelector(".alerts-cta-message p");
        if (ctaMessage) {
          ctaMessage.textContent =
            "Enable Inspector to Scan for Accessibility Alerts";
        }

        const overlayBtn = blurOverlay.querySelector(
          ".component-create-report"
        );
        if (overlayBtn && !overlayBtn._handlerBound) {
          overlayBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (
              window.reportsManager &&
              typeof window.reportsManager.handleNewReport === "function"
            ) {
              window.reportsManager.handleNewReport();
            }
          });
          overlayBtn._handlerBound = true;
        }
        try {
          if (window.injectIcons) window.injectIcons();
        } catch (_) {}
      }
      return;
    }

    console.log("[UIManager] Valid results found - removing blur overlay");

    // Remove blur and hide overlay when we have valid results
    if (summaryWrapper) {
      summaryWrapper.classList.remove("blurred");
      summaryWrapper.style.filter = "none";
      summaryWrapper.style.pointerEvents = "auto";
      summaryWrapper.style.userSelect = "auto";
    }

    if (blurOverlay) {
      blurOverlay.style.display = "none";
    }

    const violations = actualData.violations || [];
    const totalViolations = violations.length;
    const passes = actualData.passes ? actualData.passes.length : 0;

    console.log("[UIManager] Processing results:", {
      violationsCount: violations.length,
      passesCount: passes,
    });

    // Group by impact (count affected elements like legacy behavior)
    const impactCounts = violations.reduce((counts, v) => {
      const impact = v.impact || "minor";
      counts[impact] = (counts[impact] || 0) + v.nodes.length;
      return counts;
    }, {});

    // Build simplified overview stats similar to legacy UI
    const hasIcons =
      window.ImpactIcons &&
      typeof window.ImpactIcons.getImpactData === "function";
    const impacts = ["critical", "serious", "moderate", "minor"];
    const impactHtml = impacts
      .map((key) => {
        const count = impactCounts[key] || 0;
        if (!hasIcons) {
          const fallbackColors = {
            critical: "#991b1b",
            serious: "#c2410c",
            moderate: "#a16207",
            minor: "#166534",
          };
          return `<div class="overview-stat" style="border-left-color: ${
            fallbackColors[key]
          };"><span class="overview-stat-count">${count}</span><span class="overview-stat-label">${
            key[0].toUpperCase() + key.slice(1)
          }</span></div>`;
        }
        const data = window.ImpactIcons.getImpactData(key);
        return `<div class="overview-stat" style="border-left-color: ${data.color};"><span class="overview-stat-count">${count}</span><span class="overview-stat-label">${data.displayName}</span></div>`;
      })
      .join("");

    // Update with real scan results
    overviewSummary.innerHTML = `
      <div class="overview-stats">${impactHtml}</div>
      <div class="overview-meta" style="margin-top:8px;font-size:12px;color:#64748b;">
        <strong>${totalViolations}</strong> violation rules, <strong>${passes}</strong> passes
      </div>`;

    // Since we have scan results, remove blur and show data clearly
    if (summaryWrapper) {
      summaryWrapper.style.display = "block";
      summaryWrapper.classList.remove("blurred");
      summaryWrapper.style.filter = "none";
      summaryWrapper.style.pointerEvents = "auto";
      summaryWrapper.style.userSelect = "auto";
    }
    if (blurOverlay) {
      blurOverlay.style.display = "none";
    }

    // Reset CTA message when we have data
    const ctaMessage = document.querySelector(".alerts-cta-message p");
    if (ctaMessage) {
      ctaMessage.textContent =
        "Create a Report to Scan for Accessibility Alerts";
    }
  }

  updateDetailedAlerts(scanResults) {
    // Handle nested data structure - the actual data might be in scanResults.scanResults
    const actualData = scanResults?.scanResults || scanResults;

    const alertsContent = document.getElementById("alerts-content");
    const alertsLoading = document.getElementById("alerts-loading");
    const alertsError = document.getElementById("alerts-error");

    if (!alertsContent) {
      console.warn("Alerts content element not found");
      return;
    }

    // Hide loading and error states
    if (alertsLoading) alertsLoading.style.display = "none";
    if (alertsError) alertsError.style.display = "none";

    // Show content
    alertsContent.style.display = "block";

    // Display detailed alerts list
    if (
      !actualData ||
      !actualData.violations ||
      actualData.violations.length === 0
    ) {
      alertsContent.innerHTML =
        '<div class="no-violations"><h3>🎉 No violations found!</h3><p>This page appears to be accessible.</p></div>';
      return;
    }

    // Sort violations by impact severity
    const sortedViolations = [...actualData.violations].sort((a, b) => {
      const impactA = a.impact || "minor";
      const impactB = b.impact || "minor";
      return this.impactOrder[impactA] - this.impactOrder[impactB];
    });

    alertsContent.innerHTML = `
        <div class="violations-list">
          <h3>Accessibility Violations (${actualData.violations.length})</h3>
          ${sortedViolations
            .map((violation) => {
              const impact = violation.impact || "minor";
              const impactIcon =
                window.ImpactIcons && window.ImpactIcons[impact]
                  ? window.ImpactIcons[impact]
                  : impact;

              // Get a preview of the affected elements (first 3)
              const elementPreview = violation.nodes
                .slice(0, 3)
                .map((node) => {
                  const target = Array.isArray(node.target)
                    ? node.target.join(" ")
                    : node.target;
                  const truncatedTarget =
                    target.length > 50
                      ? target.substring(0, 50) + "..."
                      : target;
                  return `<code class="element-selector">${truncatedTarget}</code>`;
                })
                .join(", ");

              const additionalCount = Math.max(0, violation.nodes.length - 3);

              return `
                <div class="violation-item ${impact}" data-rule-id="${
                violation.id
              }">
                  <div class="violation-header">
                    <div class="violation-title">
                      <span class="impact-icon">${impactIcon}</span>
                      <strong>${violation.description || violation.id}</strong>
                      <span class="violation-count">(${
                        violation.nodes.length
                      } ${
                violation.nodes.length === 1 ? "element" : "elements"
              })</span>
                    </div>
                  </div>
                  <div class="violation-details">
                    <p><strong>Help:</strong> ${
                      violation.help || "No help available"
                    }</p>
                    ${
                      violation.helpUrl
                        ? `<p><a href="${violation.helpUrl}" target="_blank" rel="noopener noreferrer">Learn more →</a></p>`
                        : ""
                    }
                    <div class="affected-elements">
                      <strong>Affected elements:</strong> ${elementPreview}
                      ${
                        additionalCount > 0
                          ? ` <em>and ${additionalCount} more</em>`
                          : ""
                      }
                    </div>
                    <div class="violation-tags">
                      ${(violation.tags || [])
                        .map((tag) => `<span class="tag">${tag}</span>`)
                        .join("")}
                    </div>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      `;
  }

  showLoading(elementId, message = "Loading...") {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = "flex";
      element.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <span>${message}</span>
        </div>
      `;
    }
  }

  hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = "none";
    }
  }

  showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = "flex";
      element.innerHTML = `
        <div class="error-state">
          <span class="error-message">${message}</span>
        </div>
      `;
    }
  }

  updateToggleLabel(enabled) {
    const toggleLabel = document.getElementById("toggle-label");
    if (toggleLabel) {
      toggleLabel.textContent = enabled
        ? "Extension Enabled"
        : "Extension Disabled";
    }
  }

  updateInspectorModeLabel(inspectorMode) {
    const modeLabel = document.getElementById("inspector-mode-label");
    if (modeLabel) {
      const modeText =
        {
          off: "Inspector: Off",
          on: "Inspector: On",
          mini: "Inspector: Mini Mode",
        }[inspectorMode] || "Inspector: Unknown";
      modeLabel.textContent = modeText;
    }

    // Legacy support - update mini mode label if it exists
    const miniModeLabel = document.getElementById("mini-mode-label");
    if (miniModeLabel) {
      miniModeLabel.textContent =
        inspectorMode === "mini" ? "Mini Mode: On" : "Mini Mode: Off";
    }
  }

  // Legacy method for backwards compatibility
  updateMiniModeLabel(miniMode) {
    const inspectorMode = miniMode ? "mini" : "on";
    this.updateInspectorModeLabel(inspectorMode);
  }
}

window.UIManager = UIManager;
