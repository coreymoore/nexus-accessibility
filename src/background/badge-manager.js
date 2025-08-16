/**
 * Badge Manager
 * Handles displaying accessibility violation counts on the extension icon
 */
export class BadgeManager {
  constructor() {
    this.tabViolationCounts = new Map(); // Track violation counts per tab
    this.currentActiveTab = null;

    // Initialize current active tab
    this.initializeActiveTab();

    // Set up tab change listener to update badge for active tab
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.currentActiveTab = activeInfo.tabId;
      this.updateBadgeForTab(activeInfo.tabId);
    });

    // Clean up when tabs are closed
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.tabViolationCounts.delete(tabId);
    });

    // Clear badge when tab is updated (new page loaded)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === "loading") {
        // Clear badge when page starts loading
        this.clearBadge(tabId);
      }
    });

    console.log("[BadgeManager] Initialized");

    // Test if chrome.action is available
    if (typeof chrome !== "undefined" && chrome.action) {
      console.log("[BadgeManager] Chrome action API available");
    } else {
      console.error("[BadgeManager] Chrome action API not available!");
    }
  }

  /**
   * Initialize the current active tab
   */
  async initializeActiveTab() {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs.length > 0) {
        this.currentActiveTab = tabs[0].id;
        console.log(
          `[BadgeManager] Initialized with active tab: ${this.currentActiveTab}`
        );
      } else {
        console.log(`[BadgeManager] No active tab found during initialization`);
      }
    } catch (error) {
      console.error("[BadgeManager] Error getting active tab:", error);
    }
  }

  /**
   * Update violation count for a specific tab
   * @param {number} tabId - The tab ID
   * @param {number} violationCount - Number of violations found
   */
  updateViolationCount(tabId, violationCount) {
    console.log(
      `[BadgeManager] Updating violation count for tab ${tabId}:`,
      violationCount
    );
    console.log(`[BadgeManager] Current active tab: ${this.currentActiveTab}`);

    this.tabViolationCounts.set(tabId, violationCount);

    // Always update the badge for the tab, regardless of whether it's active
    this.setBadge(violationCount, tabId);
  }

  /**
   * Update badge for a specific tab
   * @param {number} tabId - The tab ID
   */
  updateBadgeForTab(tabId) {
    const violationCount = this.tabViolationCounts.get(tabId) || 0;
    this.setBadge(violationCount, tabId);
  }

  /**
   * Set the badge text and background color
   * @param {number} count - Number of violations
   * @param {number} tabId - The tab ID
   */
  async setBadge(count, tabId) {
    try {
      const badgeText = count > 0 ? count.toString() : "";
      const backgroundColor = count > 0 ? "#ff4444" : "#888888";

      console.log(
        `[BadgeManager] Setting badge for tab ${tabId}: "${badgeText}" (count: ${count})`
      );

      // Try to set badge text - first try globally, then tab-specific
      try {
        console.log(
          `[BadgeManager] Attempting to set global badge text: "${badgeText}"`
        );
        await chrome.action.setBadgeText({ text: badgeText });
        console.log(`[BadgeManager] Successfully set global badge text`);
      } catch (error) {
        console.error(`[BadgeManager] Failed to set global badge text:`, error);
      }

      // Set badge background color - only if we have violations
      if (count > 0) {
        try {
          console.log(
            `[BadgeManager] Attempting to set global badge color: ${backgroundColor}`
          );
          await chrome.action.setBadgeBackgroundColor({
            color: backgroundColor,
          });
          console.log(`[BadgeManager] Successfully set global badge color`);
        } catch (error) {
          console.error(
            `[BadgeManager] Failed to set global badge color:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("[BadgeManager] Error setting badge:", error);
    }
  }

  /**
   * Clear badge for a specific tab
   * @param {number} tabId - The tab ID
   */
  async clearBadge(tabId) {
    console.log(`[BadgeManager] Clearing badge for tab ${tabId}`);
    this.tabViolationCounts.delete(tabId);
    await this.setBadge(0, tabId);
  }

  /**
   * Get violation count for a specific tab
   * @param {number} tabId - The tab ID
   * @returns {number} The violation count
   */
  getViolationCount(tabId) {
    return this.tabViolationCounts.get(tabId) || 0;
  }

  /**
   * Handle scan completed message from content script
   * @param {Object} message - The message containing scan results
   * @param {Object} sender - The message sender
   */
  handleScanCompleted(message, sender) {
    const tabId = sender.tab?.id;
    if (!tabId) {
      console.warn("[BadgeManager] No tab ID in scan completed message");
      return;
    }

    const violationCount = message.violationCount || 0;
    console.log(
      `[BadgeManager] Scan completed for tab ${tabId}: ${violationCount} violations`
    );

    this.updateViolationCount(tabId, violationCount);
  }
}
