'use strict';
const assert = require('assert');
const C = require('../convert');

// slug
assert.strictEqual(C.slug('  My: note / 1?  '), 'My note 1');
assert.strictEqual(C.slug(''), 'Untitled'); assert.strictEqual(C.slug('???'), 'Untitled');
assert.strictEqual(C.slug('CON'), '_CON'); assert.strictEqual(C.slug('nul'), '_nul');
assert.strictEqual(C.slug('Λίστα αγορών'), 'Λίστα αγορών');
assert.strictEqual(C.slug('end.'), 'end'); assert.ok(C.slug('x'.repeat(200)).length <= 60);

// export
const blocks = [{ t: 'text', v: 'Shopping for Friday\n' }, { t: 'check', v: 'milk', done: true }, { t: 'check', v: 'eggs', done: false }, { t: 'img', id: 'abc123.png' }, { t: 'text', v: 'Thanks!' }];
assert.strictEqual(C.toMarkdown('Groceries', blocks), '# Groceries\n\nShopping for Friday\n- [x] milk\n- [ ] eggs\nThanks!\n');
assert.strictEqual(C.toText('Groceries', blocks), 'Groceries\n\nShopping for Friday\n[x] milk\n[ ] eggs\nThanks!\n');
assert.strictEqual(C.toMarkdown('', [{ t: 'text', v: 'just text' }]), 'just text\n');
assert.strictEqual(C.toMarkdown('T', []), '# T\n'); assert.strictEqual(C.toMarkdown('', []), ''); assert.strictEqual(C.toText('T', []), 'T\n');

// import
let r = C.fromMarkdown('# Groceries\n\nShopping for Friday\n- [x] milk\n- [ ] eggs\n* [X] bread\nThanks!\n', 'x.md');
assert.strictEqual(r.title, 'Groceries');
assert.deepStrictEqual(r.blocks, [{ t: 'text', v: 'Shopping for Friday' }, { t: 'check', v: 'milk', done: true }, { t: 'check', v: 'eggs', done: false }, { t: 'check', v: 'bread', done: true }, { t: 'text', v: 'Thanks!' }]);
r = C.fromMarkdown('no heading here\r\nsecond line', 'C:\\docs\\My Plan.txt');
assert.strictEqual(r.title, 'My Plan'); assert.deepStrictEqual(r.blocks, [{ t: 'text', v: 'no heading here\nsecond line' }]);
r = C.fromMarkdown('\uFEFF\n\n# Τίτλος\n\nκείμενο', 'a.md'); assert.strictEqual(r.title, 'Τίτλος'); assert.strictEqual(r.blocks[0].v, 'κείμενο');
r = C.fromMarkdown('', 'empty.md'); assert.strictEqual(r.title, 'empty'); assert.deepStrictEqual(r.blocks, []);
r = C.fromMarkdown('- [ ] \n- [ ] real', 'a.md'); assert.deepStrictEqual(r.blocks.filter(b => b.t === 'check').map(b => b.v), ['real'], 'empty items are not made');
r = C.fromMarkdown('## sub heading\ntext', 'a.md'); assert.strictEqual(r.title, 'a', 'only a level-1 heading becomes the title');

// round trip keeps the words and the ticks
const rt = C.fromMarkdown(C.toMarkdown('Round', blocks.filter(b => b.t !== 'img')), 'r.md');
assert.strictEqual(rt.title, 'Round');
assert.deepStrictEqual(rt.blocks, [{ t: 'text', v: 'Shopping for Friday' }, { t: 'check', v: 'milk', done: true }, { t: 'check', v: 'eggs', done: false }, { t: 'text', v: 'Thanks!' }]);

// unique names
assert.deepStrictEqual(C.uniqueNames(['A', 'a', 'A', ''], '.md'), ['A.md', 'a (2).md', 'A (3).md', 'Untitled.md']);
console.log('convert ok');
// .stickypad files: Markdown inside, found in a command line
assert.deepStrictEqual(C.noteFileArgs(['C:\\App\\StickyPad.exe', '--updated', 'C:\\n\\Plan.stickypad', 'x.txt', 'D:\\A.STICKYPAD', '--x.stickypad']), ['C:\\n\\Plan.stickypad', 'D:\\A.STICKYPAD']);
assert.deepStrictEqual(C.noteFileArgs(undefined), []);
assert.strictEqual(C.fromMarkdown('hello', 'C:\\n\\Plan.stickypad').title, 'Plan');
