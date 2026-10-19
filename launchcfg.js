'use strict';
// Start-up options that Electron needs BEFORE the app is ready (so they live in a tiny file of their own, not in notes.json).
const fs = require('fs'), path = require('path');

const DEFAULTS = { lowMemory: true };
const fileOf = dir => path.join(dir, 'launch.json');

function read(dir) {
  try { const d = JSON.parse(fs.readFileSync(fileOf(dir), 'utf8')); return { lowMemory: d.lowMemory !== false }; }
  catch { return { ...DEFAULTS }; }
}
function write(dir, cfg) {
  fs.mkdirSync(dir, { recursive: true });
  const tmp = fileOf(dir) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ lowMemory: cfg.lowMemory !== false }));
  fs.renameSync(tmp, fileOf(dir));
}

// What to tell Chromium. Low memory mode: no GPU process (software drawing is plenty for notes), V8 tuned for size,
// and background services a notes app never uses are switched off.
function plan(cfg) {
  const features = ['CalculateNativeWinOcclusion'];
  const switches = [];
  if (cfg.lowMemory) {
    features.push('MediaRouter', 'Translate', 'OptimizationHints', 'AutofillServerCommunication');
    switches.push(['js-flags', '--optimize-for-size'], ['disable-background-networking'], ['no-pings'], ['disable-domain-reliability']);
  }
  switches.unshift(['disable-features', features.join(',')]);
  return { disableGpu: !!cfg.lowMemory, switches };
}

module.exports = { read, write, plan, DEFAULTS, fileOf };
