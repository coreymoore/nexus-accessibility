/**
 * Security Utilities
 * Priority 3: Security improvements and input validation
 * 
 * Provides security utilities for validating inputs, sanitizing data,
 * and preventing common security issues in the extension.
 */

import { logger } from "./logger.js";

class SecurityUtils {
  constructor() {
    this.log = logger.security || logger.background;
    
    // Trusted domains for cross-origin operations
    this.trustedOrigins = new Set([
      'https://www.w3.org',
      'https://developer.mozilla.org',
      'https://webaim.org',
    ]);

    // Maximum allowed string lengths
    this.limits = {
      maxSelectorLength: 1000,
      maxMessageSize: 10000,
      maxCacheKeyLength: 500,
      maxLogMessageLength: 5000,
    };
  }

  /**
   * Validate CSS selector for security issues
   * @param {string} selector - CSS selector to validate
   * @returns {Object} Validation result
   */
  validateSelector(selector) {
    if (typeof selector !== 'string') {
      return { valid: false, reason: 'Selector must be a string' };
    }

    if (selector.length === 0) {
      return { valid: false, reason: 'Selector cannot be empty' };
    }

    if (selector.length > this.limits.maxSelectorLength) {
      return { 
        valid: false, 
        reason: `Selector too long (${selector.length} > ${this.limits.maxSelectorLength})` 
      };
    }

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /<script/i,
      /expression\s*\(/i,
      /import\s*\(/i,
      /eval\s*\(/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(selector)) {
        return { 
          valid: false, 
          reason: `Selector contains potentially dangerous pattern: ${pattern}` 
        };
      }
    }

    // Try to parse as CSS selector
    try {
      // Use a dummy element to validate the selector
      if (typeof document !== 'undefined') {
        document.createElement('div').querySelector(selector);
      }
    } catch (error) {
      return { 
        valid: false, 
        reason: `Invalid CSS selector syntax: ${error.message}` 
      };
    }

    return { valid: true };
  }

  /**
   * Sanitize text content for safe display
   * @param {string} text - Text to sanitize
   * @param {number} maxLength - Maximum allowed length
   * @returns {string} Sanitized text
   */
  sanitizeText(text, maxLength = this.limits.maxLogMessageLength) {
    if (typeof text !== 'string') {
      return String(text).substring(0, maxLength);
    }

    // Remove potential script content
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      .substring(0, maxLength);
  }

  /**
   * Validate URL for cross-origin requests
   * @param {string} url - URL to validate
   * @returns {Object} Validation result
   */
  validateUrl(url) {
    if (typeof url !== 'string') {
      return { valid: false, reason: 'URL must be a string' };
    }

    try {
      const urlObj = new URL(url);
      
      // Only allow HTTPS and HTTP
      if (!['https:', 'http:'].includes(urlObj.protocol)) {
        return { 
          valid: false, 
          reason: `Unsupported protocol: ${urlObj.protocol}` 
        };
      }

      // Check against trusted origins for sensitive operations
      const origin = urlObj.origin;
      const isTrusted = this.trustedOrigins.has(origin);

      return { 
        valid: true, 
        trusted: isTrusted,
        origin,
        protocol: urlObj.protocol,
      };
    } catch (error) {
      return { 
        valid: false, 
        reason: `Invalid URL: ${error.message}` 
      };
    }
  }

  /**
   * Validate message data for size and content
   * @param {any} data - Data to validate
   * @returns {Object} Validation result
   */
  validateMessageData(data) {
    try {
      const serialized = JSON.stringify(data);
      
      if (serialized.length > this.limits.maxMessageSize) {
        return {
          valid: false,
          reason: `Message too large (${serialized.length} > ${this.limits.maxMessageSize} bytes)`,
        };
      }

      // Check for potential code injection in string values
      const checkObject = (obj, path = '') => {
        if (typeof obj === 'string') {
          const sanitized = this.sanitizeText(obj);
          if (sanitized !== obj) {
            return {
              valid: false,
              reason: `Potentially unsafe content detected at ${path}`,
            };
          }
        } else if (typeof obj === 'object' && obj !== null) {
          for (const [key, value] of Object.entries(obj)) {
            const result = checkObject(value, `${path}.${key}`);
            if (!result.valid) {
              return result;
            }
          }
        }
        return { valid: true };
      };

      const contentCheck = checkObject(data);
      if (!contentCheck.valid) {
        return contentCheck;
      }

      return { valid: true, size: serialized.length };
    } catch (error) {
      return {
        valid: false,
        reason: `Serialization error: ${error.message}`,
      };
    }
  }

  /**
   * Create a secure cache key from user input
   * @param {string} input - Input to create cache key from
   * @returns {string} Secure cache key
   */
  createSecureCacheKey(input) {
    if (typeof input !== 'string') {
      input = String(input);
    }

    // Sanitize and limit length
    const sanitized = this.sanitizeText(input, this.limits.maxCacheKeyLength);
    
    // Create a hash for very long inputs to ensure consistent key length
    if (sanitized.length > 200) {
      // Simple hash for cache key (not cryptographic)
      let hash = 0;
      for (let i = 0; i < sanitized.length; i++) {
        const char = sanitized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return `${sanitized.substring(0, 150)}_${Math.abs(hash).toString(36)}`;
    }

    return sanitized;
  }

  /**
   * Validate tab ID for security
   * @param {number} tabId - Chrome tab ID
   * @returns {Object} Validation result
   */
  validateTabId(tabId) {
    if (typeof tabId !== 'number' || !Number.isInteger(tabId)) {
      return { valid: false, reason: 'Tab ID must be an integer' };
    }

    if (tabId < 0) {
      return { valid: false, reason: 'Tab ID must be positive' };
    }

    if (tabId > Number.MAX_SAFE_INTEGER) {
      return { valid: false, reason: 'Tab ID too large' };
    }

    return { valid: true };
  }

  /**
   * Check if frame ID is valid
   * @param {number} frameId - Chrome frame ID
   * @returns {Object} Validation result
   */
  validateFrameId(frameId) {
    if (typeof frameId !== 'number' || !Number.isInteger(frameId)) {
      return { valid: false, reason: 'Frame ID must be an integer' };
    }

    if (frameId < 0) {
      return { valid: false, reason: 'Frame ID must be non-negative' };
    }

    return { valid: true };
  }

  /**
   * Log security event for monitoring
   * @param {string} event - Event type
   * @param {Object} details - Event details
   * @param {string} severity - Severity level
   */
  logSecurityEvent(event, details = {}, severity = 'warn') {
    this.log[severity](`Security event: ${event}`, {
      event,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  /**
   * Rate limiter for operations
   */
  createRateLimiter(maxRequests = 100, windowMs = 60000) {
    const requests = new Map();
    
    return (identifier) => {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Clean old entries
      for (const [id, timestamps] of requests) {
        const filtered = timestamps.filter(t => t > windowStart);
        if (filtered.length === 0) {
          requests.delete(id);
        } else {
          requests.set(id, filtered);
        }
      }
      
      // Check rate limit
      const userRequests = requests.get(identifier) || [];
      if (userRequests.length >= maxRequests) {
        this.logSecurityEvent('rate_limit_exceeded', { 
          identifier, 
          requestCount: userRequests.length 
        });
        return false;
      }
      
      // Record this request
      userRequests.push(now);
      requests.set(identifier, userRequests);
      return true;
    };
  }
}

// Create global security utils instance
const securityUtils = new SecurityUtils();

// Add rate limiter for debugger operations
const debuggerRateLimit = securityUtils.createRateLimiter(50, 60000); // 50 ops per minute per tab

export { SecurityUtils };
export const security = securityUtils;
export { debuggerRateLimit };
