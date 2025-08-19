/**
 * Content Script Accessibility Data Management
 *
 * This module handles fetching accessibility information from Chrome DevTools Protocol
 * and provides fallback local computation when CDP is unavailable.
 *
 * Dependencies: content-utils.js, content-cache.js
 */

(function () {
  "use strict";

  // Ensure our namespace exists
  window.ContentExtension = window.ContentExtension || {};
  const CE = window.ContentExtension;

  /**
   * Normalize a state value that might be wrapped in an object
   * @param {*} value - The value to normalize
   * @returns {boolean|null} Normalized boolean value or null
   */
  function normalizeStateValue(value) {
    if (typeof value === "object" && value !== null && "value" in value) {
      return value.value === true;
    }
    return value === true;
  }

  /**
   * Normalize expanded state from states and aria properties
   * @param {Object} states - Element states
   * @param {Object} ariaProperties - Aria properties
   * @returns {boolean|null} Normalized expanded state
   */
  function normalizeExpandedState(states, ariaProperties) {
    if ("expanded" in states) {
      return normalizeStateValue(states.expanded);
    }
    if ("aria-expanded" in ariaProperties) {
      return (
        ariaProperties["aria-expanded"] === "true" ||
        ariaProperties["aria-expanded"] === true
      );
    }
    return null;
  }

  /**
   * Initialize the accessibility module
   */
  function initialize() {
    console.log(
      "[ContentExtension.accessibility] Initializing accessibility data management"
    );
  }

  /**
   * Wait for accessibility update with retry logic
   * @param {Element} target - The target element
   * @param {number} maxAttempts - Maximum number of retry attempts
   * @returns {Promise<Object>} Accessibility information
   */
  async function waitForAccessibilityUpdate(
    target,
    maxAttempts = window.NexusConstants?.RETRY_ATTEMPTS?.ACCESSIBILITY_UPDATE ||
      8
  ) {
    const cache = CE.cache;

    // Allowed actions (mirror of MessageValidator.ALLOWED_ACTIONS)
    const ALLOWED_ACTIONS = new Set([
      "getAccessibilityTree",
      "getBackendNodeIdAndAccessibleInfo",
      "AX_INSPECTOR_SHOWN",
      "keepAlive",
      "detachDebugger",
    ]);

    /**
     * Validate and send a runtime message with optional recovery.
     * Ensures action is permitted before dispatching.
     * @param {Object} msg - Message object to send (must include action)
     * @param {string} opId - Operation identifier for recovery
     * @returns {Promise<any>} Response
     */
    function validatedSend(msg, opId) {
      if (!msg || typeof msg !== "object") {
        return Promise.reject(new Error("Invalid message object"));
      }
      const action = msg.action || msg.type;
      if (!ALLOWED_ACTIONS.has(action)) {
        return Promise.reject(new Error(`Disallowed action: ${action}`));
      }
      const executor = () => chrome.runtime.sendMessage(msg);
      if (
        window.errorRecovery &&
        typeof window.errorRecovery.executeWithRecovery === "function"
      ) {
        return window.errorRecovery.executeWithRecovery(opId, executor, {
          onError: (err, attempt) => {
            console.warn(
              `[NEXUS] Message send failed (attempt ${
                attempt + 1
              }) for ${action}:`,
              err.message
            );
          },
          shouldRetry: (err, attempt) => {
            const m = err?.message || "";
            if (m.includes("timeout") || m.includes("disconnected"))
              return attempt < 2;
            return attempt === 0; // single retry for other transient cases
          },
          maxRetries: 2,
        });
      }
      return executor();
    }

    // Cancel any pending request
    if (cache) {
      cache.clearPendingRequest();
    }

    // Create new request tracker
    const currentRequest = { cancelled: false };
    if (cache) {
      cache.setPendingRequest(currentRequest);
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Check if this request was cancelled
      if (currentRequest.cancelled) {
        console.log("[NEXUS] Request cancelled");
        return null;
      }

      try {
        // Use CDP approach with direct element reference
        const selector = CE.utils.getUniqueSelector(target);

        const response = await validatedSend(
          {
            action: "getBackendNodeIdAndAccessibleInfo",
            useDirectReference: true,
            elementSelector: selector,
            frameId: 0, // Background script will determine the correct frame
          },
          "getBackendNodeIdAndAccessibleInfo"
        );

        console.log("[NEXUS] CDP Response:", {
          role: response?.role,
        });

        if (currentRequest.cancelled) return null;

        if (response && response.accessibleNode) {
          return response;
        }

        // Check if we have meaningful data
        const hasData =
          (response?.role && response.role !== "(no role)") ||
          (response?.name && response.name !== "(no accessible name)") ||
          (response?.states && Object.keys(response.states).length > 0) ||
          (response?.ariaProperties &&
            Object.keys(response.ariaProperties).length > 0);

        if (hasData) {
          console.log(`Got accessibility data on attempt ${attempt + 1}:`, {
            role: response?.role,
            name: response?.name,
            statesCount: Object.keys(response?.states || {}).length,
            ariaCount: Object.keys(response?.ariaProperties || {}).length,
          });
          return response;
        }

        // Short backoff: 50ms, 100ms, 150ms, ...
        if (attempt < maxAttempts - 1) {
          const delay =
            (window.NexusConstants?.TIMEOUTS?.ACCESSIBILITY_RETRY_BASE || 50) *
            (attempt + 1);
          console.log(
            `No meaningful data on attempt ${
              attempt + 1
            }, waiting ${delay}ms...`,
            {
              role: response?.role,
              name: response?.name,
            }
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (error) {
        if (currentRequest.cancelled) return null;
        console.error("[NEXUS] Attempt failed:", error);

        // Wait before retry with exponential backoff
        if (attempt < maxAttempts - 1) {
          const backoffBase =
            window.NexusConstants?.TIMEOUTS?.EXPONENTIAL_BACKOFF_BASE || 100;
          await new Promise((resolve) =>
            setTimeout(resolve, backoffBase * Math.pow(2, attempt))
          );
        }
      }
    }

    // Clean up
    if (cache && cache.getPendingRequest() === currentRequest) {
      cache.clearPendingRequest();
    }

    // Final attempt
    console.log("Final attempt after all retries...");
    try {
      const selector = CE.utils.getUniqueSelector(target);

      const response = await validatedSend(
        {
          action: "getBackendNodeIdAndAccessibleInfo",
          useDirectReference: true,
          elementSelector: selector,
          frameId: 0, // Background script will determine the correct frame
        },
        "finalAttempt-getBackendNodeIdAndAccessibleInfo"
      );

      console.log("Final attempt result:", {
        role: response?.role,
        name: response?.name,
      });

      return response;
    } catch (error) {
      throw new Error("Failed to get accessibility info after all attempts");
    }
  }

  /**
   * Get accessible information for an element
   * @param {Element} target - The target element
   * @param {boolean} forceUpdate - Whether to force update ignoring cache
   * @returns {Promise<Object>} Accessibility information
   */
  async function getAccessibleInfo(target, forceUpdate = false) {
    console.log(
      "getAccessibleInfo called with:",
      target,
      "forceUpdate:",
      forceUpdate
    );
    console.log("Element details:", {
      tagName: target.tagName,
      id: target.id,
      className: target.className,
      textContent: target.textContent?.substring(0, 50),
      isInShadowRoot: CE.utils.isInShadowRoot(target),
      parentHost: target.getRootNode()?.host?.id || "none",
    });

    const cache = CE.cache;

    // Check for existing in-flight request
    if (cache) {
      const existing = cache.getInflightRequest(target);
      if (existing) {
        return existing;
      }
    }

    const promise = (async () => {
      // Check cache first, unless forceUpdate is true
      let cached;
      if (!forceUpdate && cache) {
        cached = cache.getCached(target);
      }

      // Check if we should use local fallback (shadow DOM, deep iframes, etc.)
      if (CE.utils.shouldUseLocalFallback(target)) {
        console.log("Using local fallback for accessibility info:", {
          inShadowRoot: CE.utils.isInShadowRoot(target),
          inIframe: CE.utils.isInIframe(),
          frameDepth: CE.utils.getFrameDepth(),
        });
        const localInfo = getLocalAccessibleInfo(target);
        if (CE.inspector) {
          CE.inspector.showInspector(localInfo, target);
        }
        return localInfo;
      }

      // Log current DOM state
      const domExpanded = CE.utils.safeGetAttribute(target, "aria-expanded");
      console.log("DOM aria-expanded value before fetch:", domExpanded);

      try {
        const info = await waitForAccessibilityUpdate(target);

        // Handle structured error response
        if (info && info.error) {
          const err = new Error(info.error);
          if (info.errorCode) err.code = info.errorCode;
          throw err;
        }

        console.log("getAccessibleInfo: building return object from", info);

        // If we got an IframePresentational role when we expected element content,
        // it means CDP is seeing the iframe container instead of the focused element
        if (info?.role === "IframePresentational" && CE.utils.isInIframe()) {
          console.log(
            "Detected iframe presentational issue, falling back to local computation"
          );
          const localInfo = getLocalAccessibleInfo(target);
          if (CE.inspector) {
            CE.inspector.showInspector(localInfo, target);
          }
          return localInfo;
        }

        // Process accessibility information
        const result = processAccessibilityInfo(info, target);

        // Cache the result if meaningful and not a force update
        if (!forceUpdate && cache && result) {
          cache.setCached(target, result);
        } else if (cached && cache) {
          // Use cached data if current result is empty
          console.log("Using cached data instead of empty result");
          return cached;
        }

        console.log("getAccessibleInfo: final result", result);

        // If CDP returned generic role for shadow DOM element, try local fallback
        if (result?.role === "generic" && CE.utils.isInShadowRoot(target)) {
          console.log(
            "CDP returned generic role for shadow DOM element, trying local fallback"
          );
          const localInfo = getLocalAccessibleInfo(target);

          // Use local info if it's more specific than generic
          if (
            localInfo &&
            localInfo.role &&
            localInfo.role !== "generic" &&
            localInfo.role !== "(no role)"
          ) {
            console.log(
              "Using local fallback for shadow DOM element:",
              localInfo
            );
            if (CE.inspector) {
              CE.inspector.showInspector(localInfo, target);
            }
            return localInfo;
          }
        }

        return result;
      } catch (error) {
        console.error("Failed to get accessibility info:", error);

        // Fallback to cached or local info
        if (cached && cache) {
          console.log("Using cached data after error");
          return cached;
        }

        const localInfo = getLocalAccessibleInfo(target);

        // Cache local info if meaningful
        if (
          cache &&
          localInfo &&
          (localInfo.role !== "(no role)" ||
            localInfo.name !== "(no accessible name)")
        ) {
          cache.setCached(target, localInfo);
        }

        return localInfo;
      } finally {
        if (cache) {
          cache.deleteInflightRequest(target);
        }
      }
    })();

    if (cache) {
      cache.getInflightRequest(target, promise);
    }

    return promise;
  }

  /**
   * Process raw accessibility information from CDP
   * @param {Object} info - Raw accessibility info from CDP
   * @param {Element} target - The target element
   * @returns {Object} Processed accessibility information
   */
  function processAccessibilityInfo(info, target) {
    const states = { ...(info?.states || {}) };
    const ariaProperties = { ...(info?.ariaProperties || {}) };

    // Clean up recursive properties
    delete states.describedby;
    delete states.url;
    delete ariaProperties["aria-describedby"];

    // Normalize expanded state
    const normalizedExpanded = normalizeExpandedState(states, ariaProperties);

    const result = {
      role: info?.role || "(no role)",
      name: info?.name || "(no accessible name)",
      description: info?.description || "(no description)",
      value: info?.value || "(no value)",
      states,
      ariaProperties,
      normalizedExpanded,
      ignored: info?.ignored || false,
      ignoredReasons: info?.ignoredReasons || [],
    };

    // Preserve raw activedescendant AXValue structure (if any) so observers can try
    // to resolve it without immediately performing a second round-trip.
    // We intentionally do NOT mutate the states entry (so inspector shows the
    // original AX state), but expose a dedicated field for downstream logic.
    // Shape example from CDP:
    // states.activedescendant = { type: 'idref', relatedNodes: [{ idref: 'combo1-1', backendDOMNodeId: 600485 }] }
    if (states && states.activedescendant && !result.activeDescendantRaw) {
      result.activeDescendantRaw = states.activedescendant;
    }

    // Normalize checkbox states
    normalizeCheckboxStates(result, target);

    // Add group information
    result.group = info?.group ?? computeGroupInfo(target);

    return result;
  }

  /**
   * Normalize checkbox states from DOM properties
   * @param {Object} result - The accessibility result object
   * @param {Element} target - The target element
   */
  function normalizeCheckboxStates(result, target) {
    try {
      if (
        target instanceof Element &&
        target.tagName === "INPUT" &&
        target.type === "checkbox"
      ) {
        const domChecked = !!target.checked;
        const domIndeterminate = !!target.indeterminate;

        if (domIndeterminate) {
          result.states.checked = "mixed";
          result.ariaProperties["aria-checked"] = "mixed";
        } else {
          result.states.checked = domChecked;
          // Remove conflicting aria-checked
          if ("aria-checked" in result.ariaProperties) {
            delete result.ariaProperties["aria-checked"];
          }
        }
      } else if ("aria-checked" in result.ariaProperties) {
        // Non-native checkbox: trust aria-checked
        const ariaChecked = String(
          result.ariaProperties["aria-checked"]
        ).toLowerCase();
        if (ariaChecked === "mixed") {
          result.states.checked = "mixed";
        } else if (ariaChecked === "true") {
          result.states.checked = true;
        } else if (ariaChecked === "false") {
          result.states.checked = false;
        }
      }
    } catch (e) {
      console.warn("Checkbox normalization failed:", e);
    }
  }

  /**
   * Compute group information from DOM ancestors
   * @param {Element} el - The element to compute group info for
   * @returns {Object|undefined} Group information
   */
  function computeGroupInfo(el) {
    try {
      let node = el && el.parentElement;
      while (node && node !== document.body) {
        // HTML fieldset acts as a group
        if (node.tagName === "FIELDSET") {
          const label =
            CE.utils.getFieldsetLegend(node) || CE.utils.getAriaLabel(node);
          return { role: "group", label: label || undefined };
        }

        // ARIA group containers
        const role = CE.utils.safeGetAttribute(node, "role");
        if (role === "group" || role === "radiogroup") {
          const label = CE.utils.getAriaLabel(node);
          return { role, label: label || undefined };
        }

        node = node.parentElement;
      }
    } catch (e) {
      console.warn("computeGroupInfo failed:", e);
    }
    return undefined;
  }

  /**
   * Get local accessible information as fallback
   * @param {Element} el - The element to get info for
   * @returns {Object} Local accessibility information
   */
  function getLocalAccessibleInfo(el) {
    const verbose = window.NEXUS_TESTING_MODE?.verbose;
    if (verbose) console.log("getLocalAccessibleInfo called with:", el);

    let name = "";
    let description = "";
    let role = "";

    const useLibraries = window.NEXUS_TESTING_MODE?.useLibraries !== false;

    // Try to use libraries first
    if (useLibraries) {
      const libraryResults = getAccessibilityFromLibraries(el, verbose);
      name = libraryResults.name;
      description = libraryResults.description;
      role = libraryResults.role;
    }

    // Fallback computation if libraries didn't provide results
    if (!name) name = computeFallbackAccessibleName(el);
    if (!description) description = computeFallbackDescription(el);
    if (!role) role = computeFallbackRole(el);

    // Normalize empty values
    if (!name) name = "(no accessible name)";
    if (!description) description = "(no description)";
    if (!role) role = "(no role)";

    // Collect states and ARIA properties
    const statesAndProps = collectStatesAndProperties(el);

    return {
      role,
      name,
      description,
      value: el.value || "(no value)",
      states: statesAndProps.states,
      ariaProperties: statesAndProps.ariaProperties,
      group: computeGroupInfo(el),
      ignored: false,
      ignoredReasons: [],
    };
  }

  /**
   * Get accessibility information from libraries
   * @param {Element} el - The element
   * @param {boolean} verbose - Whether to log verbose output
   * @returns {Object} Library results
   */
  function getAccessibilityFromLibraries(el, verbose = false) {
    let name = "";
    let description = "";
    let role = "";

    try {
      // Use dom-accessibility-api for name and description
      if (window.DOMAccessibilityAPI) {
        name = window.DOMAccessibilityAPI.computeAccessibleName(el);
        description =
          window.DOMAccessibilityAPI.computeAccessibleDescription(el);
        if (verbose) console.log("DOM API computed:", { name, description });
      }

      // Use aria-query for role
      role = CE.utils.safeGetAttribute(el, "role");
      if (!role && window.AriaQuery && window.AriaQuery.getImplicitRole) {
        role = window.AriaQuery.getImplicitRole(el) || "";
        if (verbose) console.log("ARIA Query role:", role);
      }

      // Fallback to dom-accessibility-api getRole
      if (
        !role &&
        window.DOMAccessibilityAPI &&
        window.DOMAccessibilityAPI.getRole
      ) {
        role = window.DOMAccessibilityAPI.getRole(el) || "";
        if (verbose) console.log("DOM API role:", role);
      }
    } catch (error) {
      console.warn("Error using accessibility libraries, falling back:", error);
    }

    return { name, description, role };
  }

  /**
   * Collect ARIA properties and states from element
   * @param {Element} el - The element
   * @returns {Object} Object with states and ariaProperties
   */
  function collectStatesAndProperties(el) {
    const ariaProperties = {};
    const states = {};

    // Collect ARIA properties
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith("aria-") && attr.name !== "aria-describedby") {
        ariaProperties[attr.name] = attr.value;
      }
    });

    // Add common states
    ["disabled", "selected", "pressed"].forEach((state) => {
      if (el.hasAttribute(state)) {
        states[state] = true;
      }
    });

    // Handle checkbox states
    if (el.tagName === "INPUT" && el.type === "checkbox") {
      if (el.indeterminate) {
        states.checked = "mixed";
      } else {
        states.checked = !!el.checked;
      }
    } else if (el.hasAttribute("checked")) {
      states.checked = true;
    }

    return { states, ariaProperties };
  }

  /**
   * Compute fallback accessible name
   * @param {Element} el - The element
   * @returns {string} Accessible name
   */
  function computeFallbackAccessibleName(el) {
    // Try ARIA label first
    let name = CE.utils.safeGetAttribute(el, "aria-label");
    if (name) return name.trim();

    // Try aria-labelledby
    const labelledby = CE.utils.safeGetAttribute(el, "aria-labelledby");
    if (labelledby) {
      name = labelledby
        .split(/\s+/)
        .map((id) => CE.utils.getTextFromId(id))
        .filter(Boolean)
        .join(" ");
      if (name) return name;
    }

    const tag = (el.tagName || "").toUpperCase();

    // For form controls, check for labels
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      const id = CE.utils.safeGetAttribute(el, "id");
      if (id) {
        const lbl = el.ownerDocument.querySelector(
          `label[for="${CSS.escape(id)}"]`
        );
        if (lbl) name = (lbl.textContent || "").trim();
      }

      // Nested label
      if (!name) {
        const parentLabel = el.closest("label");
        if (parentLabel) name = (parentLabel.textContent || "").trim();
      }
    }

    // For images, use alt text
    if (tag === "IMG") {
      name = CE.utils.safeGetAttribute(el, "alt");
      if (name) return name;
    }

    // Use text content
    if (!name) {
      name = (el.innerText || el.textContent || "").trim();
    }

    // Use title as last resort
    if (!name) {
      name = CE.utils.safeGetAttribute(el, "title");
    }

    return name;
  }

  /**
   * Compute fallback description
   * @param {Element} el - The element
   * @returns {string} Description
   */
  function computeFallbackDescription(el) {
    const description = CE.utils.safeGetAttribute(el, "aria-description");
    if (description) return description;

    const describedby = CE.utils.safeGetAttribute(el, "aria-describedby");
    if (describedby) {
      const describingEl = document.getElementById(describedby);
      return describingEl?.textContent || "";
    }

    return "";
  }

  /**
   * Compute fallback role
   * @param {Element} el - The element
   * @returns {string} Role
   */
  function computeFallbackRole(el) {
    // Try explicit role first
    let role = CE.utils.safeGetAttribute(el, "role");
    if (role) return role;

    const tag = (el.tagName || "").toUpperCase();
    const type = CE.utils.safeGetAttribute(el, "type").toLowerCase();

    // Infer role from native semantics
    if (tag === "A" && el.hasAttribute("href")) role = "link";
    else if (tag === "BUTTON") role = "button";
    else if (tag === "INPUT") {
      if (["button", "submit", "reset"].includes(type)) role = "button";
      else if (type === "checkbox") role = "checkbox";
      else if (type === "radio") role = "radio";
      else if (type === "range") role = "slider";
      else if (
        ["search", "email", "url", "tel", "password", "text"].includes(type)
      )
        role = "textbox";
      else if (type === "number") role = "spinbutton";
      else role = "textbox";
    } else if (tag === "TEXTAREA") role = "textbox";
    else if (tag === "SELECT") {
      const multiple = el.hasAttribute("multiple");
      const size = parseInt(CE.utils.safeGetAttribute(el, "size", "0"), 10);
      role = multiple || size > 1 ? "listbox" : "combobox";
    } else if (tag === "OPTION") role = "option";
    else if (tag === "IMG") role = "img";
    else if (tag === "SUMMARY") role = "button";
    else if (tag === "NAV") role = "navigation";
    else if (tag === "MAIN") role = "main";
    else if (tag === "ASIDE") role = "complementary";
    else if (tag === "HEADER") role = "banner";
    else if (tag === "FOOTER") role = "contentinfo";
    else if (tag === "UL" || tag === "OL") role = "list";
    else if (tag === "LI") role = "listitem";
    else if (tag === "TABLE") role = "table";
    else if (tag === "TR") role = "row";
    else if (tag === "TH") {
      role =
        CE.utils.safeGetAttribute(el, "scope") === "row"
          ? "rowheader"
          : "columnheader";
    } else if (tag === "TD") role = "cell";
    else if (el.isContentEditable) role = "textbox";
    else if (
      typeof el.tabIndex === "number" &&
      el.tabIndex >= 0 &&
      typeof el.onclick === "function"
    ) {
      role = "button";
    }

    return role;
  }

  /**
   * Clean up accessibility module
   */
  function cleanup() {
    console.log(
      "[ContentExtension.accessibility] Cleaning up accessibility module"
    );

    if (CE.cache) {
      CE.cache.clearPendingRequest();
    }
  }

  /**
   * Handle state change (extension enabled/disabled)
   * @param {boolean} enabled - Whether extension is enabled
   */
  function onStateChange(enabled) {
    if (!enabled && CE.cache) {
      CE.cache.clearPendingRequest();
    }
  }

  // Export the accessibility module
  CE.accessibility = {
    initialize,
    cleanup,
    onStateChange,

    // Main functions
    getAccessibleInfo,
    getLocalAccessibleInfo,

    // Utility functions
    computeGroupInfo,
    computeFallbackAccessibleName,
    computeFallbackDescription,
    computeFallbackRole,

    // Helper functions
    getAccessibilityFromLibraries,
    collectStatesAndProperties,

    // Internal functions (exposed for testing)
    waitForAccessibilityUpdate,
    processAccessibilityInfo,
    normalizeCheckboxStates,
  };

  console.log("[ContentExtension.accessibility] Module loaded");
})();
