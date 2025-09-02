/**
 * sr-preview-content.js
 * Transformation layer ONLY. No accessibility logic here.
 * Consumes window.NexusSrPreview (core) and produces DOM nodes / HTML for display.
 * Global API: window.NexusSrPreviewContent
 */
(function(){
  'use strict';
  function guardCore() {
    if (!window.NexusSrPreview || !window.NexusSrPreview.generateSegments) {
      console.warn('[NEXUS][SR-PREVIEW-CONTENT] Core sr-preview API missing');
      return false;
    }
    return true;
  }

  function renderSegment(segment) {
    const kind = segment && (segment.kind || segment.type) || 'misc';
    const text = segment && segment.text != null ? String(segment.text) : '';
    const span = document.createElement('span');
    span.className = 'sr-token sr-token-' + kind;
    span.textContent = text;
    return span;
  }

  function buildRenderedSegments(info, options = {}) {
    if (!guardCore()) return [];
    const { returnNodes = true } = options;
    let segments = [];
    try { segments = window.NexusSrPreview.generateSegments(info) || []; } catch { segments = []; }
    const nodes = segments.map(renderSegment);
    if (returnNodes) return nodes;
    const tmp = document.createElement('div');
    nodes.forEach(n=>tmp.appendChild(n));
    return tmp.innerHTML;
  }

  function buildContainer(info, options = {}) {
    const el = document.createElement('div');
    el.className = 'sr-preview-container';
    const nodes = buildRenderedSegments(info, { returnNodes: true, ...options });
    nodes.forEach(n=>el.appendChild(n));
    return el;
  }

  window.NexusSrPreviewContent = { renderSegment, buildRenderedSegments, buildContainer };
})();