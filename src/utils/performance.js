/**
 * Performance Monitoring Utilities
 * Priority 3: Performance improvements and monitoring
 * 
 * Provides tools for monitoring extension performance, memory usage,
 * and operation timing to ensure the extension meets performance targets.
 */

import { logger } from "./logger.js";

class PerformanceMonitor {
  constructor() {
    this.log = logger.performance || logger.background;
    this.metrics = new Map();
    this.timers = new Map();
    this.memoryBaseline = null;
    
    // Track performance thresholds
    this.thresholds = {
      tooltipDisplay: 100, // ms - target for tooltip display
      debuggerAttach: 2000, // ms - maximum for debugger attachment
      axTreeRetrieval: 1000, // ms - maximum for accessibility tree retrieval
      nodeQuery: 500, // ms - maximum for DOM node queries
    };
  }

  /**
   * Start timing an operation
   * @param {string} label - Operation label
   * @param {number} threshold - Optional threshold in ms
   */
  startTimer(label, threshold = null) {
    const timer = {
      start: performance.now(),
      threshold: threshold || this.thresholds[label],
      label,
    };
    this.timers.set(label, timer);
    this.log.debug(`Started timer: ${label}`);
    return timer;
  }

  /**
   * End timing an operation and log results
   * @param {string} label - Operation label
   * @returns {number} Duration in milliseconds
   */
  endTimer(label) {
    const timer = this.timers.get(label);
    if (!timer) {
      this.log.warn(`Timer not found: ${label}`);
      return 0;
    }

    const duration = performance.now() - timer.start;
    this.timers.delete(label);

    // Store metric
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    const metrics = this.metrics.get(label);
    metrics.push(duration);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }

    // Check threshold
    const isSlowOperation = timer.threshold && duration > timer.threshold;
    const level = isSlowOperation ? "warn" : "debug";
    
    this.log[level](`Timer ended: ${label}`, {
      duration: `${duration.toFixed(2)}ms`,
      threshold: timer.threshold ? `${timer.threshold}ms` : "none",
      exceedsThreshold: isSlowOperation,
    });

    return duration;
  }

  /**
   * Measure an async operation
   * @param {string} label - Operation label
   * @param {Function} operation - Async function to measure
   * @param {number} threshold - Optional threshold in ms
   * @returns {Promise<any>} Result of the operation
   */
  async measure(label, operation, threshold = null) {
    this.startTimer(label, threshold);
    try {
      const result = await operation();
      this.endTimer(label);
      return result;
    } catch (error) {
      this.endTimer(label);
      this.log.error(`Operation failed: ${label}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Get performance statistics for an operation
   * @param {string} label - Operation label
   * @returns {Object} Statistics object
   */
  getStats(label) {
    const measurements = this.metrics.get(label);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((a, b) => a + b, 0);
    
    return {
      count: measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      mean: sum / measurements.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  /**
   * Record memory usage baseline
   */
  recordMemoryBaseline() {
    if (typeof performance.memory !== 'undefined') {
      this.memoryBaseline = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        timestamp: Date.now(),
      };
      this.log.debug("Memory baseline recorded", this.memoryBaseline);
    }
  }

  /**
   * Check current memory usage against baseline
   * @returns {Object} Memory usage information
   */
  checkMemoryUsage() {
    if (typeof performance.memory === 'undefined') {
      return { error: "Memory API not available" };
    }

    const current = {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
      timestamp: Date.now(),
    };

    const result = { current };

    if (this.memoryBaseline) {
      const growth = current.used - this.memoryBaseline.used;
      const growthPercent = (growth / this.memoryBaseline.used) * 100;
      const timeElapsed = current.timestamp - this.memoryBaseline.timestamp;

      result.baseline = this.memoryBaseline;
      result.growth = {
        bytes: growth,
        percent: growthPercent,
        timeElapsed,
        ratePerMinute: (growth / timeElapsed) * 60000,
      };

      // Warn if memory growth exceeds 50MB or 50%
      if (growth > 50 * 1024 * 1024 || growthPercent > 50) {
        this.log.warn("High memory growth detected", result.growth);
      }
    }

    return result;
  }

  /**
   * Generate a performance report
   * @returns {Object} Performance report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: {},
      memory: this.checkMemoryUsage(),
      thresholds: this.thresholds,
    };

    // Include stats for all tracked operations
    for (const [label] of this.metrics) {
      report.metrics[label] = this.getStats(label);
    }

    return report;
  }

  /**
   * Log a performance summary
   */
  logSummary() {
    const report = this.generateReport();
    this.log.info("Performance Summary", report);
    
    // Check for performance issues
    const issues = [];
    for (const [operation, stats] of Object.entries(report.metrics)) {
      if (stats && this.thresholds[operation]) {
        const threshold = this.thresholds[operation];
        if (stats.p95 > threshold) {
          issues.push(`${operation}: P95 ${stats.p95.toFixed(2)}ms > ${threshold}ms threshold`);
        }
      }
    }

    if (issues.length > 0) {
      this.log.warn("Performance issues detected", { issues });
    } else {
      this.log.info("All operations within performance thresholds");
    }
  }

  /**
   * Reset all performance data
   */
  reset() {
    this.metrics.clear();
    this.timers.clear();
    this.memoryBaseline = null;
    this.log.info("Performance monitoring data reset");
  }
}

// Create global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

// Set up periodic memory monitoring in service worker
if (typeof chrome !== 'undefined' && chrome.alarms) {
  // Check memory usage every 5 minutes
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'nexus-memory-check') {
      performanceMonitor.checkMemoryUsage();
    }
  });

  // Create periodic alarm for memory monitoring
  chrome.alarms.create('nexus-memory-check', { 
    delayInMinutes: 5, 
    periodInMinutes: 5 
  });
}

export { PerformanceMonitor };
export const performance = performanceMonitor;
