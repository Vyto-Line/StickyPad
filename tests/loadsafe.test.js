// Starts the whole app (against a fake Electron) on notes files that cannot be read, and checks that nothing is ever overwritten or lost.
const assert = require('assert'), fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-'));
const good = { version: 2, notes: { n1: { id: 'n1', title: 'Precious', text: 'my notes', blocks: [{ t: 'text', v: 'my notes' }], color: '#FFF2A8', font: 'Segoe UI', size: 15, x: 10, y: 10, w: 300, h: 300, updated: 5 } }, trash: [], groups: [], settings: {} };
const run = (seed, check) => {
  fs.rmSync(path.join(root, 'seed'), { recursive: true, force: true }); fs.mkdirSync(path.join(root, 'seed'), { recursive: true }); seed(path.join(root, 'seed'));
  const code = `
    const H = require(${JSON.stringify(path.join(__dirname, 'fake-electron.js'))}); const fs = require('fs'), path = require('path');
    (async () => {
      await new Promise(r => setTimeout(r, 2500));
      const ud = path.join(H.tmp, 'userData');
      try { await H.handlers['note:new']({ sender: { id: 0 } }); } catch (e) {}
      await new Promise(r => setTimeout(r, 900));   // the 300 ms save timer fires
      const all = H.handlers['all:list'] ? await H.handlers['all:list']({}) : { notes: [] };
      console.log(JSON.stringify({ files: fs.readdirSync(ud), notesJson: fs.existsSync(path.join(ud, 'notes.json')) ? fs.readFileSync(path.join(ud, 'notes.json'), 'utf8') : null, titles: all.notes.map(n => n.title), msgs: H.dialogCalls.length, notes: H.electron.__notes.map(n => n.body) }));
      process.exit(0);
    })();`;
  const r = spawnSync(process.execPath, ['-e', code], { env: { ...process.env, SP_SEED_DIR: path.join(root, 'seed') }, encoding: 'utf8', timeout: 60000 });
  const line = (r.stdout || '').trim().split('\n').pop();
  let out; try { out = JSON.parse(line); } catch { throw new Error('child said: ' + r.stdout + r.stderr); }
  check(out);
};
// 1. unreadable file, no other copy: nothing is touched, nothing is written
run(d => fs.writeFileSync(path.join(d, 'notes.json'), '{"version":2,"notes":{"n1":{"id":"n1","tit'), o => {
  assert.strictEqual(o.notesJson, '{"version":2,"notes":{"n1":{"id":"n1","tit', 'the unreadable file was not overwritten');
  assert.ok(o.files.some(f => /^notes\.unreadable-/.test(f)), 'and a copy of it was kept: ' + o.files);
});
// 2. unreadable file with a good backup: the notes come back, the broken file is kept
run(d => { fs.writeFileSync(path.join(d, 'notes.json'), 'oops'); fs.mkdirSync(path.join(d, 'backups', '2026-05-01_10-00-00'), { recursive: true }); fs.writeFileSync(path.join(d, 'backups', '2026-05-01_10-00-00', 'notes.json'), JSON.stringify(good)); }, o => {
  assert.ok(o.titles.includes('Precious'), 'notes restored from the backup: ' + o.titles);
  assert.ok(JSON.parse(o.notesJson).notes.n1, 'the notes file is good again');
  assert.ok(o.files.some(f => /^notes\.unreadable-/.test(f)), 'the broken file was kept');
  assert.ok(o.notes.some(b => /restored/.test(b)), 'the user is told: ' + o.notes);
});
// 3. a good file loads as always and a last-good copy is made
run(d => fs.writeFileSync(path.join(d, 'notes.json'), JSON.stringify(good)), o => {
  assert.ok(o.titles.includes('Precious')); assert.ok(o.files.includes('notes.lastgood.json'), 'last good copy kept'); assert.ok(!o.files.some(f => /unreadable/.test(f)));
});
// 4. no file at all is a normal first start
run(d => fs.writeFileSync(path.join(d, 'other.txt'), 'x'), o => { assert.ok(o.notesJson === null || JSON.parse(o.notesJson).version === 2); assert.ok(!o.files.some(f => /unreadable/.test(f))); });
console.log('loadsafe ok');
