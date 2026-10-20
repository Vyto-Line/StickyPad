'use strict';
// Text prediction: remembers which words you use again and again, and offers the rest of a word after the first letters.
// Pure functions (no Electron, no DOM), shared by the main process (counts words of all notes) and the note window (looks them up).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StickyWords = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const WORD = /[\p{L}\p{N}_]+/gu;
  const MIN_LEN = 4;        // shorter words are quicker to type than to pick
  const MAX_LEN = 32;
  const MAX_KEYS = 60000;   // a huge pile of notes must not eat the memory
  const MIN_PREFIX = 3;

  // One letter in -> one letter out (same length), ignoring case and Greek/Latin accents: "Καλημέρα" and "καλημερα" are the same word.
  const MEMO = new Map();   // each letter is worked out once
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
  const fold = s => { s = String(s); if (ASCII.test(s)) return s.toLowerCase(); let o = ''; for (const ch of s) o += fold1(ch); return o; };

  const WMEMO = new Map();   // whole words are repeated all the time, so each different word is folded once
  const foldWord = w => { let k = WMEMO.get(w); if (k === undefined) { k = fold(w); if (WMEMO.size < 100000) WMEMO.set(w, k); } return k; };
  const newMap = () => new Map();
  // Adds the words of one text to a count map: key (folded word) -> { n, forms: Map(form -> count) }
  function add(map, text) {
    const s = String(text || '').slice(0, 400000);
    for (const m of s.matchAll(WORD)) {
      const w = m[0];
      if (w.length < MIN_LEN || w.length > MAX_LEN || /^[\p{N}_]+$/u.test(w)) continue;
      const k = foldWord(w);
      let e = map.get(k);
      if (!e) { if (map.size >= MAX_KEYS) continue; e = { n: 0, forms: new Map() }; map.set(k, e); }
      e.n++;
      if (e.forms.size < 6 || e.forms.has(w)) e.forms.set(w, (e.forms.get(w) || 0) + 1);
    }
    return map;
  }
  // Adds the counts of `from` (a map made by add()) to `into`: lets each note keep its own small map, and only the changed notes are counted again.
  function merge(into, from) {
    for (const [k, e] of from) {
      let d = into.get(k);
      if (!d) { if (into.size >= MAX_KEYS) continue; d = { n: 0, forms: new Map() }; into.set(k, d); }
      d.n += e.n;
      for (const [f, c] of e.forms) if (d.forms.size < 6 || d.forms.has(f)) d.forms.set(f, (d.forms.get(f) || 0) + c);
    }
    return into;
  }
  // The form you write most often ("Athens" or "athens"); on a tie the accented one, then the one with fewer capitals.
  const accents = w => w.normalize('NFD').replace(/[^\u0300-\u036f]/g, '').length;
  const caps = w => w.replace(/[^\p{Lu}]/gu, '').length;
  function best(e) {
    let w = '', c = -1;
    for (const [f, n] of e.forms) {
      if (n > c || (n === c && (accents(f) > accents(w) || (accents(f) === accents(w) && caps(f) < caps(w))))) { w = f; c = n; }
    }
    return w;
  }
  // The most used words (used at least twice), as a plain list that can cross from the main process to the window.
  function top(map, max) {
    const out = [];
    for (const [k, e] of map) if (e.n >= 2) out.push({ k, w: best(e), n: e.n });
    out.sort((a, b) => b.n - a.n || a.w.length - b.w.length || (a.w < b.w ? -1 : 1));
    return out.slice(0, max || 4000);
  }
  // The word being typed: letters and digits right before the caret (null when the caret is in the middle of a word or there are too few letters).
  function prefixAt(text, caret) {
    const before = String(text).slice(0, caret);
    const m = /[\p{L}\p{N}_]+$/u.exec(before);
    if (!m || m[0].length < MIN_PREFIX) return null;
    const next = String(text).slice(caret, caret + 2);
    if (next && /^[\p{L}\p{N}_]/u.test(next)) return null;
    return m[0];
  }
  // Up to `max` completions of `prefix`. `lists` is [ top() lists ], `own` is an optional count map of the current note.
  // A word needs to have been used at least twice (all notes and this note together).
  function suggest(prefix, max, lists, own) {
    const p = fold(prefix); if (p.length < MIN_PREFIX) return [];
    const found = new Map();
    const take = (k, w, n) => {
      if (k === p || !k.startsWith(p)) return;
      const f = found.get(k); if (f) f.n += n; else found.set(k, { w, n });
    };
    (lists || []).forEach(l => (l || []).forEach(x => take(x.k, x.w, x.n)));
    if (own) for (const [k, e] of own) if (k.length > p.length && k.startsWith(p)) take(k, best(e), e.n);
    return [...found.values()].filter(x => x.n >= 2 && x.w.length > prefix.length)
      .sort((a, b) => b.n - a.n || a.w.length - b.w.length || (a.w < b.w ? -1 : 1)).slice(0, max || 5).map(x => x.w);
  }
  // What to type to finish the word: the rest of it, as written in the suggestion.
  const rest = (prefix, word) => word.slice(prefix.length);

  return { MIN_LEN, MIN_PREFIX, fold, newMap, add, merge, top, prefixAt, suggest, rest };
});
