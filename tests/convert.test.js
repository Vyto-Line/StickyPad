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
// pictures travel inside the file as data addresses and come back as picture blocks
const PNG = 'data:image/png;base64,iVBORw0KGgo=', JPG = 'data:image/jpeg;base64,/9j/4AAQ';
const pb = [{ t: 'text', v: 'Before\n' }, { t: 'img', id: 'a.png' }, { t: 'check', v: 'milk', done: false }, { t: 'img', id: 'gone.png' }, { t: 'img', id: 'b.jpg' }, { t: 'text', v: 'After' }];
const imgOf = id => ({ 'a.png': PNG, 'b.jpg': JPG }[id] || '');
const pm = C.toMarkdown('Pics', pb, { image: imgOf });
assert.ok(pm.includes('![](' + PNG + ')') && pm.includes('![](' + JPG + ')') && !pm.includes('gone'), 'pictures are written, a missing file is skipped');
assert.ok(!C.toMarkdown('Pics', pb).includes('data:image'), 'without the option pictures are left out as before'); assert.ok(!C.toText('Pics', pb).includes('data:image'), 'plain text never has pictures');
const pr = C.fromMarkdown(pm, 'x.stickypad');
assert.deepStrictEqual(pr.blocks.map(b => b.t), ['text', 'img', 'check', 'img', 'text'], JSON.stringify(pr.blocks.map(b => b.t)));
assert.strictEqual(pr.blocks[1].data, PNG); assert.strictEqual(pr.blocks[3].data, JPG); assert.strictEqual(pr.blocks[0].v, 'Before', 'no extra blank lines around a picture'); assert.strictEqual(pr.blocks[4].v, 'After');
const again = C.toMarkdown(pr.title, pr.blocks.map(b => b.t === 'img' ? { t: 'img', id: b.data === PNG ? 'a.png' : 'b.jpg' } : b), { image: imgOf }); assert.strictEqual(again, C.toMarkdown('Pics', pb.filter(b => b.id !== 'gone.png'), { image: imgOf }), 'export, import, export gives the same file');
const evil = C.fromMarkdown('# T\n![x](data:image/svg+xml;base64,PHN2Zz4=)\n![y](https://example.com/a.png)\n![z](data:text/html;base64,AAAA)\n'); assert.ok(!evil.blocks.some(b => b.t === 'img'), 'only png, jpeg, webp and gif data addresses become pictures');
console.log('convert ok');
// .stickypad files: Markdown inside, found in a command line
assert.deepStrictEqual(C.noteFileArgs(['C:\\App\\StickyPad.exe', '--updated', 'C:\\n\\Plan.stickypad', 'x.txt', 'D:\\A.STICKYPAD', '--x.stickypad']), ['C:\\n\\Plan.stickypad', 'D:\\A.STICKYPAD']);
assert.deepStrictEqual(C.noteFileArgs(undefined), []);
assert.strictEqual(C.fromMarkdown('hello', 'C:\\n\\Plan.stickypad').title, 'Plan');
