// toggle-shortcut-smoke.js
// Basic smoke assertions for Alt+T (background command toggles inspector state) and ESC behavior.
// NOTE: This relies on manual triggering of command in Chrome; here we simulate by dispatching the
// same INSPECTOR_STATE_CHANGE messages the background would send.
(function () {
  const LOG_PREFIX = '[SMOKE:toggle-shortcut]';
  function log(msg, data) { try { console.log(LOG_PREFIX, msg, data||''); } catch(e) {} }

  function sendState(state) {
    const msg = { type: 'INSPECTOR_STATE_CHANGE', inspectorState: state };
    window.postMessage({ __nexus_test_forward: true, message: msg }, '*');
    // Content scripts listen via chrome.runtime messaging; for test harness (in test-runner.html)
    // ensure a bridge exists to forward these if needed.
  }

  function assert(cond, label) {
    if (!cond) {
      console.error(LOG_PREFIX + ' FAIL:', label);
    } else {
      console.log(LOG_PREFIX + ' PASS:', label);
    }
  }

  // Sequence: turn on -> verify -> focus inside -> ESC -> verify still open -> turn off
  setTimeout(() => {
    sendState('on');
    setTimeout(() => {
      const inspector = document.getElementById('nexus-accessibility-ui-inspector') || document.querySelector('.nexus-accessibility-ui-inspector');
      assert(!!inspector, 'Inspector should be present after state on');

      if (inspector) {
        // Try to focus first focusable inside shadow if possible
        try {
          const shadow = inspector.shadowRoot; // normally closed; fallback to host focus
          if (shadow) {
            const focusable = shadow.querySelector('button, [tabindex], input, a, .nexus-accessibility-ui-inspector-sr');
            if (focusable) focusable.focus(); else inspector.focus();
          } else {
            inspector.focus();
          }
        } catch (e) { try { inspector.focus(); } catch(_) {} }
      }

      const escEv = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      document.dispatchEvent(escEv);

      setTimeout(() => {
        const stillThere = document.getElementById('nexus-accessibility-ui-inspector') || document.querySelector('.nexus-accessibility-ui-inspector');
        assert(!!stillThere, 'Inspector should remain after ESC');
        sendState('off');
        setTimeout(() => {
          const gone = document.getElementById('nexus-accessibility-ui-inspector') || document.querySelector('.nexus-accessibility-ui-inspector');
          assert(!gone, 'Inspector should be removed after state off');
        }, 150);
      }, 100);
    }, 250);
  }, 500);
})();
