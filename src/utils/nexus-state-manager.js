/**
 * Nexus Extension-Wide State Manager
 *
 * Centralized state management system for the entire extension.
 * Handles state synchronization across content scripts, background service worker,
 * popup, and options pages through message-based communication and persistent storage.
 *
 * Architecture:
 * - Background Service Worker: Master state coordinator with persistent storage
 * - Content Scripts: State consumers with local caching and event handling
 * - Popup/Options: State consumers with real-time updates
 *
 * State Categories:
 * - Inspector State: Current element, focus tracking, inspector visibility
 * - Extension Settings: User preferences, configuration options
 * - Session State: Tab-specific data, temporary runtime state
 * - Accessibility Data: Element analysis, validation results cache
 *
 * @module NexusStateManager
 */

/**
 * State structure definition
 */
const STATE_SCHEMA = {
  // Inspector state - current element inspection and focus tracking
  inspector: {
    // Currently focused element for accessibility analysis
    focusedElement: {
      selector: null,
      tabId: null,
      frameId: null,
      timestamp: null,
    },
    // Element being actively inspected (may differ from focused in shadow DOM)
    inspectedElement: {
      selector: null,
      tabId: null,
      frameId: null,
      timestamp: null,
      // CDP-specific data for background processing
      cdpData: {
        backendNodeId: null,
        accessibilityNodeId: null,
        domNodeId: null,
      },
    },
    // Inspector UI state
    ui: {
      isVisible: false,
      position: { x: 0, y: 0 },
      size: { width: 360, height: "auto" },
      zIndex: 2147483647,
    },
    // Validation cache for current element
    validation: {
      results: null,
      timestamp: null,
      version: null,
    },
  },

  // Extension settings and user preferences
  settings: {
    // Validation preferences
    validation: {
      enableCDP: true,
      enableLibraryFallback: true,
      verboseLogging: false,
      highlightValidationErrors: true,
    },
    // UI preferences
    ui: {
      theme: "auto", // 'light', 'dark', 'auto'
      reducedMotion: false,
      fontSize: "medium", // 'small', 'medium', 'large'
      contrast: "normal", // 'normal', 'high'
    },
    // Accessibility features
    accessibility: {
      announceInspectorChanges: false,
      keyboardNavigationMode: "standard", // 'standard', 'enhanced'
      focusIndicatorStyle: "dual-ring", // 'dual-ring', 'solid', 'dotted'
    },
  },

  // Session state - runtime data that doesn't persist
  session: {
    // Active tabs and their states
    tabs: {}, // tabId: { status, lastActivity, frameCount, etc. }
    // Background service worker state
    background: {
      isActive: true,
      debuggerAttachments: {}, // tabId: connectionInfo
      lastActivity: null,
    },
    // Performance metrics
    performance: {
      stateUpdates: 0,
      messagingErrors: 0,
      storageOperations: 0,
      startTime: Date.now(),
    },
  },

  // Accessibility data cache
  accessibility: {
    // Element analysis cache with TTL
    elementCache: {}, // elementId: { data, timestamp, ttl }
    // Tree analysis cache
    treeCache: {}, // tabId: { tree, timestamp, ttl }
    // Validation results cache
    validationCache: {}, // elementId: { results, timestamp, ttl }
  },
};

/**
 * State update types for message passing
 */
const STATE_UPDATE_TYPES = {
  // Inspector updates
  INSPECTOR_FOCUS_CHANGED: "state:inspector:focus:changed",
  INSPECTOR_ELEMENT_CHANGED: "state:inspector:element:changed",
  INSPECTOR_UI_CHANGED: "state:inspector:ui:changed",
  INSPECTOR_VALIDATION_UPDATED: "state:inspector:validation:updated",

  // Settings updates
  SETTINGS_CHANGED: "state:settings:changed",
  SETTINGS_VALIDATION_CHANGED: "state:settings:validation:changed",
  SETTINGS_UI_CHANGED: "state:settings:ui:changed",
  SETTINGS_ACCESSIBILITY_CHANGED: "state:settings:accessibility:changed",

  // Session updates
  SESSION_TAB_UPDATED: "state:session:tab:updated",
  SESSION_BACKGROUND_UPDATED: "state:session:background:updated",
  SESSION_PERFORMANCE_UPDATED: "state:session:performance:updated",

  // Accessibility data updates
  ACCESSIBILITY_CACHE_UPDATED: "state:accessibility:cache:updated",

  // Bulk operations
  STATE_RESET: "state:reset",
  STATE_SYNC_REQUEST: "state:sync:request",
  STATE_SYNC_RESPONSE: "state:sync:response",
};

/**
 * Message types for state management
 */
const MESSAGE_TYPES = {
  // State queries
  GET_STATE: "nexus:state:get",
  GET_STATE_PARTIAL: "nexus:state:get:partial",

  // State updates
  UPDATE_STATE: "nexus:state:update",
  UPDATE_STATE_PARTIAL: "nexus:state:update:partial",

  // State synchronization
  SYNC_STATE: "nexus:state:sync",
  STATE_CHANGED: "nexus:state:changed",

  // State management
  RESET_STATE: "nexus:state:reset",
  CLEAR_CACHE: "nexus:state:cache:clear",
};

/**
 * Storage keys for persistent state
 */
const STORAGE_KEYS = {
  SETTINGS: "nexus:settings",
  INSPECTOR_STATE: "nexus:inspector:state",
  ACCESSIBILITY_CACHE: "nexus:accessibility:cache",
  LAST_SYNC: "nexus:last:sync",
};

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  // Default TTL for cached data (5 minutes)
  DEFAULT_TTL: 5 * 60 * 1000,
  // Maximum cache entries per category
  MAX_ENTRIES: 1000,
  // Cleanup interval (1 minute)
  CLEANUP_INTERVAL: 60 * 1000,
  // Sync interval between contexts (10 seconds)
  SYNC_INTERVAL: 10 * 1000,
};

/**
 * Base State Manager Class
 *
 * Provides common functionality for all context-specific state managers.
 * Should be extended by BackgroundStateManager, ContentStateManager, etc.
 */
export class BaseStateManager {
  constructor(context = "base") {
    this.context = context;
    this.state = this.createDefaultState();
    this.listeners = new Map();
    this.messageListeners = new Set();
    this.isInitialized = false;
    this.lastSync = Date.now();

    // Bind methods for event listeners
    this.handleMessage = this.handleMessage.bind(this);
    this.handleStorageChange = this.handleStorageChange.bind(this);
    this.performCleanup = this.performCleanup.bind(this);

    console.log(`[NexusStateManager:${context}] Initialized`);
  }

  /**
   * Create default state structure
   */
  createDefaultState() {
    return JSON.parse(JSON.stringify(STATE_SCHEMA));
  }

  /**
   * Initialize the state manager
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn(`[NexusStateManager:${this.context}] Already initialized`);
      return;
    }

    try {
      // Load persistent state
      await this.loadPersistentState();

      // Set up message listeners
      this.setupMessageListeners();

      // Set up cleanup intervals
      this.setupCleanupIntervals();

      // Mark as initialized
      this.isInitialized = true;
      this.state.session.background.lastActivity = Date.now();

      console.log(
        `[NexusStateManager:${this.context}] Initialized successfully`
      );

      // Emit initialization event
      this.emit("initialized", { context: this.context, state: this.state });
    } catch (error) {
      console.error(
        `[NexusStateManager:${this.context}] Initialization failed:`,
        error
      );
      throw error;
    }
  }

  /**
   * Load persistent state from chrome.storage.local
   */
  async loadPersistentState() {
    // Override in context-specific implementations
    throw new Error("loadPersistentState must be implemented by subclass");
  }

  /**
   * Set up message listeners for cross-context communication
   */
  setupMessageListeners() {
    // Override in context-specific implementations
    throw new Error("setupMessageListeners must be implemented by subclass");
  }

  /**
   * Set up cleanup intervals
   */
  setupCleanupIntervals() {
    // Cache cleanup interval
    setInterval(this.performCleanup, CACHE_CONFIG.CLEANUP_INTERVAL);
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(message, sender) {
    try {
      if (!message.type || !message.type.startsWith("nexus:state:")) {
        return; // Not a state management message
      }

      const { type, data } = message;

      switch (type) {
        case MESSAGE_TYPES.GET_STATE:
          return this.handleGetState(data);

        case MESSAGE_TYPES.GET_STATE_PARTIAL:
          return this.handleGetStatePartial(data);

        case MESSAGE_TYPES.UPDATE_STATE:
          return await this.handleUpdateState(data, sender);

        case MESSAGE_TYPES.UPDATE_STATE_PARTIAL:
          return await this.handleUpdateStatePartial(data, sender);

        case MESSAGE_TYPES.SYNC_STATE:
          return await this.handleSyncState(data, sender);

        case MESSAGE_TYPES.RESET_STATE:
          return await this.handleResetState(data, sender);

        case MESSAGE_TYPES.CLEAR_CACHE:
          return await this.handleClearCache(data, sender);

        default:
          console.warn(
            `[NexusStateManager:${this.context}] Unknown message type:`,
            type
          );
          return { error: "Unknown message type" };
      }
    } catch (error) {
      console.error(
        `[NexusStateManager:${this.context}] Message handling error:`,
        error
      );
      return { error: error.message };
    }
  }

  /**
   * Handle storage changes (chrome.storage.onChanged)
   */
  handleStorageChange(changes, areaName) {
    if (areaName !== "local") return;

    for (const [key, change] of Object.entries(changes)) {
      if (key.startsWith("nexus:")) {
        console.log(
          `[NexusStateManager:${this.context}] Storage changed:`,
          key,
          change
        );
        this.handleStorageKeyChange(key, change.oldValue, change.newValue);
      }
    }
  }

  /**
   * Handle individual storage key changes
   */
  handleStorageKeyChange(key, oldValue, newValue) {
    // Override in context-specific implementations
  }

  /**
   * Perform cache cleanup
   */
  performCleanup() {
    const now = Date.now();
    let cleanupCount = 0;

    // Clean expired accessibility cache entries
    for (const [key, entry] of Object.entries(
      this.state.accessibility.elementCache
    )) {
      if (entry.timestamp + entry.ttl < now) {
        delete this.state.accessibility.elementCache[key];
        cleanupCount++;
      }
    }

    // Clean expired tree cache entries
    for (const [key, entry] of Object.entries(
      this.state.accessibility.treeCache
    )) {
      if (entry.timestamp + CACHE_CONFIG.DEFAULT_TTL < now) {
        delete this.state.accessibility.treeCache[key];
        cleanupCount++;
      }
    }

    // Clean expired validation cache entries
    for (const [key, entry] of Object.entries(
      this.state.accessibility.validationCache
    )) {
      if (entry.timestamp + CACHE_CONFIG.DEFAULT_TTL < now) {
        delete this.state.accessibility.validationCache[key];
        cleanupCount++;
      }
    }

    if (cleanupCount > 0) {
      console.log(
        `[NexusStateManager:${this.context}] Cleaned up ${cleanupCount} cache entries`
      );
      this.state.session.performance.storageOperations += cleanupCount;
    }
  }

  /**
   * Get current state
   */
  handleGetState(data) {
    return { state: this.state, timestamp: Date.now() };
  }

  /**
   * Get partial state
   */
  handleGetStatePartial(data) {
    const { path } = data;
    if (!path) {
      return { error: "Path required for partial state request" };
    }

    const value = this.getStateByPath(path);
    return { value, timestamp: Date.now() };
  }

  /**
   * Update state
   */
  async handleUpdateState(data, sender) {
    const { updates, persist = true } = data;

    // Apply updates to state
    this.applyStateUpdates(updates);

    // Persist if requested
    if (persist) {
      await this.persistState();
    }

    // Emit state change event
    this.emit("stateChanged", { updates, sender, timestamp: Date.now() });

    return { success: true, timestamp: Date.now() };
  }

  /**
   * Update partial state
   */
  async handleUpdateStatePartial(data, sender) {
    const { path, value, persist = true } = data;

    if (!path) {
      return { error: "Path required for partial state update" };
    }

    // Update specific path
    this.setStateByPath(path, value);

    // Persist if requested
    if (persist) {
      await this.persistState();
    }

    // Emit state change event
    this.emit("stateChanged", {
      updates: { [path]: value },
      sender,
      timestamp: Date.now(),
    });

    return { success: true, timestamp: Date.now() };
  }

  /**
   * Sync state across contexts
   */
  async handleSyncState(data, sender) {
    // Override in context-specific implementations
    return { success: true, timestamp: Date.now() };
  }

  /**
   * Reset state to defaults
   */
  async handleResetState(data, sender) {
    const { category } = data;

    if (category) {
      // Reset specific category
      this.state[category] = JSON.parse(JSON.stringify(STATE_SCHEMA[category]));
    } else {
      // Reset entire state
      this.state = this.createDefaultState();
    }

    // Persist reset state
    await this.persistState();

    // Emit reset event
    this.emit("stateReset", { category, sender, timestamp: Date.now() });

    return { success: true, timestamp: Date.now() };
  }

  /**
   * Clear cache
   */
  async handleClearCache(data, sender) {
    const { category } = data;

    if (category) {
      // Clear specific cache category
      if (this.state.accessibility[category]) {
        this.state.accessibility[category] = {};
      }
    } else {
      // Clear all caches
      this.state.accessibility = {
        elementCache: {},
        treeCache: {},
        validationCache: {},
      };
    }

    console.log(
      `[NexusStateManager:${this.context}] Cache cleared:`,
      category || "all"
    );

    return { success: true, timestamp: Date.now() };
  }

  /**
   * Get state value by path (dot notation)
   */
  getStateByPath(path) {
    const parts = path.split(".");
    let current = this.state;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Set state value by path (dot notation)
   */
  setStateByPath(path, value) {
    const parts = path.split(".");
    const lastPart = parts.pop();
    let current = this.state;

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
   * Apply multiple state updates
   */
  applyStateUpdates(updates) {
    for (const [path, value] of Object.entries(updates)) {
      this.setStateByPath(path, value);
    }

    // Update performance counter
    this.state.session.performance.stateUpdates++;
  }

  /**
   * Persist state to chrome.storage.local
   */
  async persistState() {
    // Override in context-specific implementations
    throw new Error("persistState must be implemented by subclass");
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
          console.error(
            `[NexusStateManager:${this.context}] Event listener error:`,
            error
          );
        }
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Clear listeners
    this.listeners.clear();
    this.messageListeners.clear();

    // Mark as not initialized
    this.isInitialized = false;

    console.log(`[NexusStateManager:${this.context}] Destroyed`);
  }
}

// Export constants for use in context-specific implementations
export {
  STATE_SCHEMA,
  STATE_UPDATE_TYPES,
  MESSAGE_TYPES,
  STORAGE_KEYS,
  CACHE_CONFIG,
};
