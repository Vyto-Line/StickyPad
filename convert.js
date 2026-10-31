'use strict';
const marks = require('./marks');
// Turning notes into Markdown / plain text files and back. Pure functions (no Electron, no disk).

// A safe file or folder name made from a note title.
function slug(s, fallback = 'Untitled') {
  let t = String(s || '').replace(/[\u0000-\u001f<>:"/\\|?*]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(t)) t = '_' + t;   // names Windows will not accept
  return (t.slice(0, 60).trim().replace(/[. ]+$/, '')) || fallback;
}

const lineOf = (b, md) => (md ? (b.done ? '- [x] ' : '- [ ] ') : (b.done ? '[x] ' : '[ ] ')) + (md && b.m ? marks.toMarkdown(b.v, b.m) : b.v).replace(/\n/g, ' ');

// image(id) gives a data address for a picture (or '' when its file is gone). Without it, pictures are left out (plain text can not hold them).
function body(blocks, md, image) {
  const out = [];
  (blocks || []).forEach((b, i) => {
    if (b.t === 'text') {
      const next = blocks[i + 1];
      const t = md && b.m ? marks.toMarkdown(b.v, b.m) : b.v;   // bold, italic and strikethrough are kept in Markdown (other formatting has no Markdown form)
      out.push(next && next.t !== 'text' ? t.replace(/\n$/, '') : t);
    } else if (b.t === 'check') out.push(lineOf(b, md));
    else if (b.t === 'img' && md && image) { const u = image(b.id); if (u) out.push('', '![' + (b.w >= 10 && b.w < 100 ? 'w=' + Math.round(b.w) : '') + '](' + u + ')', ''); }
  });
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// The note's properties written as a small header (YAML front matter) at the top of a .stickypad file: any Markdown program can read or ignore it.
const META_KEYS = ['color', 'font', 'size', 'opacity', 'solidText', 'pinned', 'folder', 'reminder', 'width', 'height', 'edited'];
function frontMatter(meta) {
  const lines = ['---', 'stickypad: 1'];
  for (const k of META_KEYS) if (meta && meta[k] !== undefined && meta[k] !== null && meta[k] !== '') lines.push(k + ': ' + JSON.stringify(meta[k]));
  return lines.join('\n') + '\n---\n\n';
}
// -> { meta, rest } : the properties header of a .stickypad file (only when it says "stickypad: 1"), and the text after it.
function splitFrontMatter(lines) {
  if (lines[0] !== '---') return { meta: null, lines };
  const end = lines.indexOf('---', 1);
  if (end < 0 || end > 40) return { meta: null, lines };
  const meta = {}; let mine = false;
  for (const ln of lines.slice(1, end)) {
    const m = /^([A-Za-z]+):\s*(.*)$/.exec(ln); if (!m) continue;
    if (m[1] === 'stickypad') { mine = true; continue; }
    if (!META_KEYS.includes(m[1])) continue;
    try { meta[m[1]] = JSON.parse(m[2]); } catch {}
  }
  if (!mine) return { meta: null, lines };
  let rest = lines.slice(end + 1); if (rest.length && !rest[0].trim()) rest = rest.slice(1);
  return { meta, lines: rest };
}

function toMarkdown(title, blocks, opts) {
  const t = String(title || '').trim(), b = body(blocks, true, opts && opts.image);
  return (opts && opts.meta ? frontMatter(opts.meta) : '') + (t ? '# ' + t + '\n' + (b ? '\n' : '') : '') + (b ? b + '\n' : '');
}
function toText(title, blocks) {
  const t = String(title || '').trim(), b = body(blocks, false);
  return (t ? t + '\n' + (b ? '\n' : '') : '') + (b ? b + '\n' : '');
}

const IMG_LINE = /^\s*!\[[^\]]*\]\((data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+)\)\s*$/;
// A Markdown or plain text file -> { title, blocks }. "- [ ] item" / "- [x] item" (also * and +) become checklist items.
function fromMarkdown(text, fileName) {
  let s = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  let lines = s.split('\n');
  const fm = splitFrontMatter(lines); lines = fm.lines;   // the properties of a .stickypad file
  let title = '';
  let i = 0; while (i < lines.length && !lines[i].trim()) i++;
  const h = i < lines.length && /^#{1}\s+(.+?)\s*#*\s*$/.exec(lines[i]);
  if (h) { title = h[1].trim(); lines.splice(0, i + 1); if (lines.length && !lines[0].trim()) lines.shift(); }
  if (!title) title = String(fileName || '').replace(/^.*[\\/]/, '').replace(/\.(stickypad|md|markdown|txt|text)$/i, '').trim();
  title = title.slice(0, 60);

  const blocks = []; let buf = [];
  const flush = () => { const v = buf.join('\n'); buf = []; if (v.trim()) blocks.push({ t: 'text', v }); };
  let afterImg = false;
  for (const ln of lines) {
    const wasImg = afterImg; afterImg = false;
    // a picture written as ![](data:image/png;base64,...) (what Export writes) -> a picture block; main saves the file
    const im = IMG_LINE.exec(ln);
    if (im) { if (buf.length && !buf[buf.length - 1].trim()) buf.pop(); flush(); const wm = /^\s*!\[w=(\d{2})\]/.exec(ln); blocks.push(wm ? { t: 'img', data: im[1], w: +wm[1] } : { t: 'img', data: im[1] }); afterImg = true; continue; }
    if (wasImg && !ln.trim()) continue;   // the blank line Export puts after a picture
    const m = /^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(ln) || /^\s*\[([ xX])\]\s+(.*)$/.exec(ln);
    if (m && m[2].trim()) { flush(); blocks.push({ t: 'check', v: m[2].trim(), done: m[1] !== ' ' }); }
    else buf.push(ln);
  }
  flush();
  if (blocks.length && blocks[blocks.length - 1].t === 'text') blocks[blocks.length - 1].v = blocks[blocks.length - 1].v.replace(/\s+$/, '');
  if (blocks.length && blocks[0].t === 'text') blocks[0].v = blocks[0].v.replace(/^\n+/, '');
  return { title, blocks, meta: fm.meta };
}

// An AI chat answer -> { title, blocks } for "Save as note". The model often writes a label line ("Checklist:") and plain bullets even when
// a checklist was asked for: the label goes, and the bullets right under it become real checklist items.
const LABEL = /^\s*(?:[*_#>\s]*)(?:check\s?list|to-?do(?:\s+list)?|task\s+list|λίστα(?:\s+(?:ελέγχου|εργασιών|υποχρεώσεων))?|ντο\s?ντου)\s*(?:[*_]*\s*)[:：]?\s*[*_]*\s*$/i;
const BULLET = /^\s*(?:[-*+•])\s+(?!\[)(.+)$/;
function fromChat(text) {
  const out = []; let mark = false;
  for (const ln of String(text || '').replace(/\r\n?/g, '\n').split('\n')) {
    if (LABEL.test(ln)) { mark = true; continue; }
    const b = mark && BULLET.exec(ln);
    if (b) { out.push('- [ ] ' + b[1].trim()); continue; }
    if (ln.trim() && !/^\s*(?:[-*+•]\s+\[[ xX]\]|[-*+•])\s/.test(ln)) mark = false;
    out.push(ln);
  }
  return fromMarkdown(out.join('\n'), '');
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

// The file types Import and drag-and-drop accept.
const IMPORT_EXT = /\.(stickypad|md|markdown|txt|text)$/i;
// Text file bytes -> text. Windows programs save text in several ways: UTF-8 (with or without a mark), UTF-16 (Notepad's "Unicode"), or the old
// 8-bit Windows code page (Greek files from old programs are windows-1253). Reading those as UTF-8 would turn the letters into garbage.
function decodeText(buf, greek) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf || []);
  if (b.length >= 3 && b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) return b.slice(3).toString('utf8');
  if (b.length >= 2 && b[0] === 0xFF && b[1] === 0xFE) return b.slice(2).toString('utf16le');
  if (b.length >= 2 && b[0] === 0xFE && b[1] === 0xFF) return new TextDecoder('utf-16be').decode(b.slice(2));
  if (b.length >= 4) {   // UTF-16 without a mark: plain letters have a zero byte beside each one
    let ev = 0, od = 0; const n = Math.min(b.length, 400);
    for (let i = 0; i < n; i++) if (b[i] === 0) { if (i % 2) od++; else ev++; }
    if (od > n / 5 && ev === 0) return b.toString('utf16le');
    if (ev > n / 5 && od === 0) return new TextDecoder('utf-16be').decode(b);
  }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b); }
  catch { return new TextDecoder(greek ? 'windows-1253' : 'windows-1252').decode(b); }
}

module.exports = { IMPORT_EXT, decodeText, slug, toMarkdown, toText, fromMarkdown, fromChat, uniqueNames, noteFileArgs, };
