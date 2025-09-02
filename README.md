![Nexus Logo](nexus-logo.svg)

# Nexus Accessibility Testing Toolkit

A Chrome extension for real-time accessibility inspection and testing. This toolkit provides developers and QA teams with instant feedback about accessibility properties, ARIA attributes, and screen reader output of any focused element.

This is an early release and not feature complete.

## Known Issues

**Recent Improvements (Latest Refactoring):**

- ✅ Fixed memory leaks from duplicate message listeners
- ✅ Implemented Chrome API promise wrappers to prevent race conditions
- ✅ Added smart caching with TTL and LRU eviction
- ✅ Enhanced error handling and recovery with automatic retry logic
- ✅ Improved MV3 compatibility with service worker scheduler
- ✅ Added proper cleanup on page unload
- ✅ Enhanced logging and debugging capabilities
- ✅ Improved inspector accessibility with ARIA attributes and focus management
- ✅ Added programmatic content script injection for better security
- ✅ Enhanced frame context management for cross-origin support
- ✅ Added comprehensive testing utilities for validation

**Remaining Known Issues:**
These will be resolved in upcoming releases.

- Some accessibility properties do not properly display.
- Potential access barriers on the inspector or extension menu, as full accessibility testing has not yet been completed. I did try to minimize as many barriers as possible during development but I used a very quick iterative process and may have missed some.
- Cross-origin iframe support needs further testing.

## Features

- Real-time accessibility inspection of focused elements
- Screen reader output preview
- ARIA attributes and states inspection
- Keyboard shortcuts for quick access
- Mini mode for compact display
- High contrast UI design

## Keyboard Shortcuts

Current shortcuts (see popup Shortcuts tab):

- `Alt` + `X` – Open extension popup
- `Alt` + `T` – Toggle Inspector (on/off, restores last non-off mode)
- `Alt` + `M` – Toggle Mini Mode (when inspector is visible)
- `Alt` + `[` – Enter / Focus the inspector (moves keyboard focus into the inspector UI)
- `Esc` – When focus is inside the inspector, return focus to the inspected element (never closes the inspector)

## Installation

1. Download the code:

   - Click the green "Code" button above
   - Select "Download ZIP"
   - Extract the ZIP file to a location on your computer

2. Open Chrome and navigate to `chrome://extensions`.

3. Enable "Developer mode" in the top right corner.

4. Click on "Load unpacked" and select the `access-nexus` directory.

## Usage

Focus any element on the page to see its accessibility information. The toolkit will display:

- Screen reader output
- ARIA attributes and states
- Role and name
- Other relevant accessibility properties

## Contributing

Contributions not currently welcome. However, you may open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Privacy

This extension does not collect or transmit any user data. All accessibility inspection happens locally in your browser:

- No analytics or tracking
- No data collection
- No remote servers
- No user information storage
- All processing happens locally on your device

## Retrieval of Accessibility Information

Nexus uses the Chrome DevTools Protocol (CDP) to retrieve full accessibility information for all elements, including those within Shadow DOM. When CDP is unavailable or fails for specific elements, the extension falls back to local computation using specialized libraries:

**Primary Method - Chrome DevTools Protocol (CDP):**

- Works with both regular DOM and Shadow DOM elements
- Provides the most accurate accessibility information matching Chrome's internal calculations
- Handles delegated focus patterns and complex Shadow DOM structures
- Used for all elements when possible

**Fallback Libraries (when CDP is unavailable):**

- **dom-accessibility-api**: Computes accessible names and descriptions following W3C specifications
- **aria-query**: Provides ARIA role definitions, properties, and validation
- These libraries estimate accessibility properties using ARIA attributes and DOM structure
- May not match browser-internal calculations exactly, but provide reliable fallback data

**When Fallbacks Are Used:**

- Network connectivity issues preventing CDP access
- Cross-origin restrictions in certain iframe scenarios
- Temporary CDP failures or timeouts
- Elements in documents where debugger attachment is blocked

The extension automatically detects when CDP is unavailable and seamlessly switches to the fallback computation, ensuring accessibility information is always available to developers.

## Performance and Caching Notes

To keep the inspector responsive on complex pages and sites that use frames/iframed menus, the extension employs a few targeted optimizations when retrieving accessibility information via the Chrome DevTools Protocol (CDP):

- Short-lived persistent debugger sessions: While you’re actively inspecting, the extension keeps a debugger session attached to the active tab with a short idle timeout. This avoids the overhead of re-attaching on every element. The session auto-detaches after a few seconds of inactivity.

- Per-frame document root cache (TTL): The extension caches the DOM root nodeId returned by CDP for each frame in the tab. This cache has a 30-second TTL per frame and is cleared when the debugger detaches. Using the cached root reduces repeated DOM.getDocument calls.

- Selector-to-node cache (TTL + cap): For each frame, a small cache maps a generated CSS-like selector to the resolved nodeId. This speeds up repeat lookups of the same element.
  - TTL: 10 seconds per entry. Entries older than this are invalidated.
  - Size cap: 500 entries total across all frames/tabs. When the cap is reached, the oldest entries are evicted.
  - Validation: Before using a cached nodeId, the extension performs a quick AX lookup to ensure the node still exists. If invalid, the cache is refreshed automatically.

### Tradeoffs and implications

- Faster responses, especially after entering or leaving an iframe, and when revisiting elements.
- Slightly higher memory usage in the background service worker due to caches. The TTL and size cap bound this usage.
- The extension uses the `debugger` permission to access CDP. While attached, DevTools may report that another debugger is attached. The extension mitigates this by detaching after short idle periods.
- The extension requests `webNavigation` to coordinate across frames and improve targeting. No network requests are made; all CDP interactions are scoped to the active tab.

## Technical Architecture

**Modular Structure:**

- `src/background/` - Service worker modules for debugger management, caching, and CDP communication
- `src/components/` - UI components including the accessibility inspector
- `src/utils/` - Shared utilities for logging, Chrome API wrappers, and scheduling

**Key Components:**

- **DebuggerConnectionManager** - Serializes debugger operations to prevent race conditions
- **SmartCache** - TTL-based caching with LRU eviction for memory management
- **ServiceWorkerScheduler** - Replaces setTimeout/setInterval with chrome.alarms for MV3 compatibility
- **Promise-wrapped Chrome APIs** - Eliminates callback-based race conditions

**Memory Management:**

- Automatic cleanup of event listeners on page unload
- Bounded caches with TTL and size limits
- Proper inspector lifecycle management

## Testing and Validation

The extension includes built-in testing utilities for developers:

1. Open Chrome DevTools while on the extension's service worker
2. In the console, run: `window.NexusTestUtils.runAllTests()`

Available test commands:

- `testDebuggerStability()` - Tests debugger attach/detach cycles
- `testCachePerformance()` - Validates cache read/write performance
- `testMemoryUsage()` - Monitors memory consumption patterns
- `testErrorRecovery()` - Validates error handling and retry logic

## AI Disclosure

This project was developed with assistance from GitHub Copilot and other AI tools. Specifically:

- Code structure and implementations were partially generated and refined using GitHub Copilot
- Documentation and instructions were enhanced with AI assistance
- No training data was collected from users
- All AI-generated content was reviewed and verified by human developers

While AI tools were used to accelerate development, all code and functionality is thoroughly tested to ensure reliability and accuracy for accessibility testing purposes.
