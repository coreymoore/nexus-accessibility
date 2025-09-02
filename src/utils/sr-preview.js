/**
 * Screen Reader Preview Generator (sr-preview)
 * Deterministic tokenizer + formatter producing utterance segments for an accessibility node.
 * Pure, side-effect free, synchronous.
 */

// Canonical role normalization map including abstract roles -> generic
const ABSTRACT_ROLES = new Set([
  'command','composite','landmark','range','roletype','section','sectionhead','select','structure','widget','window'
]);

const ROLE_SYNONYMS = {
  disclosuretriangle: 'button',
  textbox: 'edit',
  searchbox: 'edit',
  combobox: 'combo box',
  img: 'image',
  radiogroup: 'radio group',
  menuitem: 'menu item',
  menuitemcheckbox: 'menu item checkbox',
  menuitemradio: 'menu item radio',
  gridcell: 'cell',
  listitem: 'list item',
  treeitem: 'tree item',
  listbox: 'list',
};

/**
 * Extract raw field value trying multiple candidate property paths
 * @param {Object} node
 * @param {string[]} candidates
 * @returns {any}
 */
function pick(node, candidates) {
  for (const c of candidates) {
    if (c.includes('.')) {
      const [a,b] = c.split('.');
      if (node && node[a] && node[a][b] != null) return node[a][b];
    } else if (node && node[c] != null) {
      return node[c];
    }
  }
  return undefined;
}

function normalizeRole(rawRole) {
  if (!rawRole) return undefined;
  const role = String(rawRole).toLowerCase();
  if (ABSTRACT_ROLES.has(role)) return 'generic';
  return role;
}

function presentText(v) {
  if (v == null) return '';
  return String(v).trim();
}

// Placeholders used upstream for missing description we should NOT surface
const DESCRIPTION_SENTINELS = new Set([
  '(no description)',
  '(no accessible description)',
  'no description'
]);

function meaningfulDescription(desc, name) {
  if (!desc) return false;
  if (DESCRIPTION_SENTINELS.has(desc.toLowerCase())) return false;
  if (name && desc === name) return false;
  return true;
}

function truncateIfLong(text) {
  if (text.length > 200) {
    return { text: text.slice(0,200), truncated: true };
  }
  return { text, truncated: false };
}

/**
 * Build a normalized descriptor object from access node.
 * @param {Object} node
 */
function extract(node) {
  if (!node || typeof node !== 'object') return {};
  const role = normalizeRole(pick(node,['role','role.value']));
  const roledescription = pick(node,['aria-roledescription','roledescription']);
  const name = pick(node,['name','accessibleName','name.value']);
  const description = pick(node,['description','accessibleDescription','description.value']);
  const value = pick(node,['value','currentValue','aria-valuetext','aria-valuenow']);
  const level = pick(node,['level','aria-level']);
  const checkedRaw = pick(node,['aria-checked','checked']);
  const pressed = pick(node,['pressed','aria-pressed']);
  const selected = pick(node,['selected','aria-selected']);
  const expanded = pick(node,['expanded','aria-expanded','states.expanded','normalizedExpanded','open']);
  const hasPopup = pick(node,['hasPopup','aria-haspopup','states.hasPopup']);
  const orientation = pick(node,['orientation','aria-orientation']);
  const multiline = pick(node,['multiline','aria-multiline']);
  const multiselectable = pick(node,['multiselectable','aria-multiselectable']);
  const autocomplete = pick(node,['autocomplete','aria-autocomplete']);
  const modal = pick(node,['modal','aria-modal']);
  const current = pick(node,['current','aria-current']);
  const placeholder = pick(node,['placeholder']);
  const hidden = pick(node,['hidden','aria-hidden']);
  const disabled = pick(node,['disabled','aria-disabled']);
  const readonly = pick(node,['readonly','aria-readonly']);
  const required = pick(node,['required','aria-required']);
  const invalid = pick(node,['invalid','aria-invalid']);
  const busy = pick(node,['busy','aria-busy']);
  const live = pick(node,['aria-live','live']);
  const rows = pick(node,['rows','rowCount']);
  const columns = pick(node,['columns','colCount']);
  const rowIndex = pick(node,['rowIndex']);
  const colIndex = pick(node,['colIndex','columnIndex']);
  const headers = pick(node,['headers']);
  const length = pick(node,['length','itemCount']);
  const posInSet = pick(node,['index','position','posInSet','aria-posinset']);
  const setSize = pick(node,['setSize','aria-setsize','length','itemCount']);
  const valueMin = pick(node,['aria-valuemin','valueMin','min']);
  const valueMax = pick(node,['aria-valuemax','valueMax','max']);
  const valueNow = pick(node,['aria-valuenow','valueNow','currentValue','value']);
  // Composite / grouping context
  const activeDescendant = pick(node,['aria-activedescendant','activeDescendant']);
  let activeDescendantName = pick(node,['activeDescendantName']);

  // Heuristic enrichment: derive active descendant name if not explicitly provided.
  // We keep this lightweight (single-level lookups) to avoid heavy tree walks.
  if (!activeDescendantName && activeDescendant) {
    // Case 1: activeDescendant itself is an object with a name
    if (typeof activeDescendant === 'object') {
      activeDescendantName = pick(activeDescendant, ['name','accessibleName','name.value']);
    }
    // Case 2: Dedicated ref object commonly named activeDescendantNode
    if (!activeDescendantName && node.activeDescendantNode && typeof node.activeDescendantNode === 'object') {
      activeDescendantName = pick(node.activeDescendantNode, ['name','accessibleName','name.value']);
    }
    // Case 3: Shallow search among provided children by id match
    if (!activeDescendantName && Array.isArray(node.children) && typeof activeDescendant === 'string') {
      const match = node.children.find(ch => ch && (ch.id === activeDescendant || ch.nodeId === activeDescendant || ch.axId === activeDescendant));
      if (match) {
        activeDescendantName = pick(match, ['name','accessibleName','name.value']);
      }
    }
  }
  const activeIndex = pick(node,['activeIndex']);
  const itemCount = pick(node,['itemCount']);
  const groupLabels = pick(node,['groupLabels']);
  const group = pick(node,['group']);
  const id = pick(node,['id']);
  // Radiogroup specific
  const selectedIndex = pick(node,['selectedIndex']);
  const selectedName = pick(node,['selectedName']);
  return { role, roledescription, name, description, value, level, checkedRaw, pressed, selected, expanded, hasPopup, orientation, multiline, multiselectable, autocomplete, modal, current, placeholder, hidden, disabled, readonly, required, invalid, busy, live, rows, columns, rowIndex, colIndex, headers, length, posInSet, setSize, valueMin, valueMax, valueNow, activeDescendant, activeDescendantName, activeIndex, itemCount, groupLabels, group, id, selectedIndex, selectedName };
}

function checkedState(checkedRaw) {
  if (checkedRaw === 'mixed') return 'mixed';
  if (checkedRaw === true || checkedRaw === 'true') return 'checked';
  if (checkedRaw === false || checkedRaw === 'false') return 'unchecked';
  return undefined;
}

function radioState(selected) {
  if (selected === true || selected === 'true') return 'selected';
  if (selected === false || selected === 'false') return 'not selected';
}

function switchState(checkedRaw) {
  if (checkedRaw === true || checkedRaw === 'true') return 'on';
  if (checkedRaw === false || checkedRaw === 'false') return 'off';
}

function boolState(value, word) {
  if (value === true || value === 'true') return word;
  return undefined;
}

function expandedState(expanded) {
  // Handle simple boolean values
  if (expanded === true || expanded === 'true') return 'expanded';
  if (expanded === false || expanded === 'false') return 'collapsed';
  
  // Handle complex nested structure like {type: "booleanOrUndefined", value: false}
  if (expanded && typeof expanded === 'object' && expanded.value !== undefined) {
    if (expanded.value === true || expanded.value === 'true') return 'expanded';
    if (expanded.value === false || expanded.value === 'false') return 'collapsed';
  }
  
  return undefined;
}

function requiredState(required) { return (required === true || required === 'true') ? 'required' : undefined; }
function readonlyState(readonly) { return (readonly === true || readonly === 'true') ? 'readonly' : undefined; }
function invalidState(invalid) { return (invalid === true || invalid === 'true') ? 'invalid' : undefined; }

function numeric(v) { if (v == null || v === '') return undefined; const n = Number(v); return Number.isFinite(n) ? n : undefined; }

function roleLabel(descriptor) {
  if (descriptor.roledescription) return presentText(descriptor.roledescription);
  const r = descriptor.role;
  if (!r) return undefined;
  return ROLE_SYNONYMS[r] || r;
}

/**
 * Generate segments for role-specific formatting.
 * @param {*} d extracted descriptor
 */
function buildSegments(d) {
  const segments = [];
  const add = (kind,text,data) => {
    if (!text && text !== '') return; // allow explicit empty string only for some kinds if needed
    if (kind === 'state' && segments.some(s=>s.kind==='state' && s.text===text)) return; // dedupe states
    segments.push({ kind, text, ...(data?{data}: {}) });
  };

  if (!d.role && !d.name) return segments; // nothing meaningful

  const role = d.role;
  const roleText = roleLabel(d);
  const nameText = presentText(d.name);
  const descText = presentText(d.description);

  // Group / fieldset / ancestor labels first (outermost -> innermost)
  if (d.group && typeof d.group === 'object' && d.group.label) {
    const gl = presentText(d.group.label);
    if (gl) add('group', gl);
  }
  if (Array.isArray(d.groupLabels)) {
    d.groupLabels.forEach(label => {
      const t = presentText(label);
      if (t) add('meta', t);
    });
  }

  // Helper for value truncation
  const pushValue = (text) => {
    if (!text && text !== '') return; // allow empty explicit
    const { text: t, truncated } = truncateIfLong(String(text));
    add('value', t, truncated ? { truncated: true } : undefined);
  };

  // Role families
  switch (role) {
    case 'heading': {
      if (d.level != null) add('meta', `Heading level ${d.level}`); else add('role','heading');
      if (nameText) add('name', nameText);
      return segments;
    }
    case 'button': {
      if (nameText) add('name', nameText);
      add('role', roleText || 'button');
      if (boolState(d.pressed,'pressed')) add('state','pressed');
      if (boolState(d.disabled,'disabled')) add('state','disabled');
      if (boolState(d.busy,'busy')) add('state','busy');
      return segments;
    }
    case 'disclosuretriangle': {
      if (nameText) add('name', nameText);
      add('role', roleText || 'button');
      const expState = expandedState(d.expanded);
      if (expState) add('state', expState);
      if (boolState(d.disabled,'disabled')) add('state','disabled');
      return segments;
    }
    case 'link': {
      if (nameText) add('name', nameText);
      add('role', roleText || 'link');
      if (boolState(d.visited,'visited')) add('state','visited');
      return segments;
    }
  }

  // Text entry roles (textbox/searchbox)
  if (['textbox','searchbox'].includes(role)) {
    if (nameText) add('name', nameText);
    add('role', roleText || 'edit');
    if (requiredState(d.required)) add('state','required');
    if (readonlyState(d.readonly)) add('state','readonly');
    if (invalidState(d.invalid)) add('state','invalid');
    const val = presentText(d.value);
    if (val === '') add('state','empty'); else if (val) pushValue(val);
    if (meaningfulDescription(descText, nameText)) add('description', descText);
    return segments;
  }

  // Combobox (separate so we can surface expanded, active descendant & popup)
  if (role === 'combobox') {
    if (nameText) add('name', nameText);
    add('role', roleText || 'combo box');
    // States
    const expState = expandedState(d.expanded);
    if (expState) add('state', expState);
    if (d.hasPopup && typeof d.hasPopup === 'string') add('meta', `popup ${d.hasPopup}`);
    if (requiredState(d.required)) add('state','required');
    if (readonlyState(d.readonly)) add('state','readonly');
    if (invalidState(d.invalid)) add('state','invalid');
    // Value & active option: avoid duplicate if value already equals active descendant name
    const val = presentText(d.value);
    if (d.activeDescendantName && presentText(d.activeDescendantName) !== val) {
      add('meta', presentText(d.activeDescendantName));
    }
    if (val === '') add('state','empty'); else if (val) pushValue(val);
    if (meaningfulDescription(descText, nameText)) add('description', descText);
    return segments;
  }

  if (['checkbox','menuitemcheckbox','treeitem'].includes(role)) {
    if (nameText) add('name', nameText);
    add('role', roleText || 'checkbox');
    const chk = checkedState(d.checkedRaw);
    if (chk) add('state', chk);
    if (boolState(d.disabled,'disabled')) add('state','disabled');
    if (role === 'treeitem') {
      const idx = numeric(d.posInSet);
      const size = numeric(d.setSize);
      if (idx != null && size != null) add('meta', `${idx} of ${size}`);
      const expState = expandedState(d.expanded);
      if (expState) add('state', expState);
    }
    // Active marker if this node is the active descendant of itself (id matches)
    if (d.activeDescendant && d.id && d.activeDescendant === d.id) add('state','active');
    if (meaningfulDescription(descText, nameText)) add('description', descText);
    return segments;
  }

  if (['radio','menuitemradio'].includes(role)) {
    if (nameText) add('name', nameText);
    add('role', role === 'radio' ? 'radio button' : roleText || 'menu item radio');
    const rs = radioState(d.selected ?? d.checkedRaw);
    if (rs) add('state', rs);
    if (boolState(d.disabled,'disabled')) add('state','disabled');
    if (d.activeDescendant && d.id && d.activeDescendant === d.id) add('state','active');
    if (meaningfulDescription(descText, nameText)) add('description', descText);
    return segments;
  }

  if (role === 'switch') {
    if (nameText) add('name', nameText);
    add('role', roleText || 'switch');
    const st = switchState(d.checkedRaw);
    if (st) add('state', st);
    if (!st) { // fallback if only boolean checked mapping present
      const chk = checkedState(d.checkedRaw);
      if (chk === 'checked') add('state','on');
      else if (chk === 'unchecked') add('state','off');
    }
    return segments;
  }

  if (['list','listbox'].includes(role)) {
    if (nameText) add('name', nameText);
    const len = numeric(d.length) || numeric(d.setSize);
    add('role', roleText || 'list');
    if (len != null) add('meta', `with ${len} items`);
    // Active descendant context
  if (d.activeDescendantName) add('meta', presentText(d.activeDescendantName));
    else if (d.activeIndex != null && (numeric(d.itemCount) != null || len != null)) {
      const count = numeric(d.itemCount) != null ? numeric(d.itemCount) : len;
      add('meta', `item ${d.activeIndex} of ${count}`);
    } else if (d.activeDescendant) add('meta', 'has active descendant');
    if (d.multiselectable === true || d.multiselectable === 'true') add('state','multi-selectable');
    return segments;
  }

  if (role === 'tree') {
    if (d.name) add('name', nameText);
    const len = numeric(d.length) || numeric(d.itemCount) || numeric(d.setSize);
    add('role', roleText || 'tree');
    if (len != null) add('meta', `with ${len} items`);
  if (d.activeDescendantName) add('meta', presentText(d.activeDescendantName));
    else if (d.activeDescendant) add('meta','has active descendant');
    if (d.multiselectable === true || d.multiselectable === 'true') add('state','multi-selectable');
    return segments;
  }

  if (role === 'listitem' || role === 'option') {
    if (nameText) add('name', nameText);
    add('role', roleText || (role === 'option' ? 'option' : 'list item'));
    const idx = numeric(d.posInSet) || (numeric(d.index) );
    const size = numeric(d.setSize) || numeric(d.length);
    if (idx != null && size != null) add('meta', `${idx} of ${size}`);
    if (boolState(d.selected,'selected')) add('state','selected');
    if (d.activeDescendant && d.id && d.activeDescendant === d.id) add('state','active');
    return segments;
  }

  // Tablist container
  if (role === 'tablist') {
    if (nameText) add('name', nameText);
    add('role', roleText || 'tablist');
  if (d.activeDescendantName) add('meta', presentText(d.activeDescendantName));
    else if (d.activeIndex != null && (numeric(d.itemCount) != null)) {
      add('meta', `item ${d.activeIndex} of ${numeric(d.itemCount)}`);
    } else if (d.activeDescendant) add('meta','has active descendant');
    return segments;
  }

  if (role === 'tab') {
    if (nameText) add('name', nameText);
    add('role', roleText || 'tab');
    if (boolState(d.selected,'selected')) add('state','selected');
    if (d.activeDescendant && d.id && d.activeDescendant === d.id) add('state','active');
    const idx = numeric(d.posInSet); const size = numeric(d.setSize);
    if (idx != null && size != null) add('meta', `${idx} of ${size}`);
    return segments;
  }

  // Tabpanel
  if (role === 'tabpanel') {
    if (nameText) add('name', nameText);
    add('role', roleText || 'tab panel');
    if (meaningfulDescription(descText, nameText)) add('description', descText);
    return segments;
  }

  if (role === 'table' || role === 'grid' || role === 'treegrid') {
    add('role', roleText || 'table');
    const r = numeric(d.rows); const c = numeric(d.columns);
    if (r != null) add('meta', `${r} rows`);
    if (c != null) add('meta', `${c} columns`);
    if (d.headers && Array.isArray(d.headers) && d.headers.length) {
      add('meta', `header: ${d.headers[0]}`);
    }
    if (nameText) add('name', nameText);
    if (d.activeDescendantName) add('meta', presentText(d.activeDescendantName));
    else if (d.activeDescendant) add('meta','has active descendant');
    if (d.multiselectable === true || d.multiselectable === 'true') add('state','multi-selectable');
    return segments;
  }

  if (['cell','gridcell','rowheader','columnheader'].includes(role)) {
    add('role', roleLabel(d) || 'cell');
    const r = numeric(d.rowIndex); const c = numeric(d.colIndex);
    if (r != null && d.rows != null) add('meta', `row ${r} of ${d.rows}`);
    if (c != null && d.columns != null) add('meta', `column ${c} of ${d.columns}`);
    if (nameText) add('name', nameText);
    return segments;
  }

  if (['progressbar','slider','spinbutton','meter'].includes(role)) {
    if (nameText) add('name', nameText);
    add('role', roleText || role);
    const now = numeric(d.valueNow);
    const min = numeric(d.valueMin);
    const max = numeric(d.valueMax);
    if (now != null) {
      if (min != null && max != null && max > min) {
        const pct = Math.round(((now - min)/(max-min))*100);
        if (min === 0) {
          add('value', `${now} of ${max} (${pct}%)`);
        } else {
          add('value', `${now} (range ${min} to ${max}, ${pct}%)`);
        }
      } else if (max != null && min == null) {
        add('value', `${now} (max ${max})`);
      } else if (min != null && max == null) {
        add('value', `${now} (min ${min})`);
      } else {
        add('value', String(now));
      }
    } else if (d.value) pushValue(d.value);
    if (meaningfulDescription(descText, nameText)) add('description', descText);
    return segments;
  }

  if (['alert','status','log','timer','marquee'].includes(role)) {
    add('role', roleText || role);
    if (nameText) add('name', nameText);
    if (meaningfulDescription(descText, nameText)) add('description', descText);
    if (d.live) add('meta', d.live);
    return segments;
  }

  if (role === 'radiogroup') {
    if (nameText) add('name', nameText);
    add('role', roleText || 'radio group');
    if (d.selectedName) add('meta', `selected: ${presentText(d.selectedName)}`);
    else if (numeric(d.selectedIndex) != null && numeric(d.itemCount) != null) {
      add('meta', `selected ${numeric(d.selectedIndex)} of ${numeric(d.itemCount)}`);
    }
  if (d.activeDescendantName) add('meta', presentText(d.activeDescendantName));
    else if (d.activeDescendant) add('meta','has active descendant');
    return segments;
  }

  // Menu / menubar
  if (role === 'menu' || role === 'menubar') {
    if (nameText) add('name', nameText);
    add('role', roleText || (role === 'menubar' ? 'menu bar' : 'menu'));
    if (d.activeDescendantName) add('meta', presentText(d.activeDescendantName));
    else if (d.activeDescendant) add('meta','has active descendant');
    return segments;
  }

  // Toolbar
  if (role === 'toolbar') {
    if (nameText) add('name', nameText);
    add('role', roleText || 'toolbar');
    if (d.activeDescendantName) add('meta', presentText(d.activeDescendantName));
    else if (d.activeDescendant) add('meta','has active descendant');
    return segments;
  }

  // Dialog / alertdialog
  if (role === 'dialog' || role === 'alertdialog') {
    if (nameText) add('name', nameText);
    add('role', roleText || (role === 'alertdialog' ? 'alert dialog' : 'dialog'));
    if (d.modal === true || d.modal === 'true') add('state','modal');
    if (meaningfulDescription(descText, nameText)) add('description', descText);
    return segments;
  }

  // Landmarks & structural: navigation, main, region, banner, complementary, contentinfo, form, article, feed
  if (['navigation','main','region','banner','complementary','contentinfo','form','article','feed'].includes(role)) {
    if (nameText) add('name', nameText);
    add('role', roleText || role);
    if (role === 'feed' && d.activeDescendantName) add('meta', presentText(d.activeDescendantName));
    return segments;
  }

  // Search landmark distinct from searchbox/edit
  if (role === 'search') {
    if (nameText) add('name', nameText);
    add('role', roleText || 'search');
    return segments;
  }

  // Application / document / note / figure / math (structural informational)
  if (['application','document','note','figure','math'].includes(role)) {
    if (nameText) add('name', nameText);
    add('role', roleText || role);
    if (meaningfulDescription(descText, nameText)) add('description', descText);
    return segments;
  }

  // Image
  if (role === 'img' || role === 'image') {
    if (nameText) add('name', nameText); // Name typically alt text
    add('role', roleText || 'image');
    if (meaningfulDescription(descText, nameText)) add('description', descText);
    return segments;
  }

  // Tooltip
  if (role === 'tooltip') {
    if (nameText) add('name', nameText);
    add('role', roleText || 'tooltip');
    if (meaningfulDescription(descText, nameText)) add('description', descText);
    return segments;
  }

  // Definition / term
  if (role === 'definition' || role === 'term') {
    if (nameText) add('name', nameText);
    add('role', roleText || role);
    if (meaningfulDescription(descText, nameText)) add('description', descText);
    return segments;
  }

  // Row / rowgroup (within table/grid/treegrid)
  if (role === 'row' || role === 'rowgroup') {
    add('role', roleText || role);
    if (nameText) add('name', nameText);
    const idx = numeric(d.rowIndex);
    const total = numeric(d.rows);
    if (idx != null && total != null) add('meta', `row ${idx} of ${total}`);
    return segments;
  }

  // Scrollbar
  if (role === 'scrollbar') {
    add('role', roleText || 'scroll bar');
    const now = numeric(d.valueNow);
    const min = numeric(d.valueMin);
    const max = numeric(d.valueMax);
    if (now != null && max != null && min != null && max > min) {
      const pct = Math.round(((now - min)/(max-min))*100);
      add('value', `${pct}%`);
    } else if (now != null) {
      add('value', String(now));
    }
    if (d.orientation && (d.orientation === 'vertical' || d.orientation === 'horizontal')) add('meta', d.orientation);
    return segments;
  }

  // Separator (focusable or with value if aria-valuenow used as slider-like)
  if (role === 'separator') {
    add('role', roleText || 'separator');
    if (d.orientation && (d.orientation === 'vertical' || d.orientation === 'horizontal')) add('meta', d.orientation);
    const now = numeric(d.valueNow);
    if (now != null) add('value', String(now));
    return segments;
  }

  // None / presentation -> do not emit tokens (explicitly neutral)
  if (role === 'none' || role === 'presentation') {
    return segments; // intentionally empty
  }

  // Fallback / generic handling
  if (nameText) add('name', nameText);
  if (roleText) add('role', roleText);
  const st = [];
  if (boolState(d.disabled,'disabled')) st.push('disabled');
  if (readonlyState(d.readonly)) st.push('readonly');
  if (requiredState(d.required)) st.push('required');
  if (invalidState(d.invalid)) st.push('invalid');
  const expState = expandedState(d.expanded);
  if (expState) st.push(expState);
  if (boolState(d.selected,'selected')) st.push('selected');
  if (d.pressed === true || d.pressed === 'true') st.push('pressed');
  if (d.hidden === true || d.hidden === 'true') st.push('hidden');
  if (d.multiline === true || d.multiline === 'true') st.push('multiline');
  if (d.multiselectable === true || d.multiselectable === 'true') st.push('multi-selectable');
  if (d.modal === true || d.modal === 'true') st.push('modal');
  if (d.current && d.current !== 'false') {
    if (d.current === true || d.current === 'true') st.push('current'); else st.push(`current ${d.current}`);
  }
  if (st.length) st.forEach(s=> add('state', s));
  if (meaningfulDescription(descText, nameText)) add('description', descText);
  if (d.activeDescendant && d.id && d.activeDescendant === d.id) add('state','active');
  if (d.orientation && (d.orientation === 'vertical' || d.orientation === 'horizontal')) add('meta', d.orientation);
  if (d.autocomplete) add('meta', `autocomplete ${d.autocomplete}`);
  if (d.placeholder && !nameText) add('meta', `placeholder ${presentText(d.placeholder)}`);
  return segments;
}

/**
 * Generate utterance segments from an accessibility node.
 * @param {Object} accessNode
 * @param {Object} options currently unused placeholder
 * @returns {Array<{kind:string,text:string,data?:object}>}
 */
function generateSegments(accessNode, options = {}) {
  try {
    const d = extract(accessNode);
    const segs = buildSegments(d);
    // Deterministic ordering across roles
    const order = { group:0, name:1, role:2, state:3, value:4, meta:5, description:6 };
    return segs
      .map((s,i)=>({s,i}))
      .sort((a,b)=> {
        const oa = order[a.s.kind] ?? 99;
        const ob = order[b.s.kind] ?? 99;
        if (oa !== ob) return oa - ob;
        return a.i - b.i; // stable among same kind
      })
      .map(w=>w.s);
  } catch {
    return [];
  }
}

/**
 * Join segments into preview string
 * @param {Array} segments
 * @param {Object} options { joiner }
 * @returns {string}
 */
function generatePreviewString(segments, options = {}) {
  if (!Array.isArray(segments) || !segments.length) return '';
  const joiner = options.joiner != null ? options.joiner : ', ';
  return segments.map(s=>s.text).filter(Boolean).join(joiner);
}

// Expose globally for non-module contexts (like content scripts)
if (typeof window !== 'undefined') {
  window.NexusSrPreview = { generateSegments, generatePreviewString };
}
