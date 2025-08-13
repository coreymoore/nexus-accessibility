# Content Script Refactoring - Modular Architecture

## Overview

The original `content.js` file has been refactored into 8 modular files, each with a specific responsibility. This improves maintainability, readability, and testability while maintaining full compatibility with direct script inclusion in Chrome extensions.

## New File Structure

### Core Files (Required)

1. **`content-utils.js`** - Utility functions and helpers
   - DOM utilities, element selectors, ARIA helpers
   - Logger and error handler references
   - Debounce/throttle fallbacks
   - Frame coordination utilities

2. **`content-cache.js`** - Cache and performance management
   - WeakMap-based accessibility info caching
   - Timer management for debounced updates
   - In-flight request tracking
   - Pending request cancellation

3. **`content-events.js`** - Event handling and management
   - Focus/blur event listeners
   - Keyboard event handling
   - Value change monitoring
   - Cross-frame message handling

4. **`content-accessibility.js`** - Accessibility data fetching
   - Chrome DevTools Protocol communication
   - Fallback local accessibility computation
   - State normalization and processing
   - Group information computation

5. **`content-observers.js`** - DOM mutation observers
   - Attribute change monitoring
   - ARIA state change detection
   - Observer lifecycle management
   - Memory-safe cleanup

6. **`content-tooltip.js`** - Tooltip display management
   - Integration with tooltip component
   - Cross-frame tooltip coordination
   - Show/hide logic and callbacks
   - Loading state management

7. **`content-main.js`** - Main coordinator and entry point
   - Module initialization and coordination
   - Extension state management
   - Cleanup coordination
   - Error handling and fallbacks

### Optional Files

8. **`content-validation.js`** - Testing and validation utilities
   - Library validation functions
   - Batch accessibility testing
   - Development debugging tools
   - Optional for production use

## Loading Order and Dependencies

### Required Script Loading Order

The scripts must be loaded in this specific order due to dependencies:

```html
<!-- In manifest.json content_scripts or HTML -->
<script src="src/content-utils.js"></script>
<script src="src/content-cache.js"></script>
<script src="src/content-events.js"></script>
<script src="src/content-accessibility.js"></script>
<script src="src/content-observers.js"></script>
<script src="src/content-tooltip.js"></script>
<script src="src/content-validation.js"></script> <!-- Optional -->
<script src="src/content-main.js"></script> <!-- Must be last -->
```

### Dependency Graph

```
content-utils.js (no dependencies)
├── content-cache.js (depends on utils)
├── content-events.js (depends on utils, cache)
├── content-accessibility.js (depends on utils, cache)
├── content-observers.js (depends on utils, cache)
├── content-tooltip.js (depends on utils)
├── content-validation.js (depends on utils, accessibility) [optional]
└── content-main.js (depends on all above)
```

## Architecture Patterns Used

### 1. Namespace Pattern
All modules attach to a global `window.ContentExtension` namespace to avoid conflicts:

```javascript
window.ContentExtension = window.ContentExtension || {};
const CE = window.ContentExtension;
```

### 2. IIFE (Immediately Invoked Function Expression)
Each module is wrapped in an IIFE for encapsulation:

```javascript
(function() {
  'use strict';
  // Module code here
})();
```

### 3. Module Interface Pattern
Each module exports a consistent interface:

```javascript
CE.moduleName = {
  initialize,      // Setup function
  cleanup,         // Cleanup function
  onStateChange,   // State change handler
  // ... public methods
};
```

### 4. Error Isolation
Modules handle their own errors and provide fallbacks to prevent cascade failures.

## Module Responsibilities

### content-utils.js
- **Purpose**: Shared utilities and helpers
- **Key Functions**:
  - `storeElementForCDP()` - Store elements for Chrome DevTools Protocol
  - `getUniqueSelector()` - Generate CSS selectors
  - `getAriaLabel()` - Extract ARIA labels
  - `safeFocus()` - Safe element focusing with fallbacks

### content-cache.js
- **Purpose**: Performance optimization and caching
- **Key Functions**:
  - `getCached()` / `setCached()` - Cache management
  - `createDebouncedUpdate()` - Debounced update functions
  - `setRefetchTimer()` - Timer management
  - `setPendingRequest()` - Request lifecycle tracking

### content-events.js
- **Purpose**: DOM event handling and user interaction
- **Key Functions**:
  - `onFocusIn()` / `onFocusOut()` - Focus management
  - `onKeyDown()` - Keyboard shortcuts (Escape, Shift+Escape)
  - `onValueChanged()` - Form input monitoring
  - `enableEventListeners()` / `disableEventListeners()` - Listener management

### content-accessibility.js
- **Purpose**: Accessibility data retrieval and processing
- **Key Functions**:
  - `getAccessibleInfo()` - Main accessibility info fetching
  - `getLocalAccessibleInfo()` - Fallback local computation
  - `waitForAccessibilityUpdate()` - CDP communication with retry logic
  - `computeGroupInfo()` - Group/fieldset information

### content-observers.js
- **Purpose**: DOM change monitoring
- **Key Functions**:
  - `startObserving()` / `stopObserving()` - Observer lifecycle
  - `handleAttributeMutation()` - ARIA attribute changes
  - `scheduleAttributeUpdate()` - Debounced updates
  - `handleAriaActiveDescendantChange()` - Active descendant tracking

### content-tooltip.js
- **Purpose**: Tooltip display coordination
- **Key Functions**:
  - `showTooltip()` / `hideTooltip()` - Tooltip display
  - `showLoadingTooltip()` - Loading states
  - `handleCrossFrameTooltip()` - Multi-frame coordination
  - `waitForTooltipComponent()` - Component availability checking

### content-main.js
- **Purpose**: Overall coordination and initialization
- **Key Functions**:
  - `initialize()` - Main initialization
  - `updateExtensionState()` - State management
  - `setupCleanup()` - Cleanup coordination
  - `isEnabled()` / `isInitialized()` - State queries

### content-validation.js (Optional)
- **Purpose**: Development and testing utilities
- **Key Functions**:
  - `validateAccessibilityLibraries()` - Library validation
  - `batchValidateAccessibility()` - Batch testing
  - `runValidationSuite()` - Comprehensive testing
  - `testCurrentElement()` - Single element testing

## Integration Points

### External Dependencies
The modules integrate with existing extension components:

1. **Tooltip Component**: `window.chromeAxTooltip` (src/components/tooltip/tooltip.js)
2. **Logger**: `window.logger` or `window.axLogger`
3. **Error Handler**: `window.errorHandler`
4. **Debounce Utilities**: `window.debounceUtils`
5. **Accessibility Libraries**: `window.DOMAccessibilityAPI`, `window.AriaQuery`

### Chrome Extension APIs
- `chrome.runtime.sendMessage()` - Background script communication
- `chrome.storage.sync` - Settings persistence
- `chrome.runtime.onMessage` - Message handling

## Migration Notes

### From Original content.js
1. **No Breaking Changes**: All functionality preserved
2. **Same Public API**: External integrations remain unchanged
3. **Enhanced Error Handling**: Better isolation and fallbacks
4. **Improved Performance**: Better caching and debouncing
5. **Better Testability**: Modular design allows unit testing

### Configuration Changes Required

#### manifest.json Update
```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": [
      "src/content-utils.js",
      "src/content-cache.js", 
      "src/content-events.js",
      "src/content-accessibility.js",
      "src/content-observers.js",
      "src/content-tooltip.js",
      "src/content-validation.js",
      "src/content-main.js"
    ]
  }]
}
```

#### Remove Original content.js
The original `content.js` file should be removed and replaced with the new modular files.

## Benefits of Refactoring

### Maintainability
- **Single Responsibility**: Each module has one clear purpose
- **Easier Debugging**: Issues isolated to specific modules
- **Cleaner Code**: Smaller, focused files are easier to understand

### Performance
- **Better Caching**: Improved cache management and cleanup
- **Efficient Debouncing**: Centralized debouncing logic
- **Memory Management**: Proper WeakMap usage and cleanup

### Testing
- **Unit Testing**: Each module can be tested independently
- **Mocking**: Easy to mock dependencies between modules
- **Validation Tools**: Built-in validation and testing utilities

### Extensibility
- **Plugin Architecture**: Easy to add new modules
- **Feature Flags**: Optional modules like validation
- **API Stability**: Clear interfaces between modules

## Troubleshooting

### Common Issues

1. **Module Not Found Errors**
   - Ensure correct loading order
   - Check all required files are included
   - Verify file paths in manifest.json

2. **Initialization Failures**
   - Check browser console for error messages
   - Verify external dependencies are loaded
   - Check for missing permissions

3. **Performance Issues**
   - Monitor cache statistics via `CE.cache.getStats()`
   - Check observer counts via `CE.observers.getObserverStats()`
   - Use validation tools to identify bottlenecks

### Debug Commands

Available in browser console when validation module is loaded:

```javascript
// Test current focused element
CE.validation.testCurrentElement()

// Batch test multiple elements
CE.validation.batchValidateAccessibility('button, input')

// Run comprehensive validation
CE.validation.runValidationSuite()

// Check module status
CE.main.isInitialized()
CE.main.isEnabled()

// Get statistics
CE.cache.getStats()
CE.observers.getObserverStats()
```

This modular architecture provides a solid foundation for the accessibility extension while maintaining full compatibility with Chrome extension requirements and direct script inclusion patterns.
