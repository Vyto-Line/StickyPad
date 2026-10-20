// Restore from a backup, through the real app code (fake Electron, a seeded data folder so the notes file really exists).
const assert = require('assert'), fs = require('fs'), path = require('path'), os = require('os');
const seed = fs.mkdtempSync(path.join(os.tmpdir(), 'ra-')); fs.mkdirSync(path.join(seed, 'images'));
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(path.join(seed, 'images', 'abc123.png'), PNG);
const mk = (id, title, text, o = {}) => ({ id, title, text, blocks: [{ t: 'text', v: text }, ...(o.img ? [{ t: 'img', id: o.img }] : [])], color: '#FFF2A8', font: 'Segoe UI', size: 15, bounds: { x: 10, y: 10, width: 300, height: 320 }, updated: 5, ...(o.group ? { group: o.group } : {}) });
fs.writeFileSync(path.join(seed, 'notes.json'), JSON.stringify({ version: 2, notes: { na: mk('na', 'Alpha', 'precious text', { img: 'abc123.png', group: 'g1' }), nb: mk('nb', 'Beta', 'second note') }, trash: [], groups: [{ id: 'g1', name: 'Work', collapsed: false }], settings: {} }));
process.env.SP_SEED_DIR = seed;
const H = require('./fake-electron');
(async () => {
  const { handlers: h, electron, tmp } = H, ud = path.join(tmp, 'userData'), act = (n, a) => h['settings:action']({}, n, a);
  await new Promise(r => setTimeout(r, 1200));
  assert.ok((await h['all:list']({})).notes.length === 2, 'seeded notes loaded');
  assert.ok((await act('backupNow')).ok); await h['app:prefs']({}, { name: 'Zed' });
  const lb = await act('listBackups'); const item = lb.items.find(x => x.kind === 'backup' && x.ok); assert.ok(item && item.notes === 2, JSON.stringify(lb));
  const id = item.id;
  // add missing: both notes lost for good, the picture file too
  // remove the notes the way a user would: to the trash, then out of the trash
  const open = async nid => {   // the window that shows this note (found by asking each window which note it is)
    await h['all:show']({}, nid);
    for (const w of H.wins.slice().reverse()) { if (w.isDestroyed()) continue; const g = await h['note:get'](H.ev(w)); if (g && g.id === nid) return H.ev(w); }
    throw new Error('no window for ' + nid);
  };
  const eA = await open('na'); await h['note:delete'](eA); await h['trash:purge']({}, 'na');
  const eB = await open('nb'); await h['note:delete'](eB); await h['trash:purge']({}, 'nb');
  assert.ok(!fs.existsSync(path.join(ud, 'images', 'abc123.png')), 'picture file removed with the purged note');
  assert.strictEqual((await h['all:list']({})).notes.length, 0);
  const add = await act('restoreBackup', { id, mode: 'add' }); assert.ok(add.ok && add.mode === 'add' && add.added === 2 && add.images === 1, JSON.stringify(add));
  let list = (await h['all:list']({})); assert.deepStrictEqual(list.notes.map(x => x.id).sort(), ['na', 'nb']); assert.ok(fs.existsSync(path.join(ud, 'images', 'abc123.png')), 'picture is back');
  assert.ok(list.groups.some(g => g.id === 'g1' && g.name === 'Work'), 'the folder came back'); assert.strictEqual(list.notes.find(x => x.id === 'na').group, 'g1');
  const again = await act('restoreBackup', { id, mode: 'add' }); assert.ok(again.ok && again.added === 0, 'a second time adds nothing: ' + JSON.stringify(again));
  // add never changes a note that exists
  const eA2 = await open('na'); await h['note:update'](eA2, { blocks: [{ t: 'text', v: 'EDITED since' }] });
  await act('restoreBackup', { id, mode: 'add' }); assert.ok(/EDITED since/.test((await h['all:list']({})).notes.find(x => x.id === 'na').text), 'an existing note is left alone');
  // replace: a note written later disappears, the safety copy keeps it, the settings of this PC stay
  await h['note:new']({ sender: { id: 0 } }); const eN = H.ev(H.wins[H.wins.length - 1]); await h['note:update'](eN, { title: 'Written later', blocks: [{ t: 'text', v: 'later stuff' }] });
  const rep = await act('restoreBackup', { id, mode: 'replace' }); assert.ok(rep.ok && rep.mode === 'replace' && /^before-restore-/.test(rep.safety), JSON.stringify(rep));
  list = await h['all:list']({}); assert.deepStrictEqual(list.notes.map(x => x.id).sort(), ['na', 'nb'], 'exactly the notes of the backup'); assert.ok(/precious text/.test(list.notes.find(x => x.id === 'na').text) && !/EDITED/.test(JSON.stringify(list.notes)));
  const safe = fs.readFileSync(path.join(ud, 'backups', rep.safety, 'notes.json'), 'utf8'); assert.ok(/Written later/.test(safe) && /EDITED since/.test(safe), 'what there was before is kept');
  assert.strictEqual((await h['settings:get']({})).prefs.name, 'Zed', 'settings of this PC are kept');
  assert.ok(JSON.parse(fs.readFileSync(path.join(ud, 'notes.json'), 'utf8')).notes.na, 'saved to disk at once');
  assert.ok(H.wins.some(w => w.webContents.sent.some(m => m[0] === 'note:reload')), 'open notes are told to reload');
  // only ids we made are accepted
  for (const bad of ['b:../../x', '/etc/passwd', 'b:2026-10-01_09-00-00/../..', '', 'b:2020-01-01_00-00-00']) assert.strictEqual((await act('restoreBackup', { id: bad, mode: 'replace' })).ok, false, 'refused: ' + bad);
  assert.strictEqual((await act('restoreBackup')).ok, false, 'no argument');
  // from a file: only missing notes are added
  await h['note:delete'](await open('nb')); await h['trash:purge']({}, 'nb');
  electron.__open = [path.join(ud, 'backups', id.slice(2), 'notes.json')]; const rf = await act('restoreFromFile'); assert.ok(rf.ok && rf.mode === 'add' && rf.added === 1, JSON.stringify(rf));
  electron.__open = undefined; assert.strictEqual((await act('restoreFromFile')).cancelled, true);
  // damaged backup
  fs.mkdirSync(path.join(ud, 'backups', '2020-01-01_00-00-00'), { recursive: true }); fs.writeFileSync(path.join(ud, 'backups', '2020-01-01_00-00-00', 'notes.json'), '{"version":2,"notes":{"x"');
  assert.strictEqual((await act('restoreBackup', { id: 'b:2020-01-01_00-00-00', mode: 'replace' })).ok, false, 'a damaged backup never replaces anything'); assert.strictEqual((await h['all:list']({})).notes.length, 2);
  console.log('restoreapp ok'); process.exit(0);
})().catch(e => { console.error('HARNESS FAIL', e); process.exit(1); });
