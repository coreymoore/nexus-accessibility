/**
 * Nexus Content State Manager
 *
 * Extension-wide state management for content script context.
 * This module provides centralized state management across all extension contexts
 * and integrates with the background service worker for persistence.
 */

window.ContentExtension = window.ContentExtension || {};
window.ContentExtension.deps = window.ContentExtension.deps || {};

window.ContentExtension.deps.defineModule(
  "stateManager",
  [],
  function (deps, utils) {
    "use strict";

    /**
     * Content State Manager Class
     */
    class ContentStateManager {
      constructor() {
        this.context = "content";
        this.isInitialized = false;

        // Local state cache with fast access
        this.localState = {
          inspector: {
            focusedElement: null,
            inspectedElement: null,
            ui: { isVisible: false },
            validation: { results: null },
          },
          settings: {
            validation: { enableCDP: true, enableLibraryFallback: true },
            ui: { theme: "auto" },
            accessibility: { announceInspectorChanges: false },
          },
        };

        // Event listeners
        this.listeners = new Map();

        // DOM element references (WeakMap for memory management)
        this.elementReferences = new WeakMap();

        // Sync tracking
        this.lastSync = Date.now();
        this.syncInProgress = false;

        // Message queue for background communication
        this.messageQueue = [];
        this.messageBatchTimer = null;

        // Performance tracking
        this.metrics = {
          stateUpdates: 0,
          domOperations: 0,
          syncOperations: 0,
          errors: 0,
        };

        console.log("[ContentStateManager] Initialized");
      }

      /**
       * Initialize content state manager
       */
      async initialize() {
        if (this.isInitialized) {
          console.warn("[ContentStateManager] Already initialized");
          return;
        }

        try {
          // Register with background state manager
          await this.registerWithBackground();

          // Sync initial state
          await this.syncWithBackground();

          // Set up message listeners
          this.setupMessageListeners();

          // Set up DOM event listeners
          this.setupDOMListeners();

          // Set up sync timer
          this.setupSyncTimer();

          this.isInitialized = true;

          console.log("[ContentStateManager] Content state manager ready");

          // Emit initialization event
          this.emit("initialized", { context: this.context });
        } catch (error) {
          console.error("[ContentStateManager] Initialization failed:", error);
          this.metrics.errors++;
          throw error;
        }
      }

      /**
       * Register with background state manager
       */
      async registerWithBackground() {
        try {
          const response = await chrome.runtime.sendMessage({
            type: "nexus:state:register:content",
            data: {
              tabId: await this.getTabId(),
              timestamp: Date.now(),
            },
          });

          if (response?.error) {
            throw new Error(response.error);
          }

          console.log(
            "[ContentStateManager] Registered with background state manager"
          );
        } catch (error) {
          console.error(
            "[ContentStateManager] Background registration failed:",
            error
          );
          throw error;
        }
      }

      /**
       * Get current tab ID
       */
      async getTabId() {
        // For content scripts, we need to get tab ID from background
        try {
          const response = await chrome.runtime.sendMessage({
            type: "nexus:get:tab:id",
          });
          return response?.tabId || null;
        } catch (error) {
          console.warn("[ContentStateManager] Could not get tab ID:", error);
          return null;
        }
      }

      /**
       * Set up message listeners
       */
      setupMessageListeners() {
        chrome.runtime.onMessage.addListener(
          (message, sender, sendResponse) => {
            this.handleMessage(message, sender)
              .then((response) => {
                if (response !== undefined) {
                  sendResponse(response);
                }
              })
              .catch((error) => {
                console.error(
                  "[ContentStateManager] Message handling error:",
                  error
                );
                this.metrics.errors++;
                sendResponse({ error: error.message });
              });

            return true; // Async response
          }
        );

        console.log("[ContentStateManager] Message listeners set up");
      }

      /**
       * Set up DOM event listeners
       */
      setupDOMListeners() {
        // Page unload cleanup
        window.addEventListener("beforeunload", () => {
          this.cleanup();
        });

        // Visibility change handling
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            this.handlePageVisible();
          } else {
            this.handlePageHidden();
          }
        });

        console.log("[ContentStateManager] DOM listeners set up");
      }

      /**
       * Set up sync timer
       */
      setupSyncTimer() {
        setInterval(async () => {
          if (!this.syncInProgress) {
            await this.syncWithBackground();
          }
        }, CACHE_CONFIG.SYNC_INTERVAL);
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

            case MESSAGE_TYPES.GET_STATE:
              return this.handleGetLocalState();

            case MESSAGE_TYPES.UPDATE_STATE_PARTIAL:
              return this.handleLocalStateUpdate(data);

            default:
              return undefined;
          }
        } catch (error) {
          console.error("[ContentStateManager] Message handling error:", error);
          this.metrics.errors++;
          return { error: error.message };
        }
      }

      /**
       * Handle state changed notification from background
       */
      handleStateChanged(data) {
        const { category, changes, timestamp } = data;

        if (this.localState[category]) {
          this.localState[category] = {
            ...this.localState[category],
            ...changes,
          };
          this.lastSync = timestamp;

          // Emit local state change event
          this.emit("stateChanged", { category, changes, timestamp });

          console.log(`[ContentStateManager] Local state updated:`, category);
        }

        return { success: true, timestamp: Date.now() };
      }

      /**
       * Handle sync request from background
       */
      async handleSyncRequest(data) {
        await this.syncWithBackground();
        return { success: true, timestamp: Date.now() };
      }

      /**
       * Handle local state query
       */
      handleGetLocalState() {
        return {
          state: this.localState,
          timestamp: Date.now(),
          metrics: this.metrics,
        };
      }

      /**
       * Handle local state update
       */
      handleLocalStateUpdate(data) {
        const { path, value } = data;

        if (path) {
          this.setLocalStateByPath(path, value);
          this.metrics.stateUpdates++;

          // Emit change event
          this.emit("localStateChanged", {
            path,
            value,
            timestamp: Date.now(),
          });
        }

        return { success: true, timestamp: Date.now() };
      }

      /**
       * Sync with background state manager
       */
      async syncWithBackground() {
        if (this.syncInProgress) {
          console.log(
            "[ContentStateManager] Sync already in progress, skipping"
          );
          return;
        }

        this.syncInProgress = true;

        try {
          const response = await chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.SYNC_STATE,
            data: {
              lastSync: this.lastSync,
              timestamp: Date.now(),
            },
          });

          if (response?.error) {
            throw new Error(response.error);
          }

          if (response?.state) {
            // Update local cache with latest state
            this.updateLocalStateFromBackground(response.state);
            this.lastSync = response.timestamp;
            this.metrics.syncOperations++;
          }

          console.log(
            "[ContentStateManager] Synced with background state manager"
          );
        } catch (error) {
          console.error("[ContentStateManager] Background sync failed:", error);
          this.metrics.errors++;
        } finally {
          this.syncInProgress = false;
        }
      }

      /**
       * Update local state from background response
       */
      updateLocalStateFromBackground(backgroundState) {
        // Update inspector state
        if (backgroundState.inspector) {
          this.localState.inspector = {
            ...this.localState.inspector,
            ...backgroundState.inspector,
          };
        }

        // Update settings
        if (backgroundState.settings) {
          this.localState.settings = {
            ...this.localState.settings,
            ...backgroundState.settings,
          };
        }

        console.log(
          "[ContentStateManager] Local state updated from background"
        );
      }

      /**
       * Update focused element state
       */
      async updateFocusedElement(element, options = {}) {
        const { persist = true, sync = true } = options;

        try {
          // Generate element selector
          const selector = this.generateElementSelector(element);
          const tabId = await this.getTabId();

          const focusData = {
            selector,
            tabId,
            frameId: 0, // TODO: Handle frames
            timestamp: Date.now(),
          };

          // Update local state
          this.localState.inspector.focusedElement = focusData;

          // Store element reference
          if (element) {
            this.elementReferences.set(element, {
              selector,
              timestamp: Date.now(),
              type: "focused",
            });
          }

          // Update global reference for CDP compatibility
          window.nexusTargetElement = element;

          this.metrics.stateUpdates++;
          this.metrics.domOperations++;

          // Emit change event
          this.emit("focusChanged", { element, data: focusData });

          // Sync with background if requested
          if (sync && persist) {
            await this.sendStateUpdate("inspector.focusedElement", focusData);
          }

          console.log(
            "[ContentStateManager] Focused element updated:",
            selector
          );

          return { success: true, data: focusData };
        } catch (error) {
          console.error(
            "[ContentStateManager] Failed to update focused element:",
            error
          );
          this.metrics.errors++;
          throw error;
        }
      }

      /**
       * Update inspected element state
       */
      async updateInspectedElement(element, options = {}) {
        const { persist = true, sync = true, cdpData = {} } = options;

        try {
          // Generate element selector
          const selector = this.generateElementSelector(element);
          const tabId = await this.getTabId();

          const inspectedData = {
            selector,
            tabId,
            frameId: 0, // TODO: Handle frames
            timestamp: Date.now(),
            cdpData: {
              backendNodeId: null,
              accessibilityNodeId: null,
              domNodeId: null,
              ...cdpData,
            },
          };

          // Update local state
          this.localState.inspector.inspectedElement = inspectedData;

          // Store element reference
          if (element) {
            this.elementReferences.set(element, {
              selector,
              timestamp: Date.now(),
              type: "inspected",
              cdpData,
            });
          }

          this.metrics.stateUpdates++;
          this.metrics.domOperations++;

          // Emit change event
          this.emit("inspectedElementChanged", {
            element,
            data: inspectedData,
          });

          // Sync with background if requested
          if (sync && persist) {
            await this.sendStateUpdate(
              "inspector.inspectedElement",
              inspectedData
            );
          }

          console.log(
            "[ContentStateManager] Inspected element updated:",
            selector
          );

          return { success: true, data: inspectedData };
        } catch (error) {
          console.error(
            "[ContentStateManager] Failed to update inspected element:",
            error
          );
          this.metrics.errors++;
          throw error;
        }
      }

      /**
       * Update inspector UI state
       */
      async updateInspectorUI(uiState, options = {}) {
        const { persist = true, sync = true } = options;

        try {
          // Update local state
          this.localState.inspector.ui = {
            ...this.localState.inspector.ui,
            ...uiState,
            timestamp: Date.now(),
          };

          this.metrics.stateUpdates++;

          // Emit change event
          this.emit("inspectorUIChanged", { uiState, timestamp: Date.now() });

          // Sync with background if requested
          if (sync && persist) {
            await this.sendStateUpdate(
              "inspector.ui",
              this.localState.inspector.ui
            );
          }

          console.log("[ContentStateManager] Inspector UI updated:", uiState);

          return { success: true, data: this.localState.inspector.ui };
        } catch (error) {
          console.error(
            "[ContentStateManager] Failed to update inspector UI:",
            error
          );
          this.metrics.errors++;
          throw error;
        }
      }

      /**
       * Update validation results
       */
      async updateValidationResults(results, options = {}) {
        const { persist = false, sync = true } = options; // Don't persist validation by default

        try {
          const validationData = {
            results,
            timestamp: Date.now(),
            version: this.metrics.stateUpdates,
          };

          // Update local state
          this.localState.inspector.validation = validationData;

          this.metrics.stateUpdates++;

          // Emit change event
          this.emit("validationChanged", { results, timestamp: Date.now() });

          // Sync with background if requested (usually for caching)
          if (sync && persist) {
            await this.sendStateUpdate("inspector.validation", validationData);
          }

          console.log("[ContentStateManager] Validation results updated");

          return { success: true, data: validationData };
        } catch (error) {
          console.error(
            "[ContentStateManager] Failed to update validation results:",
            error
          );
          this.metrics.errors++;
          throw error;
        }
      }

      /**
       * Send state update to background
       */
      async sendStateUpdate(path, value) {
        this.queueMessage({
          type: MESSAGE_TYPES.UPDATE_STATE_PARTIAL,
          data: {
            path,
            value,
            persist: true,
            timestamp: Date.now(),
          },
        });
      }

      /**
       * Queue message for batch sending
       */
      queueMessage(message) {
        this.messageQueue.push(message);

        // Clear existing timer
        if (this.messageBatchTimer) {
          clearTimeout(this.messageBatchTimer);
        }

        // Set new timer to send batch
        this.messageBatchTimer = setTimeout(async () => {
          await this.sendMessageBatch();
        }, 50); // Batch for 50ms
      }

      /**
       * Send message batch to background
       */
      async sendMessageBatch() {
        if (this.messageQueue.length === 0) return;

        const messages = [...this.messageQueue];
        this.messageQueue = [];
        this.messageBatchTimer = null;

        for (const message of messages) {
          try {
            await chrome.runtime.sendMessage(message);
          } catch (error) {
            console.error(
              "[ContentStateManager] Failed to send message:",
              error
            );
            this.metrics.errors++;
          }
        }

        console.log(
          `[ContentStateManager] Sent batch of ${messages.length} messages`
        );
      }

      /**
       * Generate element selector
       */
      generateElementSelector(element) {
        if (!element) return null;

        try {
          // Try ID first
          if (element.id) {
            return `#${element.id}`;
          }

          // Try unique class combination
          if (element.className) {
            const classes = element.className
              .split(" ")
              .filter((c) => c.trim());
            if (classes.length > 0) {
              const selector = "." + classes.join(".");
              if (document.querySelectorAll(selector).length === 1) {
                return selector;
              }
            }
          }

          // Generate path selector
          const path = [];
          let current = element;

          while (
            current &&
            current !== document.body &&
            current !== document.documentElement
          ) {
            let selector = current.tagName.toLowerCase();

            if (current.id) {
              selector += `#${current.id}`;
              path.unshift(selector);
              break;
            }

            if (current.className) {
              const classes = current.className
                .split(" ")
                .filter((c) => c.trim());
              if (classes.length > 0) {
                selector += "." + classes.join(".");
              }
            }

            // Add nth-child if needed for uniqueness
            const parent = current.parentElement;
            if (parent) {
              const siblings = Array.from(parent.children).filter(
                (child) => child.tagName === current.tagName
              );
              if (siblings.length > 1) {
                const index = siblings.indexOf(current) + 1;
                selector += `:nth-child(${index})`;
              }
            }

            path.unshift(selector);
            current = current.parentElement;
          }

          return path.join(" > ");
        } catch (error) {
          console.error(
            "[ContentStateManager] Failed to generate selector:",
            error
          );
          return `${element.tagName.toLowerCase()}[data-nexus-fallback="${Date.now()}"]`;
        }
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
       * Get current state snapshot
       */
      getCurrentState() {
        return {
          ...this.localState,
          metadata: {
            lastSync: this.lastSync,
            metrics: this.metrics,
            timestamp: Date.now(),
          },
        };
      }

      /**
       * Handle page visibility change
       */
      handlePageVisible() {
        // Sync when page becomes visible
        this.syncWithBackground().catch((error) => {
          console.error("[ContentStateManager] Visibility sync failed:", error);
        });
      }

      /**
       * Handle page hidden
       */
      handlePageHidden() {
        // Flush any pending messages
        if (this.messageQueue.length > 0) {
          this.sendMessageBatch().catch((error) => {
            console.error(
              "[ContentStateManager] Failed to flush messages on hide:",
              error
            );
          });
        }
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
                "[ContentStateManager] Event listener error:",
                error
              );
              this.metrics.errors++;
            }
          }
        }
      }

      /**
       * Cleanup resources
       */
      async cleanup() {
        try {
          // Unregister with background
          await chrome.runtime.sendMessage({
            type: "nexus:state:unregister:content",
            data: {
              tabId: await this.getTabId(),
              timestamp: Date.now(),
            },
          });

          // Clear timers
          if (this.messageBatchTimer) {
            clearTimeout(this.messageBatchTimer);
            this.messageBatchTimer = null;
          }

          // Clear listeners
          this.listeners.clear();

          // Clear element references
          this.elementReferences = new WeakMap();

          // Clear global references
          window.nexusTargetElement = null;

          this.isInitialized = false;

          console.log("[ContentStateManager] Cleanup completed");
        } catch (error) {
          console.error("[ContentStateManager] Cleanup failed:", error);
        }
      }
    }

    // Return the module API
    const contentStateManager = new ContentStateManager();

    return {
      ContentStateManager,
      contentStateManager,
      // Legacy API compatibility
      initialize: () => contentStateManager.initialize(),
      updateFocusState: (element, options) =>
        contentStateManager.updateFocusState(element, options),
      updateInspectedElement: (element, data) =>
        contentStateManager.updateInspectedElement(element, data),
      getCurrentState: () => contentStateManager.getCurrentState(),
      cleanup: () => contentStateManager.cleanup(),
    };
  }
);
