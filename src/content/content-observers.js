/**
 * Content Script DOM Observers Management
 *
 * This module manages DOM mutation observers to watch for accessibility-related
 * attribute changes and coordinate updates with other modules.
 *
 * Dependencies: content-utils.js, content-cache.js
 */

(function () {
  "use strict";

  // Ensure our namespace exists
  window.ContentExtension = window.ContentExtension || {};
  const CE = window.ContentExtension;

  // Observer management
  const activeObservers = new WeakMap();
  const allObservers = new Set();
  const observerCleanupTimeouts = new Map();

  // Main mutation observer
  let mainObserver = null;
  // Simple retrieval attribution counter for observer-triggered fetches
  let __observerRetrievalCounter = 0;

  function logAndCallGetAccessibleInfoObserver(target, forceUpdate, source) {
    __observerRetrievalCounter++;
    const id = __observerRetrievalCounter;
    console.log(
      `[RETRIEVAL][observer] id=${id} source=${source} target=${target?.tagName} id=${
        target?.id || "(no id)"
      }`
    );
    if (CE.accessibility && CE.accessibility.getAccessibleInfo) {
      return CE.accessibility.getAccessibleInfo(target, forceUpdate);
    }
    return Promise.resolve(null);
  }

  /**
   * Initialize the observers module
   */
  function initialize() {
    console.log("[ContentExtension.observers] Initializing DOM observers");
    setupMainObserver();
  }

  /**
   * Set up the main mutation observer
   */
  function setupMainObserver() {
    mainObserver = new MutationObserver(handleMutations);
  }

  /**
   * Handle mutation observer callbacks
   * @param {MutationRecord[]} mutations - Array of mutation records
   */
  function handleMutations(mutations) {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes") {
        handleAttributeMutation(mutation);
      }

      // Schedule cleanup check for mutation targets
      if (mutation.target && mutation.target.nodeType === Node.ELEMENT_NODE) {
        scheduleObserverCleanup(mutation.target);
      }
    });
  }

  /**
   * Handle attribute mutation
   * @param {MutationRecord} mutation - The mutation record
   */
  function handleAttributeMutation(mutation) {
    const focusState = CE.events ? CE.events.getFocusState() : {};
    const { lastFocusedElement, inspectedElement } = focusState;

    const isTargetElement = mutation.target === lastFocusedElement;
    const isSelectOption =
      lastFocusedElement &&
      lastFocusedElement.tagName === "SELECT" &&
      mutation.target &&
      mutation.target.tagName === "OPTION";

    // Handle details/summary case: focus is on <summary> but mutation is on parent <details>
    const isDetailsDisclosure =
      lastFocusedElement &&
      lastFocusedElement.tagName === "SUMMARY" &&
      mutation.target &&
      mutation.target.tagName === "DETAILS" &&
      mutation.target.contains(lastFocusedElement) &&
      mutation.attributeName === "open";

    if (!(isTargetElement || isSelectOption || isDetailsDisclosure)) {
      return;
    }

    console.log("[ContentExtension.observers] Attribute changed:", {
      attribute: mutation.attributeName,
      oldValue: mutation.oldValue,
      newValue: CE.utils.safeGetAttribute(
        mutation.target,
        mutation.attributeName
      ),
      tagName: mutation.target.tagName,
      id: mutation.target.id || "(no id)",
      className: mutation.target.className || "(no class)",
      focusedElement: lastFocusedElement
        ? {
            tagName: lastFocusedElement.tagName,
            id: lastFocusedElement.id || "(no id)",
            role: CE.utils.safeGetAttribute(lastFocusedElement, "role"),
            "aria-expanded": CE.utils.safeGetAttribute(
              lastFocusedElement,
              "aria-expanded"
            ),
          }
        : null,
    });

    // Determine which element to update
    let targetForUpdate;
    if (isTargetElement) {
      targetForUpdate = lastFocusedElement;
    } else if (isSelectOption) {
      targetForUpdate = lastFocusedElement;
    } else if (isDetailsDisclosure) {
      // For details/summary, update inspector for the focused summary element
      targetForUpdate = lastFocusedElement;
    }

    // Handle aria-activedescendant changes
    if (
      mutation.attributeName === "aria-activedescendant" &&
      lastFocusedElement &&
      mutation.target === lastFocusedElement
    ) {
      handleAriaActiveDescendantChange(lastFocusedElement);
      return;
    }

    // Special handling for combobox aria-expanded changes
    // Comboboxes often have complex timing issues with accessibility tree updates
    if (
      mutation.attributeName === "aria-expanded" &&
      targetForUpdate &&
      (CE.utils.safeGetAttribute(targetForUpdate, "role") === "combobox" ||
        (targetForUpdate.tagName === "INPUT" &&
          CE.utils.safeGetAttribute(targetForUpdate, "aria-expanded") !== null))
    ) {
      console.log(
        "[ContentExtension.observers] Combobox aria-expanded change detected, using enhanced invalidation"
      );
      scheduleComboboxUpdate(targetForUpdate);
      return;
    }

    // Handle general attribute changes with debouncing
    if (targetForUpdate) {
      scheduleAttributeUpdate(targetForUpdate);
    }
  }

  /**
   * Special handling for combobox updates with enhanced cache invalidation
   * @param {Element} target - The combobox element
   */
  function scheduleComboboxUpdate(target) {
    if (!CE.cache) {
      console.warn("[ContentExtension.observers] Cache module not available");
      return;
    }

    console.log(
      "[ContentExtension.observers] Enhanced combobox update - clearing all caches"
    );

    // Clear content script cache
    CE.cache.deleteCached(target);

    // Send message to background to clear CDP cache with enhanced clearing
    if (chrome.runtime && chrome.runtime.sendMessage) {
      const elementSelector =
        CE.utils && CE.utils.generateSelector
          ? CE.utils.generateSelector(target)
          : null;

      if (elementSelector) {
        chrome.runtime
          .sendMessage({
            action: "invalidateAccessibilityCache",
            tabId: null,
            frameId: 0,
            elementSelector: elementSelector,
            reason: "combobox-expanded-change", // Special reason for enhanced clearing
          })
          .catch((error) => {
            console.warn(
              "[ContentExtension.observers] Failed to invalidate background cache for combobox:",
              error
            );
          });
      }
    }

    // Use a slightly longer delay for combobox updates to allow DOM/a11y tree to settle
    const updateFunction = (element) => {
      if (CE.accessibility && CE.accessibility.getAccessibleInfo) {
        console.log(
          "[ContentExtension.observers] Executing combobox update with forceUpdate=true"
        );
        logAndCallGetAccessibleInfoObserver(element, true, "combobox-update")
          .then((info) => {
            const focusState = CE.events ? CE.events.getFocusState() : {};
            const { lastFocusedElement, inspectedElement } = focusState;

            const isCurrentlyFocused =
              lastFocusedElement === element || inspectedElement === element;
            if (isCurrentlyFocused && CE.inspector) {
              console.log(
                "[ContentExtension.observers] Updating inspector for combobox with info:",
                info
              );
              CE.inspector.showInspector(info, element);
            }
          })
          .catch((error) => {
            console.error(
              "[ContentExtension.observers] Error updating combobox inspector:",
              error
            );
          });
      }
    };

    // Use a longer delay for combobox updates (200ms instead of 100ms)
    const debouncedUpdate = CE.cache.createDebouncedUpdate(updateFunction, 200);
    debouncedUpdate(target);
  }

  /**
   * Handle aria-activedescendant changes
   * @param {Element} container - The container element with aria-activedescendant
   */
  function handleAriaActiveDescendantChange(container) {
    const activeId = CE.utils.safeGetAttribute(
      container,
      "aria-activedescendant"
    );
    if (!activeId) return;

    const activeEl = container.ownerDocument.getElementById(activeId);
    if (!activeEl) return;

    console.log("[ContentExtension.observers] Active descendant changed:", {
      container: container.id || container.tagName,
      activeDescendantId: activeId,
      activeElement: activeEl.tagName + (activeEl.id ? `#${activeEl.id}` : ""),
    });

    // Keep the container as the main inspected element, but get info about the active descendant
    // We'll pass this information along when updating the inspector
    scheduleActiveDescendantUpdate(container, activeEl, activeId);
  }

  /**
   * Schedule update for container with active descendant information
   * @param {Element} container - The container element
   * @param {Element} activeDescendant - The active descendant element
   * @param {string} activeDescendantId - The ID of the active descendant
   */
  function scheduleActiveDescendantUpdate(
    container,
    activeDescendant,
    activeDescendantId
  ) {
    if (!CE.cache || !CE.accessibility) {
      console.warn(
        "[ContentExtension.observers] Required modules not available"
      );
      return;
    }

    console.log(
      "[ContentExtension.observers] Scheduling active descendant update"
    );

    // Clear cache for both container and active descendant
    CE.cache.deleteCached(container);
    if (activeDescendant) {
      CE.cache.deleteCached(activeDescendant);
    }

    // Create enhanced update function that includes active descendant info
    const updateFunction = async (containerElement) => {
      if (!CE.accessibility.getAccessibleInfo) return;

      try {
        console.log(
          "[ContentExtension.observers] Getting accessibility info for container and active descendant"
        );

        // Get container accessibility info (force update so we get fresh states.activedescendant)
        const containerInfo = await logAndCallGetAccessibleInfoObserver(
          containerElement,
          true,
          "container-activedescendant"
        );

        // Attempt to resolve active descendant directly from containerInfo.states.activedescendant
        // BEFORE issuing a separate accessibility call on the descendant element. This avoids the
        // situation where Chrome returns the container's AX node for the descendant due to timing.
        let resolvedFromStates = null;
        try {
          const raw =
            containerInfo?.states?.activedescendant ||
            containerInfo?.activeDescendantRaw;
          if (
            raw &&
            Array.isArray(raw.relatedNodes) &&
            raw.relatedNodes.length
          ) {
            for (const rel of raw.relatedNodes) {
              // Prefer idref resolution when present; backendDOMNodeId mapping not yet implemented
              if (rel && rel.idref) {
                const byId = containerElement.ownerDocument.getElementById(
                  rel.idref
                );
                if (byId) {
                  resolvedFromStates = {
                    element: byId,
                    id: byId.id,
                    role:
                      byId.getAttribute("role") || byId.tagName.toLowerCase(),
                    name:
                      byId.getAttribute("aria-label") ||
                      byId.textContent?.trim() ||
                      byId.id ||
                      "(no accessible name)",
                  };
                  console.log(
                    "[ContentExtension.observers] Resolved active descendant via container states.activedescendant idref",
                    {
                      idref: rel.idref,
                      role: resolvedFromStates.role,
                      name: resolvedFromStates.name,
                    }
                  );
                  break;
                }
              }
              // Placeholder for future backendDOMNodeId resolution path
              if (!resolvedFromStates && rel && rel.backendDOMNodeId) {
                console.log(
                  "[ContentExtension.observers] backendDOMNodeId present for activedescendant but no resolver implemented yet",
                  rel.backendDOMNodeId
                );
              }
            }
          }
        } catch (e) {
          console.warn(
            "[ContentExtension.observers] Failed resolving activedescendant from states",
            e
          );
        }

        // Get active descendant accessibility info if available
        let activeDescendantInfo = null;
        // If we already resolved from states, adopt that without an extra accessibility fetch
        if (resolvedFromStates && resolvedFromStates.element) {
          activeDescendantInfo = {
            role: resolvedFromStates.role,
            name: resolvedFromStates.name,
            description: "(no description)",
            states: [],
            element: resolvedFromStates.element,
          };
          console.log(
            "[ContentExtension.observers] Using activedescendant info resolved from container states"
          );
        } else if (activeDescendant && document.contains(activeDescendant)) {
          try {
            console.log(
              "[ContentExtension.observers] Getting accessibility info for active descendant element:",
              {
                tagName: activeDescendant.tagName,
                id: activeDescendant.id,
                role: activeDescendant.getAttribute("role"),
                textContent: activeDescendant.textContent?.substring(0, 50),
                selector: CE.utils.getUniqueSelector
                  ? CE.utils.getUniqueSelector(activeDescendant)
                  : "unknown",
              }
            );

            // Double-check we have the right element before getting accessibility info
            if (activeDescendant.id !== activeDescendantId) {
              console.warn(
                "[ContentExtension.observers] Element ID mismatch!",
                {
                  expectedId: activeDescendantId,
                  actualId: activeDescendant.id,
                }
              );
            }

            // Add a small delay to ensure Chrome's accessibility tree has updated
            await new Promise((resolve) => setTimeout(resolve, 50));

            activeDescendantInfo = await logAndCallGetAccessibleInfoObserver(
              activeDescendant,
              true, // Force update to bypass cache
              "active-descendant"
            );

            console.log(
              "[ContentExtension.observers] Raw active descendant info received:",
              {
                fullInfo: activeDescendantInfo,
                role: activeDescendantInfo?.role,
                name: activeDescendantInfo?.name,
                hasStates: !!activeDescendantInfo?.states,
                elementIdFromInfo: activeDescendantInfo?.element?.id,
                containerRole: containerInfo?.role,
                containerName: containerInfo?.name,
              }
            );

            // More thorough check: if the API returned info that exactly matches the container,
            // it's likely incorrect (unless they genuinely are the same element, which would be weird)
            if (
              activeDescendantInfo &&
              containerInfo &&
              activeDescendantInfo.role === containerInfo.role &&
              activeDescendantInfo.name === containerInfo.name &&
              activeDescendant !== containerElement
            ) {
              console.warn(
                "[ContentExtension.observers] API returned container info for descendant - this suggests either:"
              );
              console.warn(
                "1. Chrome's accessibility API is following aria-activedescendant incorrectly"
              );
              console.warn(
                "2. The selector resolution found the wrong element"
              );
              console.warn("3. The accessibility tree hasn't updated yet");
              console.warn("4. There's a caching issue");

              // Before falling back, let's try one more time with additional delay
              console.log(
                "[ContentExtension.observers] Retrying with longer delay..."
              );
              await new Promise((resolve) => setTimeout(resolve, 150));

              const retryInfo = await logAndCallGetAccessibleInfoObserver(
                activeDescendant,
                true,
                "active-descendant-retry"
              );

              if (
                retryInfo &&
                (retryInfo.role !== containerInfo.role ||
                  retryInfo.name !== containerInfo.name)
              ) {
                console.log(
                  "[ContentExtension.observers] Retry successful, got different info"
                );
                activeDescendantInfo = retryInfo;
              } else {
                console.warn(
                  "[ContentExtension.observers] Retry failed, falling back to manual info"
                );

                // Build active descendant info manually from DOM
                const manualInfo = {
                  role: activeDescendant.getAttribute("role") || "option",
                  name:
                    activeDescendant.textContent?.trim() ||
                    activeDescendant.getAttribute("aria-label") ||
                    activeDescendant.getAttribute("title") ||
                    activeDescendant.id,
                  description: activeDescendant.getAttribute("aria-describedby")
                    ? activeDescendant.getAttribute("aria-describedby")
                    : "(no description)",
                  states: [],
                  element: activeDescendant,
                };

                // Check for common states
                if (activeDescendant.getAttribute("aria-selected") === "true") {
                  manualInfo.states.push("selected");
                }
                if (activeDescendant.getAttribute("aria-disabled") === "true") {
                  manualInfo.states.push("disabled");
                }
                if (activeDescendant.matches(":focus")) {
                  manualInfo.states.push("focused");
                }

                activeDescendantInfo = manualInfo;
                console.log(
                  "[ContentExtension.observers] Manual active descendant info:",
                  manualInfo
                );
              }
            }
          } catch (error) {
            console.warn(
              "[ContentExtension.observers] Could not get active descendant info:",
              error
            );
          }
        }

        // Enhance container info with active descendant data
        const enhancedInfo = {
          ...containerInfo,
          activeDescendant: activeDescendantInfo
            ? {
                role: activeDescendantInfo.role,
                name: activeDescendantInfo.name,
                description: activeDescendantInfo.description,
                states: activeDescendantInfo.states,
                element: activeDescendant,
              }
            : null,
        };

        const focusState = CE.events ? CE.events.getFocusState() : {};
        const { lastFocusedElement, inspectedElement } = focusState;

        const isCurrentlyFocused =
          lastFocusedElement === containerElement ||
          inspectedElement === containerElement;

        if (isCurrentlyFocused && CE.inspector) {
          console.log(
            "[ContentExtension.observers] Updating inspector with enhanced info including active descendant"
          );
          CE.inspector.showInspector(enhancedInfo, containerElement);
        }
      } catch (error) {
        console.error(
          "[ContentExtension.observers] Error updating active descendant inspector:",
          error
        );
      }
    };

    // Use standard debounce delay
    const debouncedUpdate = CE.cache.createDebouncedUpdate(updateFunction, 100);
    debouncedUpdate(container);
  }

  /**
   * Schedule debounced update for attribute changes
   * @param {Element} target - The target element
   */
  function scheduleAttributeUpdate(target) {
    if (!CE.cache) {
      console.warn("[ContentExtension.observers] Cache module not available");
      return;
    }

    console.log(
      "[ContentExtension.observers] Scheduling attribute update for element, clearing caches"
    );

    // Clear content script cache for fresh data
    CE.cache.deleteCached(target);

    // Send message to background to clear CDP cache
    if (chrome.runtime && chrome.runtime.sendMessage) {
      const elementSelector =
        CE.utils && CE.utils.generateSelector
          ? CE.utils.generateSelector(target)
          : null;

      if (elementSelector) {
        chrome.runtime
          .sendMessage({
            action: "invalidateAccessibilityCache",
            tabId: null, // Background will determine current tab
            frameId: 0, // Background will determine correct frame
            elementSelector: elementSelector,
          })
          .catch((error) => {
            console.warn(
              "[ContentExtension.observers] Failed to invalidate background cache:",
              error
            );
          });
      }
    }

    // Create debounced update function
    const updateFunction = (element) => {
        if (CE.accessibility && CE.accessibility.getAccessibleInfo) {
        console.log(
          "[ContentExtension.observers] Executing debounced update with forceUpdate=true"
        );
        logAndCallGetAccessibleInfoObserver(element, true, "attribute-change")
          .then((info) => {
            const focusState = CE.events ? CE.events.getFocusState() : {};
            const { lastFocusedElement, inspectedElement } = focusState;

            const isCurrentlyFocused =
              lastFocusedElement === element || inspectedElement === element;
            if (isCurrentlyFocused && CE.inspector) {
              CE.inspector.showInspector(info, element);
            }
          })
          .catch((error) => {
            console.error(
              "[ContentExtension.observers] Error updating inspector:",
              error
            );
          });
      }
    };

    // Use cache's debounced update mechanism with reduced delay for better responsiveness
    const debouncedUpdate = CE.cache.createDebouncedUpdate(updateFunction, 100);
    debouncedUpdate(target);
  }

  /**
   * Start observing an element with comprehensive attribute monitoring
   * @param {Element} element - The element to observe
   */
  function startObserving(element) {
    if (!mainObserver) {
      console.warn(
        "[ContentExtension.observers] Main observer not initialized"
      );
      return;
    }

    // Check if already observing
    if (activeObservers.has(element)) {
      return;
    }

    const isSelect = element && element.tagName === "SELECT";
    const isSummary = element && element.tagName === "SUMMARY";

    const observerOptions = {
      attributes: true,
      // For <select>, also observe subtree to catch <option selected> attribute toggles
      subtree: !!isSelect,
      attributeFilter: [
        // ARIA states and properties - Core states
        "aria-expanded",
        "aria-pressed",
        "aria-checked",
        "aria-selected",
        "aria-disabled",
        "aria-invalid",
        "aria-required",
        "aria-readonly",
        "aria-busy",
        "aria-current",
        "aria-hidden",
        "aria-modal",
        "aria-activedescendant",

        // ARIA states and properties - Interactive states
        "aria-haspopup",
        "aria-grabbed",
        "aria-autocomplete",
        "aria-multiselectable",
        "aria-orientation",
        "aria-sort",
        "aria-multiline",

        // ARIA states and properties - Live regions
        "aria-live",
        "aria-atomic",
        "aria-relevant",

        // ARIA states and properties - Value/Range
        "aria-valuemin",
        "aria-valuemax",
        "aria-valuenow",
        "aria-valuetext",

        // ARIA states and properties - Set/Position
        "aria-level",
        "aria-posinset",
        "aria-setsize",

        // ARIA states and properties - Grid/Table
        "aria-rowcount",
        "aria-rowindex",
        "aria-rowspan",
        "aria-colcount",
        "aria-colindex",
        "aria-colspan",

        // ARIA naming/relationship attributes
        "aria-label",
        "aria-describedby",
        "aria-labelledby",
        "aria-errormessage",
        "aria-details",
        "aria-controls",
        "aria-flowto",
        "aria-owns",
        "aria-placeholder",
        "aria-roledescription",
        "aria-keyshortcuts",

        // HTML state attributes
        "disabled",
        "checked",
        "selected",
        "required",
        "readonly",
        "expanded", // Native expanded attribute for <details> and custom components
        "open", // For <details>, <dialog> and similar elements
        "hidden", // For visibility state changes
        "multiple",
        "autofocus",

        // HTML5 input constraints
        "min",
        "max",
        "step",
        "pattern",
        "maxlength",
        "minlength",
        "size",

        // HTML form attributes
        "placeholder",
        "autocomplete",
        "list",
        "form",
        "formaction",
        "formmethod",
        "formtarget",

        // Media element states
        "controls",
        "loop",
        "muted",
        "autoplay",
        "playsinline",
        "poster",
        "preload",

        // Content interaction attributes
        "contenteditable",
        "spellcheck",
        "draggable",
        "tabindex",
        "accesskey",
        "inputmode",
        "enterkeyhint",

        // Language & translation
        "lang",
        "dir",
        "translate",

        // Link/resource attributes
        "href",
        "src",
        "alt",
        "type",
        "target",
        "rel",
        "download",
        "ping",
        "referrerpolicy",
        "crossorigin",
        "loading",

        // Semantic attributes
        "role",
        "reversed",
        "start",

        // Other relevant attributes
        "title",
        "value",
        "class",
        "id",

        // Common data attributes for state
        "data-state",
        "data-active",
        "data-selected",
        "data-expanded",
        "data-checked",
        "data-disabled",
      ],
    };

    mainObserver.observe(element, observerOptions);

    // For <summary> elements, also observe the parent <details> element
    // to catch "open" attribute changes
    if (isSummary) {
      const detailsParent = element.closest("details");
      if (detailsParent && !activeObservers.has(detailsParent)) {
        const detailsOptions = {
          attributes: true,
          attributeFilter: ["open"],
        };
        mainObserver.observe(detailsParent, detailsOptions);
        activeObservers.set(detailsParent, mainObserver);
        allObservers.add(mainObserver);
        console.log(
          "[ContentExtension.observers] Also observing parent <details> element for",
          element.id || "summary"
        );
      }
    }

    // Track the observer for cleanup
    activeObservers.set(element, mainObserver);
    allObservers.add(mainObserver);

    // Schedule periodic cleanup check
    scheduleObserverCleanup(element);
  }

  /**
   * Stop observing an element
   * @param {Element} element - The element to stop observing
   */
  /**
   * Stop observing a specific element
   * @param {Element} element - The element to stop observing
   */
  function stopObservingElement(element) {
    const observer = activeObservers.get(element);
    if (observer) {
      // Note: We can't selectively stop observing just one element
      // with a single MutationObserver, so we just remove from tracking
      activeObservers.delete(element);
      allObservers.delete(observer);
    }

    const timeout = observerCleanupTimeouts.get(element);
    if (timeout) {
      clearTimeout(timeout);
      observerCleanupTimeouts.delete(element);
    }
  }

  /**
   * Stop all observation
   */
  function stopObserving() {
    if (mainObserver) {
      mainObserver.disconnect();
    }
  }

  /**
   * Schedule cleanup check for an element
   * @param {Element} element - The element to schedule cleanup for
   */
  function scheduleObserverCleanup(element) {
    // Clear existing timeout
    const existingTimeout = observerCleanupTimeouts.get(element);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule new cleanup check
    const timeout = setTimeout(() => {
      if (!document.contains(element)) {
        stopObservingElement(element);
      }
    }, 30000); // Check every 30 seconds

    observerCleanupTimeouts.set(element, timeout);
  }

  /**
   * Get observer statistics for debugging
   * @returns {Object} Observer statistics
   */
  function getObserverStats() {
    return {
      activeObserversCount: "WeakMap (size not available)", // WeakMap doesn't expose size
      allObserversCount: allObservers.size,
      cleanupTimeoutsCount: observerCleanupTimeouts.size,
      hasMainObserver: !!mainObserver,
    };
  }

  /**
   * Check if an element is currently being observed
   * @param {Element} element - Element to check
   * @returns {boolean} True if element is being observed
   */
  function isObserving(element) {
    return activeObservers.has(element);
  }

  /**
   * Clean up all observers and timeouts
   */
  function cleanup() {
    console.log("[ContentExtension.observers] Cleaning up observers");

    // Disconnect main observer
    if (mainObserver) {
      mainObserver.disconnect();
      mainObserver = null;
    }

    // Clean up all observers
    if (allObservers && typeof allObservers.forEach === "function") {
      allObservers.forEach((observer) => observer.disconnect());
      allObservers.clear();
    }

    // Clear cleanup timeouts
    if (
      observerCleanupTimeouts &&
      typeof observerCleanupTimeouts.forEach === "function"
    ) {
      observerCleanupTimeouts.forEach((timeout) => clearTimeout(timeout));
      observerCleanupTimeouts.clear();
    }

    // Clear active observers tracking
    // Note: WeakMap doesn't have a clear method, but will be garbage collected
  }

  /**
   * Handle state change (extension enabled/disabled)
   * @param {boolean} enabled - Whether extension is enabled
   */
  function onStateChange(enabled) {
    if (!enabled) {
      stopObserving();
    }
  }

  /**
   * Reconnect observer after it's been disconnected
   */
  function reconnectObserver() {
    console.log("[ContentExtension.observers] Reconnecting observers");

    // Always create a new observer to ensure it's fresh
    if (mainObserver) {
      try {
        mainObserver.disconnect();
      } catch (error) {
        console.warn(
          "[ContentExtension.observers] Error disconnecting old observer:",
          error
        );
      }
    }

    setupMainObserver();

    // Clear tracking maps since we're starting fresh
    // Note: activeObservers is a WeakMap and doesn't have a clear() method
    // It will clean up automatically when elements are garbage collected
    allObservers.clear();

    // Clear any pending cleanup timeouts
    observerCleanupTimeouts.forEach((timeout) => clearTimeout(timeout));
    observerCleanupTimeouts.clear();

    console.log("[ContentExtension.observers] Observer reconnection complete");
  }

  // Export the observers module
  CE.observers = {
    initialize,
    cleanup,
    onStateChange,

    // Main observation control
    startObserving,
    stopObserving,
    stopObservingElement,

    // Utility functions
    scheduleObserverCleanup,
    getObserverStats,
    isObserving,
    reconnectObserver,

    // Internal functions (exposed for testing)
    handleMutations,
    handleAttributeMutation,
    handleAriaActiveDescendantChange,
    scheduleAttributeUpdate,
    scheduleComboboxUpdate,
  };

  console.log("[ContentExtension.observers] Module loaded");
})();
