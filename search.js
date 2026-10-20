'use strict';
// Search across all notes: whole-word-or-part, ignoring capitals and Greek/Latin accents, every word of the query must be found.
// Pure functions (no Electron, no DOM): the main process runs it over the full text of every note; tests run it alone.
// Folding keeps the text the same length, so a position found in the folded text is the same position in the real text (for snippets).
const MEMO = new Map();   // one letter -> its folded form
const fold1 = ch => {
  let r = MEMO.get(ch);
  if (r === undefined) {
    const f = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const c = f === 'ς' ? 'σ' : f;
    r = c.length === ch.length ? c : (ch.toLowerCase().length === ch.length ? ch.toLowerCase() : ch);
    if (MEMO.size < 5000) MEMO.set(ch, r);
  }
  return r;
};
const ASCII = /^[\x00-\x7f]*$/;
function fold(s) {
  s = String(s == null ? '' : s);
  if (ASCII.test(s)) return s.toLowerCase();   // the common case: plain English text is folded in one step
  let o = ''; for (const ch of s) o += fold1(ch);
  return o;
}

const MAX_QUERY_WORDS = 8;
const queryWords = q => [...new Set(fold(q).split(/\s+/).filter(Boolean))].slice(0, MAX_QUERY_WORDS);

// Remembers the folded text of each note, so a keystroke in the search box never folds a note again unless that note changed.
function createIndex() {
  const cache = new Map();   // id -> { key, title, body }
  return {
    get(n) {
      const text = n.lock ? '' : String(n.text || ''), title = String(n.title || '');
      const key = (n.updated || 0) + ':' + title.length + ':' + text.length + ':' + (n.lock ? 1 : 0);
      let e = cache.get(n.id);
      if (!e || e.key !== key) { e = { key, title: fold(title), body: fold(text) }; cache.set(n.id, e); }
      return e;
    },
    prune(notes) {   // forget notes that are gone
      if (cache.size <= notes.length) return;
      const live = new Set(notes.map(n => n.id));
      for (const id of cache.keys()) if (!live.has(id)) cache.delete(id);
    },
    size: () => cache.size
  };
}

// Cuts the text into [{ t, h }] pieces; h is true for the parts that matched. Lines are joined with " · " so a snippet stays on one line.
function pieces(text, folded, from, to, words) {
  const ranges = [];
  for (const w of words) {
    let i = folded.indexOf(w, from);
    while (i >= 0 && i < to) { ranges.push([i, Math.min(to, i + w.length)]); i = folded.indexOf(w, i + w.length); }
  }
  ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const out = []; let pos = from;
  const plain = s => s.replace(/\s*\n\s*/g, ' · ').replace(/[ \t]+/g, ' ');
  for (const [a, b] of ranges) {
    if (b <= pos) continue;
    const s = Math.max(a, pos);
    if (s > pos) out.push({ t: plain(text.slice(pos, s)), h: false });
    out.push({ t: plain(text.slice(s, b)), h: true }); pos = b;
  }
  if (pos < to) out.push({ t: plain(text.slice(pos, to)), h: false });
  return out;
}

const SNIP = 120;
function snippet(text, folded, words, at) {
  if (at < 0) {   // nothing to show in the body: the first words of the note
    const t = text.trimStart(), cut = t.slice(0, SNIP);
    return t ? [{ t: cut.replace(/\s*\n\s*/g, ' · ').replace(/[ \t]+/g, ' ') + (t.length > SNIP ? '…' : ''), h: false }] : [];
  }
  let from = Math.max(0, at - 40), to = Math.min(text.length, from + SNIP);
  // start and end on word boundaries, so the snippet does not begin or stop in the middle of a word
  if (from > 0) { const sp = text.slice(from, at).search(/\s/); if (sp >= 0) from += sp + 1; }
  if (to < text.length) { const sp = text.slice(at, to).search(/\s\S*$/); if (sp >= 0) to = at + sp; }
  const out = pieces(text, folded, from, to, words);
  if (from > 0) out.unshift({ t: '…', h: false });
  if (to < text.length) out.push({ t: '…', h: false });
  return out;
}

// notes: [{ id, title, text, updated, lock, pinned }]. Returns the best matches first:
// [{ id, score, title: [{t,h}], snippet: [{t,h}], inTitle }]. An empty query returns the newest notes.
function search(index, notes, query, { max = 40 } = {}) {
  index.prune(notes);
  const words = queryWords(query), phrase = words.length > 1 ? fold(query).trim().replace(/\s+/g, ' ') : '';
  const live = notes.filter(n => String(n.title || '').trim() || String(n.text || '').trim() || n.lock);
  if (!words.length) {
    return live.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, max).map(n => {
      const text = n.lock ? '' : String(n.text || '');
      return { id: n.id, score: 0, inTitle: false, title: n.title ? [{ t: String(n.title), h: false }] : [], snippet: n.lock ? [] : snippet(text, '', [], -1) };
    });
  }
  const hits = [];
  for (const n of live) {
    const e = index.get(n);
    let score = 0, ok = true, first = -1, inTitle = false;
    for (const w of words) {
      const ti = e.title.indexOf(w), bi = e.body.indexOf(w);
      if (ti < 0 && bi < 0) { ok = false; break; }
      if (ti >= 0) {
        inTitle = true; score += 10;
        if (ti === 0 || /[^\p{L}\p{N}]/u.test(e.title[ti - 1])) score += 6;   // the title has a word that starts with it
        if (e.title === w) score += 20;
      }
      if (bi >= 0) {
        let c = 0, i = bi;
        while (i >= 0 && c < 5) { c++; i = e.body.indexOf(w, i + w.length); }
        score += c;
        if (bi === 0 || /[^\p{L}\p{N}]/u.test(e.body[bi - 1])) score += 2;
        if (first < 0 || bi < first) first = bi;
      }
    }
    if (!ok) continue;
    let at = first;
    if (phrase) { const pi = e.body.indexOf(phrase); if (pi >= 0) { score += 12; at = pi; } else if (e.title.includes(phrase)) score += 12; }
    if (n.pinned) score += 1;
    hits.push({ n, e, score, at, inTitle });
  }
  hits.sort((a, b) => b.score - a.score || (b.n.updated || 0) - (a.n.updated || 0));
  return hits.slice(0, max).map(({ n, e, score, at, inTitle }) => {
    const text = n.lock ? '' : String(n.text || '');
    return {
      id: n.id, score, inTitle,
      title: n.title ? pieces(String(n.title), e.title, 0, String(n.title).length, words) : [],
      snippet: n.lock ? [] : snippet(text, e.body, words, at)
    };
  });
}
// Just the ids of the matching notes (what the All notes window needs to filter its cards).
const matchIds = (index, notes, query) => search(index, notes, query, { max: 100000 }).map(r => r.id);

module.exports = { fold, createIndex, search, matchIds, queryWords };
