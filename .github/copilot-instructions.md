# AI Context Rules for Nexus Accessibility Testing Toolkit

## Purpose

This document provides strict rules and context for any AI agent generating code, documentation, or feature suggestions for this project. All outputs must preserve current functionality, follow established standards, and align with the project's branding, accessibility, security, and technical architecture.

---

## 1. Core Functionality Preservation

### 1.1 Critical Features - DO NOT BREAK

- **Accessibility validation pipeline:** The chain from content script → background service worker → CDP commands → inspector display
- **CDP-first approach with fallbacks:** Primary validation through Chrome DevTools Protocol with dom-accessibility-api and aria-query as fallbacks
- **Library fallback system:** When CDP fails, use dom-accessibility-api and aria-query for validation
- **Debugger lifecycle:** Attach/detach cycles managed by `DebuggerConnectionManager` with serialized operations
- **Direct element reference system:** The `useDirectReference` flag and element marking with `data-nexus-element-id`
- **Inspector positioning and display:** Absolute positioning calculations relative to viewport
- **Cache invalidation:** TTL-based LRU caching with automatic cleanup
- **Message validation:** All extension messages must pass `MessageValidator.validate()`
- **Inspector Accessibility Isolation:**  
  When injecting the inspector into a page, ensure that it does not interfere with the accessibility tree, ARIA attributes, or screen reader experience of the host page.
- Do not modify, override, or obscure any existing accessibility properties, roles, or labels of page elements.
- Do not use ARIA live regions, landmark roles, or other global ARIA attributes in the inspector.
- The inspector must be accessible to screen readers, but should not be announced automatically or interfere with the page's accessibility tree. Do not use `aria-hidden="true"` on the inspector container. Instead, ensure the inspector is only exposed to assistive technology when the user explicitly moves keyboard focus into it (e.g., via tabbing or programmatic focus). The inspector should not capture focus by default and must never override or mask the accessibility of the page.
- Do not capture or redirect keyboard focus away from the user's content unless explicitly required for extension functionality.
- Inspector interactions must not block, mask, or alter the accessibility of any underlying page content.
- Always test the inspector in pages with complex accessibility structures to ensure no negative impact.

### 1.2 Data Flow Integrity

- **Preserve the message flow:** Content → Background → CDP → Content → Inspector
- **Maintain element identification:** Both selector-based (legacy) and direct reference approaches must work
- **Validation result structures:** Maintain both formats used in the codebase:
  - Core validation: `ComparisonResult` with `match`, `library`, and `fallback` properties
  - Content validation: Results with `nameMatch`, `descriptionMatch` properties

### 1.3 Validation Libraries

- **CDP primary access:** Use Chrome DevTools Protocol as the primary method to access accessibility data
- **Bundled fallback libraries:** Only use `aria-query.js` and `dom-accessibility-api.js` as fallbacks when CDP is unavailable
- **Role validation:** Follow the extensive role definitions from CDP, with aria-query.js as fallback
- **Name computation:** Use CDP's accessibility tree data primarily, with `computeAccessibleName` and `computeAccessibleDescription` as fallbacks

---

## 2. Branding & Visual Identity

### 2.1 Nexus Brand Assets

- **Logo usage:** Only use `nexus-logo.svg` (128x128) and `nexus-icon.png` (16x16, 48x48, 128x128)
- **Logo spacing:** Maintain at least 16px padding around the logo in all contexts
- **Logo background:** Always place the logo on a compatible background (dark theme or white)
- **Logo alterations:** Never modify, stretch, recolor, or add effects to the logo unless directed to

### 2.2 Color Palette

- **Primary brand colors:**
  - Nexus Purple: `#683ab7` - Used for primary actions, highlights, and branded elements.
  - Nexus Dark Purple: `#2d1958` - Used for primary text and borders.
  - Nexus Medium Purple: `#3a2956` - Used for secondary text.
- **UI colors:**
  - Background Light: `#f3f0fa` - Main background for inspectors and popup.
  - Border Color: `#d1c4e9` - Used for dividers and borders.
  - Secondary Border Color: `#ccc`, `#ddd` - Used for less prominent borders.
  - Text Dark: `#2d1958` - Primary text color.
  - White: `#fff` - Used for backgrounds and inner focus ring.
- **Semantic colors:**
  - Success Green: `#4CAF50` - For successful validation results.
  - Success Green Dark: `#29922d` - For hover/active states on success elements.
  - Warning Amber: `#FFC107` - For warnings and partial validation.
  - Error Red: `#F44336` - For errors and failed validations.
  - Info Blue: `#2196F3` - For informational content and inspectors.
- **Extended Semantic Colors (for Inspector Categories):**

  - Indigo: `#4b0082`
  - Dark Blue: `#005a8d`
  - Dark Green: `#007a4d`
  - Dark Orange: `#924400`
  - Crimson: `#b8002f`
  - Dark Gold: `#7c5c00`
  - Teal: `#016060`

- **Opacity standards:**
  - Interactive elements: 100% opacity in normal state
  - Hover effects: 90% opacity or 10% white overlay
  - Disabled elements: 38% opacity
  - Overlay backgrounds: 80% opacity

### 2.3 Typography

- **Font families:**

  - Primary font: `'Inter', sans-serif` - For all UI text (loaded from local WOFF2 files only)
  - Monospace font: `'JetBrains Mono', monospace` - For code examples, technical output, and screen reader information display
  - Fallback fonts: System sans-serif stack for general text, system monospace for code
  - Icon font: None. All icons are SVGs.

- **Font weights (Inter):**

  - Regular: 400 - For general text and body content
  - Medium: 500 - For section headings and emphasized text
  - Semi-Bold: 600 - For important UI elements
  - Bold: 700 - For primary headings and strong emphasis

- **Font loading:**

  - Inter: Loaded via local WOFF2 files (`src/assets/fonts/inter*.woff2`)
  - JetBrains Mono: Loaded via local WOFF2 files (`src/assets/fonts/jetbrains-mono*.woff2`)
  - Font-display: `swap` - Ensures text remains visible during font load

- **Font sizes:**

  - Primary text: 14px
  - Secondary text: 12px
  - Headings: 16px (h3), 18px (h2), 20px (h1)
  - Inspector content: 13px
  - Button text: 14px
  - Small text/captions: 11px
  - Screen reader output (JetBrains Mono): 13px

- **Line heights:**
  - Default: 1.5
  - Headings: 1.2
  - Compact areas: 1.3
  - Code/monospace content: 1.4

### 2.4 UI Components

- **Inspector styling:**

  - Must match `src/components/inspector/inspector.css`
  - Light theme with purple accents
  - Card-like appearance with 8px rounded corners
  - Subtle drop shadow: `0px 3px 8px rgba(0, 0, 0, 0.3)`
  - Arrow indicator for pointing to referenced element
  - Maximum width of 360px

- No entrance/exit animations (inspector must appear and disappear instantly to avoid motion distraction). Do NOT add CSS animations, transitions on opacity/transform, or keyframe-driven effects to the inspector container without explicit human approval.

- **Popup interface:**

  - Maintain the existing layout and styling in `src/popup/`
  - Consistent header with logo and version number
  - Section dividers using `border-bottom: 1px solid var(--border-color)`
  - Default padding of 16px in containers
  - Minimum width of 320px, maximum of 800px

- **Buttons:**

  - Primary: Nexus Purple background, white text, 4px rounded corners
  - Secondary: Transparent with Nexus Purple border, Nexus Purple text
  - Hover effect: 10% darken or 10% lighten depending on button type
  - Disabled state: 38% opacity, no hover effects

- **Form controls:**
  - Input fields: 1px Border Color border, 4px rounded corners, 8px padding
  - Checkbox/Radio: Custom styled with Nexus Purple for selected state
  - Dropdown: Consistent with input fields, custom arrow icon

### 2.5 Icons & Graphics

- **Icon usage:** All icons in the extension must be SVGs, not icon fonts. AI-generated SVGs for new icons.
- **Accessibility:** Any meaningful icon (i.e., not purely decorative) must have `role="img"` and an appropriate `aria-label` describing its purpose.
- **Decorative icons:** If an icon is purely decorative, use `aria-hidden="true"` to exclude it from the accessibility tree.
- **Consistency:** SVG icons must match the color palette and visual style of the extension.
- **Icon sizes:** 18px for inline icons, 24px for standalone icons.
- **Icon colors:** Should match the text color they accompany.
- **Custom graphics:** Must follow the established color palette

### 2.6 Spacing & Layout

- **Grid system:** Use 8px as the base unit for all spacing
- **Padding standards:**
  - Container padding: 16px
  - Button padding: 8px 16px
  - Inspector padding: 12px
  - Between related elements: 8px
  - Between sections: 24px
- **Margins:**

  - Between unrelated elements: 16px
  - Between paragraphs: 8px
  - Before headings: 24px
  - After headings: 8px

- **Alignment:**
  - Form labels and controls should be left-aligned
  - Buttons in forms should be right-aligned
  - Text should be left-aligned in LTR languages
  - Headings should match text alignment

### 2.7 Animations & Transitions

- **Duration standards:**
  - Fast interactions (hover, focus): 100ms
  - Normal transitions: 180ms
  - Complex animations: 220-300ms
- **Easing:**
  - Default: ease-in-out
  - Appearing elements: ease-out
  - Disappearing elements: ease-in
- **Animation types:**
  - Inspector: PROHIBITED (no fade, scale, or motion). Any future proposal to animate inspector requires explicit documented approval.
  - Other UI surfaces (popup, settings): May use subtle fade or color transitions within defined duration standards.
  - No extreme or distracting animations
  - **Motion accessibility:** Always detect and respect the user's "prefers-reduced-motion" system setting. If this setting is enabled, disable all non-essential animations and transitions throughout the extension UI, including popup, buttons, and overlays (inspector already has none). Provide instant state changes with no visual motion effects for users who prefer reduced motion.

### 2.8 Focus Indicators

- **Unified focus style:** All interactive elements (buttons, inputs, inspectors, popups, etc.) must use the same focus indicator throughout the extension.
- **Focus indicator design:** Use a dual outline—2px solid Nexus Purple (`#683ab7`) outer ring with a 4px solid white inner ring created using `box-shadow`.
- **Implementation:** The canonical implementation lives in `src/assets/shared.css` and MUST be imported by every UI surface (inspector injection, popup, options pages). Do NOT duplicate focus ring CSS in component stylesheets; instead ensure `shared.css` is loaded. Apply this focus style ONLY with `:focus-visible` (do NOT style `:focus` or `:focus-within`). Use `!important` to prevent override from host page styles.
- **No overrides:** Do not use browser default focus rings or custom styles that differ from this standard.
- **Accessibility:** Ensure the focus indicator is always visible and meets WCAG 2.2 AA contrast requirements against all backgrounds.
- **Example CSS:**
  ```css
  *:focus-visible {
    outline: 2px solid #683ab7 !important;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px #fff !important;
  }
  ```
- **Consistency:** This dual purple/white focus indicator must be present on all interactive UI elements. Any PR introducing new UI without importing `shared.css` must be rejected.

### 2.10 Shared Stylesheet Enforcement

- **File:** `src/assets/shared.css` is the single source of truth for:
  - Unified focus ring implementation (Section 2.8)
  - Shared keyboard shortcut key styling (`kbd` tokens)
  - Reduced motion defaults for common surfaces
- **Injection Rules:**
  - Inspector: Inject via `ensureStylesInjected()` in `inspector-core.js` if not already present.
  - Popup & options: Reference directly in HTML `<head>` after component-specific stylesheet.
- **No Duplication:** Component stylesheets (`inspector.css`, `popup.css`, etc.) must not redefine focus ring styles unless extending with additional, non-conflicting selectors. If an extension is needed, update `shared.css` instead.
- **Change Workflow:** Any modification to focus ring or shared tokens must update `shared.css` and (if substantive) add a brief note in AI_CONTEXT_RULES.md summarizing rationale and date.

### 2.9 Component States & Style Robustness

- **State coverage:** All interactive components (buttons, inputs, inspectors, overlays, etc.) must have explicit styles for every state, including default, hover, active, focus, disabled, and visited (where applicable).
- **Style isolation:** Use strong CSS selectors, encapsulation techniques (such as Shadow DOM or unique class names), and `!important` declarations where necessary to prevent host webpage styles from overriding extension component styles.
- **Contrast compliance:** Every component state (including hover, focus, active, disabled, and error) must meet WCAG 2.2 AA contrast requirements for both text and UI elements (borders, backgrounds, icons).
- **Testing:** When adding or updating styles, verify that all states remain visually distinct and accessible, even when injected into pages with aggressive or conflicting CSS.
- **No state left unstyled:** Do not rely on browser defaults for any component state. Explicitly define styles for all possible states.

---

## 3. Accessibility Standards

### 3.1 UI Accessibility

- **Extension UI must be fully accessible:** All components in popups, inspectors, and options pages
- **Keyboard navigation:** All UI controls must be focusable and operable with keyboard
- **Screen reader compatibility:** UI components must have proper ARIA attributes and roles
- **Color contrast:** Maintain WCAG AA-compliant contrast ratios in all UI elements
- **Standards compliant:** Extension must meet WCAG 2.2 AA and follow WAI-ARIA 1.2.
- Aim for WCAG 2.2 AAA conformance whenever possible

### 3.2 Keyboard & Screen Reader Support

- **All interactive elements must be keyboard accessible**
- **Proper focus management:** Use `tabindex` appropriately
- **Live regions:** Do not use ARIA live regions (e.g., `aria-live`, `aria-atomic`, `aria-relevant`) in inspectors injected into inspected pages, as this can disrupt or override the accessibility tree and interfere with the host page's screen reader experience. Live regions are only permitted in extension-controlled UI surfaces such as the popup, options page, or other overlays that are not injected into the inspected page. Always ensure live regions are scoped to extension UI and never modify or compete with the accessibility semantics of the page that is being inspected.

### 3.3 Testing Functions

- **Global validation functions:** `validateAccessibilityLibraries()` and `batchValidateAccessibility()`
- **Library injection:** Must inject both DOM API and ARIA Query into page context for testing

### 3.4 Validation Implementation Hierarchy

The extension uses three distinct validation layers that work together:

1. **CDP Validation (Primary)**: Implemented in utils/validation/core.js, uses Chrome DevTools Protocol
2. **Library Fallback (Secondary)**: Uses dom-accessibility-api and aria-query when CDP is unavailable
3. **Content Script Validation**: Implemented in content/content-validation.js for in-page validation

When implementing new validation features:

- Always attempt CDP validation first
- Provide complete fallback implementation using libraries
- Update both core and content validation modules when adding new checks

---

## 4. Security & Privacy

### 4.1 Chrome Extension Security

- **Manifest V3 compliance:** Service workers only, no persistent background pages
- **Content Security Policy:** Follow strict CSP in manifest
- **Host permissions:** Only request necessary permissions (`<all_urls>`, `debugger`, `tabs`, etc.)

### 4.2 Code Injection & Sandboxing

- **Programmatic injection only:** Use `chrome.scripting.executeScript()` as in `contentInjector.js`
- **Sanitize DOM operations:** Use `dom-sanitizer.js` for any innerHTML or DOM manipulation
- **Isolated contexts:** Keep page context separate from content script context

### 4.3 Data Handling

- **No external requests:** Do not add fetch calls to external servers
- **No user tracking:** No analytics, telemetry, or data collection
- **Local storage only:** Use chrome.storage.local for persistence

---

## 5. Technical Architecture

### 5.1 Limited Build System - Library Bundling Only

- **Core extension code:** All extension JavaScript must run as-is without transpilation
- **ES6 modules:** Use native ES6 module syntax with proper import/export for extension code
- **Third-party libraries only:** Build system (Rollup) is used ONLY to bundle accessibility libraries (`aria-query`, `dom-accessibility-api`)
- **No new build dependencies:** Do not add new npm packages or change the build process without explicit approval
- **Pre-built libraries:** The bundled libraries in `src/libs/` are generated files - do not edit directly

### 5.2 Module Organization

```
src/
├── background/     # Service worker modules (cache, debugger, state, messaging)
├── components/     # UI components (inspector system)
├── content/        # Content scripts (validation, DOM interaction)
├── libs/           # Third-party libraries (aria-query, dom-accessibility-api)
├── popup/          # Extension popup interface
├── utils/          # Shared utilities (Chrome API wrappers, sanitizers, validators)
└── assets/         # Images and icons
```

### 5.3 Chrome API Patterns

- **Promise wrappers:** Use `chromeAsync.js` for all Chrome APIs
- **Message passing:** Use `chrome.runtime.sendMessage()` with proper error handling
- **Alarm-based scheduling:** Replace setTimeout/setInterval with `chrome.alarms` API
- **Tab lifecycle:** Properly handle tab updates, removals, and navigation

### 5.4 State Management

- **Service worker state:** Use `StateManager` class for persistent state
- **Cache management:** Implement TTL and size limits (1000 items max)
- **Memory cleanup:** Clear listeners and data on tab close/navigation

---

## 6. Performance Optimization

### 6.1 DOM Operations

- **Batch DOM queries:** Use `querySelectorAll` once rather than multiple queries
- **Avoid layout thrashing:** Read all DOM properties before writing
- **Debounce/throttle:** Use for scroll and resize handlers

### 6.2 Memory Management

- **Bounded caches:** Enforce size limits on all caches
- **WeakMap usage:** For element references where appropriate
- **Cleanup routines:** Remove event listeners and clear caches on unload

### 6.3 CDP Performance

- **Serialize debugger operations:** Use queue in `DebuggerConnectionManager`
- **Batch CDP commands:** Group related commands when possible
- **Handle debugger limits:** Respect Chrome's debugger attachment constraints

### 6.4 Lifecycle-based Memory Management

Memory cleanup must occur at these specific lifecycle points:

1. **Tab Navigation**: Clear tab-specific caches and listeners (content scripts)
2. **Tab Close**: Remove all tab data from background storage
3. **Extension Unload**: Release global resources and service worker state
4. **Element Reference Cleanup**: Use WeakMap or explicit cleanup when element references are no longer needed

All new features must implement cleanup at all applicable lifecycle points.

### 6.5 Standardized Cache Implementation

All caches in the extension must follow these specifications:

1. **TTL**: All cached items expire after 5 minutes by default
2. **Size Limits**: Maximum 1000 items per cache type
3. **Implementation**: Use CacheManager from utils/cache-manager.js
4. **Invalidation**: Clear relevant caches on page navigation or DOM mutations
5. **Priority**: Implement LRU (Least Recently Used) eviction policy

Example implementation:

```javascript
import { CacheManager } from "../utils/cache-manager.js";

const elementCache = new CacheManager({
  name: "elements",
  maxSize: 1000,
  ttl: 5 * 60 * 1000, // 5 minutes
});
```

---

## 7. Error Handling & Resilience

### 7.1 Error Recovery

- **Use ErrorRecovery class:** Implement exponential backoff for retries
- **Graceful degradation:** Fall back to selector-based approach if direct reference fails
- **User feedback:** Show clear error messages in inspectors/popup

### 7.2 Logging

- **Consistent logging prefixes:** Use `[NEXUS]` for general messages and `[VALIDATION]` for validation-specific logging
- **Log levels:** Support verbose mode via `NEXUS_TESTING_MODE.verbose`
- **No console errors in production:** Catch and handle all exceptions

### 7.3 Standard Error Handling Pattern

All code must follow this error handling pattern:

1. **Async Operations**: Use try/catch with async/await pattern
2. **Error Classification**: Categorize errors as recoverable or fatal
3. **Recovery Strategy**: Use ErrorRecovery class for retryable operations
4. **User Feedback**: Show user-friendly error messages in UI
5. **Logging**: Log detailed error information for debugging

Example implementation:

```javascript
import { ErrorRecovery } from "../utils/error-recovery.js";

async function validateElement(element) {
  const recovery = new ErrorRecovery("validateElement", {
    maxRetries: 3,
    backoffFactor: 1.5,
  });

  return recovery.attempt(async () => {
    try {
      // Validation logic here
    } catch (error) {
      console.error("[VALIDATION] Element validation failed:", error);
      throw error; // Will be caught by recovery.attempt
    }
  });
}
```

---

## 8. Testing & Validation

### 8.1 Testing Infrastructure

- **Built-in test utilities:** `NexusTestUtils` with methods for stability, performance, and memory testing
- **Multiple validation implementations:** Maintain separation between core validation (utils/validation/core.js), content validation (content/content-validation.js), and utility validation (utils/validation-utils.js)
- **Page context testing:** Support both library-based and native validation
- **All testing must use local data:** No external validation data or services should be used

### 8.2 Test Coverage

- **All new features must include validation routines**
- **Regression prevention:** Test against known accessibility patterns
- **Cross-page testing:** Ensure features work on SPAs and traditional sites

---

## 9. Code Style & Quality

### 9.1 JavaScript Standards

- **ES6+ syntax:** Use modern JavaScript features (const/let, arrow functions, destructuring)
- **JSDoc comments:** Document all functions with proper type annotations
- **Naming conventions:** camelCase for variables/functions, PascalCase for classes

### 9.2 Code Organization

- **Single responsibility:** Each module should have one clear purpose
- **DRY principle:** Reuse existing utilities and patterns
- **Consistent patterns:** Follow existing error handling and async patterns
- **Separate validation modules:** Maintain distinct validation implementations in their respective modules, each serving different contexts:
  - Core validation (utils/validation/core.js)
  - Content validation (content/content-validation.js)
  - Utility validation (utils/validation-utils.js)

---

## 10. Internationalization Readiness

### 10.1 Text Content

- **Externalize strings:** Prepare for future i18n by avoiding hardcoded text
- **UTF-8 support:** Ensure proper character encoding
- **Locale awareness:** Consider future multi-language support in UI design

---

## 11. Version Management

### 11.1 Semantic Versioning

- **Update manifest.json version** for all releases

### 11.2 Backward Compatibility

- **Support both validation approaches:** Direct reference and selector-based
- **Gradual deprecation:** Mark old methods as deprecated before removal
- **Migration paths:** Provide clear upgrade instructions

---

## 12. Documentation Requirements

### 12.1 Code Documentation

- **README.md updates:** Keep installation and usage instructions current
- **Inline comments:** Explain complex logic and Chrome API workarounds
- **API documentation:** Document all public methods and message formats
- Update relevant documentation files including BUILD_LIBS.md for library changes

### 12.2 AI Disclosure

- **Transparency:** Clearly state AI involvement in development
- **No training on user data:** Explicitly state privacy protection
- **Human review:** All AI-generated code must be reviewed

---

## 13. Dependency & Library Management

### 13.1 Third-Party Code

- **Current libraries:** aria-query.js and dom-accessibility-api.js are vendored
- **No external CDNs:** All code must be bundled with extension
- **License compliance:** Maintain MIT license compatibility

### 13.2 Library Updates

- **Library rebuilding:** Libraries must be rebuilt using npm run build and tested after any updates
- **Version tracking:** Document library versions in code comments
- **Compatibility testing:** Ensure updates don't break existing functionality

### 13.3 License Documentation

- **Extension license:** This project is licensed under MIT License
- **Third-party licenses:** All bundled libraries must be MIT-compatible
  - `aria-query`: Apache-2.0 (compatible with MIT)
  - `dom-accessibility-api`: MIT
- **License files:** Maintain LICENSE file in project root
- **Attribution:** Include proper attribution for all third-party code in comments or documentation
- **License headers:** Do not remove existing license headers from vendored libraries
- **New dependencies:** Any new libraries must have MIT-compatible licenses (MIT, BSD, Apache 2.0)
- **License disclosure:** Document all third-party licenses in a LICENSES.md or similar file

---

## 14. Special Considerations

### 14.1 Chrome-Specific Constraints

- **Debugger one-per-tab limit:** Only one debugger can attach to a tab
- **Service worker lifecycle:** Handle wake/sleep cycles properly
- **Extension ID references:** Use `chrome.runtime.id` for self-reference

### 14.2 Message Validation Rules

- **Required fields:** action/type, tabId (for certain actions)
- **Sender validation:** Must be from same extension ID
- **Action whitelist:** Only allow predefined action types

### 14.3 Message Validation Implementation

All message validation must use the MessageValidator class:

1. **Import**: `import { MessageValidator } from '../utils/validation/message-validator.js'`
2. **Validation**: All messages must be validated with `MessageValidator.validate(message)`
3. **Schema**: Messages must follow the schema defined in message-schemas.js
4. **Error Handling**: Invalid messages must be rejected with clear error messages
5. **New Message Types**: When adding new message types, update both the validator and schema

This applies to all contexts: background, content scripts, and popup.

---

## 15. Maintaining These AI Context Rules

### 15.1 Rules File Updates

- **Living document:** This AI_CONTEXT_RULES.md file must evolve as the codebase changes
- **Human approval required:** All updates to this file must be reviewed and approved by a human developer
- **Change proposal process:** Follow the process below for proposing updates

### 15.2 When to Propose Updates

AI agents should propose updates to this rules file when:

- A significant new feature is added to the codebase
- An architectural pattern changes
- New libraries or dependencies are introduced
- Security or privacy policies are modified
- UI/UX patterns evolve
- Validation strategies change
- Any other substantive change that future AI agents need to be aware of

### 15.3 Update Proposal Process

1. **Identify the need:** When a significant change occurs, identify which sections of this file need updating
2. **Draft changes:** Create a clear, concise update to the relevant sections
3. **Present to human:** Show the proposed changes to a human reviewer using the format:

```
## Proposed Updates to AI_CONTEXT_RULES.md

I've noticed [describe the change in the codebase] which suggests the AI Context Rules should be updated.

### Proposed Changes:

Current text:
```

[existing rule text]

```

Proposed update:
```

[new rule text]

```

Rationale: [explain why this update is necessary]
```

4. **Wait for approval:** Do not implement changes until explicit human approval
5. **Document the update:** When implementing approved changes, add a brief comment indicating when and why the rule was updated

### 15.4 Default Approach

When in doubt about whether to propose an update to this file, err on the side of proposing the update rather than assuming the existing rules are sufficient.

---

## Enforcement

### Critical Rules (MUST NOT VIOLATE)

1. Do not break the debugger management serialization
2. Do not modify message validation logic without updating validator
3. Do not introduce NEW build dependencies or expand build process beyond library bundling
4. Do not add external network requests
5. Do not change the inspector positioning system under any circumstances unless you receive explicit, direct instructions from a human developer. If you are instructed to make changes, you must first ask clarifying questions to fully understand the intent, requirements, and expected outcomes before proceeding with any modifications.
6. Do not break the dual validation approach (direct reference + selector)

### Review Checklist

- [ ] Code runs without transpilation
- [ ] No new npm dependencies added unless asked for
- [ ] Chrome API calls use promise wrappers
- [ ] Error handling follows established patterns
- [ ] Memory cleanup implemented
- [ ] Accessibility standards maintained
- [ ] Security constraints respected
- [ ] Documentation updated

### Default Behavior

When uncertain, choose the most conservative approach that maintains backward compatibility and follows existing patterns in the codebase.

---

## Contact for Clarification

If an AI agent encounters ambiguity or needs to make architectural decisions beyond these rules, it should explicitly request human review rather than making assumptions.
