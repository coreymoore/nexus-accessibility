chrome.runtime.onInstalled.addListener(() => {
  console.log("Chrome Accessibility Extension installed");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getAccessibilityTree") {
    getAccessibilityTree(sender.tab.id)
      .then((tree) => sendResponse({ tree }))
      .catch((error) => sendResponse({ error: error.message }));
    return true; // async response
  }
  if (request.action === "getAccessibilitySubtree") {
    getAccessibilitySubtree(sender.tab.id, request.elementSelector)
      .then((subtree) => sendResponse({ subtree }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }
  if (request.action === "getAccessibleName") {
    getAccessibleName(sender.tab.id, request.elementSelector)
      .then((name) => sendResponse({ name }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }
});

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

async function getAccessibilitySubtree(tabId, selector) {
  await chrome.debugger.attach({ tabId }, "1.3");
  await chrome.debugger.sendCommand({ tabId }, "Accessibility.enable");
  // Get the root document node
  const { root } = await chrome.debugger.sendCommand(
    { tabId },
    "DOM.getDocument",
    { depth: -1, pierce: true }
  );
  // Query for the element using the selector
  const { nodeId } = await chrome.debugger.sendCommand(
    { tabId },
    "DOM.querySelector",
    {
      nodeId: root.nodeId,
      selector,
    }
  );
  if (!nodeId) {
    await chrome.debugger.detach({ tabId });
    throw new Error("Node not found");
  }
  // Get accessibility node
  const { nodes } = await chrome.debugger.sendCommand(
    { tabId },
    "Accessibility.getPartialAXTree",
    {
      nodeId,
      fetchRelatives: true,
    }
  );
  await chrome.debugger.detach({ tabId });
  return nodes;
}

async function getAccessibleName(tabId, selector) {
  await chrome.debugger.attach({ tabId }, "1.3");
  await chrome.debugger.sendCommand({ tabId }, "Accessibility.enable");
  const { root } = await chrome.debugger.sendCommand(
    { tabId },
    "DOM.getDocument",
    { depth: -1, pierce: true }
  );
  // Use :focus to get the currently focused node
  const { nodeId } = await chrome.debugger.sendCommand(
    { tabId },
    "DOM.querySelector",
    {
      nodeId: root.nodeId,
      selector: ":focus",
    }
  );
  if (!nodeId) {
    await chrome.debugger.detach({ tabId });
    throw new Error("Node not found");
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
  if (nodes && nodes.length && nodes[0].name && nodes[0].name.value) {
    return nodes[0].name.value;
  }
  return "(no accessible name)";
}
