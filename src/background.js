chrome.runtime.onInstalled.addListener(() => {
  console.log("Chrome Accessibility Extension installed");
});

// Simple per-tab promise queue to serialize debugger sessions
const __axSessionQueues = new Map(); // tabId -> Promise
function queueDebuggerSession(tabId, task) {
  const prev = __axSessionQueues.get(tabId) || Promise.resolve();
  const run = () => Promise.resolve().then(task);
  const next = prev.then(run, run);
  const cleanup = next.finally(() => {
    // Only clear if this promise is still the head
    if (__axSessionQueues.get(tabId) === next) {
      __axSessionQueues.delete(tabId);
    }
  });
  __axSessionQueues.set(tabId, cleanup);
  return next;
}

// Helper function for accessibility tree
async function getAccessibilityTree(tabId) {
  try {
    await chrome.debugger.attach({ tabId }, "1.3");
    await chrome.debugger.sendCommand({ tabId }, "Accessibility.enable");
    const { nodes } = await chrome.debugger.sendCommand(
      { tabId },
      "Accessibility.getFullAXTree"
    );
    await chrome.debugger.detach({ tabId });
    return nodes;
  } catch (e) {
    try {
      await chrome.debugger.detach({ tabId });
    } catch {}
    throw e;
  }
}

// Main message handler
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getAccessibilityTree") {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const tabId = tab.id;
        const tree = await queueDebuggerSession(tabId, async () => {
          try {
            await chrome.debugger.attach({ tabId }, "1.3");
            await chrome.debugger.sendCommand(
              { tabId },
              "Accessibility.enable"
            );
            const { nodes } = await chrome.debugger.sendCommand(
              { tabId },
              "Accessibility.getFullAXTree"
            );
            return nodes;
          } finally {
            try {
              await chrome.debugger.detach({ tabId });
            } catch {}
          }
        });
        sendResponse({ tree });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }

  if (
    msg.action === "getBackendNodeIdAndAccessibleInfo" ||
    msg.action === "getAccessibleInfo"
  ) {
    (async () => {
      let tabId;
      try {
        console.log("Background: received message", msg);
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        tabId = tab.id;
        console.log("Background: using tab", tabId);

        const result = await queueDebuggerSession(tabId, async () => {
          // The entire debugger session happens within this queued task
          await chrome.debugger.attach({ tabId }, "1.3");
          try {
            await chrome.debugger.sendCommand({ tabId }, "DOM.enable");
            await chrome.debugger.sendCommand(
              { tabId },
              "Accessibility.enable"
            );

            const { root } = await chrome.debugger.sendCommand(
              { tabId },
              "DOM.getDocument",
              { depth: -1, pierce: true }
            );

            const { nodeId } = await chrome.debugger.sendCommand(
              { tabId },
              "DOM.querySelector",
              {
                nodeId: root.nodeId,
                selector: msg.elementSelector,
              }
            );

            if (!nodeId) {
              return { error: "Node not found" };
            }

            // Get the accessibility node with all properties
            const { nodes } = await chrome.debugger.sendCommand(
              { tabId },
              "Accessibility.getPartialAXTree",
              {
                nodeId,
                fetchRelatives: true,
              }
            );

            // Also get DOM attributes to capture ARIA properties
            const { attributes } = await chrome.debugger.sendCommand(
              { tabId },
              "DOM.getAttributes",
              {
                nodeId,
              }
            );

            if (!nodes || !nodes.length) {
              return { error: "No AXNode found" };
            }

            const node = nodes[0];
            console.log("Raw AX node:", node);
            console.log("DOM attributes:", attributes);

            const out = {
              role: node.role?.value || "(no role)",
              name: node.name?.value || "(no accessible name)",
              description: node.description?.value || "(no description)",
              value: node.value?.value || "(no value)",
              states: {},
              ariaProperties: {},
              ignored: node.ignored || false,
              ignoredReasons: node.ignoredReasons || [],
            };

            // Extract ARIA properties from DOM attributes (more reliable)
            if (attributes && Array.isArray(attributes)) {
              console.log("Processing DOM attributes:", attributes);
              for (let i = 0; i < attributes.length; i += 2) {
                const attrName = attributes[i];
                const attrValue = attributes[i + 1];
                console.log(`Attribute: ${attrName} = ${attrValue}`);
                if (attrName && attrName.startsWith("aria-")) {
                  console.log(
                    `Found ARIA attribute: ${attrName} = ${attrValue}`
                  );
                  out.ariaProperties[attrName] = attrValue;
                }
              }
            } else {
              console.log("No attributes found or not an array:", attributes);
            }

            // Extract properties from accessibility node (if available)
            if (node.properties && Array.isArray(node.properties)) {
              console.log("Node has properties:", node.properties);
              node.properties.forEach((prop) => {
                console.log("Processing node property:", prop);
                if (prop.name && prop.name.startsWith("aria-")) {
                  // Only add if not already captured from DOM attributes
                  if (!out.ariaProperties[prop.name]) {
                    out.ariaProperties[prop.name] =
                      prop.value?.value || prop.value;
                  }
                } else if (prop.name) {
                  out.states[prop.name] = prop.value?.value || prop.value;
                }
              });
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
          } finally {
            try {
              await chrome.debugger.detach({ tabId });
            } catch (e) {
              // ignore
            }
          }
        });

        sendResponse(result);
      } catch (err) {
        console.error("Error in background script:", err);
        if (tabId) {
          try {
            await chrome.debugger.detach({ tabId });
          } catch {}
        }
        sendResponse({ error: err.message });
      }
    })();
    return true;
  }

  // Detach debugger when requested by content script
  if (msg.action === "detachDebugger") {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tab && tab.id) {
          await queueDebuggerSession(tab.id, async () => {
            try {
              await chrome.debugger.detach({ tabId: tab.id });
              console.log("Debugger detached from tab", tab.id);
            } catch (err) {
              console.warn("Failed to detach debugger:", err);
            }
          });
        }
      } catch (err) {
        console.warn("Failed to queue debugger detach:", err);
      }
    })();
    return false;
  }
});
