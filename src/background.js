chrome.runtime.onInstalled.addListener(() => {
  console.log("Chrome Accessibility Extension installed");
});

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
    getAccessibilityTree(sender.tab.id)
      .then((tree) => sendResponse({ tree }))
      .catch((error) => sendResponse({ error: error.message }));
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

        await chrome.debugger.attach({ tabId }, "1.3");
        await chrome.debugger.sendCommand({ tabId }, "DOM.enable");
        await chrome.debugger.sendCommand({ tabId }, "Accessibility.enable");

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
          await chrome.debugger.detach({ tabId });
          sendResponse({ error: "Node not found" });
          return;
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

        await chrome.debugger.detach({ tabId });

        if (!nodes || !nodes.length) {
          sendResponse({ error: "No AXNode found" });
          return;
        }

        const node = nodes[0];
        console.log("Raw AX node:", node);
        console.log("DOM attributes:", attributes);

        const result = {
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
              console.log(`Found ARIA attribute: ${attrName} = ${attrValue}`);
              result.ariaProperties[attrName] = attrValue;
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
              if (!result.ariaProperties[prop.name]) {
                result.ariaProperties[prop.name] =
                  prop.value?.value || prop.value;
              }
            } else if (prop.name) {
              result.states[prop.name] = prop.value?.value || prop.value;
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
            result.states[prop] = node[prop].value;
          }
        });

        console.log("Final result:", result);
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
});
