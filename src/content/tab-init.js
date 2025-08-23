// Top-frame-only content script that notifies the background service worker
// of the current tab id for developer test utilities. This runs in the page
// context (content script) and only in the top-level frame to avoid duplicates.

(function () {
  "use strict";

  // Only run in top-level frames
  if (window.top !== window) return;

  try {
    // Send a simple init message to the background so it can persist the tab id
    // The background will validate the sender and store sender.tab.id in
    // chrome.storage.local under the key 'nexus_test_tabId'.
    chrome.runtime.sendMessage({ type: "NEXUS_TAB_INIT" }, (resp) => {
      // Ignore response - this is best-effort and should not block page
      try {
        // Optionally log in devtools for debugging
        if (resp && resp.status) {
          console.debug("[NEXUS_TAB_INIT] background response:", resp);
        }
      } catch (e) {}
    });
  } catch (error) {
    // Silently ignore errors - this should never throw in content scripts
    console.debug("[NEXUS_TAB_INIT] sendMessage failed:", error);
  }
})();
