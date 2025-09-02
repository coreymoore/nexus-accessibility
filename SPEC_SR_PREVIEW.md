# Screen Reader Preview Specification (sr-preview)

Deterministic tokenizer + formatter that converts an inspector-provided accessibility node object into ordered utterance segments and a preview string (comma separated by default).

## API

Exports from `src/utils/sr-preview.js`:
- `generateSegments(accessNode, options = {}) => Segment[]`
- `generatePreviewString(segments, options = { joiner: ', '}) => string`

Segment shape: `{ kind: 'name'|'role'|'state'|'description'|'meta'|'value', text: string, data?: object }`.

Empty / invalid input returns `[]` and `''`.

## Field Extraction & Fallbacks

For robustness the extractor probes multiple properties:

| Concept | Candidates (first non-null wins) |
|---------|----------------------------------|
| role | `role`, `role.value` |
| name | `name`, `accessibleName`, `name.value` |
| description | `description`, `accessibleDescription`, `description.value` |
| value | `value`, `currentValue`, `aria-valuetext`, `aria-valuenow` |
| level | `level`, `aria-level` |
| checked | `aria-checked`, `checked` |
| pressed | `pressed`, `aria-pressed` |
| selected | `selected`, `aria-selected` |
| expanded | `expanded`, `aria-expanded` |
| disabled | `disabled`, `aria-disabled` |
| readonly | `readonly`, `aria-readonly` |
| required | `required`, `aria-required` |
| invalid | `invalid`, `aria-invalid` |
| live | `aria-live`, `live` |
| rows | `rows`, `rowCount` |
| columns | `columns`, `colCount` |
| rowIndex | `rowIndex` |
| colIndex | `colIndex`, `columnIndex` |
| headers | `headers` |
| length | `length`, `itemCount` |
| posInSet | `index`, `position`, `posInSet`, `aria-posinset` |
| setSize | `setSize`, `aria-setsize`, `length`, `itemCount` |
| range values | `aria-valuemin`/`valueMin`/`min`, `aria-valuemax`/`valueMax`/`max`, `aria-valuenow`/`valueNow`/`currentValue`/`value` |
| composite active | `aria-activedescendant`, `activeDescendant` |
| active descendant name | `activeDescendantName` |
| active index | `activeIndex` |
| item count (container) | `itemCount` |
| group labels (ancestors) | `groupLabels` (array, outermost→innermost) |
| node id | `id` |

Abstract roles are normalized to `generic`.
`aria-roledescription` overrides canonical role label.

Values longer than 200 chars are truncated with `segment.data.truncated = true`.

## Role Coverage (WAI-ARIA 1.2)

All roles below are recognized. Abstract roles fall back to `generic` formatting.

alert, alertdialog, application, article, banner, blockquote, button, caption, cell, checkbox, code, columnheader, combobox, command (abstract), complementary, composite (abstract), contentinfo, definition, deletion, dialog, directory [deprecated], document, emphasis, feed, figure, form, generic, grid, gridcell, group, heading, img, input, insertion, landmark (abstract), link, list, listbox, listitem, log, main, marquee, math, meter, menu, menubar, menuitem, menuitemcheckbox, menuitemradio, navigation, none, note, option, paragraph, presentation, progressbar, radio, radiogroup, range (abstract), region, roletype (abstract), row, rowgroup, rowheader, scrollbar, search, searchbox, section (abstract), sectionhead (abstract), select (abstract), separator, slider, spinbutton, status, strong, structure (abstract), subscript, superscript, switch, tab, table, tablist, tabpanel, term, textbox, time, timer, toolbar, tooltip, tree, treegrid, treeitem, widget (abstract), window (abstract)

## Role-Specific Templates & Ordering

Ordering is the sequence segments are emitted; preview string joins texts with ", ".

### Heading
Template: "Heading level {level}, {name}". Segments: meta(level phrase), name. Role word omitted when level known.

### Button
Template: "{name}, button{, pressed}{, disabled}{, busy}". Segments: name, role, states.

### Link
Template: "{name}, link{, visited}" (visited currently depends on flag the inspector may supply).

### Text Entry (textbox, searchbox, combobox)
Template: "{name}, edit{, required}{, readonly}{, invalid}{, empty|value}" then optional description.

### Checkbox / Menu Item Checkbox / Treeitem / Switch
Template: "{name}, checkbox|switch, checked|unchecked|mixed{, disabled}". Mixed supported via `aria-checked="mixed"`.

### Radio / Menu Item Radio
Template: "{name}, radio button|menu item radio, selected|not selected{, disabled}".

### List / Listbox
Template: "{name?}, list, with {n} items". Segments: name?, role, meta(length).
Active descendant enhancements: if `activeDescendantName` -> add `meta: active: {name}`; else if `activeIndex` & count -> `meta: item {i} of {count}`; else if only id present -> `meta: has active descendant`.

### List Item / Option
Template: "{name}, list item|option, {index} of {size}{, selected}".
If its id matches container `aria-activedescendant`, add `state: active`.

### Table / Grid / Treegrid
Template: "table, {rows} rows, {cols} columns, header: {firstHeader}{, name}". Segments: role, meta rows, meta columns, meta first header, name.

### Tree / Treegrid Containers
Tree: "tree, with {n} items{, active: {name}|has active descendant}{, name}" (name emitted first if present). Treegrid behaves like grid/table but may also include active descendant meta similar to tree.

### Radiogroup
"{name?}, radio group{, selected: {radioName}|selected i of N}{, active: {name}|has active descendant}".

### Cell / Gridcell / Rowheader / Columnheader
Template: "cell, row {r} of {rows}, column {c} of {cols}{, name}" (indexes depend on provided indices).

### Progress / Slider / Spinbutton / Meter
Template (nuanced):
* If min/max numeric and now inside range:
	* If min==0: "{name}, role, {now} of {max} ({pct}%)"
	* Else: "{name}, role, {now} (range {min} to {max}, {pct}%)"
* Else: "{name}, role, {now}" or raw value fallback.

### Live Regions (alert, status, log, timer, marquee)
Template: "role, {name}{, description}{, live}".

### Fallback / Generic
### Tablist / Tab
Tablist container: "{name?}, tablist{, active: {tabName}|item i of N|has active descendant}".
Tab: "{name}, tab{, selected}{, active}{, i of N}" (index meta from `posInSet` / `setSize`).

### Treeitem
"{name}, tree item, checked|unchecked|mixed{, disabled}{, i of N}{, active}".

## Group / Fieldset / Ancestor Labels
If `groupLabels` array is provided, each label is emitted as a leading `meta` segment (outermost first) before the node’s own name/role. This mirrors fieldset/legend and nested group context.

## Active Descendant Rules Summary
1. Containers (listbox, list, tablist) emit one of: `active: {name}`, `item i of N`, or `has active descendant`.
2. Items (option, listitem, tab, treeitem, menu items, radio, etc.) receive `state: active` if their `id` matches container `aria-activedescendant`.
3. If both `activeDescendantName` and index information exist, name wins (no duplication).
4. Order: group meta labels → name → role → primary states (selected/checked/active/mixed) → other states → value → description → trailing meta (indices, active descendant meta for containers).
Template: "{name?}, {role}{, states}{, description}".

States considered in fallback: disabled, readonly, required, invalid, expanded, selected.

## Examples

Heading example:
Input: `{ role: 'heading', name: 'Features', level: 2 }`
Segments: `[meta:"Heading level 2", name:"Features"]`
String: `Heading level 2, Features`

Button pressed:
`{ role: 'button', name: 'Submit', pressed: true }` -> `Submit, button, pressed`

Text input required empty:
`{ role: 'textbox', name: 'Email address', value: '', required: true }` -> `Email address, edit, required, empty`

Checkbox mixed:
`{ role: 'checkbox', name: 'Agree to terms', 'aria-checked': 'mixed' }` -> `Agree to terms, checkbox, mixed`

Menuitemcheckbox mixed:
`{ role: 'menuitemcheckbox', name: 'Option A', 'aria-checked': 'mixed' }` -> `Option A, menu item checkbox, mixed`

Table:
`{ role: 'table', name: 'Results', rows: 3, columns: 5, headers: ['Name','Date','Status','Owner','Id'] }` -> `table, 3 rows, 5 columns, header: Name, Results`

## Truncation
Value segments over 200 characters are truncated; `segment.data.truncated` becomes `true`.

## Integration Snippet
```js
import { generateSegments, generatePreviewString } from './utils/sr-preview.js';
// inside inspector rendering logic when you have accessNode
const segments = generateSegments(accessNode);
const preview = generatePreviewString(segments); // comma-separated string
```

If only a string is required, the one-line pattern:
```js
const preview = generatePreviewString(generateSegments(accessNode));
```

## Assumptions
* Inspector supplies plain object, no functions.
* Indexes (rowIndex/colIndex) are 1-based if provided; logic does not adjust.
* Missing numeric metadata simply omits related meta segments.
* Visited state for links depends on external flag (not currently extracted except generic boolean `visited`).

## Testing Summary
Unit tests (`tests/sr-preview.spec.js`) cover 14 scenarios including mixed checkbox states and fallback.
