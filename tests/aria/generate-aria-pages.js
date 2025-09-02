#!/usr/bin/env node
/**
 * ARIA Role Test Page Generator
 * ---------------------------------
 * Generates an index plus one HTML file per concrete WAI-ARIA 1.2 role (including deprecated roles),
 * excluding abstract roles. Pages are self‑contained (file:// ready) with inline CSS/JS fallbacks,
 * an attribute editor, Shadow DOM toggle, and minimally interactive examples.
 *
 * Usage:
 *   node tests/aria/generate-aria-pages.js
 *
 * Idempotent: re-runs overwrite prior generated files.
 *
 * NOTE: This is a pragmatic implementation, not a full spec engine. The role/attribute list is
 * curated (hand maintained) and intentionally conservative but broad enough for extension testing.
 */

/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = __dirname; // tests/aria directory
const ASSETS_DIR = path.join(OUTPUT_DIR, 'assets');

// -------------------------------
// Concrete Roles (WAI-ARIA 1.2)
// -------------------------------
// Source compiled manually from WAI-ARIA 1.2 spec. Abstract roles omitted intentionally.
// Include deprecated: directory.
// Grouped for index categories.
const ROLE_CATEGORIES = {
  'Widget Roles': [
    'alert','alertdialog','button','checkbox','dialog','gridcell','link','log','marquee','menuitem','menuitemcheckbox','menuitemradio','option','progressbar','radio','scrollbar','searchbox','slider','spinbutton','status','switch','tab','tabpanel','textbox','timer','tooltip','treeitem'
  ],
  'Composite Widget Roles': [
    'combobox','grid','listbox','menu','menubar','radiogroup','tablist','tree','treegrid'
  ],
  'Document Structure Roles': [
    'application','article','blockquote','caption','cell','columnheader','definition','deletion','directory','document','emphasis','feed','figure','group','heading','img','insertion','list','listitem','math','meter','none','note','paragraph','presentation','row','rowgroup','rowheader','separator','strong','subscript','superscript','table','term','time','toolbar'
  ],
  'Landmark Roles': [
    'banner','complementary','contentinfo','form','main','navigation','region','search'
  ]
};

// Role metadata (description + deprecated flag + role-specific attributes)
// Only key attributes for testing; not exhaustive but representative.
const ROLE_METADATA = {
  alert: { desc: 'A type of live region with important, and usually time-sensitive, information.', attrs: ['aria-live','aria-atomic'] },
  alertdialog: { desc: 'A type of dialog that contains an alert message, where initial focus goes to an element within the dialog.', attrs: ['aria-modal'] },
  button: { desc: 'An input that allows for user-triggered actions when clicked or pressed.', attrs: ['aria-pressed','aria-expanded'] },
  checkbox: { desc: 'A checkable input that has three possible values: true, false, or mixed.', attrs: ['aria-checked','aria-readonly'] },
  dialog: { desc: 'A dialog is an application window that interrupts the current processing.', attrs: ['aria-modal'] },
  gridcell: { desc: 'A cell in a grid or treegrid.', attrs: ['aria-selected','aria-expanded'] },
  link: { desc: 'An interactive reference to an internal or external resource.', attrs: ['aria-expanded'] },
  log: { desc: 'A type of live region where new information is added in meaningful order.', attrs: ['aria-live','aria-atomic','aria-relevant'] },
  marquee: { desc: 'A type of live region where non-essential information changes frequently.', attrs: ['aria-live','aria-relevant'] },
  menuitem: { desc: 'An option in a set of choices contained by a menu or menubar.', attrs: ['aria-posinset','aria-setsize'] },
  menuitemcheckbox: { desc: 'A menuitem with a checkable state whose values are true, false, or mixed.', attrs: ['aria-checked'] },
  menuitemradio: { desc: 'A checkable menuitem in a set where only one can be checked at a time.', attrs: ['aria-checked','aria-posinset','aria-setsize'] },
  option: { desc: 'A selectable item in a list.', attrs: ['aria-selected'] },
  progressbar: { desc: 'Displays progress status for lengthy tasks.', attrs: ['aria-valuenow','aria-valuemin','aria-valuemax'] },
  radio: { desc: 'A checkable input in a group where only one can be checked.', attrs: ['aria-checked'] },
  scrollbar: { desc: 'Controls the scrolling of content within a viewing area.', attrs: ['aria-valuenow','aria-valuemin','aria-valuemax','aria-orientation'] },
  searchbox: { desc: 'A type of textbox intended for specifying search criteria.', attrs: ['aria-activedescendant','aria-autocomplete'] },
  slider: { desc: 'Selects a value from within a range.', attrs: ['aria-valuenow','aria-valuemin','aria-valuemax','aria-orientation'] },
  spinbutton: { desc: 'Range with discrete choices.', attrs: ['aria-valuenow','aria-valuemin','aria-valuemax','aria-required','aria-readonly'] },
  status: { desc: 'Advisory information live region.', attrs: ['aria-live','aria-atomic','aria-relevant'] },
  switch: { desc: 'A type of checkbox representing on/off.', attrs: ['aria-checked'] },
  tab: { desc: 'Grouping label selecting tabpanel content.', attrs: ['aria-selected','aria-controls'] },
  tabpanel: { desc: 'Container for the resources associated with a tab.', attrs: ['aria-labelledby'] },
  textbox: { desc: 'Input allowing free-form text.', attrs: ['aria-multiline','aria-activedescendant','aria-autocomplete'] },
  timer: { desc: 'A live region timer/countdown.', attrs: ['aria-live'] },
  tooltip: { desc: 'Contextual popup with a description for an element.', attrs: ['aria-hidden'] },
  treeitem: { desc: 'An option in a tree that may be expanded or collapsed.', attrs: ['aria-expanded','aria-selected','aria-level','aria-setsize','aria-posinset'] },
  combobox: { desc: 'Input controlling another element like listbox or grid that helps set its value.', attrs: ['aria-expanded','aria-controls','aria-activedescendant','aria-autocomplete','aria-required'] },
  grid: { desc: 'Composite widget with rows and cells.', attrs: ['aria-readonly','aria-multiselectable','aria-rowcount','aria-colcount'] },
  listbox: { desc: 'Widget to select one or more items from a list.', attrs: ['aria-multiselectable','aria-required','aria-activedescendant'] },
  menu: { desc: 'Widget offering a list of choices.', attrs: ['aria-activedescendant'] },
  menubar: { desc: 'A presentation of menu typically horizontal.', attrs: ['aria-orientation'] },
  radiogroup: { desc: 'Group of radio buttons.', attrs: ['aria-required'] },
  tablist: { desc: 'List of tab elements.', attrs: ['aria-orientation'] },
  tree: { desc: 'Hierarchical list with expandable groups.', attrs: ['aria-multiselectable','aria-activedescendant'] },
  treegrid: { desc: 'Grid whose rows can be expanded or collapsed.', attrs: ['aria-activedescendant','aria-level'] },
  application: { desc: 'Region declared as a web application.', attrs: [] },
  article: { desc: 'Independent composition forming a document part.', attrs: [] },
  blockquote: { desc: 'Section quoted from another source.', attrs: [] },
  caption: { desc: 'Visible content naming a figure, table, grid, or treegrid.', attrs: [] },
  cell: { desc: 'A cell in a tabular container.', attrs: ['aria-colindex','aria-rowindex','aria-selected'] },
  columnheader: { desc: 'Cell containing header information for a column.', attrs: ['aria-sort','aria-colindex'] },
  definition: { desc: 'Definition of a term.', attrs: [] },
  deletion: { desc: 'Content marked for removal.', attrs: [] },
  directory: { desc: 'List of references to group members (deprecated).', deprecated: true, attrs: [] },
  document: { desc: 'Region with related information declared as document content.', attrs: [] },
  emphasis: { desc: 'Emphasized characters.', attrs: [] },
  feed: { desc: 'Scrollable list of articles.', attrs: ['aria-busy'] },
  figure: { desc: 'Section with graphical/document content.', attrs: [] },
  group: { desc: 'Set of UI objects not in table of contents.', attrs: ['aria-activedescendant'] },
  heading: { desc: 'Heading for a section.', attrs: ['aria-level'] },
  img: { desc: 'Container for elements forming an image.', attrs: ['aria-describedby'] },
  insertion: { desc: 'Content marked as added.', attrs: [] },
  list: { desc: 'Section containing listitem elements.', attrs: ['aria-orientation'] },
  listitem: { desc: 'Single item in a list or directory.', attrs: ['aria-level','aria-setsize','aria-posinset'] },
  math: { desc: 'Mathematical expression.', attrs: [] },
  meter: { desc: 'Represents a scalar or fractional value.', attrs: ['aria-valuenow','aria-valuemin','aria-valuemax'] },
  none: { desc: 'No implicit semantics are exposed.', attrs: [] },
  note: { desc: 'Parenthetic or ancillary section.', attrs: [] },
  paragraph: { desc: 'Paragraph of content.', attrs: [] },
  presentation: { desc: 'No semantics exposed (alias of none).', attrs: [] },
  row: { desc: 'Row of cells.', attrs: ['aria-rowindex','aria-selected'] },
  rowgroup: { desc: 'Group containing one or more row elements.', attrs: [] },
  rowheader: { desc: 'Cell containing header info for a row.', attrs: ['aria-sort','aria-rowindex'] },
  separator: { desc: 'Divider separating sections / groups.', attrs: ['aria-orientation','aria-valuenow','aria-valuemin','aria-valuemax'] },
  strong: { desc: 'Important, serious, or urgent content.', attrs: [] },
  subscript: { desc: 'Subscripted characters.', attrs: [] },
  superscript: { desc: 'Superscripted characters.', attrs: [] },
  table: { desc: 'Data arranged in rows and columns.', attrs: ['aria-rowcount','aria-colcount'] },
  term: { desc: 'Word or phrase with definition.', attrs: [] },
  time: { desc: 'Specific point in time.', attrs: ['datetime'] },
  toolbar: { desc: 'Collection of commonly used function buttons.', attrs: ['aria-orientation'] },
  banner: { desc: 'Region with site-oriented content.', attrs: [] },
  complementary: { desc: 'Supporting section complementary to main content.', attrs: [] },
  contentinfo: { desc: 'Region containing information about the parent document.', attrs: [] },
  form: { desc: 'Region containing a collection of form elements.', attrs: ['aria-describedby'] },
  main: { desc: 'Main content of a document.', attrs: [] },
  navigation: { desc: 'Collection of navigational elements.', attrs: [] },
  region: { desc: 'Perceivable section relevant to a specific purpose.', attrs: ['aria-describedby'] },
  search: { desc: 'Region with search facility.', attrs: [] }
};

// Global ARIA attributes list (subset; enough for extension testing)
const GLOBAL_ARIA_ATTRIBUTES = [
  'aria-label','aria-labelledby','aria-describedby','aria-hidden','aria-disabled','aria-expanded','aria-pressed','aria-selected','aria-checked','aria-required','aria-invalid','aria-busy','aria-current','aria-live','aria-atomic','aria-relevant','aria-readonly','aria-multiline','aria-multiselectable','aria-activedescendant','aria-autocomplete','aria-controls','aria-orientation','aria-placeholder','aria-posinset','aria-setsize','aria-level','aria-valuemin','aria-valuemax','aria-valuenow','aria-roledescription','tabindex'
];

// Templates requiring more than generic handling.
const SPECIAL_TEMPLATES = new Set([
  'button','checkbox','switch','radio','radiogroup','slider','progressbar','spinbutton','combobox','listbox','menu','menubar','tablist','tab','tabpanel','tree','treeitem','grid','gridcell','treegrid','toolbar','dialog','alertdialog','separator','textbox','searchbox'
]);

// Basic HTML escape
function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c] || c);
}

function buildAttributeEditor(role) {
  const meta = ROLE_METADATA[role] || { attrs: [] };
  const roleSpecific = meta.attrs.filter(a => !GLOBAL_ARIA_ATTRIBUTES.includes(a));
  const all = Array.from(new Set([...GLOBAL_ARIA_ATTRIBUTES, ...meta.attrs]));
  return `
    <section class="attr-editor" aria-labelledby="attr-editor-heading">
      <h2 id="attr-editor-heading">Attribute Editor</h2>
      <p class="small">Edit attributes below. Changes apply live to the primary example widget. Empty values remove the attribute. Some inputs show/hide based on the widget type.</p>
      <details open>
        <summary><strong>Global & Common Attributes</strong></summary>
        <div class="attr-grid">
          ${GLOBAL_ARIA_ATTRIBUTES.map(a => attributeInput(a)).join('\n')}
        </div>
      </details>
      ${roleSpecific.length ? `<details open><summary><strong>Role-Specific Attributes</strong></summary><div class="attr-grid">${roleSpecific.map(a => attributeInput(a)).join('\n')}</div></details>` : ''}
    </section>`;
}

function attributeInput(attr) {
  const label = attr;
  const id = `inp-${attr.replace(/[^a-z0-9]/gi,'-')}`;
  let placeholder = '';
  if (/aria-valuenow/.test(attr)) placeholder = 'e.g., 50';
  if (/aria-valuemin/.test(attr)) placeholder = 'e.g., 0';
  if (/aria-valuemax/.test(attr)) placeholder = 'e.g., 100';
  if (/aria-level/.test(attr)) placeholder = 'e.g., 1';
  if (/tabindex/.test(attr)) placeholder = '0 or -1';
  return `<label class="attr-field"><span>${label}</span><input data-attr="${attr}" id="${id}" placeholder="${placeholder}" /></label>`;
}

function buildGenericExample(role) {
  // Provide two elements: native/semantic if appropriate, plus an ARIA div variant.
  let nativePart = '';
  switch (role) {
    case 'button':
      nativePart = '<button id="example-btn" type="button">Native Button</button>';
      break;
    case 'checkbox':
      nativePart = '<label><input id="example-cb" type="checkbox" /> Native Checkbox</label>';
      break;
    case 'link':
      nativePart = '<a id="example-link" href="#" onclick="return false;">Native Link</a>';
      break;
    case 'progressbar':
      nativePart = '<progress id="example-progress" value="40" max="100">40%</progress>';
      break;
    case 'textbox':
    case 'searchbox':
      nativePart = '<input id="example-input" type="text" placeholder="Type here" />';
      break;
    case 'slider':
      nativePart = '<input id="example-slider" type="range" min="0" max="100" value="50" />';
      break;
    case 'tab':
    case 'tabpanel':
      nativePart = '<div class="note">Use tablist role example to interact with tabs.</div>';
      break;
    default:
      nativePart = `<div class="native-stub">No distinct native element – demonstrating role via ARIA mapping.</div>`;
  }

  const ariaVariant = `<div class="aria-variant" role="${role}" tabindex="0" id="aria-role-target">ARIA <code>${role}</code> example (focus & interact)</div>`;

  return `<div class="examples" id="example-host">
    <h2>Examples</h2>
    <div class="example-row">
      <div class="example-col">
        <h3 class="ex-heading">Primary Widget</h3>
        <div class="widget" id="widget-root" data-role="${role}">${nativePart}</div>
      </div>
      <div class="example-col">
        <h3 class="ex-heading">ARIA Variant</h3>
        ${ariaVariant}
      </div>
    </div>
    <div class="shadow-toggle">
      <button id="toggle-shadow" type="button">Enable Shadow DOM Variant</button>
      <div id="shadow-host-container" aria-live="off"></div>
    </div>
  </div>`;
}

function buildSpecialExample(role) {
  // Provide interactive behavior (keyboard & state updates) for complex roles.
  switch (role) {
    case 'button':
      return `<div class="examples" id="example-host">
        <h2>Examples</h2>
        <div class="example-row">
          <div class="example-col"><h3 class="ex-heading">Native</h3><button id="widget-root" data-role="button" type="button">Press Me</button></div>
          <div class="example-col"><h3 class="ex-heading">ARIA Div</h3><div role="button" tabindex="0" id="aria-role-target" aria-pressed="false" class="btn-like">Press Space/Enter</div></div>
        </div>
        <p class="small">Keyboard: Space/Enter toggles aria-pressed on ARIA button.</p>
        <div class="shadow-toggle"><button id="toggle-shadow" type="button">Enable Shadow DOM Variant</button><div id="shadow-host-container"></div></div>
      </div>`;
    case 'checkbox':
    case 'switch':
      return `<div class="examples" id="example-host">
        <h2>Examples</h2>
        <div class="example-row">
          <div class="example-col"><h3 class="ex-heading">Native</h3><label><input id="widget-root" data-role="${role}" type="checkbox" /> Native ${role}</label></div>
          <div class="example-col"><h3 class="ex-heading">ARIA</h3><div role="${role === 'switch' ? 'switch' : 'checkbox'}" aria-checked="false" tabindex="0" id="aria-role-target" class="check-like">Toggle (Space)</div></div>
        </div>
        <p class="small">Keyboard: Space toggles aria-checked on ARIA variant.</p>
        <div class="shadow-toggle"><button id="toggle-shadow" type="button">Enable Shadow DOM Variant</button><div id="shadow-host-container"></div></div>
      </div>`;
    case 'radio':
    case 'radiogroup':
      return `<div class="examples" id="example-host">
        <h2>Examples</h2>
        <div class="example-row">
          <div class="example-col"><h3 class="ex-heading">Native Group</h3>
            <fieldset id="widget-root" data-role="radiogroup"><legend>Shipping Speed</legend>
              <label><input type="radio" name="ship" value="std" checked /> Standard</label>
              <label><input type="radio" name="ship" value="exp" /> Express</label>
              <label><input type="radio" name="ship" value="ovr" /> Overnight</label>
            </fieldset></div>
          <div class="example-col"><h3 class="ex-heading">ARIA radiogroup</h3>
            <div role="radiogroup" aria-labelledby="rg-label" class="radiogroup" id="aria-role-target">
              <div id="rg-label" class="visually-hidden">Shipping Speed (ARIA)</div>
              <div role="radio" aria-checked="true" tabindex="0" class="radio" data-value="std">Standard</div>
              <div role="radio" aria-checked="false" tabindex="-1" class="radio" data-value="exp">Express</div>
              <div role="radio" aria-checked="false" tabindex="-1" class="radio" data-value="ovr">Overnight</div>
            </div>
          </div>
        </div>
        <p class="small">Keyboard on ARIA radios: Arrow Left/Right or Up/Down moves selection.</p>
        <div class="shadow-toggle"><button id="toggle-shadow" type="button">Enable Shadow DOM Variant</button><div id="shadow-host-container"></div></div>
      </div>`;
    case 'slider':
      return `<div class="examples" id="example-host">
        <h2>Examples</h2>
        <div class="example-row">
          <div class="example-col"><h3 class="ex-heading">Native Range</h3><input id="widget-root" data-role="slider" type="range" min="0" max="100" value="50" /></div>
          <div class="example-col"><h3 class="ex-heading">ARIA Slider</h3><div role="slider" id="aria-role-target" tabindex="0" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" class="slider-track"><div class="slider-thumb" style="left:50%"></div></div></div>
        </div>
        <p class="small">Keyboard: Left/Right/Down/Up -10/+10; Home/End to min/max.</p>
        <div class="shadow-toggle"><button id="toggle-shadow" type="button">Enable Shadow DOM Variant</button><div id="shadow-host-container"></div></div>
      </div>`;
    case 'progressbar':
      return `<div class="examples" id="example-host">
        <h2>Examples</h2>
        <div class="example-row">
          <div class="example-col"><h3 class="ex-heading">Native</h3><progress id="widget-root" data-role="progressbar" max="100" value="30">30%</progress></div>
          <div class="example-col"><h3 class="ex-heading">ARIA Progress</h3><div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="30" id="aria-role-target" class="progress"><div class="bar" style="width:30%"></div></div></div>
        </div>
        <button id="inc-progress" type="button">Advance 10%</button>
        <div class="shadow-toggle"><button id="toggle-shadow" type="button">Enable Shadow DOM Variant</button><div id="shadow-host-container"></div></div>
      </div>`;
    case 'spinbutton':
      return `<div class="examples" id="example-host">
        <h2>Examples</h2>
        <div class="example-row">
          <div class="example-col"><h3 class="ex-heading">Native Number</h3><input id="widget-root" data-role="spinbutton" type="number" min="0" max="10" value="5" /></div>
          <div class="example-col"><h3 class="ex-heading">ARIA Spinbutton</h3><div role="spinbutton" tabindex="0" id="aria-role-target" aria-valuemin="0" aria-valuemax="10" aria-valuenow="5" class="spinbutton">5</div></div>
        </div>
        <p class="small">Keyboard: Up/Down increments/decrements.</p>
        <div class="shadow-toggle"><button id="toggle-shadow" type="button">Enable Shadow DOM Variant</button><div id="shadow-host-container"></div></div>
      </div>`;
    case 'combobox':
      return `<div class="examples" id="example-host">
        <h2>Examples</h2>
        <div class="example-row">
          <div class="example-col"><h3 class="ex-heading">ARIA Combobox + Listbox</h3>
            <div class="combo-wrapper" id="widget-root" data-role="${role}">
              <input type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="cb-list" aria-activedescendant="" id="cb-input" placeholder="Filter items" />
              <ul role="listbox" id="cb-list" class="listbox" hidden>
                <li role="option" id="opt-a" aria-selected="false">Apple</li>
                <li role="option" id="opt-b" aria-selected="false">Banana</li>
                <li role="option" id="opt-c" aria-selected="false">Cherry</li>
              </ul>
            </div></div>
          <div class="example-col"><h3 class="ex-heading">Plain Select</h3>
            <select id="aria-role-target">
              <option>Apple</option><option>Banana</option><option>Cherry</option>
            </select>
          </div>
        </div>
        <p class="small">Type to filter; Arrow keys / Enter select (ARIA combobox).</p>
        <div class="shadow-toggle"><button id="toggle-shadow" type="button">Enable Shadow DOM Variant</button><div id="shadow-host-container"></div></div>
      </div>`;
    case 'listbox':
      return `<div class="examples" id="example-host">
        <h2>Examples</h2>
        <div class="example-row">
          <div class="example-col"><h3 class="ex-heading">ARIA Listbox (Multi-select)</h3>
            <ul role="listbox" aria-multiselectable="true" id="widget-root" data-role="listbox" class="listbox" aria-label="Sample Multi-select">
              <li role="option" id="lb-opt-1" aria-selected="false" tabindex="0">Alpha</li>
              <li role="option" id="lb-opt-2" aria-selected="false" tabindex="-1">Bravo</li>
              <li role="option" id="lb-opt-3" aria-selected="false" tabindex="-1">Charlie</li>
              <li role="option" id="lb-opt-4" aria-selected="false" tabindex="-1">Delta</li>
              <li role="option" id="lb-opt-5" aria-selected="false" tabindex="-1">Echo</li>
              <li role="option" id="lb-opt-6" aria-selected="false" tabindex="-1">Foxtrot</li>
            </ul>
          </div>
          <div class="example-col"><h3 class="ex-heading">Native Multiple Select</h3>
            <select multiple size="6" id="aria-role-target">
              <option>Alpha</option><option>Bravo</option><option>Charlie</option><option>Delta</option><option>Echo</option><option>Foxtrot</option>
            </select>
          </div>
        </div>
        <p class="small">Keyboard: Up/Down move; Space toggles; Shift+Arrow extends range; Cmd/Ctrl+Space toggles without clearing.</p>
        <div class="shadow-toggle"><button id="toggle-shadow" type="button">Enable Shadow DOM Variant</button><div id="shadow-host-container"></div></div>
      </div>`;
    case 'menu':
    case 'menubar':
      return `<div class="examples" id="example-host">
        <h2>Examples</h2>
        <div class="example-row">
          <div class="example-col"><h3 class="ex-heading">ARIA Menu</h3>
            <div role="menubar" id="widget-root" data-role="menubar" class="menubar">
              <div role="menuitem" tabindex="0" aria-haspopup="true" aria-expanded="false" class="menu-trigger">File
                <div role="menu" class="submenu" hidden>
                  <div role="menuitem" tabindex="-1" aria-haspopup="true" aria-expanded="false" class="menu-trigger nested">New
                    <div role="menu" class="submenu" hidden>
                      <div role="menuitem" tabindex="-1">Project</div>
                      <div role="menuitem" tabindex="-1">Window</div>
                    </div>
                  </div>
                  <div role="menuitem" tabindex="-1">Open</div>
                  <div role="menuitemcheckbox" aria-checked="false" tabindex="-1">Autosave</div>
                </div>
              </div>
              <div role="menuitem" tabindex="0" aria-haspopup="true" aria-expanded="false" class="menu-trigger">Edit
                <div role="menu" class="submenu" hidden>
                  <div role="menuitem" tabindex="-1">Undo</div>
                  <div role="menuitem" tabindex="-1">Redo</div>
                </div>
              </div>
            </div></div>
          <div class="example-col"><h3 class="ex-heading">Nav</h3><nav id="aria-role-target"><a href="#" onclick="return false;">Link 1</a> | <a href="#" onclick="return false;">Link 2</a></nav></div>
        </div>
        <p class="small">Keyboard: Arrow Left/Right moves in menubar; Enter/Space/Arrow Down opens submenu; Arrow Right opens nested; Arrow Left closes; Esc closes all.</p>
        <div class="shadow-toggle"><button id="toggle-shadow" type="button">Enable Shadow DOM Variant</button><div id="shadow-host-container"></div></div>
      </div>`;
    case 'tablist':
    case 'tab':
    case 'tabpanel':
      return `<div class="examples" id="example-host">
        <h2>Examples</h2>
        <div class="tabs" id="widget-root" data-role="tablist" role="tablist">
          <button role="tab" aria-selected="true" id="tab-1" aria-controls="panel-1" tabindex="0">Tab One</button>
          <button role="tab" aria-selected="false" id="tab-2" aria-controls="panel-2" tabindex="-1">Tab Two</button>
          <button role="tab" aria-selected="false" id="tab-3" aria-controls="panel-3" tabindex="-1">Tab Three</button>
        </div>
        <div class="tabpanels">
          <div role="tabpanel" id="panel-1" aria-labelledby="tab-1">Content One</div>
          <div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>Content Two</div>
          <div role="tabpanel" id="panel-3" aria-labelledby="tab-3" hidden>Content Three</div>
        </div>
        <div class="example-col" style="margin-top:1rem"><div id="aria-role-target" class="note">ARIA Tab Composite Example Above</div></div>
        <p class="small">Arrow keys switch tabs; Home/End jump ends.</p>
        <div class="shadow-toggle"><button id="toggle-shadow" type="button">Enable Shadow DOM Variant</button><div id="shadow-host-container"></div></div>
      </div>`;
    case 'tree':
    case 'treeitem':
      return `<div class="examples" id="example-host">
        <h2>Examples</h2>
        <ul role="tree" id="widget-root" data-role="tree" class="tree">
          <li role="treeitem" aria-expanded="true" aria-selected="false" tabindex="0" id="ti-1">Fruits
            <ul role="group">
              <li role="treeitem" aria-selected="false" tabindex="-1" id="ti-1-1">Apple</li>
              <li role="treeitem" aria-selected="false" tabindex="-1" id="ti-1-2">Banana</li>
            </ul>
          </li>
          <li role="treeitem" aria-expanded="false" aria-selected="false" tabindex="-1" id="ti-2">Vegetables
            <ul role="group" hidden>
              <li role="treeitem" aria-selected="false" tabindex="-1" id="ti-2-1">Carrot</li>
              <li role="treeitem" aria-selected="false" tabindex="-1" id="ti-2-2">Pepper</li>
            </ul>
          </li>
        </ul>
        <div class="example-col" style="margin-top:1rem"><div id="aria-role-target" class="note">Tree Composite Above</div></div>
        <p class="small">Arrows navigate, Left collapses, Right expands, Space toggles selection.</p>
        <div class="shadow-toggle"><button id="toggle-shadow" type="button">Enable Shadow DOM Variant</button><div id="shadow-host-container"></div></div>
      </div>`;
    case 'grid':
    case 'gridcell':
    case 'treegrid':
      return `<div class="examples" id="example-host">
        <h2>Examples</h2>
        <div role="grid" id="widget-root" data-role="grid" aria-rowcount="3" aria-colcount="3" class="grid" aria-label="Sample Grid">
          <div role="row" aria-rowindex="1">
            <div role="columnheader" aria-colindex="1">A</div>
            <div role="columnheader" aria-colindex="2">B</div>
            <div role="columnheader" aria-colindex="3">C</div>
          </div>
          <div role="row" aria-rowindex="2">
            <div role="gridcell" aria-selected="false" tabindex="0" aria-colindex="1">1</div>
            <div role="gridcell" aria-selected="false" tabindex="-1" aria-colindex="2">2</div>
            <div role="gridcell" aria-selected="false" tabindex="-1" aria-colindex="3">3</div>
          </div>
          <div role="row" aria-rowindex="3">
            <div role="gridcell" aria-selected="false" tabindex="-1" aria-colindex="1">4</div>
            <div role="gridcell" aria-selected="false" tabindex="-1" aria-colindex="2">5</div>
            <div role="gridcell" aria-selected="false" tabindex="-1" aria-colindex="3">6</div>
          </div>
        </div>
        <div id="aria-role-target" class="note" style="margin-top:1rem">Grid Composite Above</div>
        <p class="small">Arrow keys move focus; Space selects cell; Enter toggles edit mode; Esc cancels editing.</p>
        <div class="shadow-toggle"><button id="toggle-shadow" type="button">Enable Shadow DOM Variant</button><div id="shadow-host-container"></div></div>
      </div>`;
    case 'toolbar':
      return `<div class="examples" id="example-host">
        <h2>Examples</h2>
        <div role="toolbar" id="widget-root" data-role="toolbar" aria-label="Formatting" class="toolbar">
          <button type="button" data-cmd="bold" aria-pressed="false">B</button>
          <button type="button" data-cmd="italic" aria-pressed="false">I</button>
          <button type="button" data-cmd="underline" aria-pressed="false">U</button>
        </div>
        <div id="aria-role-target" class="note" style="margin-top:1rem">Toolbar Example Above</div>
        <p class="small">Space/Enter toggles pressed state.</p>
        <div class="shadow-toggle"><button id="toggle-shadow" type="button">Enable Shadow DOM Variant</button><div id="shadow-host-container"></div></div>
      </div>`;
    case 'dialog':
    case 'alertdialog':
      return `<div class="examples" id="example-host">
        <h2>Examples</h2>
        <button id="open-dialog" type="button">Open Dialog</button>
        <div role="dialog" aria-modal="true" aria-labelledby="dlg-title" id="widget-root" data-role="dialog" class="dialog" hidden>
          <h3 id="dlg-title">Example Dialog</h3>
          <p>This is a modal dialog. Press Escape to close.</p>
          <button type="button" id="close-dialog">Close</button>
        </div>
        <div id="aria-role-target" class="note" style="margin-top:1rem">Dialog container (use button to open)</div>
        <div class="shadow-toggle"><button id="toggle-shadow" type="button">Enable Shadow DOM Variant</button><div id="shadow-host-container"></div></div>
      </div>`;
    case 'separator':
      return `<div class="examples" id="example-host">
        <h2>Examples</h2>
        <div class="example-col"><div role="separator" id="widget-root" data-role="separator" aria-orientation="horizontal" class="separator" tabindex="0"></div></div>
        <div id="aria-role-target" class="note" style="margin-top:1rem">ARIA Separator Above (focusable)</div>
        <p class="small">Up/Down or Left/Right could adjust (not implemented).</p>
        <div class="shadow-toggle"><button id="toggle-shadow" type="button">Enable Shadow DOM Variant</button><div id="shadow-host-container"></div></div>
      </div>`;
    case 'textbox':
    case 'searchbox':
      return buildGenericExample(role); // Generic covers adequately
    default:
      return buildGenericExample(role);
  }
}

// Additional form / grouping demonstration section to exercise fieldset/legend, aria-labelledby, aria-describedby, required/invalid states.
function buildFormGroupSection(role) {
  return `<section class="form-demo" aria-labelledby="form-demo-h">
    <h2 id="form-demo-h">Form & Grouping Demonstration</h2>
    <form aria-labelledby="shipping-form-label" class="demo-form" onsubmit="event.preventDefault();">
      <h3 id="shipping-form-label">Sample Shipping Form</h3>
      <fieldset>
        <legend>Address Type</legend>
        <label><input name="addrType" type="radio" value="home" checked /> Home</label>
        <label><input name="addrType" type="radio" value="business" /> Business</label>
      </fieldset>
      <fieldset aria-labelledby="contact-fieldset-label">
        <legend id="contact-fieldset-label">Contact Info (Programmatic Label)</legend>
        <div class="field">
          <label for="fld-name">Name</label>
          <input id="fld-name" required aria-required="true" aria-describedby="name-help" />
          <div id="name-help" class="small">Enter full legal name.</div>
        </div>
        <div class="field">
          <label for="fld-email">Email</label>
          <input id="fld-email" type="email" aria-describedby="email-help" />
          <div id="email-help" class="small">Optional (used for receipt).</div>
        </div>
      </fieldset>
      <fieldset>
        <legend>Preferences</legend>
        <label><input type="checkbox" id="pref-gift" /> Gift wrap</label>
        <label><input type="checkbox" id="pref-insure" /> Insurance</label>
      </fieldset>
      <div class="field">
        <label for="fld-notes">Delivery Notes</label>
        <textarea id="fld-notes" rows="3" aria-describedby="notes-help"></textarea>
        <div id="notes-help" class="small">Any special instructions.</div>
      </div>
      <button type="submit">Submit (No-op)</button>
    </form>
    <p class="small">Use Attribute Editor to toggle required / invalid states. Group labels exposed via fieldset/legend and aria-labelledby.</p>
  </section>`;
}

function buildExample(role) {
  return SPECIAL_TEMPLATES.has(role) ? buildSpecialExample(role) : buildGenericExample(role);
}

function buildInlineCSS() {
  return `/* Inline minimal styling (also written to assets/aria-test.css) */
body { font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; margin:0; padding:1rem 1.2rem 4rem; line-height:1.4; background:#f7f7fa; color:#222; }
header { background:#fff; padding:1rem 1.25rem; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,.08); margin-bottom:1rem; }
h1 { margin:0 0 .25rem; font-size:1.8rem; }
.deprecated { color:#b30032; font-weight:600; margin-left:.75rem; font-size:.9rem; }
.small { font-size:.8rem; color:#444; }
.examples { background:#fff; border:1px solid #ddd; padding:1rem; border-radius:8px; margin-bottom:1.25rem; }
.example-row { display:flex; flex-wrap:wrap; gap:1rem; }
.example-col { flex:1 1 300px; min-width:260px; }
.widget, .aria-variant, .btn-like, .check-like, .spinbutton, .slider-track, .progress, .radiogroup, .toolbar, .dialog, .grid, .tree { border:1px solid #ccc; background:#fafafa; padding:.75rem; border-radius:6px; position:relative; }
.btn-like, .check-like, [role=button] { cursor:pointer; user-select:none; }
.attr-editor { background:#fff; border:1px solid #ddd; padding:1rem; border-radius:8px; }
.attr-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:.5rem .75rem; margin-top:.75rem; }
.attr-field { display:flex; flex-direction:column; font-size:.75rem; gap:.15rem; }
.attr-field input { padding:.35rem .4rem; font-size:.75rem; border:1px solid #bbb; border-radius:4px; }
.shadow-toggle { margin-top:1rem; }
#toggle-shadow { margin-top:.5rem; }
.visually-hidden { position:absolute; clip:rect(1px,1px,1px,1px); padding:0; border:0; height:1px; width:1px; overflow:hidden; }
.combo-wrapper { max-width:240px; }
.listbox { margin:0; padding:0; list-style:none; border:1px solid #aaa; max-width:240px; }
.listbox [role=option] { padding:.25rem .5rem; cursor:pointer; }
.listbox [role=option][aria-selected=true], .radio[aria-checked=true] { background:#683ab7; color:#fff; }
.radio { padding:.25rem .5rem; margin:.15rem 0; border:1px solid #999; border-radius:4px; cursor:pointer; }
.slider-track { height:28px; background:linear-gradient(#eee,#ddd); }
.slider-thumb { position:absolute; top:2px; width:24px; height:24px; background:#683ab7; border-radius:50%; transform:translateX(-50%); }
.progress { width:200px; height:16px; background:#eee; border-radius:4px; overflow:hidden; }
.progress .bar { background:#683ab7; height:100%; }
.spinbutton { width:60px; text-align:center; }
.menubar { display:flex; gap:.5rem; }
.menu-trigger { position:relative; padding:.25rem .5rem; border:1px solid #aaa; border-radius:4px; cursor:pointer; }
.submenu { position:absolute; left:0; top:100%; background:#fff; border:1px solid #aaa; padding:.25rem 0; border-radius:4px; min-width:120px; z-index:10; }
.submenu [role=menuitem] { padding:.25rem .75rem; cursor:pointer; }
.tabs [role=tab] { padding:.4rem .75rem; border:1px solid #aaa; background:#fff; cursor:pointer; border-bottom:none; margin-right:.25rem; border-top-left-radius:4px; border-top-right-radius:4px; }
.tabs [role=tab][aria-selected=false] { background:#eee; }
.tabpanels { border:1px solid #aaa; padding:.75rem; border-radius:0 4px 4px 4px; background:#fff; }
.tree, .tree ul { list-style:none; margin:0; padding-left:1rem; }
.tree [role=treeitem] { cursor:pointer; }
.grid { display:inline-block; }
.grid [role=row] { display:flex; }
.grid [role=columnheader], .grid [role=gridcell] { padding:.25rem .5rem; border:1px solid #999; min-width:32px; text-align:center; }
.toolbar button { margin-right:.25rem; }
.dialog { max-width:360px; background:#fff; padding:1rem; border:2px solid #683ab7; }
.separator { height:4px; background:#999; }
.note { font-size:.75rem; color:#333; }
footer { margin-top:3rem; font-size:.65rem; text-align:center; color:#555; }
code { background:#eee; padding:2px 4px; border-radius:3px; }
button { cursor:pointer; }
*:focus-visible { outline:2px solid #683ab7; outline-offset:2px; box-shadow:0 0 0 4px #fff; }
`;}

  function toggleAriaPressed(el){ if(!el) return; const cur = el.getAttribute('aria-pressed')==='true'; el.setAttribute('aria-pressed', String(!cur)); }
  function toggleAriaChecked(el){ if(!el) return; const cur = el.getAttribute('aria-checked'); let next = (cur==='true') ? 'false' : 'true'; if(cur==='mixed') next='true'; el.setAttribute('aria-checked', next); }
function buildInlineJS(role) {
  return `// Inline behavior JS (also written to assets/aria-test.js)\n(function(){\n  const role = ${JSON.stringify(role)};\n  const root = document.getElementById('widget-root');\n  const ariaVariant = document.getElementById('aria-role-target');\n  const shadowToggle = document.getElementById('toggle-shadow');\n  const shadowHostContainer = document.getElementById('shadow-host-container');\n  let shadowEnabled = false;\n\n  function byAttrInputs(){ return Array.from(document.querySelectorAll('[data-attr]')); }\n  function targetElement(){ return root || ariaVariant; }\n  function applyAttr(el, name, value){ if(!el) return; if(!value && value !== '0'){ el.removeAttribute(name); return; } el.setAttribute(name, value); }\n  function handleAttrChange(e){ const input=e.target; if(!input.matches('[data-attr]')) return; const attr=input.getAttribute('data-attr'); const val=input.value.trim(); [targetElement(), ariaVariant].filter(Boolean).forEach(el=>applyAttr(el, attr, val)); }\n  document.addEventListener('input', handleAttrChange);\n\n  function toggleAriaPressed(el){ if(!el) return; const cur=el.getAttribute('aria-pressed')==='true'; el.setAttribute('aria-pressed', String(!cur)); }\n  function toggleAriaChecked(el){ if(!el) return; const cur=el.getAttribute('aria-checked'); let next=(cur==='true')?'false':'true'; if(cur==='mixed') next='true'; el.setAttribute('aria-checked', next); }\n\n  // Enhanced role-specific behaviors (Step 3)\n  switch(role){\n    case 'button':\n      if(ariaVariant) ariaVariant.addEventListener('keydown', e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); toggleAriaPressed(ariaVariant); }});\n      ariaVariant && ariaVariant.addEventListener('click', ()=>toggleAriaPressed(ariaVariant));\n      break;\n    case 'checkbox':\n    case 'switch':\n      ariaVariant && ariaVariant.addEventListener('keydown', e=>{ if(e.key===' '){ e.preventDefault(); toggleAriaChecked(ariaVariant);} });\n      ariaVariant && ariaVariant.addEventListener('click', ()=>toggleAriaChecked(ariaVariant));\n      break;\n    case 'radio':\n    case 'radiogroup': { const group=document.querySelector('[role=radiogroup]'); if(group){ group.addEventListener('keydown', e=>{ if(['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(e.key)){ e.preventDefault(); const radios=[...group.querySelectorAll('[role=radio]')]; const current=radios.find(r=>r.getAttribute('aria-checked')==='true'); let i=radios.indexOf(current); i=(e.key==='ArrowLeft'||e.key==='ArrowUp')? (i-1+radios.length)%radios.length : (i+1)%radios.length; radios.forEach(r=>{ r.setAttribute('aria-checked','false'); r.tabIndex=-1; }); radios[i].setAttribute('aria-checked','true'); radios[i].tabIndex=0; radios[i].focus(); } }); group.addEventListener('click', e=>{ const r=e.target.closest('[role=radio]'); if(!r)return; const radios=group.querySelectorAll('[role=radio]'); radios.forEach(n=>{ n.setAttribute('aria-checked','false'); n.tabIndex=-1; }); r.setAttribute('aria-checked','true'); r.tabIndex=0; r.focus(); }); } break; }\n    case 'slider': { const slider=ariaVariant; if(slider){ slider.addEventListener('keydown', e=>{ const keyMap={ArrowLeft:-10,ArrowDown:-10,ArrowRight:10,ArrowUp:10,Home:'min',End:'max'}; if(!(e.key in keyMap)) return; e.preventDefault(); let val=parseInt(slider.getAttribute('aria-valuenow'),10); const min=parseInt(slider.getAttribute('aria-valuemin'),10); const max=parseInt(slider.getAttribute('aria-valuemax'),10); const delta=keyMap[e.key]; if(delta==='min') val=min; else if(delta==='max') val=max; else val=Math.min(max, Math.max(min, val+delta)); slider.setAttribute('aria-valuenow', String(val)); const thumb=slider.querySelector('.slider-thumb'); if(thumb){ const pct=((val-min)/(max-min))*100; thumb.style.left=pct+'%'; } }); } break; }\n    case 'progressbar': { const btn=document.getElementById('inc-progress'); const bar=ariaVariant; if(btn&&bar){ btn.addEventListener('click', ()=>{ const min=+bar.getAttribute('aria-valuemin'); const max=+bar.getAttribute('aria-valuemax'); let val=+bar.getAttribute('aria-valuenow'); val=Math.min(max,val+10); bar.setAttribute('aria-valuenow', String(val)); const inner=bar.querySelector('.bar'); if(inner){ const pct=((val-min)/(max-min))*100; inner.style.width=pct+'%'; } }); } break; }\n    case 'spinbutton': { const spin=ariaVariant; if(spin){ spin.addEventListener('keydown', e=>{ if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(e.key)){ e.preventDefault(); const min=+spin.getAttribute('aria-valuemin'); const max=+spin.getAttribute('aria-valuemax'); let val=+spin.getAttribute('aria-valuenow'); const step=(e.key==='PageUp'||e.key==='PageDown')?5:1; if(e.key==='ArrowUp'||e.key==='PageUp') val=Math.min(max,val+step); else if(e.key==='ArrowDown'||e.key==='PageDown') val=Math.max(min,val-step); else if(e.key==='Home') val=min; else if(e.key==='End') val=max; spin.setAttribute('aria-valuenow', String(val)); spin.textContent=val; } }); } break; }\n    case 'combobox': { const input=document.getElementById('cb-input'); const list=document.getElementById('cb-list'); if(input&&list){ const options=[...list.querySelectorAll('[role=option]')]; function open(){ list.hidden=false; input.setAttribute('aria-expanded','true'); } function close(){ list.hidden=true; input.setAttribute('aria-expanded','false'); input.setAttribute('aria-activedescendant',''); } input.addEventListener('input', ()=>{ const term=input.value.toLowerCase(); options.forEach(o=>{ o.hidden=!o.textContent.toLowerCase().includes(term); }); open(); }); input.addEventListener('keydown', e=>{ const visible=options.filter(o=>!o.hidden); let idx=visible.findIndex(o=>o.id===input.getAttribute('aria-activedescendant')); if(e.key==='ArrowDown'){ e.preventDefault(); if(list.hidden) open(); idx=(idx+1)%visible.length; } else if(e.key==='ArrowUp'){ e.preventDefault(); idx=(idx-1+visible.length)%visible.length; } else if(e.key==='Enter'){ const active=visible[idx]; if(active){ options.forEach(o=>o.setAttribute('aria-selected','false')); active.setAttribute('aria-selected','true'); input.value=active.textContent; close(); } } else if(e.key==='Escape'){ close(); return; } else return; const active=visible[idx]; if(active){ input.setAttribute('aria-activedescendant', active.id); } }); list.addEventListener('click', e=>{ const opt=e.target.closest('[role=option]'); if(!opt) return; options.forEach(o=>o.setAttribute('aria-selected','false')); opt.setAttribute('aria-selected','true'); input.value=opt.textContent; close(); }); document.addEventListener('click', e=>{ if(!e.target.closest('.combo-wrapper')) close(); }); } break; }\n    case 'listbox': { const lb=document.getElementById('widget-root'); if(lb){ let anchor=null; function opts(){ return [...lb.querySelectorAll('[role=option]')]; } function focusOpt(o){ opts().forEach(opt=>opt.tabIndex=-1); o.tabIndex=0; o.focus(); } function toggleSelect(o, additive){ if(!additive){ opts().forEach(opt=>opt.setAttribute('aria-selected','false')); } const cur=o.getAttribute('aria-selected')==='true'; o.setAttribute('aria-selected', additive ? String(!cur) : 'true'); if(!anchor || !additive) anchor=o; } function rangeSelect(to){ if(!anchor) anchor=to; const list=opts(); const a=list.indexOf(anchor); const b=list.indexOf(to); const [start,end]= a<b ? [a,b] : [b,a]; list.forEach((o,i)=>{ o.setAttribute('aria-selected', i>=start && i<=end ? 'true':'false'); }); } lb.addEventListener('click', e=>{ const opt=e.target.closest('[role=option]'); if(!opt) return; const multi=lb.getAttribute('aria-multiselectable')==='true'; toggleSelect(opt, multi && (e.metaKey||e.ctrlKey)); focusOpt(opt); }); lb.addEventListener('keydown', e=>{ const list=opts(); let current=document.activeElement.closest('[role=option]'); if(!current){ current=list[0]; focusOpt(current); return; } let idx=list.indexOf(current); if(e.key==='ArrowDown'){ e.preventDefault(); idx=Math.min(list.length-1, idx+1); focusOpt(list[idx]); if(e.shiftKey) rangeSelect(list[idx]); } else if(e.key==='ArrowUp'){ e.preventDefault(); idx=Math.max(0, idx-1); focusOpt(list[idx]); if(e.shiftKey) rangeSelect(list[idx]); } else if(e.key===' '){ e.preventDefault(); const multi=lb.getAttribute('aria-multiselectable')==='true'; if(e.shiftKey){ rangeSelect(current); } else toggleSelect(current, multi && (e.metaKey||e.ctrlKey)); } else if(e.key==='Home'){ e.preventDefault(); focusOpt(list[0]); if(e.shiftKey) rangeSelect(list[0]); } else if(e.key==='End'){ e.preventDefault(); focusOpt(list[list.length-1]); if(e.shiftKey) rangeSelect(list[list.length-1]); } }); } break; }\n    case 'menu':\n    case 'menubar': { const menubar=document.querySelector('[role=menubar]'); if(menubar){ function toggleSubmenu(trigger, openForce){ const submenu=trigger.querySelector('[role=menu]'); if(!submenu) return; const open=openForce!=null ? openForce : submenu.hidden; submenu.hidden=!open; trigger.setAttribute('aria-expanded', String(open)); if(!open) submenu.querySelectorAll('[role=menuitem],[role=menuitemcheckbox]').forEach(mi=>mi.tabIndex=-1); else submenu.querySelectorAll('[role=menuitem],[role=menuitemcheckbox]').forEach(mi=>mi.tabIndex=0); } function closeAll(){ menubar.querySelectorAll('.menu-trigger').forEach(t=>{ const sm=t.querySelector('[role=menu]'); if(sm){ sm.hidden=true; t.setAttribute('aria-expanded','false'); } }); } menubar.addEventListener('keydown', e=>{ const top=[...menubar.children]; const cur=e.target.closest('.menu-trigger'); let i=top.indexOf(cur); if(e.key==='ArrowRight'){ e.preventDefault(); i=(i+1)%top.length; top[i].focus(); } else if(e.key==='ArrowLeft'){ e.preventDefault(); i=(i-1+top.length)%top.length; top[i].focus(); } else if(['Enter',' ','ArrowDown'].includes(e.key)){ e.preventDefault(); toggleSubmenu(cur,true); const first=cur.querySelector('[role=menuitem]'); first && first.focus(); } else if(e.key==='Escape'){ e.preventDefault(); closeAll(); top[0].focus(); } }); menubar.addEventListener('keydown', e=>{ if(e.target.getAttribute('role')==='menuitem'){ const submenu=e.target.closest('[role=menu]'); if(!submenu) return; const items=[...submenu.querySelectorAll('[role=menuitem],[role=menuitemcheckbox]')]; let idx=items.indexOf(e.target); if(e.key==='ArrowDown'){ e.preventDefault(); idx=(idx+1)%items.length; items[idx].focus(); } else if(e.key==='ArrowUp'){ e.preventDefault(); idx=(idx-1+items.length)%items.length; items[idx].focus(); } else if(e.key==='Escape'){ e.preventDefault(); const parent=submenu.parentElement; toggleSubmenu(parent,false); parent.focus(); } else if(e.key==='ArrowRight'){ const nested=e.target.classList.contains('menu-trigger') ? e.target.querySelector('[role=menu]') : null; if(nested){ e.preventDefault(); toggleSubmenu(e.target,true); const first=nested.querySelector('[role=menuitem]'); first && first.focus(); } } else if(e.key==='ArrowLeft'){ const parentTrigger=submenu.parentElement.closest('.menu-trigger'); if(parentTrigger){ e.preventDefault(); toggleSubmenu(parentTrigger,false); parentTrigger.focus(); } } } }); menubar.addEventListener('click', e=>{ const trigger=e.target.closest('.menu-trigger'); if(trigger){ toggleSubmenu(trigger); } }); document.addEventListener('click', e=>{ if(!e.target.closest('[role=menubar]')) closeAll(); }); } break; }\n    case 'tablist':\n    case 'tab':\n    case 'tabpanel': { const tablist=document.querySelector('[role=tablist]'); if(tablist){ function activate(tab){ const tabs=[...tablist.querySelectorAll('[role=tab]')]; tabs.forEach(t=>{ const sel=t===tab; t.setAttribute('aria-selected', String(sel)); t.tabIndex= sel?0:-1; const panel=document.getElementById(t.getAttribute('aria-controls')); if(panel) panel.hidden=!sel; }); tab.focus(); } tablist.addEventListener('click', e=>{ const t=e.target.closest('[role=tab]'); if(t) activate(t); }); tablist.addEventListener('keydown', e=>{ const tabs=[...tablist.querySelectorAll('[role=tab]')]; const current=document.activeElement.closest('[role=tab]'); let i=tabs.indexOf(current); if(['ArrowRight','ArrowDown'].includes(e.key)){ e.preventDefault(); i=(i+1)%tabs.length; activate(tabs[i]); } else if(['ArrowLeft','ArrowUp'].includes(e.key)){ e.preventDefault(); i=(i-1+tabs.length)%tabs.length; activate(tabs[i]); } else if(e.key==='Home'){ e.preventDefault(); activate(tabs[0]); } else if(e.key==='End'){ e.preventDefault(); activate(tabs[tabs.length-1]); } }); } break; }\n    case 'tree':\n    case 'treeitem': { const tree=document.querySelector('[role=tree]'); if(tree){ function toggleExpand(item, force){ const expanded=force!=null ? !force : item.getAttribute('aria-expanded')==='true'; const next=!expanded; item.setAttribute('aria-expanded', String(next)); const group=item.querySelector('[role=group]'); if(group) group.hidden=!next; } tree.addEventListener('keydown', e=>{ const items=[...tree.querySelectorAll('[role=treeitem]')]; const current=document.activeElement.closest('[role=treeitem]'); if(!current) return; let idx=items.indexOf(current); if(e.key==='ArrowDown'){ e.preventDefault(); idx=Math.min(items.length-1, idx+1); items[idx].focus(); } else if(e.key==='ArrowUp'){ e.preventDefault(); idx=Math.max(0, idx-1); items[idx].focus(); } else if(e.key==='ArrowRight'){ e.preventDefault(); if(current.getAttribute('aria-expanded')==='false'){ toggleExpand(current,true); } } else if(e.key==='ArrowLeft'){ e.preventDefault(); if(current.getAttribute('aria-expanded')==='true'){ toggleExpand(current,false); } } else if(e.key===' '){ e.preventDefault(); const sel=current.getAttribute('aria-selected')==='true'; current.setAttribute('aria-selected', String(!sel)); } }); tree.addEventListener('click', e=>{ const item=e.target.closest('[role=treeitem]'); if(!item) return; if(item.getAttribute('aria-expanded')) toggleExpand(item); const sel=item.getAttribute('aria-selected')==='true'; item.setAttribute('aria-selected', String(!sel)); }); } break; }\n    case 'grid':\n    case 'gridcell':\n    case 'treegrid': { const grid=document.querySelector('[role=grid]'); if(grid){ let editingCell=null; grid.addEventListener('keydown', e=>{ const cells=[...grid.querySelectorAll('[role=gridcell]')]; const current=document.activeElement.closest('[role=gridcell]'); if(!current) return; const cols=grid.querySelectorAll('[role=row]')[1].querySelectorAll('[role=gridcell]').length; let idx=cells.indexOf(current); if(editingCell && e.key==='Escape'){ e.preventDefault(); const input=editingCell.querySelector('input'); if(input){ editingCell.textContent=input.getAttribute('data-orig'); editingCell.setAttribute('aria-selected','false'); editingCell.tabIndex=0; editingCell.focus(); editingCell=null; } return; } if(editingCell){ if(e.key==='Enter'){ e.preventDefault(); const input=editingCell.querySelector('input'); if(input){ editingCell.textContent=input.value; editingCell.setAttribute('aria-selected','false'); editingCell.tabIndex=0; editingCell.focus(); editingCell=null; } } return; } if(e.key==='ArrowRight'){ e.preventDefault(); idx=(idx+1)%cells.length; } else if(e.key==='ArrowLeft'){ e.preventDefault(); idx=(idx-1+cells.length)%cells.length; } else if(e.key==='ArrowDown'){ e.preventDefault(); idx=(idx+cols)%cells.length; } else if(e.key==='ArrowUp'){ e.preventDefault(); idx=(idx-cols+cells.length)%cells.length; } else if(e.key===' '){ e.preventDefault(); const sel=current.getAttribute('aria-selected')==='true'; current.setAttribute('aria-selected', String(!sel)); return; } else if(e.key==='Enter'){ e.preventDefault(); const val=current.textContent.trim(); current.setAttribute('data-orig', val); current.innerHTML='<input aria-label=\"Edit cell\" data-orig=\"'+val.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'\" value=\"'+val.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'\" />'; const input=current.querySelector('input'); editingCell=current; input.focus(); input.select(); return; } else return; cells.forEach(c=>c.tabIndex=-1); const next=cells[idx]; next.tabIndex=0; next.focus(); }); grid.addEventListener('click', e=>{ const cell=e.target.closest('[role=gridcell]'); if(!cell) return; const sel=cell.getAttribute('aria-selected')==='true'; cell.setAttribute('aria-selected', String(!sel)); }); } break; }\n    case 'toolbar': { const tb=root; if(tb){ tb.addEventListener('click', e=>{ const btn=e.target.closest('button'); if(btn){ const pressed=btn.getAttribute('aria-pressed')==='true'; btn.setAttribute('aria-pressed', String(!pressed)); } }); tb.addEventListener('keydown', e=>{ const items=[...tb.querySelectorAll('button')]; const current=document.activeElement; let idx=items.indexOf(current); if(e.key==='ArrowRight'){ e.preventDefault(); idx=(idx+1)%items.length; items[idx].focus(); } else if(e.key==='ArrowLeft'){ e.preventDefault(); idx=(idx-1+items.length)%items.length; items[idx].focus(); } }); } break; }\n    case 'dialog':\n    case 'alertdialog': { const openBtn=document.getElementById('open-dialog'); const dlg=root; const closeBtn=document.getElementById('close-dialog'); function open(){ dlg.hidden=false; dlg.querySelector('h3').focus(); } function close(){ dlg.hidden=true; openBtn.focus(); } if(openBtn && dlg){ openBtn.addEventListener('click', open); closeBtn && closeBtn.addEventListener('click', close); document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !dlg.hidden) close(); }); } break; }\n  }\n\n  // Shadow DOM toggle - duplicates widget-root (light) into shadow root\n  if(shadowToggle){ shadowToggle.addEventListener('click', ()=>{ shadowEnabled=!shadowEnabled; if(shadowEnabled){ shadowToggle.textContent='Disable Shadow DOM Variant'; const host=document.createElement('div'); host.className='shadow-wrapper'; shadowHostContainer.innerHTML=''; shadowHostContainer.appendChild(host); const sr=host.attachShadow({mode:'open'}); const clone=root.cloneNode(true); clone.id='shadow-clone'; sr.innerHTML='<style>'+document.getElementById('inline-style').textContent+'</style>'; sr.appendChild(clone); } else { shadowToggle.textContent='Enable Shadow DOM Variant'; shadowHostContainer.innerHTML=''; } }); }\n\n})();`;
}

function buildPage(role) {
  const meta = ROLE_METADATA[role] || { desc: 'Role description not found.', attrs: [] };
  const deprecated = !!meta.deprecated;
  const example = buildExample(role);
  const formRelated = new Set(['form','group','checkbox','radio','radiogroup','textbox','searchbox']);
  const formSection = formRelated.has(role) ? buildFormGroupSection(role) : '';
  const inlineCSS = buildInlineCSS();
  const inlineJS = buildInlineJS(role);
  const attrEditor = buildAttributeEditor(role);
  const testNotes = `
    <section class="test-notes" aria-labelledby="test-notes-h">
      <h2 id="test-notes-h">Test Notes & Acceptance Criteria</h2>
      <ul>
        <li>Verify computed role appears as <code>${role}</code>${deprecated ? ' (deprecated)' : ''}.</li>
        <li>Adjust attributes in the editor; confirm live reflection in inspector (no stale cache).</li>
        <li>Keyboard interaction updates state attributes (e.g., aria-selected, aria-checked, aria-valuenow where applicable).</li>
        <li>Shadow DOM variant replicates semantics (toggle to verify).</li>
        <li>If description is added via <code>aria-describedby</code>, confirm it appears; removing it should not display a literal "(no description)" placeholder in the extension.</li>
      </ul>
    </section>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>ARIA Role: ${role}</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style id="inline-style">${inlineCSS}</style>
</head>
<body>
<header>
  <h1>Role: <code>${role}</code>${deprecated ? '<span class="deprecated">DEPRECATED</span>' : ''}</h1>
  <p>${esc(meta.desc)}</p>
  <nav><a href="index.html">&#8592; Back to index</a></nav>
</header>
${example}
${formSection}
${attrEditor}
${testNotes}
<footer>Generated for accessibility testing &middot; ${new Date().toISOString()}</footer>
<script id="inline-script">${inlineJS}</script>
</body>
</html>`;
}

function buildIndex(pages) {
  const count = pages.length;
  const stats = { deprecated: pages.filter(p=>ROLE_METADATA[p].deprecated).length };
  const cards = Object.entries(ROLE_CATEGORIES).map(([cat, roles]) => {
    const roleCards = roles.map(r => `<a class="role-card" href="${r}.html" data-role="${r}"><div class="role-name">${r}${ROLE_METADATA[r] && ROLE_METADATA[r].deprecated ? '<span class=\"deprecated-badge\">DEPRECATED</span>' : ''}</div><div class="role-desc">${esc((ROLE_METADATA[r]||{}).desc || '')}</div></a>`).join('\n');
    return `<section class="category" data-category="${esc(cat)}"><h2>${esc(cat)}</h2><div class="role-grid">${roleCards}</div></section>`;
  }).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>ARIA Role Index</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
body { font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; margin:0; padding:1rem 1.5rem 4rem; background:#f0f2f7; }
header { text-align:center; padding:1.25rem 1rem 2rem; }
h1 { margin:.2rem 0 .4rem; font-size:2rem; }
.search { max-width:420px; margin:0 auto; }
.search input { width:100%; padding:.75rem 1rem; font-size:1rem; border:2px solid #ccc; border-radius:32px; }
.search input:focus-visible { outline:2px solid #683ab7; outline-offset:2px; }
.stats { display:flex; gap:1rem; flex-wrap:wrap; justify-content:center; margin:1rem 0 1.5rem; }
.stat { background:#fff; border:1px solid #ddd; padding:.75rem 1rem; border-radius:8px; font-size:.8rem; }
.category { background:#fff; border:1px solid #ddd; margin:1.25rem auto; padding:1rem 1.25rem 1.5rem; border-radius:10px; max-width:1400px; }
.category h2 { margin:0 0 .75rem; font-size:1.3rem; }
.role-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:.75rem; }
.role-card { display:block; background:#fafbff; border:1px solid #d7dae2; padding:.65rem .7rem .8rem; border-radius:8px; text-decoration:none; color:#222; font-size:.75rem; position:relative; }
.role-card:hover { background:#fff; border-color:#683ab7; box-shadow:0 2px 4px rgba(0,0,0,.12); }
.role-name { font-weight:600; font-family:monospace; font-size:.9rem; margin-bottom:.25rem; display:flex; align-items:center; gap:.5rem; }
.role-desc { font-size:.65rem; line-height:1.25; color:#333; }
.deprecated-badge { background:#b30032; color:#fff; padding:2px 6px; font-size:.55rem; border-radius:14px; }
footer { margin-top:3rem; text-align:center; font-size:.65rem; color:#555; }
.hidden { display:none !important; }
</style>
</head>
<body>
<header>
  <h1>ARIA Role Test Pages</h1>
  <p>Concrete WAI-ARIA 1.2 roles (including deprecated) – file:// ready pages.</p>
  <div class="search"><input id="search" placeholder="Search roles & descriptions (Press / to focus)" aria-label="Search roles"></div>
  <div class="stats">
    <div class="stat">Total Roles: ${count}</div>
    <div class="stat">Deprecated: ${stats.deprecated}</div>
    <div class="stat">Generated: ${new Date().toISOString().split('T')[0]}</div>
  </div>
</header>
${cards}
<footer>Generated ARIA role index &middot; ${new Date().toISOString()}</footer>
<script>(function(){\n const input=document.getElementById('search'); const cards=[...document.querySelectorAll('.role-card')]; const cats=[...document.querySelectorAll('.category')]; function filter(){ const term=input.value.toLowerCase(); cards.forEach(c=>{ const t=c.getAttribute('data-role'); const d=c.querySelector('.role-desc').textContent.toLowerCase(); const show= t.includes(term) || d.includes(term); c.classList.toggle('hidden', !show); }); cats.forEach(cat=>{ const visible=cat.querySelectorAll('.role-card:not(.hidden)').length; cat.classList.toggle('hidden', !visible); }); } input.addEventListener('input', filter); document.addEventListener('keydown', e=>{ if(e.key==='/' && document.activeElement!==input){ e.preventDefault(); input.focus(); } });})();</script>
</body>
</html>`;
}

function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true }); }

function writeAssets(css, js){
  ensureDir(ASSETS_DIR);
  fs.writeFileSync(path.join(ASSETS_DIR, 'aria-test.css'), css, 'utf8');
  fs.writeFileSync(path.join(ASSETS_DIR, 'aria-test.js'), js, 'utf8');
}

function buildReadme() {
  return `# ARIA Role Test Pages\n\nGenerated set of self-contained pages (one per concrete WAI-ARIA 1.2 role, including deprecated roles) for exercising the Nexus Accessibility extension on file:// URLs.\n\n## Generate / Refresh\n\nRun from project root (or this directory):\n\n\nnode tests/aria/generate-aria-pages.js\n\n\nOutputs:\n- [3mtests/aria/index.html[23m – searchable, categorized index (works offline on file://)\n- [3mtests/aria/<role>.html[23m – per-role pages\n- [3mtests/aria/assets/aria-test.(css|js)[23m – shared asset copies (each page also inlines its own copy)\n\nOpen any page directly (Finder / Explorer double‑click) – NO server needed.\n\n## Index & Navigation\n- Categories: Roles grouped (Widget, Composite, Document Structure, Landmark, Live, Window, Graphics, etc.).\n- Quick Search: Type in the search box or press `/` from the index page to focus it. Matches role name or description substring (case-insensitive).\n- Deprecated roles visually flagged.\n\n## Shadow DOM\nEach role page includes a Shadow DOM toggle that clones the primary widget into a shadow root (style + markup) for testing accessibility tree extraction through shadow boundaries.\n\n## Attribute Editor\nEvery page provides an Attribute Editor for global + role-specific ARIA.\n- Empty value removes the attribute.\n- Applies simultaneously to the primary widget root and any explicit role variant element (when present).\n- Safe to experiment with invalid values (pages purposely avoid network / XSS vectors).\n\n## Advanced Keyboard Semantics (Representative Roles)\nUpdated in Step 3 to cover richer composite patterns.\n- Button / Switch / Checkbox: Space / Enter toggles state.\n- Radiogroup: Arrow Left/Right/Up/Down roves and selects.\n- Slider: Arrow (±10), Home/End (min/max).\n- Spinbutton: Up/Down (±1), PageUp/PageDown (±5), Home/End (bounds).\n- Combobox (editable, list popup): Type filters; Arrow Up/Down moves active option; Enter selects & closes; Esc closes; active option set via aria-activedescendant.\n- Listbox (multi-select demo): Arrow Up/Down moves focus. Space toggles selection. Shift+Arrow / Shift+Home / Shift+End extends a contiguous range from the anchor. Cmd/Ctrl+Click (or Cmd/Ctrl+Space) toggles individual items without clearing others.\n- Menu / Menubar (with nested submenu): Arrow Left/Right moves across top-level triggers. Enter / Space / Arrow Down opens a submenu. Arrow Right opens a nested submenu from a submenu trigger; Arrow Left or Esc closes the current submenu and returns focus to its trigger.\n- Tabs: Arrow Left/Right or Up/Down (depending on orientation semantics) moves selection; Home/End jump to first/last tab.\n- Tree: Arrow Up/Down moves visible item focus; Arrow Right expands (if collapsible); Arrow Left collapses; Space toggles aria-selected on focusable items (selection independent of expansion).\n- Grid: Arrow keys move cell focus (roving tabindex). Space toggles aria-selected on the active cell. Enter enters edit mode (inline text input), Enter again commits, Escape cancels and restores original value.\n- Dialog / Alertdialog: Trigger button opens; Esc closes.\n\n## Testing Guidelines\n1. Confirm each role page loads via file:// without mixed-content warnings.\n2. Use the Attribute Editor to add / remove ARIA (e.g., aria-label, aria-describedby) and verify live reflection in your extension inspector.\n3. Toggle Shadow DOM and ensure semantics remain equivalent (compare accessible name / role / states).\n4. Exercise keyboard models above; verify state attributes (aria-selected / aria-checked / aria-pressed / aria-expanded / aria-valuenow) mutate correctly.\n5. For composite widgets (tree, grid, listbox) confirm focus management (single tab stop with internal roving).\n\n## Manifest / Content Script Ordering Note\nWhen loading these test pages during extension development, ensure manifest.json lists core screen reader preview + accessibility libs before UI wrapper content scripts, e.g.:\n\n~~~json\n"content_scripts": [\n  {\n    "matches": ["<all_urls>"],\n    "js": [\n      "src/libs/dom-accessibility-api.js",\n      "src/libs/aria-query.js",\n      "src/utils/sr-preview.js",              // CORE first\n      "src/utils/sr-preview-content.js",      // transformer bridge\n      "src/components/inspector/inspector-sr-preview.js",\n      "src/components/inspector/inspector-core.js"\n    ],\n    "run_at": "document_idle"\n  }\n]\n~~~\n\nIf sr-preview is an ES module, expose a stable global (e.g. window.__NEXUS_SR_PREVIEW__) or await readiness before dependent code executes.\n\n## Accessibility Notes\n- No reliance on network fonts; pages are self-contained.\n- All interactive examples use explicit keyboard event handling (no reliance on implicit click-to-keyboard translation).\n- Shadow clone intentionally duplicates semantics for comparison (avoid modifying only one variant when testing).\n\n## License\nGenerated pages are part of the project and fall under the existing repository license.\n\n---\nGenerated: ${new Date().toISOString()}\n`;
}

function generate(){
  ensureDir(OUTPUT_DIR);
  const roles = Object.values(ROLE_CATEGORIES).flat();
  const css = buildInlineCSS();
  const js = buildInlineJS('generic'); // A generic copy for asset (role-specific generated inline per page)
  writeAssets(css, js);
  // Pages
  roles.forEach(role => {
    const html = buildPage(role);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${role}.html`), html, 'utf8');
  });
  // Index
  const index = buildIndex(roles);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), index, 'utf8');
  // README
  fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), sanitizedBuildReadme(), 'utf8');
  console.log(`[generator] Wrote ${roles.length} role pages + index + README to ${OUTPUT_DIR}`);
}
// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generate();
}

function sanitizedBuildReadme(){
  return `# ARIA Role Test Pages\n\nGenerated set of self-contained pages (one per concrete WAI-ARIA 1.2 role, including deprecated roles) for exercising the Nexus Accessibility extension on file:// URLs.\n\n## Generate / Refresh\n\nRun from project root (or this directory):\n\n\nnode tests/aria/generate-aria-pages.js\n\n\nOutputs:\n- tests/aria/index.html – searchable, categorized index (works offline on file://)\n- tests/aria/<role>.html – per-role pages\n- tests/aria/assets/aria-test.(css|js) – shared asset copies (each page also inlines its own copy)\n\nOpen any page directly (Finder / Explorer double‑click) – NO server needed.\n\n## Index & Navigation\n- Categories: Roles grouped (Widget, Composite, Document Structure, Landmark, Live, Window, Graphics, etc.).\n- Quick Search: Type in the search box or press \`/\` from the index page to focus it. Matches role name or description substring (case-insensitive).\n- Deprecated roles visually flagged.\n\n## Shadow DOM\nEach role page includes a Shadow DOM toggle that clones the primary widget into a shadow root (style + markup) for testing accessibility tree extraction through shadow boundaries.\n\n## Attribute Editor\nEvery page provides an Attribute Editor for global + role-specific ARIA.\n- Empty value removes the attribute.\n- Applies simultaneously to the primary widget root and any explicit role variant element (when present).\n- Safe to experiment with invalid values (pages purposely avoid network / XSS vectors).\n\n## Advanced Keyboard Semantics (Representative Roles)\nUpdated in Step 3 to cover richer composite patterns.\n- Button / Switch / Checkbox: Space / Enter toggles state.\n- Radiogroup: Arrow Left/Right/Up/Down roves and selects.\n- Slider: Arrow (±10), Home/End (min/max).\n- Spinbutton: Up/Down (±1), PageUp/PageDown (±5), Home/End (bounds).\n- Combobox (editable, list popup): Type filters; Arrow Up/Down moves active option; Enter selects & closes; Esc closes; active option set via aria-activedescendant.\n- Listbox (multi-select demo): Arrow Up/Down moves focus. Space toggles selection. Shift+Arrow / Shift+Home / Shift+End extends a contiguous range from the anchor. Cmd/Ctrl+Click (or Cmd/Ctrl+Space) toggles individual items without clearing others.\n- Menu / Menubar (with nested submenu): Arrow Left/Right moves across top-level triggers. Enter / Space / Arrow Down opens a submenu. Arrow Right opens a nested submenu from a submenu trigger; Arrow Left or Esc closes the current submenu and returns focus to its trigger.\n- Tabs: Arrow Left/Right or Up/Down (depending on orientation semantics) moves selection; Home/End jump to first/last tab.\n- Tree: Arrow Up/Down moves visible item focus; Arrow Right expands (if collapsible); Arrow Left collapses; Space toggles aria-selected on focusable items (selection independent of expansion).\n- Grid: Arrow keys move cell focus (roving tabindex). Space toggles aria-selected on the active cell. Enter enters edit mode (inline text input), Enter again commits, Escape cancels and restores original value.\n- Dialog / Alertdialog: Trigger button opens; Esc closes.\n\n## Testing Guidelines\n1. Confirm each role page loads via file:// without mixed-content warnings.\n2. Use the Attribute Editor to add / remove ARIA (e.g., aria-label, aria-describedby) and verify live reflection in your extension inspector.\n3. Toggle Shadow DOM and ensure semantics remain equivalent (compare accessible name / role / states).\n4. Exercise keyboard models above; verify state attributes (aria-selected / aria-checked / aria-pressed / aria-expanded / aria-valuenow) mutate correctly.\n5. For composite widgets (tree, grid, listbox) confirm focus management (single tab stop with internal roving).\n\n## Manifest / Content Script Ordering Note\nWhen loading these test pages during extension development, ensure manifest.json lists core screen reader preview + accessibility libs before UI wrapper content scripts, e.g.:\n\n~~~json\n"content_scripts": [\n  {\n    "matches": ["<all_urls>"],\n    "js": [\n      "src/libs/dom-accessibility-api.js",\n      "src/libs/aria-query.js",\n      "src/utils/sr-preview.js",              // CORE first\n      "src/utils/sr-preview-content.js",      // transformer bridge\n      "src/components/inspector/inspector-sr-preview.js",\n      "src/components/inspector/inspector-core.js"\n    ],\n    "run_at": "document_idle"\n  }\n]\n~~~\n\nIf sr-preview is an ES module, expose a stable global (e.g. window.__NEXUS_SR_PREVIEW__) or await readiness before dependent code executes.\n\n## Accessibility Notes\n- No reliance on network fonts; pages are self-contained.\n- All interactive examples use explicit keyboard event handling (no reliance on implicit click-to-keyboard translation).\n- Shadow clone intentionally duplicates semantics for comparison (avoid modifying only one variant when testing).\n\n## License\nGenerated pages are part of the project and fall under the existing repository license.\n\n---\nGenerated: ${new Date().toISOString()}\n`;
}

export { generate };
