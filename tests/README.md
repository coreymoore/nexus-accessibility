Clear Caches Smoke Test

How to run

1. Build or load the extension as an unpacked extension in Chrome (via chrome://extensions).
2. Open the test page from the extension files. For example, if your extension ID is `__EXT_ID__`, open:

   chrome-extension://__EXT_ID__/tests/clear-caches-smoke.html

3. Click "Generate" to produce a correlationId (or enter your own), then click "Run CLEAR_CACHES".
4. The page will call `chrome.runtime.sendMessage({ type: 'CLEAR_CACHES', correlationId })` and display the aggregated response and per-frame ACKs.

Notes

- This page must be opened as an extension resource (chrome-extension://) to have access to `chrome.runtime`.
- The smoke test is intentionally simple and designed to exercise the background `handleClearCaches` path and observe correlation propagation.
