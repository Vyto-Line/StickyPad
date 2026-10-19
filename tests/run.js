// Runs every *.test.js in this folder, one after another. On GitHub Actions a failure is also reported as an annotation.
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
let failed = 0;
for (const f of fs.readdirSync(__dirname).filter(n => n.endsWith('.test.js')).sort()) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8' });
  process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
  if (r.status !== 0) {
    failed++; console.error('FAILED: ' + f);
    if (process.env.GITHUB_ACTIONS) {
      const msg = ((r.stderr || '') + (r.stdout || '')).trim().slice(0, 900).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
      console.log(`::error title=${f} failed::${msg}`);
    }
  }
}
console.log(failed ? failed + ' test file(s) failed' : 'All tests passed');
process.exit(failed ? 1 : 0);
