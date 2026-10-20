'use strict';
// "How many times does X appear?" Language models cannot count reliably (and a long note is cut to fit them), so StickyPad counts itself
// and hands the AI the exact number. Pure functions: tests and main.js use them.
const { fold } = require('./search');

const ASKS = /(how\s+many|how\s+often|number\s+of|count\b|πόσες|πόσα|πόσοι|πόσο\s+συχνά|μέτρησε|αριθμός)/i;
const ABOUT = /(times|occurrences?|appears?|appear|mentions?|used|repeat|words?\b|φορές|φορά|εμφανίζ|υπάρχ|αναφέρ|λέξη|λέξεις|φράση)/i;
const QUOTED = /["“”«»`]([^"“”«»`\n]{1,60})["“”«»`]/;
const AFTER = /(?:\bword|\bphrase|\bterm|λέξη|λέξης|φράση|φράσης)\s+([^\s"“”«»`]{1,40})/i;
const AFTER_TIMES = /(?:times\s+(?:does|do|is|are)\s+|φορές\s+(?:εμφανίζεται|υπάρχει|αναφέρεται|χρησιμοποιείται)\s+(?:η\s+λέξη\s+|το\s+|η\s+|ο\s+)?)([^\s"“”«»`?!.,;:]{1,40})/i;
const clean = s => String(s || '').replace(/^[\s'‘’(\[]+|[\s'‘’)\].,;:!?…]+$/g, '').trim();

// The thing being counted, or '' when the question is not a counting question about a word or phrase.
function target(question) {
  const q = String(question || '');
  if (!ASKS.test(q) || !ABOUT.test(q)) return '';
  const m = q.match(QUOTED) || q.match(AFTER) || q.match(AFTER_TIMES);
  const t = m ? clean(m[1]) : '';
  return t.length >= 1 && t.length <= 60 ? t : '';
}
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// How many times `word` is in `text`: anywhere in the text (what Ctrl+F counts), and as a whole word only. Ignores capitals and accents.
function count(text, word) {
  const hay = fold(text), w = fold(word);
  if (!w) return { any: 0, whole: 0 };
  let any = 0; for (let i = hay.indexOf(w); i !== -1; i = hay.indexOf(w, i + w.length)) any++;
  let whole = 0; try { const m = hay.match(new RegExp('(?<![\\p{L}\\p{N}])' + esc(w) + '(?![\\p{L}\\p{N}])', 'gu')); whole = m ? m.length : 0; } catch { whole = 0; }
  return { any, whole };
}
const fmt = n => n.toLocaleString('en-US');
// The sentence to add to the AI's instructions ('' when the question is not about counting).
function facts(question, notes) {   // notes: [{ title, text }]
  const t = target(question); if (!t) return '';
  const per = notes.map(n => ({ title: n.title || '(untitled)', ...count(n.text, t) })).filter(x => x.any > 0).sort((a, b) => b.any - a.any);
  const any = per.reduce((s, x) => s + x.any, 0), whole = per.reduce((s, x) => s + x.whole, 0);
  let out = `\n\nEXACT COUNT, computed by the app (not an estimate; you cannot count reliably, so use these numbers and do not recount): "${t}" appears ${fmt(any)} time${any === 1 ? '' : 's'} in total` +
    (any ? ` (${fmt(whole)} as a whole word, the rest inside longer words)` : '') + (notes.length > 1 ? ` across ${notes.length} notes` : ' in the attached note') + ', ignoring capitals and accents.';
  if (notes.length > 1 && per.length) out += ' Most: ' + per.slice(0, 5).map(x => `${x.title} (${fmt(x.any)})`).join(', ') + '.';
  return out;
}
module.exports = { target, count, facts };
