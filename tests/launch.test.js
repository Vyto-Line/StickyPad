// "When StickyPad starts": the same on a normal start and when you start it again while it runs in the tray.
const assert = require('assert'), fs = require('fs'), path = require('path'), os = require('os');
const mode = process.argv[2] || 'both';
if (!process.argv[2]) {   // run the three modes, each in its own process (main.js loads once per process)
  for (const m of ['notes', 'all', 'both']) {
    const r = require('child_process').spawnSync(process.execPath, [__filename, m], { encoding: 'utf8' });
    process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || ''); if (r.status !== 0) process.exit(1);
  }
  console.log('launch ok'); process.exit(0);
}
const seed = path.join(os.tmpdir(), 'sp-launch-' + mode + '.json');
fs.writeFileSync(seed, JSON.stringify({ version: 2, notes: { n1: { id: 'n1', title: 'A', text: 'hello', blocks: [{ t: 'text', v: 'hello' }], color: '#FFF2A8', font: 'Segoe UI', bounds: { x: 100, y: 100, width: 300, height: 320 } } }, trash: [], groups: [], settings: { launch: mode, splash: false } }));
process.env.SP_SEED = seed;
const H = require('./fake-electron');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const { wins, electron } = H;
  await wait(600);
  const homes = () => wins.filter(w => w.o.title === 'StickyPad' && !w.isDestroyed());
  const notes = () => wins.filter(w => w.o.width === 300 && !w.isDestroyed());
  assert.strictEqual(homes().length, mode === 'notes' ? 0 : 1, mode + ': Home on a normal start');
  assert.strictEqual(notes().length, mode === 'all' ? 0 : 1, mode + ': notes on a normal start');
  // close everything, as if every window was closed and StickyPad sits in the tray
  wins.forEach(w => { if (!w.isDestroyed()) { w._d = true; (w.ls && w.ls.closed || []).forEach(f => f()); } });
  const before = wins.length;
  electron.__appEv['second-instance']({}, ['C:\\StickyPad.exe']);
  await wait(300);
  const fresh = wins.slice(before).filter(w => !w.isDestroyed());
  assert.strictEqual(fresh.filter(w => w.o.title === 'StickyPad').length, mode === 'notes' ? 0 : 1, mode + ': Home when started again');
  assert.strictEqual(fresh.filter(w => w.o.width === 300).length, mode === 'all' ? 0 : 1, mode + ': notes when started again');
  console.log('launch', mode, 'ok'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
