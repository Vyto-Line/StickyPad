// Every file the app loads must be listed in package.json "build.files", or the installed app breaks while "npm start" still works.
const assert = require('assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), files = new Set(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).build.files);
const need = new Map();
const add = (f, from) => { if (!need.has(f)) need.set(f, from); };
for (const f of fs.readdirSync(root).filter(n => /\.(js|html)$/.test(n))) {
  if (!files.has(f)) continue;                       // only look inside files that ship
  const t = fs.readFileSync(path.join(root, f), 'utf8');
  if (f.endsWith('.js')) for (const m of t.matchAll(/require\('\.\/([\w-]+)'\)/g)) add(m[1] + '.js', f);
  else {
    for (const m of t.matchAll(/<script[^>]+src="([\w.-]+\.js)"/g)) add(m[1], f);
    for (const m of t.matchAll(/<link[^>]+href="([\w.-]+\.css)"/g)) add(m[1], f);
  }
}
const missing = [...need].filter(([f]) => !files.has(f) && fs.existsSync(path.join(root, f)));
assert.deepStrictEqual(missing, [], 'not packaged: ' + missing.map(([f, from]) => f + ' (used by ' + from + ')').join(', '));
for (const f of files) if (!f.includes('*')) assert.ok(fs.existsSync(path.join(root, f)), 'listed but missing: ' + f);
console.log('packaging ok');
