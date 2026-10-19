// Runs every *.test.js in this folder, one after another.
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
let failed = 0;
for (const f of fs.readdirSync(__dirname).filter(n => n.endsWith('.test.js')).sort()) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' });
  if (r.status !== 0) { failed++; console.error('FAILED: ' + f); }
}
console.log(failed ? failed + ' test file(s) failed' : 'All tests passed');
process.exit(failed ? 1 : 0);
