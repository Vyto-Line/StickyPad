'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const { buildTemplate } = require('../contextmenu');
const lab = t => t.filter(i => i.type !== 'separator').map(i => i.label + (i.enabled === false ? '(off)' : ''));

// right-click in a note with some words selected: Cut, Copy, Paste, Select all, all usable
let t = buildTemplate({ isEditable: true, selectionText: 'hello', editFlags: { canCut: true, canCopy: true, canPaste: true, canSelectAll: true } }, {});
assert.deepStrictEqual(lab(t), ['Cut', 'Copy', 'Paste', 'Select all']);
assert.deepStrictEqual(t.filter(i => i.role).map(i => i.role), ['cut', 'copy', 'paste', 'selectAll'], 'the real editing actions are used, so cut and paste go through the note\'s own handlers');

// nothing selected: Cut and Copy are greyed out, Paste still works
t = buildTemplate({ isEditable: true, selectionText: '', editFlags: { canCut: true, canCopy: true, canPaste: true, canSelectAll: true } }, {});
assert.deepStrictEqual(lab(t), ['Cut(off)', 'Copy(off)', 'Paste', 'Select all']);

// nothing on the clipboard to paste
t = buildTemplate({ isEditable: true, selectionText: 'x', editFlags: { canPaste: false } }, {});
assert.ok(lab(t).includes('Paste(off)'));

// read-only text (a chat answer, a result): Copy only when something is selected
t = buildTemplate({ isEditable: false, selectionText: 'words', editFlags: { canCopy: true, canSelectAll: true } }, {});
assert.deepStrictEqual(lab(t), ['Copy', 'Select all']);
assert.deepStrictEqual(buildTemplate({ isEditable: false, selectionText: '' }, {}), [], 'no menu on plain areas');
assert.deepStrictEqual(buildTemplate(null, {}), [], 'odd input gives no menu');

// misspelled word: suggestions first (at most five), then Add to dictionary
let replaced = null, added = null;
const wc = { replaceMisspelling: s => { replaced = s; }, session: { addWordToSpellCheckerDictionary: w => { added = w; } } };
t = buildTemplate({ isEditable: true, selectionText: 'helo', misspelledWord: 'helo', dictionarySuggestions: ['hello', 'help', 'hero', 'held', 'helm', 'heloo', 'halo'], editFlags: {} }, wc);
assert.deepStrictEqual(lab(t).slice(0, 7), ['hello', 'help', 'hero', 'held', 'helm', 'Add to dictionary', 'Cut']);
t[0].click(); assert.strictEqual(replaced, 'hello', 'a suggestion replaces the word');
t.find(i => i.label === 'Add to dictionary').click(); assert.strictEqual(added, 'helo');
t = buildTemplate({ isEditable: true, misspelledWord: 'zzqx', dictionarySuggestions: [], editFlags: {} }, wc);
assert.deepStrictEqual(lab(t).slice(0, 2), ['No suggestions(off)', 'Add to dictionary']);
// a failing spell-check call must not throw out of the menu
assert.doesNotThrow(() => buildTemplate({ isEditable: true, misspelledWord: 'a', dictionarySuggestions: ['b'], editFlags: {} }, {})[0].click());

// wired up and packaged
assert.ok(/web-contents-created[\s\S]{0,400}context-menu/.test(fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8')), 'main.js shows the menu');
assert.ok(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).build.files.includes('contextmenu.js'), 'contextmenu.js is in the installer');
console.log('contextmenu tests passed');
