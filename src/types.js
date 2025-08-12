/**
 * @typedef {Object} AccessibilityInfo
 * @property {string} role - ARIA role
 * @property {string} name - Accessible name
 * @property {string} [description] - Accessible description
 * @property {Object.<string, boolean>} states - State properties
 * @property {Object.<string, string>} properties - ARIA properties
 */

/**
 * @typedef {Object} ElementSelector
 * @property {string} selector - CSS selector
 * @property {number} [index] - Element index if multiple matches
 */

/**
 * @typedef {Object} DebuggerConnection
 * @property {number} tabId
 * @property {boolean} attached
 * @property {number} attachedAt
 */

export default {};
