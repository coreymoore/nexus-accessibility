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
  textbox: 'edit',
  searchbox: 'edit',
  combobox: 'combo box',
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
  const expanded = pick(node,['expanded','aria-expanded']);
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
  const activeDescendantName = pick(node,['activeDescendantName']);
  const activeIndex = pick(node,['activeIndex']);
  const itemCount = pick(node,['itemCount']);
  const groupLabels = pick(node,['groupLabels']);
  const id = pick(node,['id']);
  // Radiogroup specific
  const selectedIndex = pick(node,['selectedIndex']);
  const selectedName = pick(node,['selectedName']);
  return { role, roledescription, name, description, value, level, checkedRaw, pressed, selected, expanded, disabled, readonly, required, invalid, busy, live, rows, columns, rowIndex, colIndex, headers, length, posInSet, setSize, valueMin, valueMax, valueNow, activeDescendant, activeDescendantName, activeIndex, itemCount, groupLabels, id, selectedIndex, selectedName };
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
  const add = (kind,text,data) => { if (!text) return; segments.push({ kind, text, ...(data?{data}: {}) }); };

  if (!d.role && !d.name) return segments; // nothing meaningful

  const role = d.role;
  const roleText = roleLabel(d);
  const nameText = presentText(d.name);
  const descText = presentText(d.description);

  // Group / fieldset / ancestor labels first (outermost -> innermost)
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
    case 'link': {
      if (nameText) add('name', nameText);
      add('role', roleText || 'link');
      if (boolState(d.visited,'visited')) add('state','visited');
      return segments;
    }
  }

  // Text entry roles
  if (['textbox','searchbox','combobox'].includes(role)) {
    if (nameText) add('name', nameText);
    add('role', roleText || 'edit');
    if (requiredState(d.required)) add('state','required');
    if (readonlyState(d.readonly)) add('state','readonly');
    if (invalidState(d.invalid)) add('state','invalid');
    const val = presentText(d.value);
    if (val === '') add('state','empty'); else if (val) pushValue(val);
    if (descText) add('description', descText);
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
    }
    // Active marker if this node is the active descendant of itself (id matches)
    if (d.activeDescendant && d.id && d.activeDescendant === d.id) add('state','active');
    return segments;
  }

  if (['radio','menuitemradio'].includes(role)) {
    if (nameText) add('name', nameText);
    add('role', role === 'radio' ? 'radio button' : roleText || 'menu item radio');
    const rs = radioState(d.selected ?? d.checkedRaw);
    if (rs) add('state', rs);
    if (boolState(d.disabled,'disabled')) add('state','disabled');
    if (d.activeDescendant && d.id && d.activeDescendant === d.id) add('state','active');
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
    if (d.activeDescendantName) add('meta', `active: ${presentText(d.activeDescendantName)}`);
    else if (d.activeIndex != null && (numeric(d.itemCount) != null || len != null)) {
      const count = numeric(d.itemCount) != null ? numeric(d.itemCount) : len;
      add('meta', `item ${d.activeIndex} of ${count}`);
    } else if (d.activeDescendant) add('meta', 'has active descendant');
    return segments;
  }

  if (role === 'tree') {
    if (d.name) add('name', nameText);
    const len = numeric(d.length) || numeric(d.itemCount) || numeric(d.setSize);
    add('role', roleText || 'tree');
    if (len != null) add('meta', `with ${len} items`);
    if (d.activeDescendantName) add('meta', `active: ${presentText(d.activeDescendantName)}`);
    else if (d.activeDescendant) add('meta','has active descendant');
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
    if (d.activeDescendantName) add('meta', `active: ${presentText(d.activeDescendantName)}`);
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

  if (role === 'table' || role === 'grid' || role === 'treegrid') {
    add('role', roleText || 'table');
    const r = numeric(d.rows); const c = numeric(d.columns);
    if (r != null) add('meta', `${r} rows`);
    if (c != null) add('meta', `${c} columns`);
    if (d.headers && Array.isArray(d.headers) && d.headers.length) {
      add('meta', `header: ${d.headers[0]}`);
    }
    if (nameText) add('name', nameText);
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
      } else {
        add('value', String(now));
      }
    } else if (d.value) pushValue(d.value);
    return segments;
  }

  if (['alert','status','log','timer','marquee'].includes(role)) {
    add('role', roleText || role);
    if (nameText) add('name', nameText);
    if (descText && descText !== nameText) add('description', descText);
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
    if (d.activeDescendantName) add('meta', `active: ${presentText(d.activeDescendantName)}`);
    else if (d.activeDescendant) add('meta','has active descendant');
    return segments;
  }

  // Fallback
  if (nameText) add('name', nameText);
  if (roleText) add('role', roleText);
  const st = [];
  if (boolState(d.disabled,'disabled')) st.push('disabled');
  if (readonlyState(d.readonly)) st.push('readonly');
  if (requiredState(d.required)) st.push('required');
  if (invalidState(d.invalid)) st.push('invalid');
  if (boolState(d.expanded,'expanded')) st.push('expanded');
  if (boolState(d.selected,'selected')) st.push('selected');
  if (st.length) st.forEach(s=> add('state', s));
  if (descText && descText !== nameText) add('description', descText);
  if (d.activeDescendant && d.id && d.activeDescendant === d.id) add('state','active');
  return segments;
}

/**
 * Generate utterance segments from an accessibility node.
 * @param {Object} accessNode
 * @param {Object} options currently unused placeholder
 * @returns {Array<{kind:string,text:string,data?:object}>}
 */
export function generateSegments(accessNode, options = {}) {
  try {
    const d = extract(accessNode);
    return buildSegments(d);
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
export function generatePreviewString(segments, options = {}) {
  if (!Array.isArray(segments) || !segments.length) return '';
  const joiner = options.joiner != null ? options.joiner : ', ';
  return segments.map(s=>s.text).filter(Boolean).join(joiner);
}

export default { generateSegments, generatePreviewString };
