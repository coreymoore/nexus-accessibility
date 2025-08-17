/**
 * Content Script State Management
 *
 * This module handles browser state changes, desktop switching, visibility changes,
 * and system wake detection. It provides utilities for refreshing inspector state
 * when the user returns to the page.
 *
 * Dependencies: content-deps.js
 */

// Use the enhanced module definition system
window.ContentExtension.deps.defineModule(
  "eventsState",
  [],
  function (deps, utils) {
    "use strict";

    // System wake detection state
    let lastAnimationFrame = Date.now();
    let animationFrameId = null;

    /**
     * Handle browser wake from sleep/hibernate
     * Uses requestAnimationFrame to detect when rendering resumes
     */
    function checkForWakeFromSleep() {
      const now = Date.now();
      const timeDiff = now - lastAnimationFrame;

      // If more than 5 seconds have passed, assume system was asleep
      if (timeDiff > 5000) {
        console.log(
          "[ContentExtension.events.state] System wake detected, refreshing inspector"
        );
        refreshInspectorState();
      }

      lastAnimationFrame = now;
      animationFrameId = requestAnimationFrame(checkForWakeFromSleep);
    }

    /**
     * Start wake detection monitoring
     */
    function startWakeDetection() {
      if (animationFrameId === null) {
        lastAnimationFrame = Date.now();
        animationFrameId = requestAnimationFrame(checkForWakeFromSleep);
        console.log("[ContentExtension.events.state] Wake detection started");
      }
    }

    /**
     * Stop wake detection monitoring
     */
    function stopWakeDetection() {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        console.log("[ContentExtension.events.state] Wake detection stopped");
      }
    }

    /**
     * Refresh inspector state when returning to page
     */
    function refreshInspectorState() {
      // Get the currently focused element through state manager
      const focusState = utils.callModuleMethod(
        "stateManager",
        "getCurrentState"
      );

      const focusedElement = focusState?.lastFocusedElement;

      if (!focusedElement) {
        console.log(
          "[ContentExtension.events.state] No focused element to refresh"
        );
        return;
      }

      console.log(
        "[ContentExtension.events.state] Refreshing inspector for:",
        focusedElement.tagName,
        focusedElement.id || focusedElement.className
      );

      // Re-inspect the current element to update its state using safe method calls
      const eventsAvailable = utils.callModuleMethod(
        "events",
        "handleElementInspection",
        focusedElement,
        focusedElement
      );
      const focusAvailable =
        !eventsAvailable &&
        utils.callModuleMethod(
          "eventsFocus",
          "handleElementInspection",
          focusedElement,
          focusedElement
        );

      if (!eventsAvailable && !focusAvailable) {
        console.warn(
          "[ContentExtension.events.state] Could not refresh inspector - no inspection method available"
        );
      } else {
        console.log(
          "[ContentExtension.events.state] Inspector refresh initiated successfully"
        );
      }
    }

    /**
     * Handle page visibility change
     */
    function onVisibilityChange() {
      if (!document.hidden) {
        console.log(
          "[ContentExtension.events.state] Page visible again, refreshing inspector"
        );
        refreshInspectorState();
      } else {
        console.log("[ContentExtension.events.state] Page hidden");
      }
    }

    /**
     * Handle window focus (desktop switching, app switching)
     */
    function onWindowFocus() {
      console.log(
        "[ContentExtension.events.state] Window focused, refreshing inspector"
      );
      refreshInspectorState();
    }

    /**
     * Handle page show event (back/forward navigation, cache restore)
     */
    function onPageShow(event) {
      // Only refresh if this was from cache (bfcache)
      if (event.persisted) {
        console.log(
          "[ContentExtension.events.state] Page restored from cache, refreshing inspector"
        );
        refreshInspectorState();
      }
    }

    /**
     * Handle document focus event
     */
    function onDocumentFocus() {
      // Only refresh if we have a focused element
      if (document.hasFocus()) {
        console.log(
          "[ContentExtension.events.state] Document focused, refreshing inspector"
        );
        refreshInspectorState();
      }
    }

    /**
     * Handle orientation change (mobile)
     */
    function onOrientationChange() {
      // Wait a bit for the layout to settle
      setTimeout(() => {
        console.log(
          "[ContentExtension.events.state] Orientation changed, refreshing inspector"
        );
        refreshInspectorState();
      }, 250);
    }

    /**
     * Handle window resize
     */
    function onResize() {
      // Debounce resize events
      clearTimeout(onResize.timeout);
      onResize.timeout = setTimeout(() => {
        console.log(
          "[ContentExtension.events.state] Window resized, refreshing inspector"
        );
        refreshInspectorState();
      }, 500);
    }

    /**
     * Register state change event listeners
     */
    function registerStateListeners() {
      console.log(
        "[ContentExtension.events.state] Registering state listeners"
      );

      try {
        // Page visibility and focus
        document.addEventListener("visibilitychange", onVisibilityChange, true);

        // Window and focus events (desktop switching, app switching)
        window.addEventListener("focus", onWindowFocus, true);
        window.addEventListener("pageshow", onPageShow, true);
        document.addEventListener("focus", onDocumentFocus, true);

        // System and browser state changes
        window.addEventListener("resize", onResize, { passive: true });

        // Mobile orientation changes
        if ("onorientationchange" in window) {
          window.addEventListener(
            "orientationchange",
            onOrientationChange,
            true
          );
        }

        // Start wake detection
        startWakeDetection();

        console.log(
          "[ContentExtension.events.state] State listeners registered successfully"
        );
      } catch (error) {
        console.error(
          "[ContentExtension.events.state] Error registering state listeners:",
          error
        );
      }
    }

    /**
     * Remove state change event listeners
     */
    function unregisterStateListeners() {
      console.log("[ContentExtension.events.state] Removing state listeners");

      try {
        // Page visibility and focus
        document.removeEventListener(
          "visibilitychange",
          onVisibilityChange,
          true
        );

        // Window and focus events
        window.removeEventListener("focus", onWindowFocus, true);
        window.removeEventListener("pageshow", onPageShow, true);
        document.removeEventListener("focus", onDocumentFocus, true);

        // System and browser state changes
        window.removeEventListener("resize", onResize);

        // Mobile orientation changes
        if ("onorientationchange" in window) {
          window.removeEventListener(
            "orientationchange",
            onOrientationChange,
            true
          );
        }

        // Stop wake detection
        stopWakeDetection();

        console.log(
          "[ContentExtension.events.state] State listeners removed successfully"
        );
      } catch (error) {
        console.error(
          "[ContentExtension.events.state] Error removing state listeners:",
          error
        );
      }
    }

    // Return module exports
    return {
      // Public API
      refreshInspectorState,
      registerStateListeners,
      unregisterStateListeners,

      // Event handlers (exposed for testing)
      onVisibilityChange,
      onWindowFocus,
      onPageShow,
      onDocumentFocus,
      onOrientationChange,
      onResize,

      // Wake detection
      startWakeDetection,
      stopWakeDetection,
    };
  }
);

console.log("[ContentExtension.events.state] Module loaded");
