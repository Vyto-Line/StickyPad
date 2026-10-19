const assert = require('assert'), fs = require('fs'), path = require('path');
const C = require('../changelog');
const md = `# Changelog

## 1.14.12
This release also contains everything from 1.14.8.
- **Better models.** Gemma 4.
- Not tried on a real Windows PC yet.

## 1.14.11
- Folder chips.
### Extra
- Neon bar.

## 1.14.9
- One Home window.

## 1.14.8
- Delete a model.

## 1.14.7
- Panel column.
`;
const s = C.parse(md);
assert.deepStrictEqual(s.map(x => x.version), ['1.14.12', '1.14.11', '1.14.9', '1.14.8', '1.14.7']);
assert.ok(!JSON.stringify(s).includes('Not tried'), 'developer notes are left out');
assert.strictEqual(s[0].blocks[0].t, 'p'); assert.strictEqual(s[0].blocks[1].t, 'li'); assert.ok(s[1].blocks.some(b => b.t === 'h'));
// compare versions as numbers (1.14.10 is newer than 1.14.9)
assert.strictEqual(C.cmp('1.14.10', '1.14.9'), 1); assert.strictEqual(C.cmp('1.9.0', '1.14.0'), -1); assert.strictEqual(C.cmp('1.14.8', '1.14.8'), 0);
// from the old version up to the current one, newest first
assert.deepStrictEqual(C.since(s, '1.14.8', '1.14.12').map(x => x.version), ['1.14.12', '1.14.11', '1.14.9']);
assert.deepStrictEqual(C.since(s, '1.14.12', '1.14.12'), [], 'nothing newer');
assert.deepStrictEqual(C.since(s, '1.14.8', '1.14.11').map(x => x.version), ['1.14.11', '1.14.9'], 'versions above the installed one are left out');
// unknown old version: just the newest few
assert.deepStrictEqual(C.since(s, null, '1.14.12', 2).map(x => x.version), ['1.14.12', '1.14.11']);
assert.strictEqual(C.since(s, null, '1.14.12', 99).length, 5, 'never more than 5 without a known old version');
// the real file
const real = C.parse(fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8'));
const cur = require('../package.json').version;
assert.ok(real.length > 5, 'real changelog parses'); assert.strictEqual(real[0].version, cur, 'the newest changelog section is the current version');
assert.ok(real.every(x => x.blocks.length), 'no empty sections');
console.log('changelog ok');
