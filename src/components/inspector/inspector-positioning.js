/**
 * Inspector Positioning Module
 *
 * Handles inspector positioning, connector line creation, and repositioning logic.
 * Manages the visual relationship between inspector and target elements.
 *
 * Dependencies:
 * - inspector-utils.js (for geometric calculations)
 *
 * Global API: window.NexusInspector.Positioning
 */

(function () {
  "use strict";

  // Access utilities
  const utils = window.NexusInspector.Utils;

  /**
   * Positioning manager for inspectors and connectors
   */
  class PositioningManager {
    constructor(inspectorCore) {
      this.core = inspectorCore;
    }

    /**
     * Position inspector relative to target element
     * @param {Element} target - Target element to position relative to
     */
    positionInspector(target) {
      if (!this.core.inspector || !target) return;

      const rect = target.getBoundingClientRect();
      const margin = this.core._margin;
      const spaceAbove = rect.top - margin;
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const placeBelow = spaceBelow >= spaceAbove;

      // Set max height based on available space
      this.core.inspector.style.maxHeight = `${Math.max(
        0,
        placeBelow ? spaceBelow : spaceAbove
      )}px`;

      const inspectorRect = this.core.inspector.getBoundingClientRect();
      const topAbs = placeBelow
        ? window.scrollY + rect.bottom + margin
        : window.scrollY + rect.top - inspectorRect.height - margin;

      let leftAbs = window.scrollX + rect.right + margin;

      // Adjust if inspector would go off right edge
      if (leftAbs + inspectorRect.width > window.scrollX + window.innerWidth) {
        leftAbs = window.scrollX + rect.left - inspectorRect.width - margin;
      }

      // Ensure inspector stays within viewport
      leftAbs = Math.max(
        window.scrollX,
        Math.min(
          leftAbs,
          window.scrollX + window.innerWidth - inspectorRect.width
        )
      );

      this.core.inspector.style.top = `${topAbs}px`;
      this.core.inspector.style.left = `${leftAbs}px`;
    }

    /**
     * Position inspector and create connector line
     * @param {Element} target - Target element to connect to
     */
    positionInspectorWithConnector(target) {
      if (!this.core.inspector || !target) return;

      const rect = target.getBoundingClientRect();
      const inspectorRect = this.core.inspector.getBoundingClientRect();
      const margin = this.core._margin;

      // Calculate initial position
      let top = window.scrollY + rect.bottom + margin;
      let left = window.scrollX + rect.right + margin;

      // Adjust if inspector would go off bottom edge
      if (top + inspectorRect.height > window.scrollY + window.innerHeight) {
        top = window.scrollY + rect.top - inspectorRect.height - margin;
      }

      // Adjust if inspector would go off right edge
      if (left + inspectorRect.width > window.scrollX + window.innerWidth) {
        left = window.scrollX + rect.left - inspectorRect.width - margin;
      }

      // Ensure inspector stays within viewport bounds
      top = Math.max(
        window.scrollY,
        Math.min(top, window.scrollY + window.innerHeight - inspectorRect.height)
      );
      left = Math.max(
        window.scrollX,
        Math.min(left, window.scrollX + window.innerWidth - inspectorRect.width)
      );

      // Update inspector position
      this.core.inspector.style.position = "fixed";
      this.core.inspector.style.top = `${top - window.scrollY}px`;
      this.core.inspector.style.left = `${left - window.scrollX}px`;

      // Create connector line
      this.createConnector(target, {
        left,
        top,
        width: inspectorRect.width,
        height: inspectorRect.height,
      });
    }

    /**
     * Create SVG connector line between inspector and target
     * @param {Element} target - Target element
     * @param {Object} inspectorBounds - Inspector position and dimensions
     */
    createConnector(target, inspectorBounds) {
      // Remove old connector
      if (this.core.connector) {
        this.core.connector.remove();
        this.core.connector = null;
      }

      // Create new connector SVG
      this.core.connector = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      this.core.connector.style.position = "absolute";
      this.core.connector.style.pointerEvents = "none";
      this.core.connector.style.zIndex = "2147483649";
      this.core.connector.style.left = "0";
      this.core.connector.style.top = "0";
      this.core.connector.style.width = "100vw";
      this.core.connector.style.height = "100vh";
      this.core.connector.style.overflow = "visible";

      // Calculate connector line coordinates
      const rect = target.getBoundingClientRect();
      const inspectorRectAbs = {
        left: inspectorBounds.left,
        right: inspectorBounds.left + inspectorBounds.width,
        top: inspectorBounds.top,
        bottom: inspectorBounds.top + inspectorBounds.height,
        width: inspectorBounds.width,
        height: inspectorBounds.height,
      };

      const elemRectAbs = {
        left: window.scrollX + rect.left,
        right: window.scrollX + rect.right,
        top: window.scrollY + rect.top,
        bottom: window.scrollY + rect.bottom,
        width: rect.width,
        height: rect.height,
      };

      let [inspectorEdge, elemEdge] = utils.getClosestEdgePoint(
        inspectorRectAbs,
        elemRectAbs
      );

      // Extend line endpoints slightly for better visual connection
      const dx = elemEdge.x - inspectorEdge.x;
      const dy = elemEdge.y - inspectorEdge.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const extension = 4;

      inspectorEdge = {
        x: inspectorEdge.x - (dx / distance) * extension,
        y: inspectorEdge.y - (dy / distance) * extension,
      };
      elemEdge = {
        x: elemEdge.x + (dx / distance) * extension,
        y: elemEdge.y + (dy / distance) * extension,
      };

      // Create border line (white background)
      const borderLine = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      borderLine.setAttribute("x1", inspectorEdge.x);
      borderLine.setAttribute("y1", inspectorEdge.y);
      borderLine.setAttribute("x2", elemEdge.x);
      borderLine.setAttribute("y2", elemEdge.y);
      borderLine.setAttribute("stroke", "white");
      borderLine.setAttribute("stroke-width", "5");
      borderLine.setAttribute("stroke-linecap", "butt");
      this.core.connector.appendChild(borderLine);

      // Create main line (colored)
      const mainLine = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      mainLine.setAttribute("x1", inspectorEdge.x);
      mainLine.setAttribute("y1", inspectorEdge.y);
      mainLine.setAttribute("x2", elemEdge.x);
      mainLine.setAttribute("y2", elemEdge.y);
      mainLine.setAttribute("stroke", "#683ab7");
      mainLine.setAttribute("stroke-width", "3");
      mainLine.setAttribute("stroke-opacity", "1");
      mainLine.setAttribute("stroke-linecap", "butt");
      this.core.connector.appendChild(mainLine);

      document.body.appendChild(this.core.connector);
    }

    /**
     * Reposition inspector and connector (used for scroll/resize events)
     * @param {Element} target - Target element to reposition relative to
     */
    repositionInspectorAndConnector(target) {
      if (!this.core.inspector || !target) return;

      // Recalculate position and connector
      const rect = target.getBoundingClientRect();
      const inspectorRect = this.core.inspector.getBoundingClientRect();
      const margin = 16;

      // Calculate available space above and below the element
      const spaceAbove = rect.top - margin;
      const spaceBelow = window.innerHeight - rect.bottom - margin;

      let top, left;
      if (spaceBelow >= inspectorRect.height || spaceBelow > spaceAbove) {
        top = window.scrollY + rect.bottom + margin;
      } else {
        top = window.scrollY + rect.top - inspectorRect.height - margin;
      }

      left = window.scrollX + rect.right + margin;
      if (left + inspectorRect.width > window.scrollX + window.innerWidth) {
        left = window.scrollX + rect.left - inspectorRect.width - margin;
      }

      top = Math.max(
        window.scrollY,
        Math.min(top, window.scrollY + window.innerHeight - inspectorRect.height)
      );
      left = Math.max(
        window.scrollX,
        Math.min(left, window.scrollX + window.innerWidth - inspectorRect.width)
      );

      this.core.inspector.style.top = `${top - window.scrollY}px`;
      this.core.inspector.style.left = `${left - window.scrollX}px`;

      // Reposition connector
      this.updateConnectorPosition(target, {
        left,
        top,
        width: inspectorRect.width,
        height: inspectorRect.height,
      });
    }

    /**
     * Update connector line position without recreating
     * @param {Element} target - Target element
     * @param {Object} inspectorBounds - Inspector position and dimensions
     */
    updateConnectorPosition(target, inspectorBounds) {
      if (!this.core.connector) return;

      const rect = target.getBoundingClientRect();
      const inspectorRectAbs = {
        left: inspectorBounds.left,
        right: inspectorBounds.left + inspectorBounds.width,
        top: inspectorBounds.top,
        bottom: inspectorBounds.top + inspectorBounds.height,
        width: inspectorBounds.width,
        height: inspectorBounds.height,
      };

      const elemRectAbs = {
        left: window.scrollX + rect.left,
        right: window.scrollX + rect.right,
        top: window.scrollY + rect.top,
        bottom: window.scrollY + rect.bottom,
        width: rect.width,
        height: rect.height,
      };

      let [inspectorEdge, elemEdge] = utils.getClosestEdgePoint(
        inspectorRectAbs,
        elemRectAbs
      );

      const dx = elemEdge.x - inspectorEdge.x;
      const dy = elemEdge.y - inspectorEdge.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const extension = 4;

      inspectorEdge = {
        x: inspectorEdge.x - (dx / distance) * extension,
        y: inspectorEdge.y - (dy / distance) * extension,
      };
      elemEdge = {
        x: elemEdge.x + (dx / distance) * extension,
        y: elemEdge.y + (dy / distance) * extension,
      };

      // Update connector SVG lines
      const borderLine = this.core.connector.querySelector(
        'line[stroke="white"]'
      );
      const mainLine = this.core.connector.querySelector(
        'line[stroke="#683ab7"]'
      );

      if (borderLine && mainLine) {
        borderLine.setAttribute("x1", inspectorEdge.x);
        borderLine.setAttribute("y1", inspectorEdge.y);
        borderLine.setAttribute("x2", elemEdge.x);
        borderLine.setAttribute("y2", elemEdge.y);

        mainLine.setAttribute("x1", inspectorEdge.x);
        mainLine.setAttribute("y1", inspectorEdge.y);
        mainLine.setAttribute("x2", elemEdge.x);
        mainLine.setAttribute("y2", elemEdge.y);
      }
    }
  }

  // Initialize global namespace
  if (!window.NexusInspector) {
    window.NexusInspector = {};
  }

  // Export positioning manager
  window.NexusInspector.Positioning = {
    PositioningManager: PositioningManager,
  };
})();
