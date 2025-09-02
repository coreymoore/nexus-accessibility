import { CacheManager } from "./cache-manager.js";
import { connectionManager } from "./connectionManager.js";
import { MessageHandler } from "./message-handler.js";
import TestUtils from "../utils/testUtils.js";

// Initialize managers
const cacheManager = new CacheManager();
// DebuggerManager deprecated: consolidated on connectionManager
const messageHandler = new MessageHandler(cacheManager);

// Setup message listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  messageHandler
    .handle(msg, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ error: error.message }));
  return true; // Keep channel open for async response
});

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  try { connectionManager.detach(tabId); } catch (_) {}
});

// Store global cache instance for cleanup
globalThis.cacheInstance = cacheManager;


console.log("Nexus Background Service Worker initialized");

// Alarm guard: prevent runaway alarm creation from exceeding browser limits.
try {
  if (chrome && chrome.alarms && !globalThis.__NEXUS_ALARM_GUARD_INSTALLED) {
    const origCreate = chrome.alarms.create.bind(chrome.alarms);
    chrome.alarms.create = function(name, info) {
      try {
        chrome.alarms.getAll((alarms) => {
          if (alarms && alarms.length >= 480) {
            console.warn('[NEXUS][ALARM-GUARD] High alarm count', alarms.length, 'attempting to add', name);
            if (alarms.length >= 495) {
              // Skip creating new low-priority cache cleanup / delay style alarms when near cap
              const lowPriority = /cache-cleanup|delay-|nexus-cache-cleanup/.test(name);
              if (lowPriority) {
                console.warn('[NEXUS][ALARM-GUARD] Suppressing low priority alarm creation:', name);
                return; // Abort creation
              }
            }
          }
          try { origCreate(name, info); } catch (e) { console.warn('[NEXUS][ALARM-GUARD] create failed', e); }
        });
      } catch (e) {
        try { origCreate(name, info); } catch(_) {}
      }
    };
    globalThis.__NEXUS_ALARM_GUARD_INSTALLED = true;
  }
} catch (e) {
  console.warn('[NEXUS][ALARM-GUARD] Failed to install alarm guard', e);
}

// One-time migration: clear legacy random cache cleanup & unused heartbeat alarms
try {
  if (chrome && chrome.alarms) {
    chrome.alarms.getAll((alarms) => {
      const legacy = alarms.filter(a => /^(cache-cleanup-|nexus-heartbeat)/.test(a.name));
      if (legacy.length) {
        console.warn('[NEXUS][ALARM-MIGRATION] Clearing legacy alarms:', legacy.map(a=>a.name));
        for (const a of legacy) {
          try { chrome.alarms.clear(a.name); } catch(_) {}
        }
      }
    });
  }
} catch (e) {
  console.warn('[NEXUS][ALARM-MIGRATION] Failed legacy cleanup', e);
}

// Attach test utilities to the service worker global for developer console access.
try {
  if (typeof globalThis !== "undefined" && TestUtils) {
    globalThis.NexusTestUtils = TestUtils;
    console.log("[BACKGROUND-INDEX] NexusTestUtils attached:", !!globalThis.NexusTestUtils);
  }
} catch (e) {
  console.warn("[BACKGROUND-INDEX] Failed to attach NexusTestUtils:", e);
}

// Dynamically import and expose connectionManager to globalThis to avoid
// circular import issues when message-handler or other modules import it.
// Expose the imported connectionManager to the service worker global so
// developers can inspect and use it from the worker console.
try {
  if (typeof globalThis !== "undefined" && connectionManager) {
    globalThis.connectionManager = connectionManager;
    console.log("[BACKGROUND-INDEX] connectionManager attached to globalThis");
  }
} catch (e) {
  console.warn("[BACKGROUND-INDEX] Failed to attach connectionManager:", e);
}

// Keyboard command handler (Alt+T -> delegate toggle to content script so it shares logic with popup)
try {
  if (chrome && chrome.commands && chrome.commands.onCommand) {
    chrome.commands.onCommand.addListener(async (command) => {
      try { console.log('[NEXUS][CMD] onCommand fired', command, Date.now()); } catch(e) {}
      if (command !== 'toggle-inspector') return;
      try {
        const tabs = await new Promise((resolve) => {
          try { chrome.tabs.query({ active: true, lastFocusedWindow: true }, resolve); } catch (e) { resolve([]); }
        });
        const msg = { type: 'COMMAND_TOGGLE_INSPECTOR' };
        for (const t of tabs) {
          if (t && t.id != null) {
            try { chrome.tabs.sendMessage(t.id, msg); } catch (e) {}
          }
        }
      } catch (err) {
        console.error('[NEXUS] Failed to delegate toggle command', err);
      }
    });
    // Diagnostic: verify registration by querying commands list (async; optional)
    try {
      if (chrome.commands.getAll) {
        chrome.commands.getAll((cmds) => {
          try { console.log('[NEXUS][CMD] Registered commands:', cmds); } catch(e) {}
        });
      }
    } catch(_) {}
  }
} catch (e) {
  console.warn('[NEXUS] Failed to register commands listener', e);
}
