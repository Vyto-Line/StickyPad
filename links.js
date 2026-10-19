'use strict';
// Finding web and e-mail addresses inside note text. No Electron needed.
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.StickyLinks = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  const RE = /(?:https?:\/\/|www\.)[^\s<>"'`«»]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/gi;
  // [{ start, end, url }] for every link in the text. Closing punctuation at the end (a full stop, a bracket) is not part of it.
  function find(text) {
    const out = []; text = String(text || ''); RE.lastIndex = 0; let m;
    while ((m = RE.exec(text))) {
      let s = m[0];
      for (;;) {
        const last = s[s.length - 1];
        if (/[.,;:!?'"…]/.test(last)) s = s.slice(0, -1);
        else if (last === ')' && (s.match(/\(/g) || []).length < (s.match(/\)/g) || []).length) s = s.slice(0, -1);
        else if (last === ']' && (s.match(/\[/g) || []).length < (s.match(/\]/g) || []).length) s = s.slice(0, -1);
        else break;
      }
      if (s.length < 4) continue;
      const u = urlOf(s); if (u) out.push({ start: m.index, end: m.index + s.length, url: u });
    }
    return out;
  }
  function urlOf(s) {
    s = String(s || '').trim();
    if (/^https?:\/\/\S+$/i.test(s)) return s;
    if (/^www\.\S+\.\S+$/i.test(s)) return 'https://' + s;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return 'mailto:' + s;
    return '';
  }
  // Only these ever get opened.
  const safe = u => /^(https?:\/\/[^\s]+|mailto:[^\s]+)$/i.test(String(u || '')) && String(u).length < 2048;
  const at = (text, i) => find(text).find(l => i >= l.start && i <= l.end) || null;
  return { find, urlOf, safe, at };
});
