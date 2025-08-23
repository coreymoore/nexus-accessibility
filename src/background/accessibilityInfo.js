/**
 * Accessibility Information Retrieval
 *
 * Core logic for extracting accessibility information from DOM elements
 * using Chrome DevTools Protocol.
 */

import { chromeAsync } from "../utils/chromeAsync.js";
import {
  docRoots as __axDocRoots,
  nodeCache as __axNodeCache,
} from "./caches.js";
import { getCdpFrameId, getOrCreateIsolatedWorld } from "./cdp.js";
import { security } from "../utils/security.js";
import { performance } from "../utils/performance.js";
import { logger } from "../utils/logger.js";

// Cache policy constants
const AX_DOCROOT_TTL_MS = 30000; // 30s per-frame document root TTL
const AX_NODECACHE_TTL_MS = 10000; // 10s per selector->nodeId cache entry
const AX_NODECACHE_MAX_ENTRIES = 500; // cap total entries to bound memory

/**
 * Get accessibility information for a specific element
 * @param {number} tabId - Chrome tab ID
 * @param {number} frameId - Chrome frame ID
 * @param {string} elementSelector - CSS selector for the element (ignored if useDirectReference is true)
 * @param {Object} connection - Connection state from DebuggerConnectionManager
 * @param {boolean} useDirectReference - If true, use Runtime.evaluate with global element reference
 * @returns {Promise<Object>} Accessibility information
 */
export async function getAccessibilityInfoForElement(
  tabId,
  frameId,
  elementSelector,
  connection,
  useDirectReference = false
) {
  // Security validation
  const tabValidation = security.validateTabId(tabId);
  if (!tabValidation.valid) {
    throw new Error(`Invalid tab ID: ${tabValidation.reason}`);
  }

  if (frameId !== undefined) {
    const frameValidation = security.validateFrameId(frameId);
    if (!frameValidation.valid) {
      throw new Error(`Invalid frame ID: ${frameValidation.reason}`);
    }
  }

  // Only validate selector if we're not using direct reference
  // Validate selector if provided. Even in direct-reference mode we may accept
  // an optional selector as a fallback; validate it to ensure cache keys are safe.
  if (elementSelector) {
    const selectorValidation = security.validateSelector(elementSelector);
    if (!selectorValidation.valid) {
      throw new Error(`Invalid selector: ${selectorValidation.reason}`);
    }
  }

  const log = logger.background;

  return await performance.measure("accessibility-info-retrieval", async () => {
    try {
      console.log("Background: Starting accessibility info retrieval");
      console.log("Background: tabId:", tabId, "frameId:", frameId);
      console.log("Background: useDirectReference:", useDirectReference);

      // IMPORTANT: Direct reference approach using Runtime.evaluate + DOM.requestNode
      // This is the most reliable method and should not be changed!
      // Use document.activeElement since it's always accurate and accessible
      if (useDirectReference) {
        console.log(
          "Background: Using document.activeElement direct reference method"
        );

        try {
          // Resolve the correct frame for iframe support
          const chromeFrameId = frameId;
          let pageFrameId;

          if (typeof chromeFrameId === "number" && chromeFrameId !== 0) {
            pageFrameId = await getCdpFrameId(tabId, chromeFrameId);
            console.log(
              "Background: Mapped Chrome frameId",
              chromeFrameId,
              "to CDP frameId",
              pageFrameId
            );
          }

          let result;

          if (pageFrameId) {
            // For iframe: use the iframe's execution context
            console.log(
              "Background: Using iframe execution context for frameId:",
              pageFrameId
            );
            const ctxId = await getOrCreateIsolatedWorld(
              tabId,
              pageFrameId,
              "AX_Helper"
            );
            console.log("Background: Got execution context ID:", ctxId);

            result = await chromeAsync.debugger.sendCommand(
              { tabId },
              "Runtime.evaluate",
              {
                expression: `
                (() => {
                  // Add a small delay to ensure focus state is settled
                  // This is crucial for shadow DOM with delegated focus
                  const waitForFocus = () => {
                    return new Promise(resolve => {
                      requestAnimationFrame(() => {
                        setTimeout(() => resolve(), 10);
                      });
                    });
                  };
                  
                  return waitForFocus().then(() => {
                    // Use the element stored by content script if available
                    let targetEl = window.nexusTargetElement || document.activeElement;
                    
                    console.log('[CDP] Target element:', targetEl);
                    
                    // If target element is in shadow DOM, use it directly
                    if (targetEl && targetEl.getRootNode() instanceof ShadowRoot) {
                      console.log('[CDP] Target is already in shadow DOM:', targetEl);
                      return targetEl;
                    }
                    
                    // If target element has shadow root, try to find the real focused element
                    if (targetEl && targetEl.shadowRoot) {
                      // First check shadowRoot.activeElement
                      const shadowFocused = targetEl.shadowRoot.activeElement;
                      if (shadowFocused) {
                        console.log('[CDP] Found focused element in shadow DOM:', shadowFocused);
                        return shadowFocused;
                      }
                      
                      // Fallback: check for elements with focus-related attributes or states
                      const possiblyFocused = targetEl.shadowRoot.querySelectorAll(
                        'input:focus, select:focus, textarea:focus, button:focus, [tabindex]:focus'
                      );
                      if (possiblyFocused.length > 0) {
                        console.log('[CDP] Found focused element via :focus selector:', possiblyFocused[0]);
                        return possiblyFocused[0];
                      }
                      
                      // Final fallback: find first focusable element in shadow DOM
                      const focusable = targetEl.shadowRoot.querySelector(
                        'button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"]'
                      );
                      if (focusable) {
                        console.log('[CDP] Found focusable element in shadow DOM:', focusable);
                        return focusable;
                      }
                    }
                    
                    console.log('[CDP] Using target element as-is:', targetEl);
                    return targetEl;
                  });
                })()
              `,
                returnByValue: false,
                contextId: ctxId,
                awaitPromise: true,
              }
            );
          } else {
            // For main frame: use default context
            console.log("Background: Using main frame context");
            result = await chromeAsync.debugger.sendCommand(
              { tabId },
              "Runtime.evaluate",
              {
                expression: `
                  (() => {
                    // Add a small delay to ensure focus state is settled
                    // This is crucial for shadow DOM with delegated focus
                    const waitForFocus = () => {
                      return new Promise(resolve => {
                        requestAnimationFrame(() => {
                          setTimeout(() => resolve(), 10);
                        });
                      });
                    };
                    
                    return waitForFocus().then(() => {
                      // Use the element stored by content script if available
                      let targetEl = window.nexusTargetElement || document.activeElement;
                      
                      console.log('[CDP] === SHADOW DOM DEBUG START ===');
                      console.log('[CDP] Target element tagName:', targetEl?.tagName);
                      console.log('[CDP] Target element id:', targetEl?.id);
                      console.log('[CDP] Target has shadowRoot:', !!targetEl?.shadowRoot);
                      console.log('[CDP] Target shadowRoot delegatesFocus:', targetEl?.shadowRoot?.delegatesFocus);
                      
                      // If target element is in shadow DOM, use it directly
                      if (targetEl && targetEl.getRootNode() instanceof ShadowRoot) {
                        console.log('[CDP] Target is already in shadow DOM');
                        console.log('[CDP] Using shadow element tagName:', targetEl.tagName);
                        console.log('[CDP] Using shadow element id:', targetEl.id);
                        return targetEl;
                      }
                      
                      // If target element has shadow root, check for delegated focus
                      if (targetEl && targetEl.shadowRoot) {
                        // For delegatesFocus: true, the shadowRoot.activeElement shows the real focused element
                        const shadowActiveElement = targetEl.shadowRoot.activeElement;
                        console.log('[CDP] Shadow root activeElement tagName:', shadowActiveElement?.tagName);
                        console.log('[CDP] Shadow root activeElement id:', shadowActiveElement?.id);
                        
                        if (shadowActiveElement) {
                          console.log('[CDP] Found delegated focus element');
                          console.log('[CDP] Delegated element tagName:', shadowActiveElement.tagName);
                          console.log('[CDP] Delegated element id:', shadowActiveElement.id);
                          return shadowActiveElement;
                        }
                        
                        // Fallback: check for elements that have browser focus
                        const focusedElements = targetEl.shadowRoot.querySelectorAll(':focus');
                        console.log('[CDP] Elements with :focus count:', focusedElements.length);
                        if (focusedElements.length > 0) {
                          console.log('[CDP] Found focused element via :focus selector');
                          console.log('[CDP] Focus selector element tagName:', focusedElements[0].tagName);
                          console.log('[CDP] Focus selector element id:', focusedElements[0].id);
                          return focusedElements[0];
                        }
                        
                        console.log('[CDP] No focused element found in shadow DOM, using host');
                      }
                      
                      console.log('[CDP] Using target element as-is');
                      console.log('[CDP] Final element tagName:', targetEl?.tagName);
                      console.log('[CDP] Final element id:', targetEl?.id);
                      console.log('[CDP] === SHADOW DOM DEBUG END ===');
                      return targetEl;
                    });
                  })()
                `,
                returnByValue: false,
                awaitPromise: true,
              }
            );
          }

          console.log("Background: Runtime.evaluate result:", result);

          if (result.result && result.result.objectId) {
            console.log("Background: Found objectId:", result.result.objectId);
            console.log(
              "Background: Result details:",
              JSON.stringify(result.result, null, 2)
            );

            // IMPORTANT: Initialize DOM tree first - this is required for DOM.requestNode to work
            try {
              console.log(
                "Background: Initializing DOM tree with DOM.getDocument"
              );
              await chromeAsync.debugger.sendCommand(
                { tabId },
                "DOM.getDocument",
                { depth: 0 }
              );
              console.log("Background: DOM tree initialized successfully");
            } catch (domInitError) {
              console.error(
                "Background: Failed to initialize DOM tree:",
                domInitError
              );
            }

            // Convert objectId to nodeId using DOM.requestNode
            try {
              const nodeResult = await chromeAsync.debugger.sendCommand(
                { tabId },
                "DOM.requestNode",
                { objectId: result.result.objectId }
              );

              console.log("Background: DOM.requestNode response:", nodeResult);
              const nodeId = nodeResult.nodeId;
              console.log(
                "Background: Got nodeId from direct reference:",
                nodeId
              );

              if (nodeId && nodeId > 0) {
                // Get the accessibility node with all properties
                const { nodes } = await chromeAsync.debugger.sendCommand(
                  { tabId },
                  "Accessibility.getPartialAXTree",
                  {
                    nodeId,
                    fetchRelatives: true,
                  }
                );

                if (nodes && nodes.length > 0) {
                  // Prefer a non-ignored node with a concrete role if available
                  let node = nodes[0];
                  const pick = nodes.find(
                    (n) => n && !n.ignored && n.role && (n.role.value || n.role)
                  );
                  if (pick) node = pick;

                  console.log(
                    "Background: Successfully got accessibility node via direct reference:",
                    node
                  );
                  return formatAccessibilityNode(node);
                }
              } else {
                console.log(
                  "Background: DOM.requestNode returned invalid nodeId:",
                  nodeId
                );
              }
            } catch (requestNodeError) {
              console.error(
                "Background: Error in DOM.requestNode:",
                requestNodeError
              );
            }
          } else {
            console.log("Background: Runtime.evaluate did not return objectId");
            console.log("Background: Result was:", result);
          }
          console.log(
            "Background: Direct reference method failed, falling back to selector-based approach"
          );
        } catch (directError) {
          console.error(
            "Background: Error in direct reference method:",
            directError
          );
          console.log("Background: Falling back to selector-based approach");
        }
      }

      // Fallback to selector-based approach or if useDirectReference is false
      if (!elementSelector) {
        console.log(
          "Background: Direct reference failed and no selector provided"
        );
        console.log(
          "Background: Attempting to use document.activeElement as last resort"
        );

        try {
          // Last resort: try document.activeElement directly
          const activeResult = await chromeAsync.debugger.sendCommand(
            { tabId },
            "Runtime.evaluate",
            {
              expression: "document.activeElement",
              returnByValue: false,
            }
          );

          if (activeResult.result?.objectId) {
            console.log("Background: Found document.activeElement as fallback");

            // Initialize DOM if needed
            try {
              await chromeAsync.debugger.sendCommand(
                { tabId },
                "DOM.getDocument",
                { depth: 0 }
              );
            } catch (domError) {
              console.log("Background: DOM already initialized");
            }

            // Convert objectId to nodeId
            const nodeResult = await chromeAsync.debugger.sendCommand(
              { tabId },
              "DOM.requestNode",
              { objectId: activeResult.result.objectId }
            );

            const nodeId = nodeResult.nodeId;
            if (nodeId && nodeId > 0) {
              // Get accessibility info
              const { nodes } = await chromeAsync.debugger.sendCommand(
                { tabId },
                "Accessibility.getPartialAXTree",
                {
                  nodeId,
                  fetchRelatives: true,
                }
              );

              if (nodes && nodes.length > 0) {
                let node = nodes[0];
                const pick = nodes.find(
                  (n) => n && !n.ignored && n.role && (n.role.value || n.role)
                );
                if (pick) node = pick;

                console.log(
                  "Background: Got accessibility info from document.activeElement fallback"
                );
                return formatAccessibilityNode(node);
              }
            }
          }
        } catch (fallbackError) {
          console.error(
            "Background: document.activeElement fallback also failed:",
            fallbackError
          );
        }

        return {
          error: "No element selector provided and direct reference failed",
        };
      }

      console.log("Background: elementSelector:", elementSelector);

      // Resolve the correct frame: prefer sender.frameId -> CDP frame; fall back to main doc
      let documentNodeId;
      const chromeFrameId = frameId;
      let pageFrameId;

      if (typeof chromeFrameId === "number") {
        pageFrameId = await getCdpFrameId(tabId, chromeFrameId);
        if (!pageFrameId) {
          console.warn("Failed to map CDP frame for", { chromeFrameId });
        }
      }

      // Only two cache scopes: main or a concrete CDP frame; never cache under ext frameId
      const cacheKey = pageFrameId
        ? `${tabId}:cdp:${pageFrameId}`
        : `${tabId}:main`;
      const cached = __axDocRoots.get(cacheKey);

      if (
        cached &&
        cached.nodeId &&
        Date.now() - cached.t <= AX_DOCROOT_TTL_MS
      ) {
        documentNodeId = cached.nodeId;
      } else {
        // For main frame, cache top-level document root. For subframes, we won't rely on DOM.getDocument.
        if (!pageFrameId) {
          const { root } = await chromeAsync.debugger.sendCommand(
            { tabId },
            "DOM.getDocument",
            { depth: 1 }
          );
          documentNodeId = root.nodeId;
          __axDocRoots.set(cacheKey, {
            nodeId: documentNodeId,
            t: Date.now(),
          });
        }
      }

      const cacheSelKey = `${cacheKey}::${elementSelector}`;
      let cachedNode = __axNodeCache.get(cacheSelKey);
      let nodeId = cachedNode && cachedNode.nodeId;
      let usedCache = false;

      if (nodeId) {
        // TTL check
        if (cachedNode && Date.now() - cachedNode.t > AX_NODECACHE_TTL_MS) {
          __axNodeCache.delete(cacheSelKey);
          nodeId = 0;
        }
      }

      if (nodeId) {
        // Validate quickly by asking for a small AX slice; if it fails, we'll re-query
        try {
          const test = await chromeAsync.debugger.sendCommand(
            { tabId },
            "Accessibility.getPartialAXTree",
            { nodeId, fetchRelatives: false }
          );
          if (test && Array.isArray(test.nodes) && test.nodes.length) {
            usedCache = true;
          } else {
            nodeId = 0;
          }
        } catch {
          nodeId = 0;
        }
      }

      if (!nodeId) {
        console.log("Background: No cached nodeId found, performing DOM query");
        console.log("Background: pageFrameId:", pageFrameId);
        console.log("Background: elementSelector:", elementSelector);

        if (pageFrameId) {
          // Cross-origin or subframe: evaluate in the frame's isolated world
          try {
            console.log("Background: Attempting frame-world query");
            const ctxId = await getOrCreateIsolatedWorld(
              tabId,
              pageFrameId,
              "AX_Helper"
            );
            const expr = `document.querySelector(${JSON.stringify(
              elementSelector
            )})`;
            console.log("Background: Evaluating expression:", expr);
            const { result } = await chromeAsync.debugger.sendCommand(
              { tabId },
              "Runtime.evaluate",
              {
                contextId: ctxId,
                expression: expr,
                returnByValue: false,
                awaitPromise: false,
              }
            );
            console.log("Background: Runtime.evaluate result:", result);
            const objectId = result && result.objectId;
            if (objectId) {
              // Convert objectId to nodeId using DOM.requestNode
              const nodeResult = await chromeAsync.debugger.sendCommand(
                { tabId },
                "DOM.requestNode",
                { objectId }
              );
              nodeId = nodeResult.nodeId;
              console.log(
                "Background: Frame-world query found nodeId:",
                nodeId
              );
            } else {
              console.log("Background: Frame-world query returned no objectId");
            }
          } catch (e) {
            console.warn(
              "Frame-world query failed; falling back to main DOM query",
              e
            );
          }
        }

        // Fallback to main frame DOM query
        if (!nodeId && documentNodeId) {
          console.log(
            "Background: Attempting main frame DOM query with documentNodeId:",
            documentNodeId
          );
          let q = await chromeAsync.debugger.sendCommand(
            { tabId },
            "DOM.querySelector",
            {
              nodeId: documentNodeId,
              selector: elementSelector,
            }
          );
          nodeId = q.nodeId;
          console.log(
            "Background: Main frame DOM query result nodeId:",
            nodeId
          );

          // If query fails (nodeId 0), refresh root once and retry quickly
          if (!nodeId && !pageFrameId) {
            try {
              console.log("Background: Refreshing document root and retrying");
              const { root } = await chromeAsync.debugger.sendCommand(
                { tabId },
                "DOM.getDocument",
                { depth: 1 }
              );
              documentNodeId = root.nodeId;
              console.log(
                "Background: New document root nodeId:",
                documentNodeId
              );
              __axDocRoots.set(cacheKey, {
                nodeId: documentNodeId,
                t: Date.now(),
              });
              q = await chromeAsync.debugger.sendCommand(
                { tabId },
                "DOM.querySelector",
                {
                  nodeId: documentNodeId,
                  selector: elementSelector,
                }
              );
              nodeId = q.nodeId;
              console.log("Background: Retry DOM query result nodeId:", nodeId);
            } catch (retryError) {
              console.error(
                "Background: Error during DOM refresh retry:",
                retryError
              );
            }
          }
        }

        if (nodeId) {
          // Enforce cache cap
          while (__axNodeCache.size >= AX_NODECACHE_MAX_ENTRIES) {
            evictOldestNodeCacheEntry();
          }
          __axNodeCache.set(cacheSelKey, { nodeId, t: Date.now() });
        }
      }

      if (!nodeId) {
        console.log(
          "Background: Final result - nodeId is still 0, returning error"
        );
        console.log("Background: documentNodeId was:", documentNodeId);
        console.log("Background: pageFrameId was:", pageFrameId);
        console.log("Background: elementSelector was:", elementSelector);
        return { error: "Node not found" };
      }

      // Get the accessibility node with all properties
      const { nodes } = await chromeAsync.debugger.sendCommand(
        { tabId },
        "Accessibility.getPartialAXTree",
        {
          nodeId,
          fetchRelatives: true,
        }
      );

      // Optionally get DOM attributes to capture ARIA properties (defer unless needed)
      let attributes = null;

      if (!nodes || !nodes.length) {
        return { error: "No AXNode found" };
      }

      // Prefer a non-ignored node with a concrete role if available
      let node = nodes[0];
      const pick = nodes.find(
        (n) => n && !n.ignored && n.role && (n.role.value || n.role)
      );
      if (pick) node = pick;

      // If chosen node is still ignored, attempt to pick a non-ignored child with a role
      try {
        if (
          node &&
          node.ignored &&
          Array.isArray(node.childIds) &&
          node.childIds.length
        ) {
          const byIdTmp = new Map(nodes.map((n) => [n.nodeId, n]));
          for (const cid of node.childIds) {
            const c = byIdTmp.get(cid);
            if (c && !c.ignored && (c.role?.value || c.role)) {
              node = c;
              break;
            }
          }
        }
      } catch (e) {
        console.warn("Failed to refine to child role:", e);
      }

      console.log("Raw AX node:", node, usedCache ? "(cached node)" : "");

      const out = {
        role: node.role?.value || node.role || "(no role)",
        name: node.name?.value || "(no accessible name)",
        description: node.description?.value || "(no description)",
        value: node.value?.value || "(no value)",
        states: {},
        ariaProperties: {},
        ignored: node.ignored || false,
        ignoredReasons: node.ignoredReasons || [],
      };

      // Compute nearest group/radiogroup ancestor from AX tree and include its accessible name
      try {
        if (Array.isArray(nodes) && nodes.length) {
          const roleOf = (n) => n?.role?.value || n?.role || "";
          const nameOf = (n) => {
            const nn = n?.name;
            const v = nn && (nn.value ?? nn);
            return v ? String(v).trim() : "";
          };
          // Build map AX nodeId -> node and child->parent links
          const byId = new Map(nodes.map((n) => [n.nodeId, n]));
          const parentByChild = new Map();
          for (const n of nodes) {
            const children = n.childIds || [];
            for (const cid of children) parentByChild.set(cid, n.nodeId);
          }
          // The first node is the target AX node; walk up to find nearest group
          let current = node;
          const wanted = new Set(["group", "radiogroup"]);
          while (current) {
            const pid = parentByChild.get(current.nodeId);
            if (!pid) break;
            const parent = byId.get(pid);
            if (!parent) break;
            const r = roleOf(parent);
            if (wanted.has(r)) {
              const label = nameOf(parent);
              out.group = { role: r, label: label || undefined };
              break;
            }
            current = parent;
          }
        }
      } catch (e) {
        console.warn("Failed to compute AX group:", e);
      }

      // Extract ARIA properties from DOM attributes if we have them
      if (attributes && Array.isArray(attributes)) {
        console.log("Processing DOM attributes:", attributes);
        for (let i = 0; i < attributes.length; i += 2) {
          const attrName = attributes[i];
          const attrValue = attributes[i + 1];
          console.log(`Attribute: ${attrName} = ${attrValue}`);
          if (attrName && attrName.startsWith("aria-")) {
            console.log(`Found ARIA attribute: ${attrName} = ${attrValue}`);
            out.ariaProperties[attrName] = attrValue;
          }
        }
      } else {
        console.log("No attributes fetched initially");
      }

      // Extract properties from accessibility node (if available)
      if (node.properties && Array.isArray(node.properties)) {
        console.log("Node has properties:", node.properties);
        node.properties.forEach((prop) => {
          console.log("Processing node property:", prop);
          if (prop.name && prop.name.startsWith("aria-")) {
            // Only add if not already captured from DOM attributes
            if (!out.ariaProperties[prop.name]) {
              out.ariaProperties[prop.name] = prop.value?.value || prop.value;
            }
          } else if (prop.name) {
            out.states[prop.name] = prop.value?.value || prop.value;
          }
        });
      }

      // If ariaProperties are still empty and we didn't fetch attributes yet, fetch once
      if (Object.keys(out.ariaProperties).length === 0 && attributes === null) {
        try {
          const resp = await chromeAsync.debugger.sendCommand(
            { tabId },
            "DOM.getAttributes",
            { nodeId }
          );
          attributes = resp.attributes;
          if (attributes && Array.isArray(attributes)) {
            for (let i = 0; i < attributes.length; i += 2) {
              const attrName = attributes[i];
              const attrValue = attributes[i + 1];
              if (attrName && attrName.startsWith("aria-")) {
                out.ariaProperties[attrName] = attrValue;
              }
            }
          }
        } catch (e) {
          console.warn("Deferred DOM.getAttributes failed:", e);
        }
      }

      // Add native properties from the node itself
      [
        "checked",
        "pressed",
        "expanded",
        "selected",
        "disabled",
        "focused",
        "readonly",
        "required",
        "level",
      ].forEach((prop) => {
        if (node[prop]?.value !== undefined) {
          out.states[prop] = node[prop].value;
        }
      });

      console.log("Final result:", out);
      return out;
    } catch (error) {
      console.error("Error getting accessibility info:", error);
      throw error;
    }
  });
}

/**
 * Evicts the oldest entry from the node cache to prevent unbounded growth
 */
function evictOldestNodeCacheEntry() {
  let oldestKey = null;
  let oldestT = Infinity;
  for (const [k, v] of __axNodeCache) {
    const t = v && v.t ? v.t : 0;
    if (t < oldestT) {
      oldestT = t;
      oldestKey = k;
    }
  }
  if (oldestKey) __axNodeCache.delete(oldestKey);
}

/**
 * Format accessibility node for direct reference method
 * This helper extracts and formats the key accessibility information from a CDP node
 * @param {Object} node - The accessibility node from CDP
 * @returns {Object} Formatted accessibility information
 */
function formatAccessibilityNode(node) {
  const out = {
    role: null,
    name: null,
    description: null,
    value: null,
    states: {},
    ariaProperties: {},
    group: null,
    ignored: node.ignored || false,
    ignoredReasons: node.ignoredReasons || [],
  };

  // Extract role
  if (node.role && node.role.value) {
    out.role = node.role.value;
  } else if (node.role) {
    out.role = node.role;
  }

  // Extract name
  if (node.name && node.name.value) {
    out.name = node.name.value;
  } else if (node.name) {
    out.name = node.name;
  }

  // Extract description
  if (node.description && node.description.value) {
    out.description = node.description.value;
  } else if (node.description) {
    out.description = node.description;
  }

  // Extract value
  if (node.value && node.value.value) {
    out.value = node.value.value;
  } else if (node.value) {
    out.value = node.value;
  }

  // Extract properties and states
  if (node.properties && Array.isArray(node.properties)) {
    node.properties.forEach((prop) => {
      if (prop.name && prop.name.startsWith("aria-")) {
        out.ariaProperties[prop.name] = prop.value?.value || prop.value;
      } else if (prop.name) {
        out.states[prop.name] = prop.value?.value || prop.value;
      }
    });
  }

  console.log("Background: Formatted accessibility node:", out);
  return out;
}

// Explicitly re-export the main function name for clarity and compatibility.
// This prevents transient module-resolution issues in environments that
// may not properly surface the named export during hot-reloads.
 