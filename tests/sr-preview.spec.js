import assert from 'assert';
import { generateSegments, generatePreviewString } from '../src/utils/sr-preview.js';

function texts(segs){ return segs.map(s=>s.text); }

// 1. Heading level
{ const node = { role: 'heading', name: 'Features', level: 2 };
  const segs = generateSegments(node);
  assert.deepStrictEqual(texts(segs), ['Heading level 2','Features']);
  assert.strictEqual(generatePreviewString(segs), 'Heading level 2, Features'); }

// 2. Button pressed/disabled
{ const node = { role: 'button', name: 'Submit', pressed: true, disabled: true };
  const segs = generateSegments(node);
  assert.deepStrictEqual(texts(segs), ['Submit','button','pressed','disabled']);
  assert.strictEqual(generatePreviewString(segs), 'Submit, button, pressed, disabled'); }

// 3. Link visited (visited simulated via custom property)
{ const node = { role: 'link', name: 'Docs', visited: true };
  const segs = generateSegments(node);
  assert.deepStrictEqual(texts(segs), ['Docs','link']); // visited not currently extracted (no prop) -> omitted
  assert.strictEqual(generatePreviewString(segs), 'Docs, link'); }

// 4. Text input (value present)
{ const node = { role: 'textbox', name: 'Username', value: 'alice' };
  const segs = generateSegments(node);
  assert.deepStrictEqual(texts(segs), ['Username','edit','alice']);
  assert.strictEqual(generatePreviewString(segs), 'Username, edit, alice'); }

// 5. Text input (required + empty)
{ const node = { role: 'textbox', name: 'Email address', value: '', required: true };
  const segs = generateSegments(node);
  assert.deepStrictEqual(texts(segs), ['Email address','edit','required','empty']);
  assert.strictEqual(generatePreviewString(segs), 'Email address, edit, required, empty'); }

// 6. Checkbox checked
{ const node = { role: 'checkbox', name: 'Accept', checked: true };
  const segs = generateSegments(node);
  assert.deepStrictEqual(texts(segs), ['Accept','checkbox','checked']);
  assert.strictEqual(generatePreviewString(segs), 'Accept, checkbox, checked'); }

// 7. Checkbox unchecked
{ const node = { role: 'checkbox', name: 'Accept', checked: false };
  const segs = generateSegments(node);
  assert.deepStrictEqual(texts(segs), ['Accept','checkbox','unchecked']);
  assert.strictEqual(generatePreviewString(segs), 'Accept, checkbox, unchecked'); }

// 8. Checkbox mixed
{ const node = { role: 'checkbox', name: 'Agree to terms', 'aria-checked': 'mixed' };
  const segs = generateSegments(node);
  assert.deepStrictEqual(texts(segs), ['Agree to terms','checkbox','mixed']);
  assert.strictEqual(generatePreviewString(segs), 'Agree to terms, checkbox, mixed'); }

// 9. Menuitemcheckbox mixed
{ const node = { role: 'menuitemcheckbox', name: 'Option A', 'aria-checked': 'mixed' };
  const segs = generateSegments(node);
  assert.deepStrictEqual(texts(segs), ['Option A','menu item checkbox','mixed']);
  assert.strictEqual(generatePreviewString(segs), 'Option A, menu item checkbox, mixed'); }

// 10. Radio selected
{ const node = { role: 'radio', name: 'Choice A', selected: true };
  const segs = generateSegments(node);
  assert.deepStrictEqual(texts(segs), ['Choice A','radio button','selected']);
  assert.strictEqual(generatePreviewString(segs), 'Choice A, radio button, selected'); }

// 11. Switch on/off
{ const nodeOn = { role: 'switch', name: 'Dark Mode', 'aria-checked': 'true' };
  const onSegs = generateSegments(nodeOn);
  assert.deepStrictEqual(texts(onSegs), ['Dark Mode','switch','on']);
  const nodeOff = { role: 'switch', name: 'Dark Mode', 'aria-checked': 'false' };
  const offSegs = generateSegments(nodeOff);
  assert.deepStrictEqual(texts(offSegs), ['Dark Mode','switch','off']); }

// 12. List summary + list item with index
{ const list = { role: 'list', name: 'Tasks', length: 3 };
  const listSegs = generateSegments(list);
  assert.deepStrictEqual(texts(listSegs), ['Tasks','list','with 3 items']);
  const item = { role: 'listitem', name: 'Item A', posInSet: 1, setSize: 3 };
  const itemSegs = generateSegments(item);
  assert.deepStrictEqual(texts(itemSegs), ['Item A','list item','1 of 3']); }

// 13. Table summary + cell
{ const table = { role: 'table', name: 'Results', rows: 3, columns: 5, headers: ['Name','Date','Status','Owner','Id'] };
  const tSegs = generateSegments(table);
  assert.deepStrictEqual(texts(tSegs), ['table','3 rows','5 columns','header: Name','Results']);
  const cell = { role: 'cell', rowIndex: 2, colIndex: 3, rows: 3, columns: 5, name: 'Active' };
  const cSegs = generateSegments(cell);
  assert.deepStrictEqual(texts(cSegs), ['cell','row 2 of 3','column 3 of 5','Active']); }

// 14. Fallback for role-only nodes
{ const node = { role: 'region' };
  const segs = generateSegments(node);
  assert.deepStrictEqual(texts(segs), ['region']);
  assert.strictEqual(generatePreviewString(segs), 'region'); }

console.log('All sr-preview tests passed.');

// Additional composite & group context tests
{ // Listbox with active descendant name
  const node = { role: 'listbox', name: 'Fruits', length: 4, activeDescendantName: 'Apple' };
  const segs = generateSegments(node);
  assert.strictEqual(generatePreviewString(segs), 'Fruits, list, with 4 items, active: Apple');
}

{ // Group labels + textbox
  const node = { role: 'textbox', name: 'City', value: 'Paris', groupLabels: ['Profile', 'Address'] };
  const segs = generateSegments(node);
  assert.strictEqual(generatePreviewString(segs), 'Profile, Address, City, edit, Paris');
}

{ // Tablist with index fallback
  const node = { role: 'tablist', name: 'Settings Sections', activeIndex: 2, itemCount: 5 };
  const segs = generateSegments(node);
  assert.strictEqual(generatePreviewString(segs), 'Settings Sections, tablist, item 2 of 5');
}

{ // Tab selected + position + active
  const node = { role: 'tab', name: 'General', selected: true, posInSet: 1, setSize: 5, id: 't1', activeDescendant: 't1' };
  const segs = generateSegments(node);
  assert.strictEqual(generatePreviewString(segs), 'General, tab, selected, active, 1 of 5');
}

{ // Treeitem mixed + index + active descendant
  const node = { role: 'treeitem', name: 'Parent', 'aria-checked': 'mixed', posInSet: 2, setSize: 4, id: 'ti2', activeDescendant: 'ti2' };
  const segs = generateSegments(node);
  assert.strictEqual(generatePreviewString(segs), 'Parent, tree item, mixed, 2 of 4, active');
}

console.log('Composite context tests passed.');

// Tree container summary
{ const node = { role: 'tree', name: 'Navigation', length: 6, activeDescendantName: 'Inbox' };
  const segs = generateSegments(node);
  const str = generatePreviewString(segs);
  assert.strictEqual(str, 'Navigation, tree, with 6 items, active: Inbox'); }

// Radiogroup with selected name and active descendant
{ const node = { role: 'radiogroup', name: 'Delivery Speed', selectedName: 'Express', selectedIndex: 2, itemCount: 3, activeDescendantName: 'Express' };
  const segs = generateSegments(node);
  const str = generatePreviewString(segs);
  // selected name wins over index summary
  assert.strictEqual(str, 'Delivery Speed, radio group, selected: Express, active: Express'); }

// Slider with 0-based min
{ const node = { role: 'slider', name: 'Volume', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 30 };
  const segs = generateSegments(node);
  const str = generatePreviewString(segs);
  assert.strictEqual(str, 'Volume, slider, 30 of 100 (30%)'); }

// Slider with non-zero min
{ const node = { role: 'slider', name: 'Brightness', 'aria-valuemin': 50, 'aria-valuemax': 150, 'aria-valuenow': 100 };
  const segs = generateSegments(node);
  const str = generatePreviewString(segs);
  assert.strictEqual(str, 'Brightness, slider, 100 (range 50 to 150, 50%)'); }
