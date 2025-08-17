/**
 * Background Service Worker State Manager
 *
 * Master state coordinator for the entire extension.
 * Handles persistent storage, cross-context synchronization,
 * and serves as the authoritative source of truth for all state.
 *
 * @module BackgroundStateManager
 */

import {
  BaseStateManager,
  MESSAGE_TYPES,
  STORAGE_KEYS,
  CACHE_CONFIG,
} from "../utils/nexus-state-manager.js";

export class BackgroundStateManager extends BaseStateManager {
  constructor() {
    super("background");

    // Tab-specific state tracking
    this.tabStates = new Map();

    // Message routing for cross-context communication
    this.contextSenders = new Map(); // context -> sender info

    // Storage operation queue for batching
    this.storageQueue = [];
    this.storageFlushTimer = null;

    // Sync intervals
    this.syncTimer = null;

    console.log("[BackgroundStateManager] Initialized");
  }

  /**
   * Initialize background state manager
   */
  async initialize() {
    try {
      await super.initialize();

      // Set up chrome API listeners
      this.setupChromeListeners();

      // Start sync timer
      this.startSyncTimer();

      // Initialize tab tracking
      await this.initializeTabTracking();

      console.log("[BackgroundStateManager] Background state manager ready");
    } catch (error) {
      console.error("[BackgroundStateManager] Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Load persistent state from chrome.storage.local
   */
  async loadPersistentState() {
    try {
      const result = await chrome.storage.local.get([
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.INSPECTOR_STATE,
        STORAGE_KEYS.ACCESSIBILITY_CACHE,
        STORAGE_KEYS.LAST_SYNC,
      ]);

      // Load settings
      if (result[STORAGE_KEYS.SETTINGS]) {
        this.state.settings = {
          ...this.state.settings,
          ...result[STORAGE_KEYS.SETTINGS],
        };
      }

      // Load inspector state
      if (result[STORAGE_KEYS.INSPECTOR_STATE]) {
        this.state.inspector = {
          ...this.state.inspector,
          ...result[STORAGE_KEYS.INSPECTOR_STATE],
        };
      }

      // Load accessibility cache
      if (result[STORAGE_KEYS.ACCESSIBILITY_CACHE]) {
        this.state.accessibility = {
          ...this.state.accessibility,
          ...result[STORAGE_KEYS.ACCESSIBILITY_CACHE],
        };
      }

      // Update last sync time
      this.lastSync = result[STORAGE_KEYS.LAST_SYNC] || Date.now();

      console.log("[BackgroundStateManager] Persistent state loaded");
    } catch (error) {
      console.error(
        "[BackgroundStateManager] Failed to load persistent state:",
        error
      );
      // Continue with default state
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
          console.error(
            "[BackgroundStateManager] Message handling error:",
            error
          );
          sendResponse({ error: error.message });
        });

      // Return true to indicate async response
      return true;
    });

    console.log("[BackgroundStateManager] Message listeners set up");
  }

  /**
   * Set up Chrome API listeners
   */
  setupChromeListeners() {
    // Storage changes
    chrome.storage.onChanged.addListener(this.handleStorageChange);

    // Tab events
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdated(tabId, changeInfo, tab);
    });

    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
      this.handleTabRemoved(tabId, removeInfo);
    });

    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivated(activeInfo);
    });

    // Web navigation events
    chrome.webNavigation.onCommitted.addListener((details) => {
      this.handleNavigationCommitted(details);
    });

    console.log("[BackgroundStateManager] Chrome listeners set up");
  }

  /**
   * Start sync timer for cross-context synchronization
   */
  startSyncTimer() {
    this.syncTimer = setInterval(async () => {
      await this.syncWithAllContexts();
    }, CACHE_CONFIG.SYNC_INTERVAL);
  }

  /**
   * Initialize tab tracking
   */
  async initializeTabTracking() {
    try {
      const tabs = await chrome.tabs.query({});

      for (const tab of tabs) {
        this.initializeTabState(tab.id, tab);
      }

      console.log(
        `[BackgroundStateManager] Initialized tracking for ${tabs.length} tabs`
      );
    } catch (error) {
      console.error(
        "[BackgroundStateManager] Tab tracking initialization failed:",
        error
      );
    }
  }

  /**
   * Initialize state for a specific tab
   */
  initializeTabState(tabId, tab) {
    const tabState = {
      id: tabId,
      url: tab.url,
      title: tab.title,
      status: tab.status,
      lastActivity: Date.now(),
      frameCount: 0,
      debuggerAttached: false,
      contentScriptInjected: false,
      inspectorActive: false,
      elementCache: new Map(),
      validationCache: new Map(),
    };

    this.tabStates.set(tabId, tabState);

    // Update session state
    this.state.session.tabs[tabId] = {
      status: tab.status,
      lastActivity: Date.now(),
      frameCount: 0,
    };

    console.log(`[BackgroundStateManager] Initialized state for tab ${tabId}`);
  }

  /**
   * Handle tab updated event
   */
  handleTabUpdated(tabId, changeInfo, tab) {
    const tabState = this.tabStates.get(tabId);

    if (!tabState) {
      this.initializeTabState(tabId, tab);
      return;
    }

    // Update tab state
    if (changeInfo.status) {
      tabState.status = changeInfo.status;
      this.state.session.tabs[tabId].status = changeInfo.status;
    }

    if (changeInfo.url) {
      tabState.url = changeInfo.url;
      // Clear caches on navigation
      tabState.elementCache.clear();
      tabState.validationCache.clear();
      tabState.contentScriptInjected = false;
      tabState.inspectorActive = false;
    }

    tabState.lastActivity = Date.now();
    this.state.session.tabs[tabId].lastActivity = Date.now();

    // If this tab is being inspected, update inspector state
    if (this.state.inspector.focusedElement?.tabId === tabId) {
      if (changeInfo.url) {
        // Clear inspector state on navigation
        this.clearInspectorState();
      }
    }

    console.log(`[BackgroundStateManager] Tab ${tabId} updated:`, changeInfo);
  }

  /**
   * Handle tab removed event
   */
  handleTabRemoved(tabId, removeInfo) {
    // Clean up tab state
    this.tabStates.delete(tabId);
    delete this.state.session.tabs[tabId];

    // Clean up debugger attachments
    if (this.state.session.background.debuggerAttachments[tabId]) {
      delete this.state.session.background.debuggerAttachments[tabId];
    }

    // Clear inspector state if it was for this tab
    if (this.state.inspector.focusedElement?.tabId === tabId) {
      this.clearInspectorState();
    }

    console.log(
      `[BackgroundStateManager] Tab ${tabId} removed, state cleaned up`
    );
  }

  /**
   * Handle tab activated event
   */
  handleTabActivated(activeInfo) {
    const { tabId } = activeInfo;
    const tabState = this.tabStates.get(tabId);

    if (tabState) {
      tabState.lastActivity = Date.now();
      this.state.session.tabs[tabId].lastActivity = Date.now();
    }

    console.log(`[BackgroundStateManager] Tab ${tabId} activated`);
  }

  /**
   * Handle navigation committed event
   */
  handleNavigationCommitted(details) {
    const { tabId, frameId, url } = details;

    // Update frame count for main frame
    if (frameId === 0) {
      const tabState = this.tabStates.get(tabId);
      if (tabState) {
        tabState.frameCount = 1;
        this.state.session.tabs[tabId].frameCount = 1;
      }
    } else {
      // Increment frame count for subframes
      const tabState = this.tabStates.get(tabId);
      if (tabState) {
        tabState.frameCount++;
        this.state.session.tabs[tabId].frameCount++;
      }
    }

    console.log(
      `[BackgroundStateManager] Navigation committed: tab ${tabId}, frame ${frameId}`
    );
  }

  /**
   * Clear inspector state
   */
  clearInspectorState() {
    this.state.inspector = {
      focusedElement: {
        selector: null,
        tabId: null,
        frameId: null,
        timestamp: null,
      },
      inspectedElement: {
        selector: null,
        tabId: null,
        frameId: null,
        timestamp: null,
        cdpData: {
          backendNodeId: null,
          accessibilityNodeId: null,
          domNodeId: null,
        },
      },
      ui: {
        isVisible: false,
        position: { x: 0, y: 0 },
        size: { width: 360, height: "auto" },
        zIndex: 2147483647,
      },
      validation: {
        results: null,
        timestamp: null,
        version: null,
      },
    };

    console.log("[BackgroundStateManager] Inspector state cleared");
  }

  /**
   * Handle storage key changes
   */
  handleStorageKeyChange(key, oldValue, newValue) {
    switch (key) {
      case STORAGE_KEYS.SETTINGS:
        this.state.settings = { ...this.state.settings, ...newValue };
        this.broadcastStateChange("settings", newValue);
        break;

      case STORAGE_KEYS.INSPECTOR_STATE:
        this.state.inspector = { ...this.state.inspector, ...newValue };
        this.broadcastStateChange("inspector", newValue);
        break;

      case STORAGE_KEYS.ACCESSIBILITY_CACHE:
        this.state.accessibility = { ...this.state.accessibility, ...newValue };
        break;
    }
  }

  /**
   * Broadcast state changes to all contexts
   */
  async broadcastStateChange(category, data) {
    const message = {
      type: MESSAGE_TYPES.STATE_CHANGED,
      data: {
        category,
        changes: data,
        timestamp: Date.now(),
      },
    };

    // Broadcast to all tabs with content scripts
    for (const [tabId, tabState] of this.tabStates) {
      if (tabState.contentScriptInjected) {
        try {
          await chrome.tabs.sendMessage(tabId, message);
        } catch (error) {
          console.warn(
            `[BackgroundStateManager] Failed to broadcast to tab ${tabId}:`,
            error
          );
        }
      }
    }

    // Broadcast to popup if open
    try {
      await chrome.runtime.sendMessage(message);
    } catch (error) {
      // Popup might not be open, ignore error
    }

    console.log(`[BackgroundStateManager] Broadcasted state change:`, category);
  }

  /**
   * Sync state with all contexts
   */
  async syncWithAllContexts() {
    const syncData = {
      timestamp: Date.now(),
      version: this.state.session.performance.stateUpdates,
    };

    const message = {
      type: MESSAGE_TYPES.SYNC_STATE,
      data: syncData,
    };

    // Send sync request to all contexts
    for (const [tabId, tabState] of this.tabStates) {
      if (tabState.contentScriptInjected) {
        try {
          await chrome.tabs.sendMessage(tabId, message);
        } catch (error) {
          console.warn(
            `[BackgroundStateManager] Sync failed for tab ${tabId}:`,
            error
          );
        }
      }
    }

    this.lastSync = Date.now();
    await this.queueStorageUpdate(STORAGE_KEYS.LAST_SYNC, this.lastSync);
  }

  /**
   * Persist state to storage
   */
  async persistState() {
    try {
      const updates = {
        [STORAGE_KEYS.SETTINGS]: this.state.settings,
        [STORAGE_KEYS.INSPECTOR_STATE]: this.state.inspector,
        [STORAGE_KEYS.ACCESSIBILITY_CACHE]: this.state.accessibility,
        [STORAGE_KEYS.LAST_SYNC]: Date.now(),
      };

      await chrome.storage.local.set(updates);
      this.state.session.performance.storageOperations++;

      console.log("[BackgroundStateManager] State persisted successfully");
    } catch (error) {
      console.error("[BackgroundStateManager] Failed to persist state:", error);
      throw error;
    }
  }

  /**
   * Queue storage update for batching
   */
  async queueStorageUpdate(key, value) {
    this.storageQueue.push({ key, value });

    // Clear existing timer
    if (this.storageFlushTimer) {
      clearTimeout(this.storageFlushTimer);
    }

    // Set new timer to flush queue
    this.storageFlushTimer = setTimeout(async () => {
      await this.flushStorageQueue();
    }, 100); // Batch updates for 100ms
  }

  /**
   * Flush storage queue
   */
  async flushStorageQueue() {
    if (this.storageQueue.length === 0) return;

    try {
      const updates = {};
      for (const { key, value } of this.storageQueue) {
        updates[key] = value;
      }

      await chrome.storage.local.set(updates);
      this.state.session.performance.storageOperations +=
        this.storageQueue.length;

      console.log(
        `[BackgroundStateManager] Flushed ${this.storageQueue.length} storage updates`
      );
    } catch (error) {
      console.error(
        "[BackgroundStateManager] Failed to flush storage queue:",
        error
      );
    } finally {
      this.storageQueue = [];
      this.storageFlushTimer = null;
    }
  }

  /**
   * Handle sync state request
   */
  async handleSyncState(data, sender) {
    const { tabId } = sender.tab || {};

    if (tabId) {
      const tabState = this.tabStates.get(tabId);
      if (tabState) {
        tabState.lastActivity = Date.now();
        tabState.contentScriptInjected = true;
      }
    }

    // Return current state for synchronization
    return {
      state: this.state,
      timestamp: Date.now(),
      version: this.state.session.performance.stateUpdates,
    };
  }

  /**
   * Enhanced message handling for background context
   */
  async handleMessage(message, sender) {
    // Handle standard state messages
    const response = await super.handleMessage(message, sender);
    if (response) return response;

    // Handle background-specific messages
    const { type, data } = message;

    switch (type) {
      case "nexus:state:register:content":
        return this.handleRegisterContentScript(data, sender);

      case "nexus:state:unregister:content":
        return this.handleUnregisterContentScript(data, sender);

      default:
        return undefined; // Let other message handlers process it
    }
  }

  /**
   * Handle content script registration
   */
  handleRegisterContentScript(data, sender) {
    const { tabId } = sender.tab || {};

    if (tabId) {
      const tabState = this.tabStates.get(tabId);
      if (tabState) {
        tabState.contentScriptInjected = true;
        tabState.lastActivity = Date.now();
      }

      console.log(
        `[BackgroundStateManager] Content script registered for tab ${tabId}`
      );
    }

    return { success: true, timestamp: Date.now() };
  }

  /**
   * Handle content script unregistration
   */
  handleUnregisterContentScript(data, sender) {
    const { tabId } = sender.tab || {};

    if (tabId) {
      const tabState = this.tabStates.get(tabId);
      if (tabState) {
        tabState.contentScriptInjected = false;
        tabState.inspectorActive = false;
        tabState.elementCache.clear();
        tabState.validationCache.clear();
      }

      console.log(
        `[BackgroundStateManager] Content script unregistered for tab ${tabId}`
      );
    }

    return { success: true, timestamp: Date.now() };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Clear timers
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.storageFlushTimer) {
      clearTimeout(this.storageFlushTimer);
      this.storageFlushTimer = null;
    }

    // Clear Chrome API listeners
    if (chrome.storage?.onChanged) {
      chrome.storage.onChanged.removeListener(this.handleStorageChange);
    }

    // Clear tab states
    this.tabStates.clear();
    this.contextSenders.clear();

    // Call parent cleanup
    super.destroy();

    console.log("[BackgroundStateManager] Cleanup completed");
  }
}

// Create and export singleton instance
export const backgroundStateManager = new BackgroundStateManager();
