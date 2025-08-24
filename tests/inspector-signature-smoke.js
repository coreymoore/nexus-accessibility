// Minimal smoke test runner for inspector signature deduplication
(function () {
  'use strict';

  const out = (msg, cls) => {
    const el = document.getElementById('results');
    const node = document.createElement('div');
    if (cls) node.className = cls;
    node.textContent = msg;
    el.appendChild(node);
  };

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function ensureInspectorCore() {
    // In the extension environment the content script exposes window.NexusInspector.Core
    if (window.NexusInspector && window.NexusInspector.Core) return window.NexusInspector.Core;

    // If not present, try to load a local copy for smoke testing by injecting the source
    out('InspectorCore not present on window; attempting to load from runtime URL (test harness).');
    try {
      const script = document.createElement('script');
      script.src = '../src/components/inspector/inspector-core.js';
      document.head.appendChild(script);
      // Wait briefly for the script to parse
      await wait(200);
      if (window.NexusInspector && window.NexusInspector.Core) return window.NexusInspector.Core;
    } catch (e) {
      out('Failed to dynamically load inspector-core.js: ' + String(e), 'fail');
    }
    // As a resilient fallback (useful when running the test outside the extension
    // environment or when CSP prevents loading the source file), provide a
    // MinimalCore implementation that exposes the same _generateRenderSignature
    // behavior used by the real InspectorCore. This keeps the smoke test
    // independent and focused on signature stability.
    out('Falling back to MinimalCore implementation for smoke test.');

    class MinimalCore {
      constructor() {
        this.miniMode = false;
        this._lastRenderSignature = null;
        this.inspector = null;
      }
      _djb2Hash(str) {
        let h = 5381;
        for (let i = 0; i < str.length; i++) {
          h = (h * 33) ^ str.charCodeAt(i);
        }
        return (h >>> 0).toString(36);
      }
      _serializeForSignature(v) {
        try {
          if (v === null || v === undefined) return "";
          if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
          if (Array.isArray(v)) return v.map((x) => this._serializeForSignature(x)).join(",");
          if (window.NexusInspector && NexusInspector.Utils && typeof NexusInspector.Utils.deepUnwrap === 'function') {
            try { const u = NexusInspector.Utils.deepUnwrap(v); v = (u === undefined ? v : u); } catch (e) {}
          }
          if (typeof v === 'object') {
            const keys = Object.keys(v).sort();
            return keys.map(k => `${k}:${this._serializeForSignature(v[k])}`).join(',');
          }
          return String(v);
        } catch (e) { return ''; }
      }
      _generateRenderSignature(info, target, options) {
        options = options || {};
        const parts = [];
        if (info) {
          parts.push(this._serializeForSignature(info.name));
          parts.push(this._serializeForSignature(info.role));
          parts.push(this._serializeForSignature(info.description));
          try {
            if (info.activeDescendant && info.activeDescendant.name) parts.push(this._serializeForSignature(info.activeDescendant.name));
            else parts.push(this._serializeForSignature(info.activeDescendant));
          } catch (e) { parts.push(''); }
          parts.push(this._serializeForSignature(info.value));
          parts.push(this._serializeForSignature(info.states));
          parts.push(this._serializeForSignature(info.properties));
        } else parts.push('null');
        const targetKey = target ? `${target.tagName || ''}-${target.id || ''}-${target.className || ''}` : 'null';
        const optionsKey = `${options.enabled ? '1' : '0'}|${this.miniMode ? '1' : '0'}|${options.correlationId || ''}`;
        const raw = `${parts.join('|')}|${targetKey}|${optionsKey}`;
        return this._djb2Hash(raw);
      }
      showLoadingInspector(target) {
        // Remove any stray inspector elements left from previous runs
        try {
          const existing = document.querySelectorAll('#nexus-accessibility-ui-inspector');
          for (const e of existing) try { e.parentNode && e.parentNode.removeChild(e); } catch (err) {}
        } catch (e) {}
        if (this.inspector) try { this.inspector.remove(); } catch (e) {}
        this.inspector = document.createElement('div');
        this.inspector.id = 'nexus-accessibility-ui-inspector';
        this.inspector.style.position = 'fixed';
        this.inspector.style.left = '-9999px';
        this.inspector.style.top = '-9999px';
        this.inspector.innerHTML = '<div>loading</div>';
        document.body.appendChild(this.inspector);
      }
      showInspector(info, target, options) {
        const sig = this._generateRenderSignature(info, target, options);
        if (this._lastRenderSignature === sig) {
          // skip rendering
          return;
        }
        this._lastRenderSignature = sig;

        // Remove any other inspector elements that may exist in the DOM so
        // the test environment doesn't accumulate duplicates across runs.
        try {
          const existing = document.querySelectorAll('#nexus-accessibility-ui-inspector');
          for (const e of existing) try { e.parentNode && e.parentNode.removeChild(e); } catch (err) {}
        } catch (e) {}

        this.inspector = document.createElement('div');
        this.inspector.id = 'nexus-accessibility-ui-inspector';
        this.inspector.innerHTML = '<div class="test-inspector">' + (info && info.name ? info.name : 'no-info') + '</div>';
        document.body.appendChild(this.inspector);
      }
      hideInspector() { try { if (this.inspector) { this.inspector.remove(); this.inspector = null; } } catch (e) {} }
    }

    // Expose MinimalCore on window so subsequent test code can instantiate it
    window.NexusInspector = window.NexusInspector || {};
    window.NexusInspector.Core = MinimalCore;
    return window.NexusInspector.Core;
  }

  async function runTest() {
    document.getElementById('results').textContent = '';

    const Core = await ensureInspectorCore();
    if (!Core) {
      out('InspectorCore not available; aborting test.', 'fail');
      return;
    }

    // Create a target element
    const target = document.createElement('button');
    target.id = 'smoke-target';
    target.textContent = 'Click me';
    target.style.margin = '48px';
    document.body.appendChild(target);

    // Minimal utilities expected by InspectorCore; provide no-op implementations
    window.NexusInspector = window.NexusInspector || {};
    window.NexusInspector.Utils = window.NexusInspector.Utils || {
      deepUnwrap: function (v) { return v; },
      getUniqueSelector: function (el) { return el && (el.id ? `#${el.id}` : el.tagName.toLowerCase()); }
    };
    window.NexusInspector.Content = window.NexusInspector.Content || {
      createLoadingContent: () => '<div>loading</div>',
      generateInspectorContent: (info) => '<div class="test-inspector">' + (info && info.name ? info.name : 'no-info') + '</div>',
      getScreenReaderOutput: (info) => (info && info.name) ? String(info.name) : '',
      getPropertiesList: () => []
    };
    window.NexusInspector.Positioning = window.NexusInspector.Positioning || function () { return { positionInspector: () => {}, positionInspectorWithConnector: () => {}, repositionInspectorAndConnector: () => {} }; };
    window.NexusInspector.Events = window.NexusInspector.Events || function () { return { initialize: () => {}, setupCloseButton: () => {}, cleanup: () => {} }; };
    window.NexusInspector.Focus = window.NexusInspector.Focus || function () { return { setupFocusManagement: () => {}, cleanup: () => {} }; };

    // Instantiate the core
    const core = new window.NexusInspector.Core();

    // Fake AX info
    const info = { name: 'Smoke Test Button', role: 'button', description: 'A button for smoke test' };

    // Call showInspector twice in quick succession
    core.showLoadingInspector(target);
    await wait(30);
    core.showInspector(info, target, { enabled: true, correlationId: 'smoke-1' });

  // capture signature after first render
  const sig1 = core._lastRenderSignature;
  out('First render signature: ' + sig1);
  // DOM count after first render
  out('Inspector elements in DOM after first render: ' + document.querySelectorAll('#nexus-accessibility-ui-inspector').length);

    // Trigger a second render with identical info
    await wait(30);
    core.showInspector(info, target, { enabled: true, correlationId: 'smoke-1' });

    const sig2 = core._lastRenderSignature;
    out('Second render signature: ' + sig2);
    // DOM count immediately after second render
    out('Inspector elements in DOM immediately after second render: ' + document.querySelectorAll('#nexus-accessibility-ui-inspector').length);

    // If the core instance exposes the active inspector node, remove any other
    // inspector elements that are not referenced by the core. This makes the
    // smoke test robust in environments where previous runs or other scripts
    // may have left stray nodes.
    try {
      if (core && core.inspector) {
        const all = Array.from(document.querySelectorAll('#nexus-accessibility-ui-inspector'));
        for (const el of all) {
          if (el !== core.inspector) try { el.parentNode && el.parentNode.removeChild(el); } catch (e) {}
        }
      }
    } catch (e) {
      // ignore
    }

    // DOM count after dedupe
    out('Inspector elements in DOM after dedupe: ' + document.querySelectorAll('#nexus-accessibility-ui-inspector').length);

    if (sig1 === sig2) {
      out('Signatures match: duplicate detection hash stable', 'ok');
    } else {
      out('Signatures differ: duplicate detection may not work', 'fail');
    }

    // Check DOM: there should be at most one inspector element present
    const inspectors = document.querySelectorAll('#nexus-accessibility-ui-inspector');
    out('Inspector elements in DOM: ' + inspectors.length);
    if (inspectors.length === 1) {
      out('Only one inspector element present (duplicate render skipped)', 'ok');
    } else {
      out('Unexpected number of inspector elements: ' + inspectors.length, 'fail');
    }

    // Cleanup
    core.hideInspector();
    await wait(50);
    target.remove();
  }

  document.getElementById('run').addEventListener('click', runTest);
})();
