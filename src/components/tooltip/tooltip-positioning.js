/**
 * Tooltip Positioning Module
 *
 * Handles tooltip positioning, connector line creation, and repositioning logic.
 * Manages the visual relationship between tooltip and target elements.
 *
 * Dependencies:
 * - tooltip-utils.js (for geometric calculations)
 *
 * Global API: window.NexusTooltip.Positioning
 */

(function () {
  "use strict";

  // Access utilities
  const utils = window.NexusTooltip.Utils;

  /**
   * Positioning manager for tooltips and connectors
   */
  class PositioningManager {
    constructor(tooltipCore) {
      this.core = tooltipCore;
    }

    /**
     * Position tooltip relative to target element
     * @param {Element} target - Target element to position relative to
     */
    positionTooltip(target) {
      if (!this.core.tooltip || !target) return;

      const rect = target.getBoundingClientRect();
      const margin = this.core._margin;
      const spaceAbove = rect.top - margin;
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const placeBelow = spaceBelow >= spaceAbove;

      // Set max height based on available space
      this.core.tooltip.style.maxHeight = `${Math.max(
        0,
        placeBelow ? spaceBelow : spaceAbove
      )}px`;

      const tooltipRect = this.core.tooltip.getBoundingClientRect();
      const topAbs = placeBelow
        ? window.scrollY + rect.bottom + margin
        : window.scrollY + rect.top - tooltipRect.height - margin;

      let leftAbs = window.scrollX + rect.right + margin;

      // Adjust if tooltip would go off right edge
      if (leftAbs + tooltipRect.width > window.scrollX + window.innerWidth) {
        leftAbs = window.scrollX + rect.left - tooltipRect.width - margin;
      }

      // Ensure tooltip stays within viewport
      leftAbs = Math.max(
        window.scrollX,
        Math.min(
          leftAbs,
          window.scrollX + window.innerWidth - tooltipRect.width
        )
      );

      this.core.tooltip.style.top = `${topAbs}px`;
      this.core.tooltip.style.left = `${leftAbs}px`;
    }

    /**
     * Position tooltip and create connector line
     * @param {Element} target - Target element to connect to
     */
    positionTooltipWithConnector(target) {
      if (!this.core.tooltip || !target) return;

      const rect = target.getBoundingClientRect();
      const tooltipRect = this.core.tooltip.getBoundingClientRect();
      const margin = this.core._margin;

      // Calculate initial position
      let top = window.scrollY + rect.bottom + margin;
      let left = window.scrollX + rect.right + margin;

      // Adjust if tooltip would go off bottom edge
      if (top + tooltipRect.height > window.scrollY + window.innerHeight) {
        top = window.scrollY + rect.top - tooltipRect.height - margin;
      }

      // Adjust if tooltip would go off right edge
      if (left + tooltipRect.width > window.scrollX + window.innerWidth) {
        left = window.scrollX + rect.left - tooltipRect.width - margin;
      }

      // Ensure tooltip stays within viewport bounds
      top = Math.max(
        window.scrollY,
        Math.min(top, window.scrollY + window.innerHeight - tooltipRect.height)
      );
      left = Math.max(
        window.scrollX,
        Math.min(left, window.scrollX + window.innerWidth - tooltipRect.width)
      );

      // Update tooltip position
      this.core.tooltip.style.position = "fixed";
      this.core.tooltip.style.top = `${top - window.scrollY}px`;
      this.core.tooltip.style.left = `${left - window.scrollX}px`;

      // Create connector line
      this.createConnector(target, {
        left,
        top,
        width: tooltipRect.width,
        height: tooltipRect.height,
      });
    }

    /**
     * Create SVG connector line between tooltip and target
     * @param {Element} target - Target element
     * @param {Object} tooltipBounds - Tooltip position and dimensions
     */
    createConnector(target, tooltipBounds) {
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
      const tooltipRectAbs = {
        left: tooltipBounds.left,
        right: tooltipBounds.left + tooltipBounds.width,
        top: tooltipBounds.top,
        bottom: tooltipBounds.top + tooltipBounds.height,
        width: tooltipBounds.width,
        height: tooltipBounds.height,
      };

      const elemRectAbs = {
        left: window.scrollX + rect.left,
        right: window.scrollX + rect.right,
        top: window.scrollY + rect.top,
        bottom: window.scrollY + rect.bottom,
        width: rect.width,
        height: rect.height,
      };

      let [tooltipEdge, elemEdge] = utils.getClosestEdgePoint(
        tooltipRectAbs,
        elemRectAbs
      );

      // Extend line endpoints slightly for better visual connection
      const dx = elemEdge.x - tooltipEdge.x;
      const dy = elemEdge.y - tooltipEdge.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const extension = 4;

      tooltipEdge = {
        x: tooltipEdge.x - (dx / distance) * extension,
        y: tooltipEdge.y - (dy / distance) * extension,
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
      borderLine.setAttribute("x1", tooltipEdge.x);
      borderLine.setAttribute("y1", tooltipEdge.y);
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
      mainLine.setAttribute("x1", tooltipEdge.x);
      mainLine.setAttribute("y1", tooltipEdge.y);
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
     * Reposition tooltip and connector (used for scroll/resize events)
     * @param {Element} target - Target element to reposition relative to
     */
    repositionTooltipAndConnector(target) {
      if (!this.core.tooltip || !target) return;

      // Recalculate position and connector
      const rect = target.getBoundingClientRect();
      const tooltipRect = this.core.tooltip.getBoundingClientRect();
      const margin = 16;

      // Calculate available space above and below the element
      const spaceAbove = rect.top - margin;
      const spaceBelow = window.innerHeight - rect.bottom - margin;

      let top, left;
      if (spaceBelow >= tooltipRect.height || spaceBelow > spaceAbove) {
        top = window.scrollY + rect.bottom + margin;
      } else {
        top = window.scrollY + rect.top - tooltipRect.height - margin;
      }

      left = window.scrollX + rect.right + margin;
      if (left + tooltipRect.width > window.scrollX + window.innerWidth) {
        left = window.scrollX + rect.left - tooltipRect.width - margin;
      }

      top = Math.max(
        window.scrollY,
        Math.min(top, window.scrollY + window.innerHeight - tooltipRect.height)
      );
      left = Math.max(
        window.scrollX,
        Math.min(left, window.scrollX + window.innerWidth - tooltipRect.width)
      );

      this.core.tooltip.style.top = `${top - window.scrollY}px`;
      this.core.tooltip.style.left = `${left - window.scrollX}px`;

      // Reposition connector
      this.updateConnectorPosition(target, {
        left,
        top,
        width: tooltipRect.width,
        height: tooltipRect.height,
      });
    }

    /**
     * Update connector line position without recreating
     * @param {Element} target - Target element
     * @param {Object} tooltipBounds - Tooltip position and dimensions
     */
    updateConnectorPosition(target, tooltipBounds) {
      if (!this.core.connector) return;

      const rect = target.getBoundingClientRect();
      const tooltipRectAbs = {
        left: tooltipBounds.left,
        right: tooltipBounds.left + tooltipBounds.width,
        top: tooltipBounds.top,
        bottom: tooltipBounds.top + tooltipBounds.height,
        width: tooltipBounds.width,
        height: tooltipBounds.height,
      };

      const elemRectAbs = {
        left: window.scrollX + rect.left,
        right: window.scrollX + rect.right,
        top: window.scrollY + rect.top,
        bottom: window.scrollY + rect.bottom,
        width: rect.width,
        height: rect.height,
      };

      let [tooltipEdge, elemEdge] = utils.getClosestEdgePoint(
        tooltipRectAbs,
        elemRectAbs
      );

      const dx = elemEdge.x - tooltipEdge.x;
      const dy = elemEdge.y - tooltipEdge.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const extension = 4;

      tooltipEdge = {
        x: tooltipEdge.x - (dx / distance) * extension,
        y: tooltipEdge.y - (dy / distance) * extension,
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
        borderLine.setAttribute("x1", tooltipEdge.x);
        borderLine.setAttribute("y1", tooltipEdge.y);
        borderLine.setAttribute("x2", elemEdge.x);
        borderLine.setAttribute("y2", elemEdge.y);

        mainLine.setAttribute("x1", tooltipEdge.x);
        mainLine.setAttribute("y1", tooltipEdge.y);
        mainLine.setAttribute("x2", elemEdge.x);
        mainLine.setAttribute("y2", elemEdge.y);
      }
    }
  }

  // Initialize global namespace
  if (!window.NexusTooltip) {
    window.NexusTooltip = {};
  }

  // Export positioning manager
  window.NexusTooltip.Positioning = {
    PositioningManager: PositioningManager,
  };
})();
