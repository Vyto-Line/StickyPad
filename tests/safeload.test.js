const assert = require('assert'), fs = require('fs'), path = require('path'), os = require('os'), L = require('../safeload');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-')), ud = path.join(dir, 'ud'); fs.mkdirSync(ud);
const good = { version: 2, notes: { a: { id: 'a', title: 'Hi' } }, trash: [], groups: [], settings: {} };
const f = path.join(dir, 'notes.json');
// reading
assert.deepStrictEqual(L.readJson(f), { ok: false, missing: true }, 'no file is not an error');
fs.writeFileSync(f, JSON.stringify(good)); assert.ok(L.readJson(f).ok);
fs.writeFileSync(f, '﻿' + JSON.stringify(good)); assert.ok(L.readJson(f).ok, 'a byte-order mark does not make a good file unreadable');
fs.writeFileSync(f, '{"version":2,"notes":{"a":'); const t0 = Date.now(); const bad = L.readJson(f, 3, 20); assert.ok(!bad.ok && !bad.missing && bad.error, 'half a file is an error, not "no notes"'); assert.ok(Date.now() - t0 >= 35, 'and it is tried again first');
// a file that becomes good while it is being retried (a sync program finishing its write)
fs.writeFileSync(f, '{"x"');   // (another process finishes writing after 150 ms; this one cannot use timers while it waits)
require('child_process').spawn(process.execPath, ['-e', `setTimeout(() => require('fs').writeFileSync(${JSON.stringify(f)}, ${JSON.stringify(JSON.stringify(good))}), 150)`], { stdio: 'ignore' }).unref();
const late = L.readJson(f, 40, 50); assert.ok(late.ok, 'a busy file is read once it is ready');
// counting
assert.strictEqual(L.countNotes(good), 1); assert.strictEqual(L.countNotes({ version: 2, notes: {} }), 0); assert.strictEqual(L.countNotes({ a: {}, b: {} }), 2, 'old plain format'); assert.strictEqual(L.countNotes(null), 0); assert.strictEqual(L.countNotes('x'), 0);
// no copy anywhere: nothing to recover
fs.writeFileSync(f, 'garbage'); assert.strictEqual(L.recover(dir, ud), null);
// copies: an empty one is skipped, newest good backup wins
fs.mkdirSync(path.join(ud, 'backups', '2026-01-01_00-00-00'), { recursive: true }); fs.mkdirSync(path.join(ud, 'backups', '2026-02-01_00-00-00'), { recursive: true }); fs.mkdirSync(path.join(ud, 'backups', '2026-03-01_00-00-00'), { recursive: true });
fs.writeFileSync(path.join(ud, 'backups', '2026-01-01_00-00-00', 'notes.json'), JSON.stringify({ ...good, notes: { old: { id: 'old' } } }));
fs.writeFileSync(path.join(ud, 'backups', '2026-02-01_00-00-00', 'notes.json'), JSON.stringify(good));
fs.writeFileSync(path.join(ud, 'backups', '2026-03-01_00-00-00', 'notes.json'), JSON.stringify({ version: 2, notes: {} }));
let rc = L.recover(dir, ud); assert.ok(rc && rc.from.includes('2026-02-01') && rc.data.notes.a, 'newest backup that holds notes: ' + (rc && rc.from));
// the last good copy beats the backups
L.keepLastGood(dir, f); assert.ok(!fs.existsSync(path.join(dir, 'notes.lastgood.json')), 'an unreadable file is never kept as "last good"');
fs.writeFileSync(f, JSON.stringify({ ...good, notes: { fresh: { id: 'fresh' } } })); L.keepLastGood(dir, f);
fs.writeFileSync(f, JSON.stringify({ version: 2, notes: {} })); L.keepLastGood(dir, f);
assert.ok(JSON.parse(fs.readFileSync(path.join(dir, 'notes.lastgood.json'), 'utf8')).notes.fresh, 'an empty file does not replace the last good copy');
fs.writeFileSync(f, 'garbage'); rc = L.recover(dir, ud); assert.ok(rc.from.endsWith('notes.lastgood.json') && rc.data.notes.fresh);
// the unreadable file itself is kept, once per size
const k1 = L.keepBroken(dir, f), k2 = L.keepBroken(dir, f); assert.ok(fs.readFileSync(k1, 'utf8') === 'garbage' && k1 === k2, 'kept, and not again every start');
console.log('safeload ok');
