# ARIA Role Test Pages

Generated set of self-contained pages (one per concrete WAI-ARIA 1.2 role, including deprecated roles) for exercising the Nexus Accessibility extension on file:// URLs.

## Generate / Refresh

Run from project root (or this directory):


node tests/aria/generate-aria-pages.js


Outputs:
- tests/aria/index.html – searchable, categorized index (works offline on file://)
- tests/aria/<role>.html – per-role pages
- tests/aria/assets/aria-test.(css|js) – shared asset copies (each page also inlines its own copy)

Open any page directly (Finder / Explorer double‑click) – NO server needed.

## Index & Navigation
- Categories: Roles grouped (Widget, Composite, Document Structure, Landmark, Live, Window, Graphics, etc.).
- Quick Search: Type in the search box or press `/` from the index page to focus it. Matches role name or description substring (case-insensitive).
- Deprecated roles visually flagged.

## Shadow DOM
Each role page includes a Shadow DOM toggle that clones the primary widget into a shadow root (style + markup) for testing accessibility tree extraction through shadow boundaries.

## Attribute Editor
Every page provides an Attribute Editor for global + role-specific ARIA.
- Empty value removes the attribute.
- Applies simultaneously to the primary widget root and any explicit role variant element (when present).
- Safe to experiment with invalid values (pages purposely avoid network / XSS vectors).

## Advanced Keyboard Semantics (Representative Roles)
Updated in Step 3 to cover richer composite patterns.
- Button / Switch / Checkbox: Space / Enter toggles state.
- Radiogroup: Arrow Left/Right/Up/Down roves and selects.
- Slider: Arrow (±10), Home/End (min/max).
- Spinbutton: Up/Down (±1), PageUp/PageDown (±5), Home/End (bounds).
- Combobox (editable, list popup): Type filters; Arrow Up/Down moves active option; Enter selects & closes; Esc closes; active option set via aria-activedescendant.
- Listbox (multi-select demo): Arrow Up/Down moves focus. Space toggles selection. Shift+Arrow / Shift+Home / Shift+End extends a contiguous range from the anchor. Cmd/Ctrl+Click (or Cmd/Ctrl+Space) toggles individual items without clearing others.
- Menu / Menubar (with nested submenu): Arrow Left/Right moves across top-level triggers. Enter / Space / Arrow Down opens a submenu. Arrow Right opens a nested submenu from a submenu trigger; Arrow Left or Esc closes the current submenu and returns focus to its trigger.
- Tabs: Arrow Left/Right or Up/Down (depending on orientation semantics) moves selection; Home/End jump to first/last tab.
- Tree: Arrow Up/Down moves visible item focus; Arrow Right expands (if collapsible); Arrow Left collapses; Space toggles aria-selected on focusable items (selection independent of expansion).
- Grid: Arrow keys move cell focus (roving tabindex). Space toggles aria-selected on the active cell. Enter enters edit mode (inline text input), Enter again commits, Escape cancels and restores original value.
- Dialog / Alertdialog: Trigger button opens; Esc closes.

## Testing Guidelines
1. Confirm each role page loads via file:// without mixed-content warnings.
2. Use the Attribute Editor to add / remove ARIA (e.g., aria-label, aria-describedby) and verify live reflection in your extension inspector.
3. Toggle Shadow DOM and ensure semantics remain equivalent (compare accessible name / role / states).
4. Exercise keyboard models above; verify state attributes (aria-selected / aria-checked / aria-pressed / aria-expanded / aria-valuenow) mutate correctly.
5. For composite widgets (tree, grid, listbox) confirm focus management (single tab stop with internal roving).

## Manifest / Content Script Ordering Note
When loading these test pages during extension development, ensure manifest.json lists core screen reader preview + accessibility libs before UI wrapper content scripts, e.g.:

~~~json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": [
      "src/libs/dom-accessibility-api.js",
      "src/libs/aria-query.js",
      "src/utils/sr-preview.js",              // CORE first
      "src/utils/sr-preview-content.js",      // transformer bridge
      "src/components/inspector/inspector-sr-preview.js",
      "src/components/inspector/inspector-core.js"
    ],
    "run_at": "document_idle"
  }
]
~~~

If sr-preview is an ES module, expose a stable global (e.g. window.__NEXUS_SR_PREVIEW__) or await readiness before dependent code executes.

## Accessibility Notes
- No reliance on network fonts; pages are self-contained.
- All interactive examples use explicit keyboard event handling (no reliance on implicit click-to-keyboard translation).
- Shadow clone intentionally duplicates semantics for comparison (avoid modifying only one variant when testing).

## License
Generated pages are part of the project and fall under the existing repository license.

---
Generated: 2025-09-02T22:24:59.953Z
