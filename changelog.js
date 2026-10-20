'use strict';
// Reads CHANGELOG.md for the "What's new" window shown after an update.
// The file has "## 1.14.12" headings; below each one, "- " bullets and short paragraphs (and "### " sub-headings).
// Version order, with test versions: 1.15.0-test.1 comes before 1.15.0 (like semver).
const cmp = (a, b) => {
  const split = v => { const m = /^v?(\d+(?:\.\d+)*)(?:-([0-9A-Za-z.-]+))?/.exec(String(v)) || [0, '0', '']; return [m[1].split('.').map(n => parseInt(n, 10) || 0), m[2] ? m[2].split('.') : null]; };
  const [x, px] = split(a), [y, py] = split(b);
  for (let i = 0; i < Math.max(x.length, y.length, 3); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; }
  if (!px && !py) return 0; if (!px) return 1; if (!py) return -1;   // a test version is older than the real one
  for (let i = 0; i < Math.max(px.length, py.length); i++) {
    if (px[i] === undefined) return -1; if (py[i] === undefined) return 1;
    const nx = /^\d+$/.test(px[i]), ny = /^\d+$/.test(py[i]);
    if (nx && ny) { const d = Number(px[i]) - Number(py[i]); if (d) return d < 0 ? -1 : 1; }
    else if (nx !== ny) return nx ? -1 : 1;
    else if (px[i] !== py[i]) return px[i] < py[i] ? -1 : 1;
  }
  return 0;
};
// Lines that are notes for the developer, not for the reader.
const SKIP = /^not tried on a real windows pc/i;
function parse(md) {
  const out = []; let cur = null;
  for (const raw of String(md || '').replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    const h = /^##\s+v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)(?![0-9A-Za-z.-])/.exec(line);
    if (h) { cur = { version: h[1], blocks: [] }; out.push(cur); continue; }
    if (!cur || !line.trim()) continue;
    if (/^#{1,2}\s/.test(line)) { cur = null; continue; }
    if (/^###\s/.test(line)) { cur.blocks.push({ t: 'h', v: line.replace(/^###\s+/, '') }); continue; }
    const li = /^[-*]\s+(.*)$/.exec(line);
    const text = (li ? li[1] : line.trim());
    if (SKIP.test(text)) continue;
    cur.blocks.push({ t: li ? 'li' : 'p', v: text });
  }
  return out.filter(s => s.blocks.length);
}
// The sections newer than `from` (the version that was installed before) up to and including `to`, newest first.
// With no `from` (we do not know the old version) it gives the newest `max`.
function since(sections, from, to, max) {
  const lim = max || 8;
  const list = sections.filter(s => (!to || cmp(s.version, to) <= 0) && (!from || cmp(s.version, from) > 0));
  return list.sort((a, b) => cmp(b.version, a.version)).slice(0, from ? Math.max(lim, 12) : Math.min(lim, 6));
}
module.exports = { parse, since, cmp };
