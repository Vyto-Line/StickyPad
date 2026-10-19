// Starts the real main.js against a fake Electron with saved notes on a second screen, then unplugs / plugs that screen.
const assert = require('assert'), fs = require('fs'), path = require('path'), os = require('os');
const D1 = { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1040 } };
const D2 = { id: 2, bounds: { x: 1920, y: 0, width: 2560, height: 1440 }, workArea: { x: 1920, y: 0, width: 2560, height: 1400 } };
const mk = (id, text, x, y, home) => ({ id, updated: 1, title: text, group: null, rolled: false, text, blocks: [{ t: 'text', v: text }], color: '#FFF2A8', font: 'Segoe UI', size: 16, pinned: false, bounds: { x, y, width: 300, height: 320 }, ...(home ? { home } : {}) });
const seed = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sp-seed-')), 'notes.json');
fs.writeFileSync(seed, JSON.stringify({ version: 2, groups: [], trash: [], settings: { launch: 'notes', splash: false, autoBackup: false },
  notes: { a: mk('a', 'on the second screen', 3000, 300, { id: 2, bounds: D2.bounds }), b: mk('b', 'on the first screen', 100, 100, { id: 1, bounds: D1.bounds }), c: mk('c', 'off screen for ever', 6000, 6000, null) } }));
process.env.SP_SEED = seed;
const H = require('./fake-electron'), { electron, wins } = H;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  electron.__displays = [D1];                                   // the second screen is not connected at start-up
  await sleep(900);
  const opened = wins.filter(w => w.o && w.o.minWidth);        // note windows
  assert.strictEqual(opened.length, 3, 'three notes opened (' + wins.length + ' windows)');
  const pos = opened.map(w => [w.o.x, w.o.y]);
  const B = opened.find(w => w.o.x === 100 && w.o.y === 100);
  assert.ok(B, 'the note on the first screen stays where it is: ' + JSON.stringify(pos));
  assert.ok(opened.every(w => w.o.x >= 0 && w.o.x + 300 <= 1920 && w.o.y >= 0 && w.o.y + 320 <= 1040), 'every note is on the visible screen: ' + JSON.stringify(pos));
  // the second screen comes back: its note goes home again
  electron.__displays = [D1, D2]; (electron.__screenOn['display-added'] || []).forEach(f => f());
  await sleep(700);
  const home = opened.filter(w => w._b.x === 3000 && w._b.y === 300);
  assert.strictEqual(home.length, 1, 'the note went back to the second screen: ' + JSON.stringify(opened.map(w => w._b)));
  // unplugged again
  electron.__displays = [D1]; (electron.__screenOn['display-removed'] || []).forEach(f => f());
  await sleep(700);
  assert.ok(home[0]._b.x + 300 <= 1920, 'moved to the first screen again');
  // what is saved still says it belongs on screen 2
  await sleep(500);
  const saved = JSON.parse(fs.readFileSync(path.join(H.tmp, 'userData', 'notes.json'), 'utf8')).notes;
  assert.ok(saved.a.bounds.x === 3000 && saved.a.home.id === 2, 'saved place is untouched: ' + JSON.stringify(saved.a.bounds) + JSON.stringify(saved.a.home));
  console.log('screens ok'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
