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
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        tabId = tab.id;

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

        const { nodes } = await chrome.debugger.sendCommand(
          { tabId },
          "Accessibility.getPartialAXTree",
          {
            nodeId,
            fetchRelatives: false,
          }
        );

        await chrome.debugger.detach({ tabId });

        if (!nodes || !nodes.length) {
          sendResponse({ error: "No AXNode found" });
          return;
        }

        const node = nodes[0];
        const result = {
          role: node.role?.value || "(no role)",
          name: node.name?.value || "(no accessible name)",
          description: node.description?.value || "(no description)",
          value: node.value?.value,
          checked: node.checked?.value,
          pressed: node.pressed?.value,
          expanded: node.expanded?.value,
          selected: node.selected?.value,
          disabled: node.disabled?.value,
          focused: node.focused?.value,
          readonly: node.readonly?.value,
          required: node.required?.value,
          level: node.level?.value,
          ignored: node.ignored || false,
          ignoredReasons: node.ignoredReasons || [],
          properties: node.properties || [],
        };

        console.log("Sending response:", result);
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
