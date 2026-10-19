'use strict';
// Reads CHANGELOG.md for the "What's new" window shown after an update.
// The file has "## 1.14.12" headings; below each one, "- " bullets and short paragraphs (and "### " sub-headings).
const cmp = (a, b) => {
  const x = String(a).split('.').map(n => parseInt(n, 10) || 0), y = String(b).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length, 3); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
};
// Lines that are notes for the developer, not for the reader.
const SKIP = /^not tried on a real windows pc/i;
function parse(md) {
  const out = []; let cur = null;
  for (const raw of String(md || '').replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    const h = /^##\s+v?(\d+\.\d+\.\d+)\b/.exec(line);
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
  return list.sort((a, b) => cmp(b.version, a.version)).slice(0, from ? Math.max(lim, 12) : Math.min(lim, 5));
}
module.exports = { parse, since, cmp };
