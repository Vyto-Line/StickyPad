'use strict';
// Text formatting (bold, italic, underline, strikethrough, highlight, letter colour). No Electron needed.
//
// A text block or checklist item keeps its plain text in `v`, exactly as before (search, AI, print, export, history and old versions need nothing
// new). Formatting is an optional list `m` next to it: [[start, end, "b"], ...], where start and end count letters of `v` (JavaScript string
// positions) and the last item is the kind: b i u s (bold, italic, underline, strikethrough), h1..h6 (highlight colours), c1..c7 (letter colours).
// An older StickyPad ignores `m` and shows the note as plain text.
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.StickyMarks = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  const KIND = /^(b|i|u|s|h[1-6]|c[1-7])$/;
  const MAX_MARKS = 5000;
  // Highlight colours (the letters on them stay dark) and letter colours (a light and a dark version, for light and dark notes).
  const HIGHLIGHT = { h1: ['Yellow', '#ffe680'], h2: ['Green', '#b9f0b9'], h3: ['Blue', '#a9d8ff'], h4: ['Pink', '#ffc1dd'], h5: ['Orange', '#ffcb9a'], h6: ['Purple', '#d8c2ff'] };
  const LETTER = { c1: ['Black or white', '#111111', '#f5f5f2'], c2: ['Red', '#c5221f', '#ff8a80'], c3: ['Orange', '#b45309', '#ffb74d'], c4: ['Green', '#15803d', '#81c995'],
    c5: ['Blue', '#1a56db', '#8ab4f8'], c6: ['Purple', '#7e22ce', '#d7aefb'], c7: ['Grey', '#5b6270', '#b0b6c0'] };
  const group = k => k[0] === 'h' ? 'h' : k[0] === 'c' ? 'c' : k;   // a letter has one highlight and one letter colour at a time

  // Tidy a list from a file or the page: only known kinds, whole numbers, inside the text; sorted, and touching parts of the same kind joined.
  function clean(m, len) {
    if (!Array.isArray(m)) return [];
    const by = {};
    for (const x of m.slice(0, MAX_MARKS * 2)) {
      if (!Array.isArray(x) || x.length !== 3) continue;
      let s = x[0], e = x[1]; const k = x[2];
      if (!Number.isInteger(s) || !Number.isInteger(e) || typeof k !== 'string' || !KIND.test(k)) continue;
      s = Math.max(0, s); e = Math.min(len, e); if (e <= s) continue;
      (by[k] = by[k] || []).push([s, e]);
    }
    const out = [];
    for (const k of Object.keys(by)) {
      by[k].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      let cur = null;
      for (const r of by[k]) { if (cur && r[0] <= cur[1]) cur[1] = Math.max(cur[1], r[1]); else { cur = [r[0], r[1]]; out.push([cur, k]); } }
    }
    out.sort((a, b) => a[0][0] - b[0][0] || a[0][1] - b[0][1] || (a[1] < b[1] ? -1 : 1));
    return out.slice(0, MAX_MARKS).map(([r, k]) => [r[0], r[1], k]);
  }
  // Does the whole stretch [s, e) have this kind?
  function covered(m, s, e, kind) {
    let at = s;
    for (const x of (m || []).filter(x => x[2] === kind).sort((a, b) => a[0] - b[0])) {
      if (x[0] > at) return false;
      if (x[1] > at) at = x[1];
      if (at >= e) return true;
    }
    return at >= e;
  }
  // Take the kind away from [s, e).
  function remove(m, s, e, kind) {
    const out = [];
    for (const x of (m || [])) {
      if (x[2] !== kind || x[1] <= s || x[0] >= e) { out.push(x); continue; }
      if (x[0] < s) out.push([x[0], s, kind]);
      if (x[1] > e) out.push([e, x[1], kind]);
    }
    return out;
  }
  // Put the kind on [s, e). A new highlight or letter colour replaces the old one there.
  function add(m, s, e, kind, len) {
    let out = m || [];
    if (group(kind) === 'h' || group(kind) === 'c') for (const k of Object.keys(group(kind) === 'h' ? HIGHLIGHT : LETTER)) out = remove(out, s, e, k);
    out = out.concat([[s, e, kind]]);
    return clean(out, len === undefined ? Math.max(e, ...out.map(x => x[1])) : len);
  }
  // Take every kind away from [s, e) (Clear formatting).
  function clear(m, s, e) { let out = m || []; for (const k of ['b', 'i', 'u', 's', ...Object.keys(HIGHLIGHT), ...Object.keys(LETTER)]) out = remove(out, s, e, k); return out; }

  // The text split into runs with the same formatting: [{ text, kinds: [] }].
  function runs(v, m) {
    const cuts = new Set([0, v.length]);
    for (const x of m || []) { cuts.add(x[0]); cuts.add(x[1]); }
    const pts = [...cuts].filter(p => p >= 0 && p <= v.length).sort((a, b) => a - b), out = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1];
      out.push({ text: v.slice(a, b), kinds: (m || []).filter(x => x[0] <= a && x[1] >= b).map(x => x[2]) });
    }
    return out;
  }

  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // The run as HTML with inline styles, for the clipboard and for printing (always for a light page: dark letters, fixed colours).
  function runHtml(r, dark) {
    let css = '', t = esc(r.text).replace(/\r?\n/g, '<br>');
    for (const k of r.kinds) {
      if (HIGHLIGHT[k]) css += 'background-color:' + HIGHLIGHT[k][1] + ';color:#111;';
      else if (LETTER[k]) css += 'color:' + LETTER[k][dark ? 2 : 1] + ';';
    }
    const deco = [r.kinds.includes('u') ? 'underline' : '', r.kinds.includes('s') ? 'line-through' : ''].filter(Boolean).join(' ');
    if (deco) css += 'text-decoration:' + deco + ';';
    if (r.kinds.includes('b')) t = '<b>' + t + '</b>';
    if (r.kinds.includes('i')) t = '<i>' + t + '</i>';
    return css ? '<span style="' + css + '">' + t + '</span>' : t;
  }
  const toHtml = (v, m, dark) => runs(v, m).map(r => runHtml(r, dark)).join('');
  // Markdown keeps bold, italic and strikethrough (there is no Markdown for the others).
  function toMarkdown(v, m) {
    return runs(v, m).map(r => {
      let t = r.text; if (!/\S/.test(t)) return t;
      const lead = /^\s*/.exec(t)[0], trail = /\s*$/.exec(t)[0], core = t.slice(lead.length, t.length - trail.length);
      let o = core;
      if (r.kinds.includes('s')) o = '~~' + o + '~~';
      if (r.kinds.includes('b') && r.kinds.includes('i')) o = '***' + o + '***'; else if (r.kinds.includes('b')) o = '**' + o + '**'; else if (r.kinds.includes('i')) o = '*' + o + '*';
      return lead + o + trail;
    }).join('');
  }
  // A block as saved: its marks tidied for its text (so a damaged list can never point outside the text).
  function sanitize(b) {
    if (!b || typeof b.v !== 'string') return undefined;
    const m = clean(b.m, b.v.length);
    return m.length ? m : undefined;
  }
  return { KIND, HIGHLIGHT, LETTER, clean, covered, remove, add, clear, runs, toHtml, toMarkdown, sanitize };
});
