# Building Accessibility Libraries

This extension uses bundled versions of accessibility libraries for fallback accessibility computations when Chrome's native APIs aren't available.

## Libraries Used

- **dom-accessibility-api** (MIT License) - W3C compliant accessible name and description computation
- **aria-query** (Apache 2.0 License) - ARIA role mapping and element information

## Building

The libraries are pre-built and included in the repository. To rebuild them:

```bash
# Install build dependencies
npm install

# Build the browser bundles
npm run build
```

This will generate:

- `src/libs/dom-accessibility-api.js` - Browser-compatible bundle of dom-accessibility-api
- `src/libs/aria-query.js` - Browser-compatible bundle of aria-query

## Files

- `build-src/` - Entry point files for bundling
- `rollup.config.js` - Build configuration
- `package.json` - Build dependencies (not runtime dependencies)

The generated bundles are self-contained with no external dependencies and work in all modern browsers.
