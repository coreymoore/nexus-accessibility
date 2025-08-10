![Nexus Logo](nexus-logo.svg)

# Nexus Accessibility Testing Toolkit

A Chrome extension for real-time accessibility inspection and testing. This toolkit provides developers and QA teams with instant feedback about accessibility properties, ARIA attributes, and screen reader output of any focused element.

This is an early release and not feature complete.

## Known Issues

These will be resolved before official release.

- Some accessibility properties do not properly display.
- Potential access barriers on the tooltip or extension menu, as full accessibility testing has not yet been completed. I did try to minimize as many barriers as possible during development but I used a very quick iterative process and may have missed some.
- The code is a bit spaghetti at this time. The plan is to go back and refine it manually before release.

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

- For elements inside Shadow DOM, Access Nexus uses ARIA attributes and native properties to estimate accessible name, role, and description.
- This may not match the computed accessibility tree shown in Chrome DevTools, and may miss browser-internal accessibility calculations.
- For elements in the main document, full accessibility info is retrieved using the Chrome Debugger Protocol.
- Due to Chrome’s architecture, extensions cannot access the full computed accessibility tree for shadow DOM elements.

## AI Disclosure

This project was developed with assistance from GitHub Copilot and other AI tools. Specifically:

- Code structure and implementations were partially generated and refined using GitHub Copilot
- Documentation and instructions were enhanced with AI assistance
- No training data was collected from users
- All AI-generated content was reviewed and verified by human developers

While AI tools were used to accelerate development, all code and functionality is thoroughly tested to ensure reliability and accuracy for accessibility testing purposes.
