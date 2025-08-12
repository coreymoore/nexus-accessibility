![Nexus Logo](nexus-logo.svg)

# Nexus Accessibility Testing Toolkit

A Chrome extension for real-time accessibility inspection and testing. This toolkit provides developers and QA teams with instant feedback about accessibility properties, ARIA attributes, and screen reader output of any focused element.

This is an early release and not feature complete.

## Known Issues

**Recent Improvements (Latest Refactoring):**
- ✅ Fixed memory leaks from duplicate message listeners
- ✅ Implemented Chrome API promise wrappers to prevent race conditions
- ✅ Added smart caching with TTL and LRU eviction
- ✅ Enhanced error handling and recovery
- ✅ Improved MV3 compatibility with service worker scheduler
- ✅ Added proper cleanup on page unload
- ✅ Enhanced logging and debugging capabilities

**Remaining Known Issues:**
These will be resolved in upcoming releases.

- Some accessibility properties do not properly display.
- Potential access barriers on the tooltip or extension menu, as full accessibility testing has not yet been completed. I did try to minimize as many barriers as possible during development but I used a very quick iterative process and may have missed some.
- Cross-origin iframe support needs further testing.

## Features

- Real-time accessibility inspection of focused elements
- Screen reader output preview
- ARIA attributes and states inspection
- Keyboard shortcuts for quick access
- Mini mode for compact display
- High contrast UI design

## Keyboard Shortcuts

- `Esc` - Close inspector
- `Shift` + `Esc` - Reopen inspector
- `Alt` + `[` - Focus inspector

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

## Shadow DOM Support and Limitations

- For elements inside Shadow DOM, Nexus uses ARIA attributes and native properties to estimate accessible name, role, and description.
- This may not match the computed accessibility tree shown in Chrome DevTools, and may miss browser-internal accessibility calculations.
- For elements in the main document, full accessibility info is retrieved using the Chrome Debugger Protocol.
- Due to Chrome’s architecture, extensions cannot access the full computed accessibility tree for shadow DOM elements.

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
- `src/components/` - UI components including the accessibility tooltip
- `src/utils/` - Shared utilities for logging, Chrome API wrappers, and scheduling

**Key Components:**
- **DebuggerConnectionManager** - Serializes debugger operations to prevent race conditions
- **SmartCache** - TTL-based caching with LRU eviction for memory management
- **ServiceWorkerScheduler** - Replaces setTimeout/setInterval with chrome.alarms for MV3 compatibility
- **Promise-wrapped Chrome APIs** - Eliminates callback-based race conditions

**Memory Management:**
- Automatic cleanup of event listeners on page unload
- Bounded caches with TTL and size limits
- Proper tooltip lifecycle management

## AI Disclosure

This project was developed with assistance from GitHub Copilot and other AI tools. Specifically:

- Code structure and implementations were partially generated and refined using GitHub Copilot
- Documentation and instructions were enhanced with AI assistance
- No training data was collected from users
- All AI-generated content was reviewed and verified by human developers

While AI tools were used to accelerate development, all code and functionality is thoroughly tested to ensure reliability and accuracy for accessibility testing purposes.
