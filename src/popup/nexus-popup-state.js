/**
 * Popup State Manager
 *
 * State consumer for the extension popup interface.
 * Handles real-time state updates and user preference changes.
 *
 * @module PopupStateManager
 */

import { MESSAGE_TYPES, STORAGE_KEYS } from "../utils/nexus-state-manager.js";

export class PopupStateManager {
  constructor() {
    this.context = "popup";
    this.isInitialized = false;

    // Local state cache for UI
    this.localState = {
      inspector: {
        focusedElement: null,
        inspectedElement: null,
        ui: { isVisible: false },
        validation: { results: null },
      },
      settings: {
        validation: {
          enableCDP: true,
          enableLibraryFallback: true,
          verboseLogging: false,
          highlightValidationErrors: true,
        },
        ui: {
          theme: "auto",
          reducedMotion: false,
          fontSize: "medium",
          contrast: "normal",
        },
        accessibility: {
          announceInspectorChanges: false,
          keyboardNavigationMode: "standard",
          focusIndicatorStyle: "dual-ring",
        },
      },
      session: {
        tabs: {},
        background: { isActive: true },
      },
    };

    // Event listeners
    this.listeners = new Map();

    // UI state tracking
    this.uiElements = new Map();
    this.updateQueue = [];
    this.updateTimer = null;

    // Performance metrics
    this.metrics = {
      stateUpdates: 0,
      uiUpdates: 0,
      errors: 0,
      lastSync: Date.now(),
    };

    console.log("[PopupStateManager] Initialized");
  }

  /**
   * Initialize popup state manager
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn("[PopupStateManager] Already initialized");
      return;
    }

    try {
      // Set up message listeners
      this.setupMessageListeners();

      // Sync initial state
      await this.syncWithBackground();

      // Set up UI bindings
      this.setupUIBindings();

      // Set up real-time updates
      this.setupRealtimeUpdates();

      this.isInitialized = true;

      console.log("[PopupStateManager] Popup state manager ready");

      // Emit initialization event
      this.emit("initialized", { context: this.context });

      // Initial UI update
      this.updateUI();
    } catch (error) {
      console.error("[PopupStateManager] Initialization failed:", error);
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Set up message listeners
   */
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender)
        .then((response) => {
          if (response !== undefined) {
            sendResponse(response);
          }
        })
        .catch((error) => {
          console.error("[PopupStateManager] Message handling error:", error);
          this.metrics.errors++;
          sendResponse({ error: error.message });
        });

      return true; // Async response
    });

    console.log("[PopupStateManager] Message listeners set up");
  }

  /**
   * Set up UI element bindings
   */
  setupUIBindings() {
    // Find and bind UI elements
    this.bindUIElements();

    // Set up form change listeners
    this.setupFormListeners();

    // Set up button click listeners
    this.setupButtonListeners();

    console.log("[PopupStateManager] UI bindings set up");
  }

  /**
   * Bind UI elements for state management
   */
  bindUIElements() {
    // Validation settings
    this.uiElements.set("enableCDP", document.getElementById("enableCDP"));
    this.uiElements.set(
      "enableLibraryFallback",
      document.getElementById("enableLibraryFallback")
    );
    this.uiElements.set(
      "verboseLogging",
      document.getElementById("verboseLogging")
    );
    this.uiElements.set(
      "highlightValidationErrors",
      document.getElementById("highlightValidationErrors")
    );

    // UI settings
    this.uiElements.set("theme", document.getElementById("theme"));
    this.uiElements.set(
      "reducedMotion",
      document.getElementById("reducedMotion")
    );
    this.uiElements.set("fontSize", document.getElementById("fontSize"));
    this.uiElements.set("contrast", document.getElementById("contrast"));

    // Accessibility settings
    this.uiElements.set(
      "announceInspectorChanges",
      document.getElementById("announceInspectorChanges")
    );
    this.uiElements.set(
      "keyboardNavigationMode",
      document.getElementById("keyboardNavigationMode")
    );
    this.uiElements.set(
      "focusIndicatorStyle",
      document.getElementById("focusIndicatorStyle")
    );

    // Status displays
    this.uiElements.set(
      "currentElement",
      document.getElementById("currentElement")
    );
    this.uiElements.set(
      "validationStatus",
      document.getElementById("validationStatus")
    );
    this.uiElements.set(
      "extensionStatus",
      document.getElementById("extensionStatus")
    );

    // Action buttons
    this.uiElements.set(
      "inspectElement",
      document.getElementById("inspectElement")
    );
    this.uiElements.set("clearState", document.getElementById("clearState"));
    this.uiElements.set(
      "exportSettings",
      document.getElementById("exportSettings")
    );
    this.uiElements.set(
      "importSettings",
      document.getElementById("importSettings")
    );

    console.log(
      `[PopupStateManager] Bound ${this.uiElements.size} UI elements`
    );
  }

  /**
   * Set up form change listeners
   */
  setupFormListeners() {
    // Validation settings
    this.addChangeListener("enableCDP", "settings.validation.enableCDP");
    this.addChangeListener(
      "enableLibraryFallback",
      "settings.validation.enableLibraryFallback"
    );
    this.addChangeListener(
      "verboseLogging",
      "settings.validation.verboseLogging"
    );
    this.addChangeListener(
      "highlightValidationErrors",
      "settings.validation.highlightValidationErrors"
    );

    // UI settings
    this.addChangeListener("theme", "settings.ui.theme");
    this.addChangeListener("reducedMotion", "settings.ui.reducedMotion");
    this.addChangeListener("fontSize", "settings.ui.fontSize");
    this.addChangeListener("contrast", "settings.ui.contrast");

    // Accessibility settings
    this.addChangeListener(
      "announceInspectorChanges",
      "settings.accessibility.announceInspectorChanges"
    );
    this.addChangeListener(
      "keyboardNavigationMode",
      "settings.accessibility.keyboardNavigationMode"
    );
    this.addChangeListener(
      "focusIndicatorStyle",
      "settings.accessibility.focusIndicatorStyle"
    );
  }

  /**
   * Add change listener for UI element
   */
  addChangeListener(elementId, statePath) {
    const element = this.uiElements.get(elementId);
    if (!element) {
      console.warn(`[PopupStateManager] UI element not found: ${elementId}`);
      return;
    }

    const handler = async (event) => {
      try {
        let value;

        if (element.type === "checkbox") {
          value = element.checked;
        } else if (element.type === "radio") {
          value = element.value;
        } else if (element.tagName === "SELECT") {
          value = element.value;
        } else {
          value = element.value;
        }

        // Update local state
        this.setLocalStateByPath(statePath, value);

        // Send update to background
        await this.sendStateUpdate(statePath, value);

        // Update metrics
        this.metrics.stateUpdates++;

        console.log(
          `[PopupStateManager] Setting changed: ${statePath} = ${value}`
        );
      } catch (error) {
        console.error(
          `[PopupStateManager] Failed to handle change for ${elementId}:`,
          error
        );
        this.metrics.errors++;
      }
    };

    element.addEventListener("change", handler);
    element.addEventListener("input", handler); // For real-time updates
  }

  /**
   * Set up button click listeners
   */
  setupButtonListeners() {
    // Inspect element button
    const inspectButton = this.uiElements.get("inspectElement");
    if (inspectButton) {
      inspectButton.addEventListener("click", async () => {
        await this.handleInspectElement();
      });
    }

    // Clear state button
    const clearButton = this.uiElements.get("clearState");
    if (clearButton) {
      clearButton.addEventListener("click", async () => {
        await this.handleClearState();
      });
    }

    // Export settings button
    const exportButton = this.uiElements.get("exportSettings");
    if (exportButton) {
      exportButton.addEventListener("click", async () => {
        await this.handleExportSettings();
      });
    }

    // Import settings button
    const importButton = this.uiElements.get("importSettings");
    if (importButton) {
      importButton.addEventListener("click", async () => {
        await this.handleImportSettings();
      });
    }
  }

  /**
   * Set up real-time updates
   */
  setupRealtimeUpdates() {
    // Update UI every second
    setInterval(() => {
      this.updateUI();
    }, 1000);

    // Set up storage listener for external changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local") {
        this.handleStorageChanged(changes);
      }
    });
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(message, sender) {
    if (!message.type || !message.type.startsWith("nexus:state:")) {
      return undefined;
    }

    const { type, data } = message;

    try {
      switch (type) {
        case MESSAGE_TYPES.STATE_CHANGED:
          return this.handleStateChanged(data);

        case MESSAGE_TYPES.SYNC_STATE:
          return this.handleSyncRequest(data);

        default:
          return undefined;
      }
    } catch (error) {
      console.error("[PopupStateManager] Message handling error:", error);
      this.metrics.errors++;
      return { error: error.message };
    }
  }

  /**
   * Handle state changed notification
   */
  handleStateChanged(data) {
    const { category, changes, timestamp } = data;

    if (this.localState[category]) {
      this.localState[category] = { ...this.localState[category], ...changes };
      this.metrics.lastSync = timestamp;

      // Queue UI update
      this.queueUIUpdate();

      // Emit change event
      this.emit("stateChanged", { category, changes, timestamp });

      console.log(`[PopupStateManager] State updated: ${category}`);
    }

    return { success: true, timestamp: Date.now() };
  }

  /**
   * Handle sync request
   */
  async handleSyncRequest(data) {
    await this.syncWithBackground();
    return { success: true, timestamp: Date.now() };
  }

  /**
   * Sync with background state manager
   */
  async syncWithBackground() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.GET_STATE,
        data: { timestamp: Date.now() },
      });

      if (response?.error) {
        throw new Error(response.error);
      }

      if (response?.state) {
        // Update local state
        this.updateLocalStateFromBackground(response.state);
        this.metrics.lastSync = response.timestamp;

        // Update UI
        this.updateUI();
      }

      console.log("[PopupStateManager] Synced with background");
    } catch (error) {
      console.error("[PopupStateManager] Background sync failed:", error);
      this.metrics.errors++;
    }
  }

  /**
   * Update local state from background
   */
  updateLocalStateFromBackground(backgroundState) {
    // Update all categories
    for (const [category, data] of Object.entries(backgroundState)) {
      if (this.localState[category]) {
        this.localState[category] = { ...this.localState[category], ...data };
      }
    }
  }

  /**
   * Send state update to background
   */
  async sendStateUpdate(path, value) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.UPDATE_STATE_PARTIAL,
        data: {
          path,
          value,
          persist: true,
          timestamp: Date.now(),
        },
      });

      if (response?.error) {
        throw new Error(response.error);
      }

      console.log(`[PopupStateManager] State update sent: ${path}`);
    } catch (error) {
      console.error(
        `[PopupStateManager] Failed to send state update: ${path}`,
        error
      );
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Handle storage changes
   */
  handleStorageChanged(changes) {
    for (const [key, change] of Object.entries(changes)) {
      if (key === STORAGE_KEYS.SETTINGS && change.newValue) {
        this.localState.settings = {
          ...this.localState.settings,
          ...change.newValue,
        };
        this.queueUIUpdate();
      } else if (key === STORAGE_KEYS.INSPECTOR_STATE && change.newValue) {
        this.localState.inspector = {
          ...this.localState.inspector,
          ...change.newValue,
        };
        this.queueUIUpdate();
      }
    }
  }

  /**
   * Queue UI update
   */
  queueUIUpdate() {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = setTimeout(() => {
      this.updateUI();
    }, 100);
  }

  /**
   * Update UI elements with current state
   */
  updateUI() {
    try {
      // Update form elements
      this.updateFormElements();

      // Update status displays
      this.updateStatusDisplays();

      // Update button states
      this.updateButtonStates();

      this.metrics.uiUpdates++;
    } catch (error) {
      console.error("[PopupStateManager] UI update failed:", error);
      this.metrics.errors++;
    }
  }

  /**
   * Update form elements with current state values
   */
  updateFormElements() {
    // Validation settings
    this.updateUIElement(
      "enableCDP",
      this.localState.settings.validation.enableCDP
    );
    this.updateUIElement(
      "enableLibraryFallback",
      this.localState.settings.validation.enableLibraryFallback
    );
    this.updateUIElement(
      "verboseLogging",
      this.localState.settings.validation.verboseLogging
    );
    this.updateUIElement(
      "highlightValidationErrors",
      this.localState.settings.validation.highlightValidationErrors
    );

    // UI settings
    this.updateUIElement("theme", this.localState.settings.ui.theme);
    this.updateUIElement(
      "reducedMotion",
      this.localState.settings.ui.reducedMotion
    );
    this.updateUIElement("fontSize", this.localState.settings.ui.fontSize);
    this.updateUIElement("contrast", this.localState.settings.ui.contrast);

    // Accessibility settings
    this.updateUIElement(
      "announceInspectorChanges",
      this.localState.settings.accessibility.announceInspectorChanges
    );
    this.updateUIElement(
      "keyboardNavigationMode",
      this.localState.settings.accessibility.keyboardNavigationMode
    );
    this.updateUIElement(
      "focusIndicatorStyle",
      this.localState.settings.accessibility.focusIndicatorStyle
    );
  }

  /**
   * Update status displays
   */
  updateStatusDisplays() {
    // Current element
    const currentElementDisplay = this.uiElements.get("currentElement");
    if (currentElementDisplay) {
      const focusedElement = this.localState.inspector.focusedElement;
      if (focusedElement?.selector) {
        currentElementDisplay.textContent = focusedElement.selector;
        currentElementDisplay.title = `Tab: ${
          focusedElement.tabId
        }, Updated: ${new Date(focusedElement.timestamp).toLocaleTimeString()}`;
      } else {
        currentElementDisplay.textContent = "No element selected";
        currentElementDisplay.title = "";
      }
    }

    // Validation status
    const validationDisplay = this.uiElements.get("validationStatus");
    if (validationDisplay) {
      const validation = this.localState.inspector.validation;
      if (validation?.results) {
        const resultCount = Object.keys(validation.results).length;
        validationDisplay.textContent = `${resultCount} validation results`;
        validationDisplay.className = "validation-status success";
      } else {
        validationDisplay.textContent = "No validation results";
        validationDisplay.className = "validation-status inactive";
      }
    }

    // Extension status
    const statusDisplay = this.uiElements.get("extensionStatus");
    if (statusDisplay) {
      const isActive = this.localState.session.background.isActive;
      const lastSync = this.metrics.lastSync;
      const syncAge = Date.now() - lastSync;

      if (isActive && syncAge < 30000) {
        // 30 seconds
        statusDisplay.textContent = "Active";
        statusDisplay.className = "extension-status active";
      } else if (isActive) {
        statusDisplay.textContent = "Active (sync delayed)";
        statusDisplay.className = "extension-status warning";
      } else {
        statusDisplay.textContent = "Inactive";
        statusDisplay.className = "extension-status inactive";
      }
    }
  }

  /**
   * Update button states
   */
  updateButtonStates() {
    // Inspect element button
    const inspectButton = this.uiElements.get("inspectElement");
    if (inspectButton) {
      inspectButton.disabled = !this.localState.session.background.isActive;
    }

    // Clear state button
    const clearButton = this.uiElements.get("clearState");
    if (clearButton) {
      const hasState =
        this.localState.inspector.focusedElement?.selector ||
        this.localState.inspector.validation?.results;
      clearButton.disabled = !hasState;
    }
  }

  /**
   * Update individual UI element
   */
  updateUIElement(elementId, value) {
    const element = this.uiElements.get(elementId);
    if (!element) return;

    try {
      if (element.type === "checkbox") {
        element.checked = Boolean(value);
      } else if (element.type === "radio") {
        element.checked = element.value === value;
      } else if (element.tagName === "SELECT") {
        element.value = value;
      } else {
        element.value = value;
      }
    } catch (error) {
      console.warn(
        `[PopupStateManager] Failed to update UI element ${elementId}:`,
        error
      );
    }
  }

  /**
   * Handle inspect element action
   */
  async handleInspectElement() {
    try {
      // Get active tab
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const activeTab = tabs[0];

      if (!activeTab) {
        throw new Error("No active tab found");
      }

      // Send inspect command to content script
      await chrome.tabs.sendMessage(activeTab.id, {
        type: "nexus:inspector:activate",
        data: { timestamp: Date.now() },
      });

      console.log("[PopupStateManager] Inspector activation sent");
    } catch (error) {
      console.error("[PopupStateManager] Failed to activate inspector:", error);
      this.showError("Failed to activate inspector: " + error.message);
    }
  }

  /**
   * Handle clear state action
   */
  async handleClearState() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.RESET_STATE,
        data: {
          category: "inspector",
          timestamp: Date.now(),
        },
      });

      if (response?.error) {
        throw new Error(response.error);
      }

      // Update local state
      this.localState.inspector = {
        focusedElement: null,
        inspectedElement: null,
        ui: { isVisible: false },
        validation: { results: null },
      };

      // Update UI
      this.updateUI();

      console.log("[PopupStateManager] State cleared");
    } catch (error) {
      console.error("[PopupStateManager] Failed to clear state:", error);
      this.showError("Failed to clear state: " + error.message);
    }
  }

  /**
   * Handle export settings action
   */
  async handleExportSettings() {
    try {
      const settings = JSON.stringify(this.localState.settings, null, 2);

      // Create and download file
      const blob = new Blob([settings], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `nexus-settings-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      console.log("[PopupStateManager] Settings exported");
    } catch (error) {
      console.error("[PopupStateManager] Failed to export settings:", error);
      this.showError("Failed to export settings: " + error.message);
    }
  }

  /**
   * Handle import settings action
   */
  async handleImportSettings() {
    try {
      // Create file input
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";

      input.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          const settings = JSON.parse(text);

          // Validate settings structure
          if (!settings.validation || !settings.ui || !settings.accessibility) {
            throw new Error("Invalid settings file format");
          }

          // Update state
          this.localState.settings = settings;

          // Send to background
          await this.sendStateUpdate("settings", settings);

          // Update UI
          this.updateUI();

          console.log("[PopupStateManager] Settings imported");
        } catch (error) {
          console.error(
            "[PopupStateManager] Failed to import settings:",
            error
          );
          this.showError("Failed to import settings: " + error.message);
        }
      });

      input.click();
    } catch (error) {
      console.error(
        "[PopupStateManager] Failed to create import dialog:",
        error
      );
      this.showError("Failed to create import dialog: " + error.message);
    }
  }

  /**
   * Show error message to user
   */
  showError(message) {
    // Create temporary error display
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #f44336;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      z-index: 10000;
      font-size: 12px;
    `;

    document.body.appendChild(errorDiv);

    // Remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }

  /**
   * Get local state by path
   */
  getLocalStateByPath(path) {
    const parts = path.split(".");
    let current = this.localState;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Set local state by path
   */
  setLocalStateByPath(path, value) {
    const parts = path.split(".");
    const lastPart = parts.pop();
    let current = this.localState;

    // Navigate to parent object
    for (const part of parts) {
      if (!current[part] || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part];
    }

    // Set the value
    current[lastPart] = value;
  }

  /**
   * Event listener management
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)) {
        try {
          callback(data);
        } catch (error) {
          console.error("[PopupStateManager] Event listener error:", error);
          this.metrics.errors++;
        }
      }
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Clear timers
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }

    // Clear listeners
    this.listeners.clear();
    this.uiElements.clear();

    this.isInitialized = false;

    console.log("[PopupStateManager] Cleanup completed");
  }
}

// Export singleton instance for popup
export const popupStateManager = new PopupStateManager();
