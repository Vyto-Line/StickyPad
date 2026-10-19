'use strict';
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
const H = require('../history');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-hist-'));
const T = s => [{ t: 'text', v: s }];

// shouldKeep
assert.strictEqual(H.shouldKeep([], T('x'), 0, 1e9), false, 'empty previous content is not worth keeping');
assert.strictEqual(H.shouldKeep(T('hello'), T('hello!'), 1e9 - 1000, 1e9), false, 'too soon');
assert.strictEqual(H.shouldKeep(T('hello'), T('hello!'), 0, 1e9), true, 'first change after a long time');
const big = 'word '.repeat(100);
assert.strictEqual(H.shouldKeep(T(big), T(''), 1e9 - 30000, 1e9), true, 'sudden big cut is kept even soon after the last copy');
assert.strictEqual(H.shouldKeep(T(big), T(''), 1e9 - 5000, 1e9), false, '...but not several times within seconds');
assert.strictEqual(H.shouldKeep(T('short'), T(''), 1e9 - 30000, 1e9), false, 'tiny notes do not count as big cuts');

// add / list / get / dedupe
assert.strictEqual(H.add(dir, 'abc123', { title: 'A', blocks: T('one two three') }, 1000), true);
assert.strictEqual(H.add(dir, 'abc123', { title: 'A', blocks: T('one two three') }, 2000), false, 'identical copy is skipped');
assert.strictEqual(H.add(dir, 'abc123', { title: 'A', blocks: [{ t: 'check', v: 'milk', done: true }, { t: 'img', id: 'aaaaaa.png' }] }, 3000), true);
assert.strictEqual(H.add(dir, 'abc123', { title: '', blocks: T('   ') }, 4000), false, 'blank content is not kept');
const l = H.list(dir, 'abc123');
assert.deepStrictEqual(l.map(x => x.t), [3000, 1000], 'newest first');
assert.strictEqual(l[0].pics, 1); assert.strictEqual(l[1].words, 3); assert.strictEqual(l[1].preview, 'one two three');
assert.strictEqual(H.get(dir, 'abc123', 1000).blocks[0].v, 'one two three');
assert.strictEqual(H.get(dir, 'abc123', 999), null);
assert.strictEqual(H.lastTime(dir, 'abc123'), 3000);
assert.ok(H.pictureIds(dir).has('aaaaaa.png'));
assert.deepStrictEqual(H.ids(dir), ['abc123']);

// limits: at most 30 copies
for (let i = 0; i < 40; i++) H.add(dir, 'many01', { blocks: T('v' + i) }, 10000 + i);
const m = H.list(dir, 'many01'); assert.strictEqual(m.length, 30); assert.strictEqual(m[0].preview, 'v39'); assert.strictEqual(m[29].preview, 'v10');
// limits: total size, always keeps the newest
const chunk = 'x'.repeat(1.5e6);
for (let i = 0; i < 5; i++) H.add(dir, 'bulk01', { blocks: T(chunk + i) }, 20000 + i);
const bl = H.list(dir, 'bulk01'); assert.ok(bl.length >= 1 && bl.length <= 3, 'size capped (' + bl.length + ')'); assert.strictEqual(bl[0].t, 20004);
// a single giant copy is refused
assert.strictEqual(H.add(dir, 'giant1', { blocks: T('y'.repeat(9e6)) }, 1), false);

// safety: bad ids never touch the disk
assert.strictEqual(H.add(dir, '../evil', { blocks: T('x') }, 1), false);
assert.deepStrictEqual(H.read(dir, '../evil'), []);
H.remove(dir, '../evil');
// remove
H.remove(dir, 'abc123'); assert.deepStrictEqual(H.read(dir, 'abc123'), []);
// damaged file does not throw
fs.writeFileSync(path.join(dir, 'history', 'broken.json'), '{not json'); assert.deepStrictEqual(H.read(dir, 'broken'), []);
fs.rmSync(dir, { recursive: true, force: true });
console.log('history ok');
