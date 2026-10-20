const assert = require('assert'), fs = require('fs'), path = require('path'), os = require('os'), R = require('../restore');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rs-')), ud = path.join(root, 'ud'), data = path.join(root, 'data'); fs.mkdirSync(ud); fs.mkdirSync(data);
const mkBackup = (stamp, notes, extra = {}) => { const d = path.join(ud, 'backups', stamp); fs.mkdirSync(path.join(d, 'images'), { recursive: true }); fs.writeFileSync(path.join(d, 'notes.json'), typeof notes === 'string' ? notes : JSON.stringify({ version: 2, notes, trash: extra.trash || [], groups: [], settings: {} })); return d; };
const d1 = mkBackup('2026-10-01_09-00-00', { a: { id: 'a' }, b: { id: 'b' } }), d2 = mkBackup('2026-10-05_10-30-00', { a: { id: 'a' } }, { trash: [{ id: 't' }] }); mkBackup('2026-10-03_08-00-00', '{"version":2,"notes":{"a":');
fs.writeFileSync(path.join(d1, 'images', 'one.png'), 'IMG1'); fs.writeFileSync(path.join(d1, 'images', 'two.png'), 'IMG2');
fs.mkdirSync(path.join(ud, 'backups', 'before-restore-2026-01-01_00-00-00'));   // never listed as a backup
fs.writeFileSync(path.join(data, 'notes.lastgood.json'), JSON.stringify({ version: 2, notes: { z: { id: 'z' } } }));
const e = R.entries(ud, data);
assert.deepStrictEqual(e.map(x => x.id), ['b:2026-10-05_10-30-00', 'b:2026-10-03_08-00-00', 'b:2026-10-01_09-00-00', 'lastgood'], 'newest first, the last good copy at the end, safety copies not listed');
assert.deepStrictEqual([e[0].notes, e[0].trash, e[0].ok], [1, 1, true]); assert.strictEqual(e[1].ok, false, 'a damaged backup is shown as unreadable'); assert.strictEqual(e[2].notes, 2);
assert.strictEqual(new Date(e[0].when).getHours(), 10, 'time read from the folder name');
// ids: only ours
assert.strictEqual(R.locate(ud, data, 'b:2026-10-01_09-00-00').file, path.join(d1, 'notes.json'));
['b:../../etc', 'b:2026-10-01_09-00-00/../x', '/etc/passwd', 'C:\\x', '', undefined, 'b:', 'b:2026-13-01'].forEach(id => assert.strictEqual(R.locate(ud, data, id), null, 'refused: ' + id));
assert.strictEqual(R.locate(ud, data, 'b:2027-01-01_00-00-00'), null, 'a backup that is gone'); assert.ok(R.locate(ud, data, 'lastgood'));
// pictures: only the wanted, valid, missing ones
const dst = path.join(root, 'imgs'); fs.mkdirSync(dst); fs.writeFileSync(path.join(dst, 'two.png'), 'KEEP');
const V = /^[a-z0-9]{3,40}\.(png|jpe?g|webp|gif)$/;
assert.strictEqual(R.copyImages(path.join(d1, 'images'), dst, new Set(['one.png', 'two.png', '../evil.png', 'nope.png']), V), 1);
assert.strictEqual(fs.readFileSync(path.join(dst, 'one.png'), 'utf8'), 'IMG1'); assert.strictEqual(fs.readFileSync(path.join(dst, 'two.png'), 'utf8'), 'KEEP', 'an existing picture is never overwritten');
// safety copy keeps the newest 3
fs.writeFileSync(path.join(data, 'notes.json'), 'CURRENT'); fs.mkdirSync(path.join(data, 'images')); fs.writeFileSync(path.join(data, 'images', 'x.png'), 'X');
for (let i = 0; i < 5; i++) R.safetyCopy(ud, data, new Date(2026, 9, 10, 12, 0, i));
const keep = fs.readdirSync(path.join(ud, 'backups')).filter(n => /^before-restore/.test(n)).sort(); assert.strictEqual(keep.length, 3); assert.ok(keep[2].endsWith('12-00-04'));
assert.strictEqual(fs.readFileSync(path.join(ud, 'backups', keep[2], 'notes.json'), 'utf8'), 'CURRENT'); assert.ok(fs.existsSync(path.join(ud, 'backups', keep[2], 'images', 'x.png')));
console.log('restore ok');
