# Nexus Accessibility Testing Toolkit

A Chrome extension for real-time accessibility inspection and testing. This toolkit provides developers and QA teams with instant feedback about accessibility properties, ARIA attributes, and screen reader output of any focused element.

This is an early release and not feature complete. Some accessibility properties do not properly display. This is a known issue and will be resolved before official release.

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

## Shadow DOM Support and Limitations

- For elements inside Shadow DOM, Access Nexus uses ARIA attributes and native properties to estimate accessible name, role, and description.
- This may not match the computed accessibility tree shown in Chrome DevTools, and may miss browser-internal accessibility calculations.
- For elements in the main document, full accessibility info is retrieved using the Chrome Debugger Protocol.
- Due to Chrome’s architecture, extensions cannot access the full computed accessibility tree for shadow DOM elements.
