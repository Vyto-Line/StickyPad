'use strict';
// "Ask all my notes": picks the notes that best fit a question so the AI can read them. No Electron needed.
const fold = s => { s = String(s || ''); let o = ''; for (let i = 0; i < s.length; i++) { let c = s[i].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); if (c === 'ς') c = 'σ'; o += c; } return o; };
const STOP = new Set(('και η ο το οι τα των του της τον την στο στη στην στον σε απο για με να θα που ειναι ειχα εχω εχει μου σου μας ποια ποιο ποιος ποιοι τι ποτε πως πού που εγραψα γραψει σημειωση σημειωσεις νοτσ ' +
  'the a an and or of to in on at for with is are was were i my me what which who when how did do does about note notes wrote write written have has had').split(/\s+/).map(fold));
// words of 3+ letters, ends cut a little so "συναντηση" finds "συναντησεις"
const stem = w => (w.length > 6 ? w.slice(0, w.length - 2) : w.length > 4 ? w.slice(0, w.length - 1) : w);
const words = s => (fold(s).match(/[\p{L}\p{N}]{3,}/gu) || []).filter(w => !STOP.has(w));
function score(note, qs) {
  const title = fold(note.title), body = fold(note.text); let s = 0;
  for (const q of qs) {
    if (title.includes(q)) s += 3;
    let i = 0, c = 0; while (c < 5 && (i = body.indexOf(q, i)) >= 0) { c++; i += q.length; }
    s += c;
  }
  return s;
}
const CUT = (t, n) => (t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t);
// notes: [{ id, title, text, updated }] (locked notes must not be passed in). -> { context, used: [{id,title}], matched }
function build(notes, question, { maxNotes = 6, perNote = 1500, total = 7000 } = {}) {
  const qs = [...new Set(words(question).map(stem))];
  const ranked = notes.filter(n => String(n.text || '').trim() || String(n.title || '').trim())
    .map(n => ({ n, s: qs.length ? score(n, qs) : 0 })).sort((a, b) => b.s - a.s || (b.n.updated || 0) - (a.n.updated || 0));
  const matched = ranked.some(r => r.s > 0);
  const pick = (matched ? ranked.filter(r => r.s > 0) : ranked).slice(0, maxNotes);
  let ctx = '', used = [];
  for (const { n } of pick) {
    const block = `### ${n.title || '(no title)'}${n.updated ? ' (edited ' + new Date(n.updated).toISOString().slice(0, 10) + ')' : ''}\n${CUT(String(n.text || '').trim(), perNote)}\n`;
    if (ctx.length + block.length > total) break; ctx += block + '\n'; used.push({ id: n.id, title: n.title || String(n.text || '').trim().split('\n')[0].slice(0, 40) });
  }
  const titles = ranked.slice(0, 60).map(r => r.n.title || String(r.n.text || '').trim().split('\n')[0].slice(0, 40)).filter(Boolean);
  return { context: ctx.trim(), used, matched, titles, count: ranked.length };
}
module.exports = { build, words, stem, fold };
