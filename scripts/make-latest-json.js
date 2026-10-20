// Writes latest.json, the small file the Tauri app reads to learn about the newest version.
// usage: node scripts/make-latest-json.js <version> <tag> <installer file name on the release> <signature file> <out file>
const fs = require('fs');
const [version, tag, asset, sigFile, out] = process.argv.slice(2);
if (!version || !tag || !asset || !sigFile || !out) { console.error('usage: make-latest-json <version> <tag> <asset> <sigfile> <out>'); process.exit(2); }
const signature = fs.readFileSync(sigFile, 'utf8').trim();
if (!signature) throw new Error('the signature file is empty');
const url = `https://github.com/Vyto-Line/StickyPad/releases/download/${tag}/${asset}`;
fs.writeFileSync(out, JSON.stringify({ version, notes: 'See the release notes on GitHub.', pub_date: new Date().toISOString(), platforms: { 'windows-x86_64': { signature, url }, 'windows-x86_64-nsis': { signature, url } } }, null, 2));
console.log('wrote', out, '->', url);
