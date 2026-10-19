const assert = require('assert'), fs = require('fs'), path = require('path'), I = require('../importers'), S = require('../sqliteread');
// Google Keep
const k = I.fromKeep(JSON.stringify({ title: 'Ψώνια', color: 'BLUE', isTrashed: false, labels: [{ name: 'Σπίτι' }], userEditedTimestampUsec: 1700000000000000, listContent: [{ text: 'γάλα', isChecked: true }, { text: 'ψωμί\nφρέσκο', isChecked: false }] }));
assert.strictEqual(k.title, 'Ψώνια'); assert.deepStrictEqual(k.blocks, [{ t: 'check', v: 'γάλα', done: true }, { t: 'check', v: 'ψωμί φρέσκο', done: false }]);
assert.strictEqual(k.color, '#CDEFFF'); assert.strictEqual(k.folder, 'Σπίτι'); assert.strictEqual(k.updated, 1700000000000);
const k2 = I.fromKeep('{"textContent":"hello\\nworld  ","title":""}'); assert.deepStrictEqual(k2.blocks, [{ t: 'text', v: 'hello\nworld' }]); assert.strictEqual(k2.color, '#FFFFFF');
assert.deepStrictEqual(I.fromKeep('{"isTrashed":true,"textContent":"x"}'), { skipped: 'trashed' }); assert.deepStrictEqual(I.fromKeep('{"title":"","textContent":""}'), { skipped: 'empty' });
assert.strictEqual(I.fromKeep('not json'), null); assert.strictEqual(I.fromKeep('{"foo":1}'), null);
// Windows Sticky Notes, with the part of the data that is still in the -wal file
const dir = path.join(__dirname, 'fixtures'), db = fs.readFileSync(path.join(dir, 'plum_copy.sqlite')), wal = fs.readFileSync(path.join(dir, 'plum_copy.sqlite-wal'));
assert.strictEqual(S.open(db).rows('Note').length, 0, 'the main file alone is still empty');
const n = I.fromStickyNotes(db, wal); assert.strictEqual(n.length, 1, 'deleted notes are skipped');
assert.strictEqual(n[0].blocks[0].v, 'Αγορές\nγάλα και ψωμί'); assert.strictEqual(n[0].color, '#CDEFFF');
assert.throws(() => S.open(Buffer.from('hello')), /Not a SQLite/); assert.throws(() => I.fromStickyNotes(db, null) && S.open(Buffer.alloc(10)));
assert.strictEqual(I.ticksToMs(637000000000000000), Math.round((637000000000000000 - 621355968000000000) / 10000));
console.log('importers ok');
