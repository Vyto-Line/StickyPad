'use strict';
// Turning notes into Markdown / plain text files and back. Pure functions (no Electron, no disk).

// A safe file or folder name made from a note title.
function slug(s, fallback = 'Untitled') {
  let t = String(s || '').replace(/[\u0000-\u001f<>:"/\\|?*]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(t)) t = '_' + t;   // names Windows will not accept
  return (t.slice(0, 60).trim().replace(/[. ]+$/, '')) || fallback;
}

const lineOf = (b, md) => (md ? (b.done ? '- [x] ' : '- [ ] ') : (b.done ? '[x] ' : '[ ] ')) + b.v.replace(/\n/g, ' ');

function body(blocks, md) {
  const out = [];
  (blocks || []).forEach((b, i) => {
    if (b.t === 'text') {
      const next = blocks[i + 1];
      out.push(next && next.t !== 'text' ? b.v.replace(/\n$/, '') : b.v);
    } else if (b.t === 'check') out.push(lineOf(b, md));
  });
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function toMarkdown(title, blocks) {
  const t = String(title || '').trim(), b = body(blocks, true);
  return (t ? '# ' + t + '\n' + (b ? '\n' : '') : '') + (b ? b + '\n' : '');
}
function toText(title, blocks) {
  const t = String(title || '').trim(), b = body(blocks, false);
  return (t ? t + '\n' + (b ? '\n' : '') : '') + (b ? b + '\n' : '');
}

// A Markdown or plain text file -> { title, blocks }. "- [ ] item" / "- [x] item" (also * and +) become checklist items.
function fromMarkdown(text, fileName) {
  let s = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = s.split('\n');
  let title = '';
  let i = 0; while (i < lines.length && !lines[i].trim()) i++;
  const h = i < lines.length && /^#{1}\s+(.+?)\s*#*\s*$/.exec(lines[i]);
  if (h) { title = h[1].trim(); lines.splice(0, i + 1); if (lines.length && !lines[0].trim()) lines.shift(); }
  if (!title) title = String(fileName || '').replace(/^.*[\\/]/, '').replace(/\.(stickypad|md|markdown|txt)$/i, '').trim();
  title = title.slice(0, 60);

  const blocks = []; let buf = [];
  const flush = () => { const v = buf.join('\n'); buf = []; if (v.trim()) blocks.push({ t: 'text', v }); };
  for (const ln of lines) {
    const m = /^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(ln) || /^\s*\[([ xX])\]\s+(.*)$/.exec(ln);
    if (m && m[2].trim()) { flush(); blocks.push({ t: 'check', v: m[2].trim(), done: m[1] !== ' ' }); }
    else buf.push(ln);
  }
  flush();
  if (blocks.length && blocks[blocks.length - 1].t === 'text') blocks[blocks.length - 1].v = blocks[blocks.length - 1].v.replace(/\s+$/, '');
  if (blocks.length && blocks[0].t === 'text') blocks[0].v = blocks[0].v.replace(/^\n+/, '');
  return { title, blocks };
}

// Names for a batch of files in one folder, never repeating (case-insensitive, as Windows is).
function uniqueNames(titles, ext) {
  const used = new Set();
  return titles.map(t => {
    const base = slug(t); let name = base, n = 2;
    while (used.has((name + ext).toLowerCase())) name = base + ' (' + n++ + ')';
    used.add((name + ext).toLowerCase()); return name + ext;
  });
}

// Exported notes (".stickypad") are Markdown inside, so any text editor can read them too; Windows opens them with StickyPad.
const NOTE_EXT = /\.stickypad$/i;
// The note files in a command line (what Windows passes when you double-click one, or run StickyPad with a file name).
function noteFileArgs(argv) {
  return (Array.isArray(argv) ? argv : []).filter(a => typeof a === 'string' && a.length > 9 && !a.startsWith('--') && NOTE_EXT.test(a));
}

module.exports = { slug, toMarkdown, toText, fromMarkdown, uniqueNames, noteFileArgs, NOTE_EXT };
