/**
 * Service Worker Scheduler
 * 
 * Replaces setTimeout/setInterval with chrome.alarms for MV3 compatibility.
 * Service workers can be killed and restarted, so persistent timers need alarms.
 */

export class ServiceWorkerScheduler {
  constructor() {
    this.alarmHandlers = new Map();
    this.setupAlarmListener();
  }

  setupAlarmListener() {
    if (chrome.alarms && chrome.alarms.onAlarm) {
      chrome.alarms.onAlarm.addListener((alarm) => {
        const handler = this.alarmHandlers.get(alarm.name);
        if (handler) {
          try {
            handler();
          } catch (error) {
            console.error("Error in alarm handler:", error);
          }
          // Remove one-time handlers
          if (!handler.recurring) {
            this.alarmHandlers.delete(alarm.name);
          }
        }
      });
    }
  }

  /**
   * Schedule a one-time execution
   * @param {string} name - Unique name for the alarm
   * @param {number} delayMs - Delay in milliseconds
   * @param {Function} handler - Function to execute
   */
  schedule(name, delayMs, handler) {
    this.cancel(name);
    
    this.alarmHandlers.set(name, {
      handler,
      recurring: false,
    });
    
    // Chrome alarms minimum delay is 1 minute, use when for shorter delays
    const delayMinutes = Math.max(delayMs / 60000, 0.1);
    
    if (chrome.alarms) {
      chrome.alarms.create(name, { delayInMinutes: delayMinutes });
    }
  }

  /**
   * Schedule a recurring execution
   * @param {string} name - Unique name for the alarm
   * @param {number} intervalMs - Interval in milliseconds
   * @param {Function} handler - Function to execute
   */
  scheduleRecurring(name, intervalMs, handler) {
    this.cancel(name);
    
    this.alarmHandlers.set(name, {
      handler,
      recurring: true,
    });
    
    const periodInMinutes = Math.max(intervalMs / 60000, 1);
    
    if (chrome.alarms) {
      chrome.alarms.create(name, { periodInMinutes });
    }
  }

  /**
   * Cancel a scheduled alarm
   * @param {string} name - Name of the alarm to cancel
   */
  cancel(name) {
    if (chrome.alarms) {
      chrome.alarms.clear(name);
    }
    this.alarmHandlers.delete(name);
  }

  /**
   * Cancel all alarms managed by this scheduler
   */
  cancelAll() {
    for (const name of this.alarmHandlers.keys()) {
      this.cancel(name);
    }
  }

  /**
   * Get list of active alarm names
   */
  getActiveAlarms() {
    return Array.from(this.alarmHandlers.keys());
  }
}

// Global scheduler instance
export const scheduler = new ServiceWorkerScheduler();

// Utility functions for common patterns
export function scheduleDebounced(name, delayMs, handler) {
  scheduler.schedule(name, delayMs, handler);
}

export function scheduleThrottled(name, intervalMs, handler) {
  if (!scheduler.alarmHandlers.has(name)) {
    scheduler.schedule(name, intervalMs, handler);
  }
}
