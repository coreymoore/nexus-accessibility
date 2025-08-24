(() => {
  function _postRequest(action, args) {
    return new Promise((resolve) => {
      const requestId = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
      function handler(e) {
        try {
          if (!e || e.source !== window) return;
          const d = e.data;
          if (!d || d.__nexus_inspector_bridge !== true) return;
          if (d.requestId !== requestId) return;
          window.removeEventListener('message', handler);
          resolve(d.payload);
        } catch (err) {
          window.removeEventListener('message', handler);
          resolve({ error: String(err) });
        }
      }
      // Timeout fallback: resolve with an error after 2500ms to avoid hanging
      const timeout = setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve({ error: 'timeout waiting for inspector bridge' });
      }, 2500);
      function wrappedHandler(e) {
        clearTimeout(timeout);
        handler(e);
      }
      window.addEventListener('message', wrappedHandler);
      window.postMessage({ __nexus_inspector_bridge: true, direction: 'from-page', requestId, action, args }, '*');
    });
  }

  try {
    if (!window.__nexus_getInspectorLogs) {
      window.__nexus_getInspectorLogs = function () { return _postRequest('getLogs'); };
    }
    if (!window.__nexus_clearInspectorLogs) {
      window.__nexus_clearInspectorLogs = function () { return _postRequest('clearLogs'); };
    }
    if (!window.__nexus_inspectorDiagnostic) {
      window.__nexus_inspectorDiagnostic = function (target) { return _postRequest('diagnostic', [target]); };
    }
    try { window.__nexus_inspector_bridge_installed = true; } catch (e) {}
  } catch (e) {
    // swallow
  }
})();
