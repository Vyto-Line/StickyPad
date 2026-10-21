'use strict';
// Measures the parts of StickyPad that run in plain Node (no Electron), with 10 / 1,000 / 10,000 notes and with one huge note.
// Run:  node tools/measure.js        (numbers are written to the screen; docs/CLEANUP.md keeps the latest results)
const fs = require('fs'), os = require('os'), path = require('path');
const search = require('../search'), words = require('../words'), convert = require('../convert');
const safeload = require('../safeload'), datadir = require('../datadir'), history = require('../history'), counts = require('../counts');
const WORDS = 'alpha beta gamma delta omega sticky note remember meeting groceries budget project καλημέρα σήμερα ραντεβού αύριο ψώνια Ωραία'.split(' ');
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const line = () => Array.from({ length: 4 + Math.floor(rnd() * 8) }, () => WORDS[Math.floor(rnd() * WORDS.length)]).join(' ');
const text = n => Array.from({ length: n }, line).join('\n');
const makeNotes = (count, lines) => { const o = {}; for (let i = 0; i < count; i++) { const t = text(lines); o['n' + i] = { id: 'n' + i, title: 'Note ' + i, text: t, blocks: [{ t: 'text', v: t }], updated: Date.now() - i * 1000, color: '#FFF2A8' }; } return o; };
const ms = f => { const t = process.hrtime.bigint(); const r = f(); return [Number(process.hrtime.bigint() - t) / 1e6, r]; };
const f1 = x => x < 10 ? x.toFixed(1) : Math.round(x).toLocaleString();
const rows = [];
function row(label, ...cols) { rows.push([label, ...cols]); }

for (const [label, count, lines] of [['10 notes', 10, 12], ['1,000 notes', 1000, 12], ['10,000 notes', 10000, 12], ['1 huge note (3.7 MB)', 1, 51200]]) {
  const notes = makeNotes(count, lines), list = Object.values(notes);
  const json = JSON.stringify({ version: 2, notes, trash: [], groups: [], settings: {} });
  const [tStr] = ms(() => JSON.stringify({ version: 2, notes, trash: [], groups: [], settings: {} }));
  const [tParse] = ms(() => JSON.parse(json));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-measure-')), file = path.join(tmp, 'notes.json');
  const [tWrite] = ms(() => datadir.writeAtomic(file, json));
  const [tRead] = ms(() => safeload.readJson(file));
  const ix = search.createIndex();
  const [tIndex] = ms(() => search.search(ix, list, 'zzzzqq'));          // first search: every note is folded once
  const [tQuery] = ms(() => search.search(ix, list, 'meeting budget'));  // later searches (a key press)
  const [tQuery2] = ms(() => search.search(ix, list, 'καλημέρα'));
  const [tWords] = ms(() => { const m = words.newMap(); for (const n of list) words.add(m, n.title + '\n' + n.text); return words.top(m, 4000); });
  const [tCount] = ms(() => counts.facts('How many times does the word alpha appear?', list.slice(0, 50)));
  const [tList] = ms(() => list.map(n => ({ id: n.id, title: n.title, text: String(n.text || '').slice(0, 240), color: n.color, updated: n.updated })));
  const [tMd] = ms(() => convert.toMarkdown('T', list[0].blocks, {}));
  fs.rmSync(tmp, { recursive: true, force: true });
  row(label, (json.length / 1e6).toFixed(1) + ' MB', f1(tStr), f1(tParse), f1(tWrite), f1(tRead), f1(tIndex), f1(tQuery), f1(tQuery2), f1(tWords), f1(tList), f1(tCount), f1(tMd));
}
const head = ['', 'notes.json', 'save: build', 'load: parse', 'write', 'read+check', 'search: 1st', 'search: key press', 'search: Greek', 'word list', 'Home list', 'AI count', 'export'];
console.log('Node-side timings in milliseconds (this machine; a Windows PC is slower)\n');
console.log(head.join(' | ')); console.log(head.map(() => '---').join(' | ')); rows.forEach(r => console.log(r.join(' | ')));
const mem = process.memoryUsage(); console.log('\nNode heap after the run: ' + Math.round(mem.heapUsed / 1048576) + ' MB used, ' + Math.round(mem.rss / 1048576) + ' MB resident');
