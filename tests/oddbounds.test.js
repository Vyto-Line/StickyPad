// A note whose saved place or size is odd (it came from another PC, an older version or a damaged file) must still open, on a screen you can see.
const assert = require('assert'), fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ob-')), seed = path.join(root, 'seed'); fs.mkdirSync(seed);
const base = { color: '#FFF2A8', font: 'Segoe UI', size: 15, updated: 5, blocks: [{ t: 'text', v: 'hello' }], text: 'hello' };
const B = (x, y, w, h) => ({ x, y, width: w, height: h });
const cases = {
  missing: {}, nul: { bounds: null }, text: { bounds: 'abc' }, nan: { bounds: B(null, undefined, 'a', NaN) }, strs: { bounds: B('10', '20', '300', '320') }, floats: { bounds: B(10.7, 20.2, 300.5, 320.9) },
  neg: { bounds: B(10, 10, -5, 0) }, tiny: { bounds: B(10, 10, 1, 1) }, huge: { bounds: B(0, 0, 99999, 99999) }, far: { bounds: B(-30000, 40000, 300, 320) }, inf: { bounds: B(Infinity, 10, 300, 320) },
  absurd: { bounds: B(1e12, -1e12, 300, 320) }, badhome: { bounds: B(3000, 100, 300, 320), home: { id: 99, bounds: { x: 1920, y: 0, width: 0, height: 0 } } }, nohome: { bounds: B(3000, 100, 300, 320), home: { id: 1, bounds: null } },
  rolled: { rolled: true, bounds: B(10, 10, 300, 40) }, badcolor: { color: 'not a color', bounds: B(10, 10, 300, 320) }, badopac: { opacity: 'x', bounds: B(10, 10, 300, 320) }
};
const notes = {}; Object.entries(cases).forEach(([k, v]) => { notes[k] = { id: k, title: k, ...base, ...v }; });
fs.writeFileSync(path.join(seed, 'notes.json'), JSON.stringify({ version: 2, notes, trash: [], groups: [], settings: {} }));
const code = `
  const H = require(${JSON.stringify(path.join(__dirname, 'fake-electron.js'))});
  H.electron.__displays[0] = { id: 1, bounds: { x: 0, y: 0, width: 1366, height: 768 }, workArea: { x: 0, y: 0, width: 1366, height: 728 } };
  (async () => {
    await new Promise(r => setTimeout(r, 1500));
    const out = {};
    for (const k of ${JSON.stringify(Object.keys(cases))}) {
      const before = H.wins.length; let err = '';
      try { await H.handlers['all:show']({}, k); } catch (e) { err = e.message; }
      out[k] = err ? { err } : (H.wins.length > before ? H.wins[H.wins.length - 1].o : { none: true });
    }
    console.log(JSON.stringify(out)); process.exit(0);
  })();`;
const r = spawnSync(process.execPath, ['-e', code], { env: { ...process.env, SP_SEED_DIR: seed }, encoding: 'utf8', timeout: 60000 });
let out; try { out = JSON.parse(r.stdout.trim().split('\n').pop()); } catch { throw new Error('child said: ' + r.stdout + r.stderr); }
for (const k of Object.keys(cases)) {
  const o = out[k]; assert.ok(o && !o.err && !o.none, k + ' did not open: ' + JSON.stringify(o));
  ['x', 'y', 'width', 'height'].forEach(f => assert.ok(Number.isInteger(o[f]), k + ': ' + f + ' is a whole number (' + o[f] + ')'));
  assert.ok(o.width >= 260 && o.width <= 1366 && o.height >= (k === 'rolled' ? 40 : 180) && o.height <= 728, k + ': a sensible size ' + o.width + 'x' + o.height);
  assert.ok(o.x + o.width > 80 && o.x < 1366 - 80 && o.y + 30 > 0 && o.y < 728 - 24, k + ': on a screen you can see (' + o.x + ',' + o.y + ')');
  assert.ok(/^#[0-9a-f]{6}$/i.test(o.backgroundColor), k + ': a real colour ' + o.backgroundColor);
}
assert.ok(out.rolled.height === 40, 'a rolled-up note stays rolled up');
console.log('oddbounds ok (' + Object.keys(cases).length + ' odd notes all open)');
