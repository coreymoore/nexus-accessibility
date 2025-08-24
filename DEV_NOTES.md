Developer Notes — Nexus Extension Test Utilities

This short guide explains the `NexusTestUtils` developer helpers and how to run them from the extension's Service Worker console.

Where to run
- Open Chrome (or Chromium-based browser) and go to chrome://extensions.
- Enable Developer mode and reload the unpacked extension if needed.
- Click "Service worker (Inactive)" or "background page" link for the extension to open the service worker console.

Available helpers (globalThis.NexusTestUtils)
- testDebuggerStability(iterations = 10, explicitTabId)
  - Repeatedly attaches/detaches the Chrome debugger to the chosen or detected tab.
  - Useful to surface intermittent attach/detach errors.
  - Example: globalThis.NexusTestUtils.testDebuggerStability(20)

- testMemoryUsage(explicitTabId)
  - Attempts to measure memory usage. Priority:
    1. `performance.memory` (renderer contexts only)
    2. Optional runtime permission `system.memory` + `chrome.system.memory.getInfo()`
    3. `navigator.deviceMemory` (approximate device RAM in GB)
  - Note: the extension includes `system.memory` as an optional permission in manifest.json. Use the popup or the service worker helper to request it when needed.

- testCachePerformance()
  - Tests read/write to caches used by content scripts. When run from the Service Worker console caches may not be present.
  - If caches aren't present the test will skip and return `{ skipped: true }`.

- testErrorRecovery()
  - Exercises error handling by sending an intentionally invalid debugger command and verifying recovery.

- runAllTests()
  - Runs the above tests in sequence. `testCachePerformance` may be skipped in SW context.

Requesting `system.memory` permission
- The permission is declared as optional in `manifest.json`.
- Request from a user gesture (popup recommended) or from the SW console via the helper (if supported):
  - From the popup (preferred): use the "Grant Memory Permission" button in the popup to trigger the permission prompt.
  - From the service worker console: call `globalThis.NexusTestUtils.requestSystemMemoryPermission()` and accept the prompt when it appears.

Notes & Troubleshooting
- `testCachePerformance` is primarily meant to run from the content script or from the page context; when run from the SW console it will usually skip.
- For high-volume stability tests run `testDebuggerStability` with a moderate delay (the default has a small delay to avoid flapping).
- Persisting test results is available as an enhancement; open an issue or request if you want results saved automatically.

Contact
- For questions about developer utilities, open an issue in the repo or contact the maintainers.
