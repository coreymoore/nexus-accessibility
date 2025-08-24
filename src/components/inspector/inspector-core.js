/**
 * Inspector Core Module
 *
 * Main inspector class that orchestrates all inspector functionality.
 * This is the primary module that initializes and manages the inspector system.
 *
 * Dependencies:
 * - inspector-utils.js (for data processing utilities)
 * - inspector-content.js (for content generation)
 * - inspector-positioning.js (for positioning logic)
 * - inspector-events.js (for event handling)
 * - inspector-focus.js (for focus management)
 *
 * Global API: window.NexusInspector.Core
 */

(function () {
  "use strict";

  // Quick runtime signal for debugging: this will appear in the page console
  // when the content script is injected. Leave as info so it doesn't alarm.
  try {
    console.info('[NEXUS] inspector-core content script loaded', { href: location.href });
  } catch (e) {}

  // Access global dependencies
  const utils = window.NexusInspector.Utils;
  const content = window.NexusInspector.Content;
  const positioning = window.NexusInspector.Positioning;
  const events = window.NexusInspector.Events;
  const focus = window.NexusInspector.Focus;

  class InspectorCore {
    constructor() {
      this.logger =
        (window.axLogger &&
          window.axLogger.log.bind(window.axLogger, "inspector")) ||
        (() => {});
      this.inspector = null;
      this.connector = null;
      this.miniMode = false;
      this._mutObserver = null;
      this._isHiding = false;
      this._margin = 32; // Spacing between inspector and focused element
      this._scrollHandler = null;

      // Store last info for mini mode toggle
      this._lastInfo = null;
      this._lastTarget = null;
      this._lastOptions = null;

      // Initialize dependencies
      this.events = new events.EventManager(this);
      this.focus = new focus.FocusManager(this);
      this.positioning = new positioning.PositioningManager(this);

      // Load saved preferences
      this._loadPreferences();

      // Initialize event handlers
      this.events.initialize();
    }

    _loadPreferences() {
      // Use both new and legacy storage for compatibility during transition
      chrome.storage.sync.get(
        {
          inspectorState: null,
          miniMode: false, // fallback for legacy
        },
        (data) => {
          if (data.inspectorState) {
            this.miniMode = data.inspectorState === "mini";
          } else {
            // Legacy fallback
            this.miniMode = !!data.miniMode;
          }
        }
      );
    }

    ensureStylesInjected() {
      if (document.getElementById("nexus-accessibility-ui-inspector-style"))
        return;
      const link = document.createElement("link");
      link.id = "nexus-accessibility-ui-inspector-style";
      link.rel = "stylesheet";
      link.type = "text/css";
      link.href = chrome.runtime.getURL(
        "src/components/inspector/inspector.css"
      );
      document.head.appendChild(link);

      // Inject shared stylesheet (focus ring, shared tokens) if not present
      if (!document.getElementById("nexus-shared-style")) {
        const shared = document.createElement("link");
        shared.id = "nexus-shared-style";
        shared.rel = "stylesheet";
        shared.type = "text/css";
        shared.href = chrome.runtime.getURL("src/assets/shared.css");
        document.head.appendChild(shared);
      }
    }

    showLoadingInspector(target) {
      this.ensureStylesInjected();
      if (this.inspector) this.inspector.remove();

      this.inspector = document.createElement("div");
      this.inspector.className = "nexus-accessibility-ui-inspector";
      this.inspector.setAttribute("role", "group");
      this.inspector.setAttribute(
        "aria-roledescription",
        "Accessibility Inspector"
      );
      this.inspector.setAttribute("id", "nexus-accessibility-ui-inspector");

      // Create safe loading content
      const loadingHtml = content.createLoadingContent();
      this.inspector.innerHTML = loadingHtml;
      this.inspector.style.display = "block";

      // Attempt to render the inspector in the top-level document when the target
      // is inside a same-origin iframe. If that succeeds, the inspector and any
      // connector are appended to the top document and positioned there. If it
      // fails (cross-origin or any error), fall back to appending to the
      // current document and use the normal positioning manager.
      if (!this._attemptEscapeToTop(target)) {
        // append into current document and position normally
        document.body.appendChild(this.inspector);
        this.positioning.positionInspector(target);
      }

      // Diagnostic: ensure inspector is actually visible and not being hidden by host styles
      try {
        this._diagnoseVisibility && this._diagnoseVisibility(target, 'loading');
      } catch (e) {
        // swallow diagnostics errors
      }
    }

    showInspector(info, target, options = {}) {
      const { onClose, enabled } = options;

      // Debug logging
      try {
        console.debug("[AX Inspector] group info:", info && info.group);
      } catch {}

      // Generate render signature for deduplication
      const renderSignature = this._generateRenderSignature(info, target, options);
      if (this._lastRenderSignature === renderSignature) {
        console.debug("[AX Inspector] Skipping duplicate render, signature matches:", renderSignature);
        return;
      }
      this._lastRenderSignature = renderSignature;

      // Store state for mode toggles
      this._lastInfo = info;
      this._lastTarget = target;
      this._lastOptions = options;

      this.ensureStylesInjected();
      if (!info) return;

      // Clean up existing inspector
      if (this.inspector) {
        this.focus.cleanup();
        this.inspector.remove();
      }

      // Create new inspector element
      this._createInspectorElement(target);

      // Generate and set content
      const inspectorContent = content.generateInspectorContent(
        info,
        this.miniMode,
        { onClose, enabled }
      );
      // Diagnostic logging: compare generated render pieces with the AX info
      try {
        // Prefer verbose/test mode flag when present, but always emit at debug level
        const srPreview =
          typeof content.getScreenReaderOutput === "function"
            ? content.getScreenReaderOutput(info)
            : null;

        const propertiesList =
          typeof content.getPropertiesList === "function"
            ? content.getPropertiesList(info)
            : null;

        const targetSummary = target
          ? {
              tagName: target.tagName,
              id: target.id,
              className: target.className,
              selector: (utils && typeof utils.getUniqueSelector === 'function') ? utils.getUniqueSelector(target) : undefined,
            }
          : null;

        // Deep unwrap name for proper string comparison
        const unwrappedName = utils && typeof utils.deepUnwrap === 'function' 
          ? utils.deepUnwrap(info && info.name) 
          : info && info.name;
        const nameStr = unwrappedName ? String(unwrappedName) : "";
        const role = info && info.role ? String(info.role) : "";

        // Check if role is presentational and should not have accessible name
        const isPresentationalRole = role && (
          role.toLowerCase() === 'presentation' || 
          role.toLowerCase() === 'none' ||
          role.toLowerCase().includes('presentational')
        );

        // Quick comparisons
        const srContainsName = srPreview && nameStr ? srPreview.indexOf(nameStr) !== -1 : null;

        let propNameRendered = null;
        let propRoleRendered = null;
        
        // Extract property values - handle both array format and HTML string format
        if (Array.isArray(propertiesList)) {
          for (const p of propertiesList) {
            if (!p || !p.label) continue;
            if (p.label === "Name") {
              // Deep unwrap property value too
              const unwrappedPropValue = utils && typeof utils.deepUnwrap === 'function'
                ? utils.deepUnwrap(p.value)
                : p.value;
              propNameRendered = String(unwrappedPropValue || "");
            }
            if (p.label === "Role") propRoleRendered = String(p.value || "");
          }
        } else if (typeof propertiesList === 'string') {
          // Extract from HTML string format (when using custom formatter)
          const nameMatch = propertiesList.match(/<dt>Name<\/dt><dd>([^<]*)<\/dd>/);
          const roleMatch = propertiesList.match(/<dt>Role<\/dt><dd>([^<]*)<\/dd>/);
          if (nameMatch) propNameRendered = nameMatch[1].trim();
          if (roleMatch) propRoleRendered = roleMatch[1].trim();
        }

        // Build a single structured object for easier inspection in devtools
        const warnings = [];
        // Only warn about missing name if not a presentational role and name is actually expected
        if (srContainsName === false && !isPresentationalRole && nameStr.trim()) {
          warnings.push({ code: 'SR_MISSING_NAME', message: 'SR preview does NOT include AX.name', name: nameStr, srPreview });
          console.warn("SR preview does NOT include AX.name:", { name: nameStr, srPreview });
        } else if (srContainsName === true) {
          // include a success note in the object but don't warn
          // no-op for now
        }

        if (propNameRendered && nameStr && propNameRendered.trim() !== nameStr.trim()) {
          warnings.push({ code: 'NAME_MISMATCH', message: "Rendered 'Name' property differs from AX.name", rendered: propNameRendered, axName: nameStr });
          console.warn("Rendered 'Name' property differs from AX.name", { rendered: propNameRendered, axName: nameStr });
        }
        if (propRoleRendered && role && propRoleRendered.trim() !== role.trim()) {
          warnings.push({ code: 'ROLE_MISMATCH', message: "Rendered 'Role' property differs from AX.role", rendered: propRoleRendered, axRole: role });
          console.warn("Rendered 'Role' property differs from AX.role", { rendered: propRoleRendered, axRole: role });
        }

        const renderVsAx = {
          timestamp: new Date().toISOString(),
          correlationId: options && options.correlationId ? options.correlationId : null,
          target: targetSummary,
          ax: info,
          generatedInspectorHtmlSnippet: inspectorContent && inspectorContent.slice ? inspectorContent.slice(0, 2048) : inspectorContent,
          srPreview,
          propertiesList,
          comparisons: {
            srContainsName,
            propNameRendered,
            propRoleRendered,
          },
          warnings,
        };

        console.log("[AX Inspector] render vs AX info", renderVsAx);
        // Also log a JSON string that is easy to copy from the console.
        try {
          const serializable = Object.assign({}, renderVsAx, {
            ax:
              utils && typeof utils.deepUnwrap === 'function'
                ? utils.deepUnwrap(renderVsAx.ax)
                : renderVsAx.ax,
          });
          // Pretty-print with indentation so Copy will produce readable JSON
          console.log('[AX Inspector] render vs AX info (json)');
          console.log(JSON.stringify(serializable, null, 2));
        } catch (e) {
          // If serialization fails, ignore and continue
        }

        // Persist a structured diagnostic entry for batch analysis.
        try {
          // Ensure global log array exists and bound it to a reasonable size
          window.__nexus_inspectorLogs = window.__nexus_inspectorLogs || [];
          const maxLogs = (window.NEXUS_TESTING_MODE && window.NEXUS_TESTING_MODE.maxInspectorLogs) || 2000;
          const logEntry = {
            timestamp: Date.now(),
            iso: new Date().toISOString(),
            correlationId: options && options.correlationId ? options.correlationId : null,
            target: targetSummary,
            ax: info,
            srPreview: srPreview,
            propertiesList: propertiesList,
            inspectorHtmlSnippet: inspectorContent && inspectorContent.slice ? inspectorContent.slice(0, 2048) : inspectorContent,
            comparisons: {
              srContainsName: srContainsName,
              propNameRendered: propNameRendered,
              propRoleRendered: propRoleRendered,
            },
          };
          window.__nexus_inspectorLogs.push(logEntry);
          // Trim oldest entries if over limit
          if (window.__nexus_inspectorLogs.length > maxLogs) {
            window.__nexus_inspectorLogs.splice(0, window.__nexus_inspectorLogs.length - maxLogs);
          }
        } catch (e) {
          // ignore logging failures
        }
      } catch (diagErr) {
        // Do not allow diagnostics to break inspector rendering
        try { console.warn('[AX Inspector] diagnostic logging failed', diagErr); } catch (e) {}
      }
      this.inspector.innerHTML = inspectorContent;

      // Setup initial positioning (offscreen for measurement)
      this._setupInitialPosition();

      // Try to escape into the top document for same-origin iframes. If the
      // escape succeeds it will append and position the inspector there and
      // create the connector. Otherwise fall back to appending here and using
      // the normal positioning manager.
      const escaped = this._attemptEscapeToTop(target);
      if (!escaped) {
        document.body.appendChild(this.inspector);

        // Setup event handlers for this inspector instance (will attach to
        // the current window)
        this._setupInspectorEventHandlers(onClose, enabled);

        // Position inspector and create connector
        this.positioning.positionInspectorWithConnector(target);
      } else {
        // When escaped, wire event handlers to the top window so scroll/resize
        // repositioning works in the top document context.
        this._setupInspectorEventHandlers(onClose, enabled);
      }

      // Setup focus management and observers
      this.focus.setupFocusManagement({ onClose, enabled });
      this._ensureObserver();

      // Diagnostic: ensure inspector is actually visible and not being hidden by host styles
      try {
        this._diagnoseVisibility && this._diagnoseVisibility(target, 'render');
      } catch (e) {
        // swallow diagnostics errors
      }
    }

    /**
     * Diagnostic helper: log inspector visibility state and apply a conservative inline
     * fallback style if it appears hidden. This is intentionally minimal and only applies
     * inline styles to make the inspector visible for debugging; it preserves ARIA and
     * does not change structural behavior.
     */
    _diagnoseVisibility(target, phase) {
      if (!this.inspector) return;
      try {
        const parent = this.inspector.parentNode;
        const inDoc = document.documentElement.contains(this.inspector);
        const rect = this.inspector.getBoundingClientRect ? this.inspector.getBoundingClientRect() : null;
        const comp = window.getComputedStyle ? window.getComputedStyle(this.inspector) : null;
        const visibleByStyle = comp
          ? comp.display !== 'none' && comp.visibility !== 'hidden' && parseFloat(comp.opacity || '1') > 0
          : true;
        const visibleByLayout = rect ? rect.width > 0 && rect.height > 0 : true;

        console.debug('[AX Inspector] visibility diagnostic', { phase, inDoc, parentTag: parent && parent.tagName, visibleByStyle, visibleByLayout, rect, computed: comp && { display: comp.display, visibility: comp.visibility, opacity: comp.opacity, zIndex: comp.zIndex } });

        // If not visible by style or layout, apply a conservative inline fallback so it becomes visible
        if (!inDoc) {
          try { document.body && document.body.appendChild(this.inspector); } catch (e) {}
        }
        if (!visibleByStyle || !visibleByLayout) {
          // Apply minimal inline styles to guarantee visibility without changing semantics
          this.inspector.style.setProperty('position', 'fixed', 'important');
          this.inspector.style.setProperty('display', 'block', 'important');
          this.inspector.style.setProperty('left', '12px', 'important');
          this.inspector.style.setProperty('top', '12px', 'important');
          this.inspector.style.setProperty('z-index', '2147483648', 'important');
          this.inspector.style.setProperty('background', '#f3f0fa', 'important');
          this.inspector.style.setProperty('border', '1px solid #d1c4e9', 'important');
          this.inspector.style.setProperty('padding', '12px 16px', 'important');
        }
      } catch (e) {
        // Ignore diagnostics failures
      }
    }

    _createInspectorElement(target) {
      this.inspector = document.createElement("div");
      this.inspector.className = "nexus-accessibility-ui-inspector";
      this.inspector.setAttribute("role", "group");
      this.inspector.setAttribute(
        "aria-roledescription",
        "Accessibility Inspector"
      );
      this.inspector.setAttribute("id", "nexus-accessibility-ui-inspector");
      // Per AI_CONTEXT_RULES: do NOT use aria-live / live regions in injected inspector.
      // Also avoid aria-hidden on container; expose only on explicit focus interaction.
      this.inspector.setAttribute("tabindex", "-1");

      // Establish ARIA relationship with target element if it has an ID
      if (target && target.id) {
        this.inspector.setAttribute("aria-controls", target.id);
      }
    }

    /**
     * Attempt to move the inspector and connector into the top-level document
     * when the target is inside a same-origin iframe. Returns true on success.
     * This allows the inspector to escape iframe clipping/stacking and be
     * positioned relative to the top-level viewport.
     */
    _attemptEscapeToTop(target) {
      try {
        // If already top-level or no target, nothing to do
        if (!target || window === window.top) return false;

        // Must be same-origin to access parent/frameElement properties
        let topWin;
        try {
          topWin = window.top; // will throw if cross-origin
          // Touching topWin.document to confirm access
          /* eslint-disable no-unused-expressions */
          topWin.document && topWin.document.documentElement;
          /* eslint-enable no-unused-expressions */
        } catch (e) {
          return false; // cross-origin, cannot escape
        }

        const frameEl = window.frameElement;
        if (!frameEl) return false;

        // Compute absolute rect relative to top viewport
        const targetRect = target.getBoundingClientRect();
        const frameRect = frameEl.getBoundingClientRect();
        const abs = {
          left: frameRect.left + targetRect.left,
          top: frameRect.top + targetRect.top,
          width: targetRect.width,
          height: targetRect.height,
          right: frameRect.left + targetRect.right,
          bottom: frameRect.top + targetRect.bottom,
        };

        // Move inspector element into top document
        const topDoc = topWin.document;
        try {
          // Adopt node across documents if needed
          if (this.inspector.ownerDocument !== topDoc) {
            // Remove from current document if attached
            try { this.inspector.parentNode && this.inspector.parentNode.removeChild(this.inspector); } catch (e) {}
            topDoc.body.appendChild(this.inspector);
          }
        } catch (e) {
          // If adoption/appending fails, abort escape
          return false;
        }

        // Compute inspector size (it may be offscreen so measure after appending)
        const inspectorRect = this.inspector.getBoundingClientRect();

        // Choose a placement that prefers the left side of the iframe when possible
        const margin = this._margin;
        const candidates = [];
        // left-centered
        candidates.push({ top: abs.top + Math.max(0, (abs.height - inspectorRect.height) / 2), left: abs.left - inspectorRect.width - margin });
        // right-centered
        candidates.push({ top: abs.top + Math.max(0, (abs.height - inspectorRect.height) / 2), left: abs.right + margin });
        // below-left
        candidates.push({ top: abs.bottom + margin, left: abs.left });
        // above-left
        candidates.push({ top: abs.top - inspectorRect.height - margin, left: abs.left });

        const vw = topWin.innerWidth;
        const vh = topWin.innerHeight;

        const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

        let chosen = null;
        const elemAbs = { left: abs.left, right: abs.right, top: abs.top, bottom: abs.bottom };
        const intersects = (a, b) => !(a.left >= b.right || a.right <= b.left || a.top >= b.bottom || a.bottom <= b.top);

        for (const c of candidates) {
          const cand = {
            left: clamp(c.left, 0, vw - inspectorRect.width),
            top: clamp(c.top, 0, vh - inspectorRect.height),
            right: clamp(c.left, 0, vw - inspectorRect.width) + inspectorRect.width,
            bottom: clamp(c.top, 0, vh - inspectorRect.height) + inspectorRect.height,
          };
          if (!intersects(cand, elemAbs)) {
            chosen = cand;
            break;
          }
        }

        if (!chosen) {
          // fallback: place to the left clamped
          chosen = {
            left: clamp(abs.left - inspectorRect.width - margin, 0, vw - inspectorRect.width),
            top: clamp(abs.top, 0, vh - inspectorRect.height),
          };
          chosen.right = chosen.left + inspectorRect.width;
          chosen.bottom = chosen.top + inspectorRect.height;
        }

        // Apply fixed positioning in top document (viewport coordinates)
        this.inspector.style.position = 'fixed';
        this.inspector.style.left = `${chosen.left}px`;
        this.inspector.style.top = `${chosen.top}px`;
        this.inspector.style.setProperty('z-index', '2147483648', 'important');

        // Create connector in top document
        try {
          // Remove existing connector if present in any doc
          if (this.connector && this.connector.parentNode) this.connector.parentNode.removeChild(this.connector);

          const svgNS = 'http://www.w3.org/2000/svg';
          const connector = topDoc.createElementNS(svgNS, 'svg');
          connector.style.position = 'absolute';
          connector.style.pointerEvents = 'none';
          connector.style.zIndex = '2147483649';
          connector.style.left = '0px';
          connector.style.top = '0px';
          connector.style.width = '100vw';
          connector.style.height = '100vh';
          connector.style.overflow = 'visible';

          const inspectorEdge = { x: chosen.left + inspectorRect.width / 2, y: chosen.top + inspectorRect.height / 2 };
          const elemEdge = { x: abs.left + abs.width / 2, y: abs.top + abs.height / 2 };

          // border line
          const borderLine = topDoc.createElementNS(svgNS, 'line');
          borderLine.setAttribute('x1', inspectorEdge.x);
          borderLine.setAttribute('y1', inspectorEdge.y);
          borderLine.setAttribute('x2', elemEdge.x);
          borderLine.setAttribute('y2', elemEdge.y);
          borderLine.setAttribute('stroke', 'white');
          borderLine.setAttribute('stroke-width', '5');
          borderLine.setAttribute('stroke-linecap', 'butt');
          connector.appendChild(borderLine);

          const mainLine = topDoc.createElementNS(svgNS, 'line');
          mainLine.setAttribute('x1', inspectorEdge.x);
          mainLine.setAttribute('y1', inspectorEdge.y);
          mainLine.setAttribute('x2', elemEdge.x);
          mainLine.setAttribute('y2', elemEdge.y);
          mainLine.setAttribute('stroke', '#683ab7');
          mainLine.setAttribute('stroke-width', '3');
          mainLine.setAttribute('stroke-linecap', 'butt');
          connector.appendChild(mainLine);

          topDoc.body.appendChild(connector);
          this.connector = connector;
        } catch (e) {
          // ignore connector failures
        }

        // Remember that we escaped and store topWin reference for event wiring
        this._escapedToTop = { topWin, topDoc, frameEl };
        return true;
      } catch (err) {
        return false;
      }
    }

    _setupInitialPosition() {
      this.inspector.style.position = "fixed";
      this.inspector.style.left = "-9999px";
      this.inspector.style.top = "-9999px";
      this.inspector.style.setProperty("z-index", "2147483648", "important");
      this.inspector.style.setProperty("display", "block", "important");
    }

    _setupInspectorEventHandlers(onClose, enabled) {
      // Setup scroll handler for repositioning
      this._scrollHandler = () => {
        if (!this.inspector || this.inspector.style.display !== "block" || !this._lastTarget) return;
        // If inspector was escaped to top document, use custom reposition logic
        if (this._escapedToTop && this._escapedToTop.topWin) {
          this._repositionEscapedInspector(this._lastTarget);
        } else {
          // Default in-frame repositioning
          this.positioning.repositionInspectorAndConnector(this._lastTarget);
        }
      };

      // Use passive:true for scroll listeners to avoid causing scroll jank
      try {
        const listenTarget = (this._escapedToTop && this._escapedToTop.topWin) ? this._escapedToTop.topWin : window;
        listenTarget.addEventListener("scroll", this._scrollHandler, {
          capture: true,
          passive: true,
        });
        // Also listen for resize to reposition connectors
        listenTarget.addEventListener("resize", this._scrollHandler, { passive: true });
      } catch (e) {
        // Fallback for older browsers: add with boolean capture
        try {
          const listenTarget = (this._escapedToTop && this._escapedToTop.topWin) ? this._escapedToTop.topWin : window;
          listenTarget.addEventListener("scroll", this._scrollHandler, true);
        } catch (err) {}
      }

      // Setup close button functionality
      const closeButton = this.inspector.querySelector(
        ".nexus-accessibility-ui-inspector-close"
      );
      if (closeButton) {
        this.events.setupCloseButton(closeButton, onClose, enabled);
      }
    }

    /**
     * Reposition inspector and connector when inspector has been escaped to top document.
     * Computes absolute coordinates for the target (based on frameElement position)
     * and updates the inspector's fixed position and SVG connector endpoints.
     */
    _repositionEscapedInspector(target) {
      try {
        if (!this._escapedToTop || !this._escapedToTop.topWin) return;
        const { topWin, topDoc, frameEl } = this._escapedToTop;
        if (!frameEl) return;

        const targetRect = target.getBoundingClientRect();
        const frameRect = frameEl.getBoundingClientRect();
        const abs = {
          left: frameRect.left + targetRect.left,
          top: frameRect.top + targetRect.top,
          width: targetRect.width,
          height: targetRect.height,
          right: frameRect.left + targetRect.right,
          bottom: frameRect.top + targetRect.bottom,
        };

        // Recompute inspector size
        const inspectorRect = this.inspector.getBoundingClientRect();
        const margin = this._margin;

        // Prefer left placement if possible
        const vw = topWin.innerWidth;
        const vh = topWin.innerHeight;
        const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

        const leftCandidate = { left: clamp(abs.left - inspectorRect.width - margin, 0, vw - inspectorRect.width), top: clamp(abs.top, 0, vh - inspectorRect.height) };
        const rightCandidate = { left: clamp(abs.right + margin, 0, vw - inspectorRect.width), top: clamp(abs.top, 0, vh - inspectorRect.height) };

        const chosen = leftCandidate; // prefer left

        this.inspector.style.left = `${chosen.left}px`;
        this.inspector.style.top = `${chosen.top}px`;

        // Update connector if present
        if (this.connector && this.connector.ownerDocument === topDoc) {
          try {
            const lines = this.connector.querySelectorAll('line');
            if (lines && lines.length >= 2) {
              const inspectorEdge = { x: chosen.left + inspectorRect.width / 2, y: chosen.top + inspectorRect.height / 2 };
              const elemEdge = { x: abs.left + abs.width / 2, y: abs.top + abs.height / 2 };
              // border line
              lines[0].setAttribute('x1', inspectorEdge.x);
              lines[0].setAttribute('y1', inspectorEdge.y);
              lines[0].setAttribute('x2', elemEdge.x);
              lines[0].setAttribute('y2', elemEdge.y);
              // main line
              lines[1].setAttribute('x1', inspectorEdge.x);
              lines[1].setAttribute('y1', inspectorEdge.y);
              lines[1].setAttribute('x2', elemEdge.x);
              lines[1].setAttribute('y2', elemEdge.y);
            }
          } catch (e) {}
        }
      } catch (e) {
        // ignore reposition errors
      }
    }

    hideInspector(options = {}) {
      const { onRefocus } = options;
      this._isHiding = true;

      try {
        // Clean up event listeners
        if (this._scrollHandler) {
          try {
            const listenTarget = (this._escapedToTop && this._escapedToTop.topWin) ? this._escapedToTop.topWin : window;
            listenTarget.removeEventListener("scroll", this._scrollHandler, true);
            listenTarget.removeEventListener("scroll", this._scrollHandler, false);
            listenTarget.removeEventListener("resize", this._scrollHandler, false);
          } catch (e) {}
          this._scrollHandler = null;
        }

        // Clean up focus management
        this.focus.cleanup();

        // Remove inspector and connector elements from whichever document they live in
        try {
          if (this.inspector) {
            const inspParent = this.inspector.parentNode;
            if (inspParent) inspParent.removeChild(this.inspector);
            this.inspector = null;
          }
        } catch (e) {}
        try {
          if (this.connector) {
            const connParent = this.connector.parentNode;
            if (connParent) connParent.removeChild(this.connector);
            this.connector = null;
          }
        } catch (e) {}

        // Clear escaped-to-top state if present
        try {
          this._escapedToTop = null;
        } catch (e) {}
      } finally {
        this._isHiding = false;
      }

      if (onRefocus) onRefocus();
    }

    toggleMiniMode() {
      this.miniMode = !this.miniMode;

      // Update the unified state
      const newState = this.miniMode ? "mini" : "on";
      chrome.storage.sync.set({ inspectorState: newState });

      // Re-render current inspector if visible
      if (this.inspector && this.inspector.style.display === "block") {
        if (this._lastInfo && this._lastTarget && this._lastOptions) {
          this.showInspector(
            this._lastInfo,
            this._lastTarget,
            this._lastOptions
          );
        }
      }
    }

    _ensureObserver() {
      if (this._mutObserver) return;
      try {
        this._mutObserver = new MutationObserver(() => {
          if (this._isHiding) return; // do not auto-restore during intentional hide
          this._restoreIfDetached();
        });
        this._mutObserver.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
      } catch (e) {
        // ignore if observer can't start
      }
    }

    _restoreIfDetached() {
      if (
        this.inspector &&
        !document.documentElement.contains(this.inspector)
      ) {
        document.body.appendChild(this.inspector);
        this.inspector.style.setProperty("display", "block", "important");
        this.inspector.style.zIndex = "2147483648";
      }
      if (
        this.connector &&
        !document.documentElement.contains(this.connector)
      ) {
        document.body.appendChild(this.connector);
      }
    }

    destroy() {
      // Clean up all resources
      this.events.cleanup();
      this.focus.cleanup();

      // Clean up inspector elements
      if (this.inspector) {
        this.inspector.remove();
        this.inspector = null;
      }
      if (this.connector) {
        this.connector.remove();
        this.connector = null;
      }

      // Clean up observers
      if (this._mutObserver) {
        this._mutObserver.disconnect();
        this._mutObserver = null;
      }

      // Clean up scroll handler
      if (this._scrollHandler) {
        window.removeEventListener("scroll", this._scrollHandler, true);
        this._scrollHandler = null;
      }
    }

    /**
     * Lightweight djb2 hash returning a compact base36 string.
     */
    _djb2Hash(str) {
      let h = 5381;
      for (let i = 0; i < str.length; i++) {
        h = (h * 33) ^ str.charCodeAt(i);
      }
      // >>>0 to ensure unsigned 32-bit, then present in base36 for compactness
      return (h >>> 0).toString(36);
    }

    /**
     * Deterministic serializer for signature components. Uses utils.deepUnwrap
     * when available to convert AX values to readable primitives and sorts
     * object keys to ensure deterministic output.
     */
    _serializeForSignature(v) {
      try {
        if (v === null || v === undefined) return "";
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
        if (Array.isArray(v)) return v.map((x) => this._serializeForSignature(x)).join(",");

        // Try using deepUnwrap to get readable values from AX wrappers
        if (utils && typeof utils.deepUnwrap === "function") {
          try {
            const u = utils.deepUnwrap(v);
            if (u === null || u === undefined) return "";
            if (typeof u === "string" || typeof u === "number" || typeof u === "boolean") return String(u);
            // If deepUnwrap produced an array or object, fall through to object handling below
            v = u;
          } catch (e) {
            // ignore and continue
          }
        }

        if (typeof v === "object") {
          const keys = Object.keys(v).sort();
          return keys.map((k) => `${k}:${this._serializeForSignature(v[k])}`).join(",");
        }

        return String(v);
      } catch (e) {
        return "";
      }
    }

    _generateRenderSignature(info, target, options) {
      options = options || {};

      // Build a deterministic, compact raw signature string using readable pieces
      const parts = [];

      if (info) {
        parts.push(this._serializeForSignature(info.name));
        parts.push(this._serializeForSignature(info.role));
        parts.push(this._serializeForSignature(info.description));

        // Active descendant: prefer its name if available
        try {
          if (info.activeDescendant && info.activeDescendant.name) {
            parts.push(this._serializeForSignature(info.activeDescendant.name));
          } else {
            parts.push(this._serializeForSignature(info.activeDescendant));
          }
        } catch (e) {
          parts.push("");
        }

        parts.push(this._serializeForSignature(info.value));
        parts.push(this._serializeForSignature(info.states));
        parts.push(this._serializeForSignature(info.properties));
      } else {
        parts.push("null");
      }

      const targetKey = target ? `${target.tagName || ''}-${target.id || ''}-${target.className || ''}` : 'null';
      const optionsKey = `${options.enabled ? '1' : '0'}|${this.miniMode ? '1' : '0'}|${options.correlationId || ''}`;

      const raw = `${parts.join('|')}|${targetKey}|${optionsKey}`;
      return this._djb2Hash(raw);
    }
  }

  // Initialize global namespace
  if (!window.NexusInspector) {
    window.NexusInspector = {};
  }

  // Export the InspectorCore class
  window.NexusInspector.Core = InspectorCore;

  // Diagnostic helper (exposed globally so tests / devs can run it on demand)
  try {
    window.__nexus_inspectorDiagnostic = async function (targetElOrSelector) {
      try {
        let target = targetElOrSelector;
        if (typeof targetElOrSelector === 'string') target = document.querySelector(targetElOrSelector) || document.getElementById(targetElOrSelector);
        if (!target) {
          // try to pick the element referenced by the existing inspector
          const insp = document.querySelector('#nexus-accessibility-ui-inspector') || document.querySelector('.nexus-accessibility-ui-inspector');
          if (insp) {
            const ac = insp.getAttribute('aria-controls');
            if (ac) target = document.getElementById(ac);
          }
        }
        if (!target) return { error: 'no target resolved' };
        if (!window.ContentExtension || !window.ContentExtension.accessibility || !window.ContentExtension.accessibility.getAccessibleInfo) {
          return { error: 'ContentExtension.accessibility.getAccessibleInfo not available' };
        }
        const ax = await window.ContentExtension.accessibility.getAccessibleInfo(target, true);
        // Reuse content generation functions to render preview strings
        const srPreview = (window.NexusInspector && window.NexusInspector.Content && typeof window.NexusInspector.Content.getScreenReaderOutput === 'function') ? window.NexusInspector.Content.getScreenReaderOutput(ax) : null;
        const propertiesList = (window.NexusInspector && window.NexusInspector.Content && typeof window.NexusInspector.Content.getPropertiesList === 'function') ? window.NexusInspector.Content.getPropertiesList(ax) : null;
        const out = { targetSummary: { tagName: target.tagName, id: target.id }, ax, srPreview, propertiesList };
        // persist the diagnostic into the global logs
        try {
          window.__nexus_inspectorLogs = window.__nexus_inspectorLogs || [];
          const maxLogs = (window.NEXUS_TESTING_MODE && window.NEXUS_TESTING_MODE.maxInspectorLogs) || 2000;
          window.__nexus_inspectorLogs.push({ timestamp: Date.now(), iso: new Date().toISOString(), target: out.targetSummary, ax: out.ax, srPreview: out.srPreview, propertiesList: out.propertiesList });
          if (window.__nexus_inspectorLogs.length > maxLogs) {
            window.__nexus_inspectorLogs.splice(0, window.__nexus_inspectorLogs.length - maxLogs);
          }
        } catch (e) {}
        return out;
      } catch (e) {
        return { error: String(e) };
      }
    };
  } catch (e) {
    // ignore
  }

  // Helpers to access/clear the in-page diagnostics
  try {
    window.__nexus_getInspectorLogs = function () {
      return window.__nexus_inspectorLogs || [];
    };
    window.__nexus_clearInspectorLogs = function () {
      window.__nexus_inspectorLogs = [];
    };
  } catch (e) {
    // ignore
  }

  // Bridge: allow page context (regular page console) to call these helpers.
  // Content scripts run in an isolated world; exposing window.* directly above
  // doesn't make them callable from the page. We use window.postMessage as a
  // secure bridge: inject a small page script that posts requests, and listen
  // here in the content script to respond. Make the injection robust by
  // retrying if DOM isn't ready and exposing lightweight stubs immediately
  // so the console won't show "not a function" if called early.
  try {
    // 1) Content-script side: message handler that replies to page requests.
    window.addEventListener('message', async function __nexus_inspector_message_handler(event) {
      try {
        // Only accept messages from the same window (page)
        if (!event || event.source !== window) return;
        const msg = event.data;
        if (!msg || msg.__nexus_inspector_bridge !== true) return;

        const { action, requestId, args } = msg;
        if (!requestId) return;

        if (action === 'getLogs') {
          const payload = window.__nexus_inspectorLogs || [];
          window.postMessage({ __nexus_inspector_bridge: true, direction: 'from-content', requestId, action, payload }, '*');
          return;
        }
        if (action === 'clearLogs') {
          window.__nexus_inspectorLogs = [];
          window.postMessage({ __nexus_inspector_bridge: true, direction: 'from-content', requestId, action, payload: { ok: true } }, '*');
          return;
        }
        if (action === 'diagnostic') {
          // args[0] may be a selector or element descriptor
          let result = { error: 'diagnostic helper not available' };
          if (typeof window.__nexus_inspectorDiagnostic === 'function') {
            try {
              result = await window.__nexus_inspectorDiagnostic.apply(null, args || []);
            } catch (e) {
              result = { error: String(e) };
            }
          }
          window.postMessage({ __nexus_inspector_bridge: true, direction: 'from-content', requestId, action, payload: result }, '*');
          return;
        }
      } catch (err) {
        try { console.warn('[NEXUS] inspector bridge handler error', err); } catch (e) {}
      }
    }, false);

  // 2) Page-side stub installer: ensure the page sees functions immediately.
    const pageScriptContent = `(() => {
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

      // Define stubs that will use postMessage. These are safe to overwrite
      // later if the content script wants to provide different behavior.
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
        // Mark the bridge as installed on the page
        try { window.__nexus_inspector_bridge_installed = true; } catch (e) {}
      } catch (e) {
        // swallow errors in page script
      }
    })();`;

    function injectBridgeOnce() {
      try {
        if (document.querySelector && document.querySelector('script[data-nexus-inspector-bridge]')) return true;
        const parent = document.documentElement || document.head || document.body;
        if (!parent) return false;
        // Try injecting external bridge script via runtime URL to satisfy CSP
        try {
          const bridgeSrc = chrome.runtime.getURL('src/components/inspector/inspector-bridge.js');
          const bridgeScript = document.createElement('script');
          bridgeScript.setAttribute('data-nexus-inspector-bridge', '1');
          bridgeScript.src = bridgeSrc;
          bridgeScript.async = false;
          parent.appendChild(bridgeScript);
          // Do not remove immediately; let browser execute external script
          return true;
        } catch (e) {
          // Fallback to inline injection if runtime URL injection fails
          const bridgeScript = document.createElement('script');
          bridgeScript.setAttribute('data-nexus-inspector-bridge', '1');
          bridgeScript.textContent = pageScriptContent;
          parent.appendChild(bridgeScript);
          bridgeScript.parentNode && bridgeScript.parentNode.removeChild(bridgeScript);
          return true;
        }
      } catch (e) {
        return false;
      }
    }

  // Try immediate injection, then schedule retries on DOMContentLoaded and load
    if (!injectBridgeOnce()) {
      document.addEventListener('DOMContentLoaded', function _nexusBridgeDOMContent() {
        injectBridgeOnce();
        document.removeEventListener('DOMContentLoaded', _nexusBridgeDOMContent);
      });
      window.addEventListener('load', function _nexusBridgeOnLoad() {
        injectBridgeOnce();
        window.removeEventListener('load', _nexusBridgeOnLoad);
      });
      // Also attempt a few timed retries in case the page is slow to create root nodes
      let retries = 0;
      const retryInterval = setInterval(() => {
        if (injectBridgeOnce() || retries++ > 6) clearInterval(retryInterval);
      }, 300);
    }
    // Announce readiness so the page can detect the content-script bridge is active.
    try {
      window.postMessage({ __nexus_inspector_bridge: true, direction: 'from-content', action: 'bridgeReady' }, '*');
    } catch (e) {}
  } catch (e) {
    // ignore bridge installation failures
  }
})();
