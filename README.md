# Access Nexus

This extension provides a user-friendly interface to view accessibility information of elements, making it easier for developers and testers to know how elements will be announced by screen readers.

It uses the Chrome DevTools Protocol to access the accessibility properties of elements for more accuracy to how they are exposed to assistive technologies.

This is an early release and not feature complete.

## Features

- View the name, role, values, and states of elements in keyboard focus.

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/coreymoore/access-nexus.git
   ```

2. Navigate to the project directory:

   ```
   cd access-nexus
   ```

3. Open Chrome and go to `chrome://extensions/`.

4. Enable "Developer mode" in the top right corner.

5. Click on "Load unpacked" and select the `access-nexus` directory.

## Usage

TODO. Press the tab key.

## Contributing

Contributions not currently welcome. However, you may open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Shadow DOM Support and Limitations

- For elements inside Shadow DOM, Access Nexus uses ARIA attributes and native properties to estimate accessible name, role, and description.
- This may not match the computed accessibility tree shown in Chrome DevTools, and may miss browser-internal accessibility calculations.
- For elements in the main document, full accessibility info is retrieved using the Chrome Debugger Protocol.
- Due to Chrome’s architecture, extensions cannot access the full computed accessibility tree for shadow DOM elements.
