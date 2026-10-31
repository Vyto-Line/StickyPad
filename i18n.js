'use strict';
// App language. English is what the code and the pages are written in; a language (so far Greek) is a dictionary of exact English texts.
// In a window it translates the page by itself: every text, title, placeholder and aria-label that matches a dictionary entry, now and whenever the page changes.
// Your own words are never touched: note text, titles, folder names (anything inside [data-notr], the note editor and the cards).
// The main program uses the same dictionary for the menus (t(text)). A text without an entry stays English.
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.StickyI18n = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  const dicts = {}, rules = {};
  let lang = 'en';
  const norm = s => String(s).replace(/\s+/g, ' ').trim();
  function add(code, dict, rl) { dicts[code] = Object.assign(dicts[code] || {}, dict); rules[code] = (rules[code] || []).concat(rl || []); }
  // Translate one text. Keeps spaces at both ends. Returns the same text when there is no entry.
  function t(s, code) {
    const l = code || lang; if (l === 'en' || typeof s !== 'string') return s;
    const k = norm(s); if (!k) return s;
    const d = dicts[l]; if (!d) return s;
    let v = Object.prototype.hasOwnProperty.call(d, k) ? d[k] : undefined;
    if (v === undefined) for (const [re, fn] of rules[l] || []) { const m = re.exec(k); if (m) { v = fn(...m.slice(1)); break; } }
    if (v === undefined) return s;
    return (/^\s*/.exec(s)[0]) + v + (/\s*$/.exec(s)[0]);
  }
  const has = code => !!dicts[code];
  const setLang = l => { lang = has(l) ? l : 'en'; return lang; };
  const api = { add, t, has, setLang, get lang() { return lang; } };

  /* ---------- the page (only in a window) ---------- */
  if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
    const EXC = '[data-notr],#ed,.card .t,.card .s,.snip,#topic,textarea,input[type=text]:not([placeholder]),script,style,.ph-user,[contenteditable="true"]';
    const ATTRS = ['title', 'placeholder', 'aria-label'];
    const textOrig = new WeakMap(), textSet = new WeakMap(), attrState = new WeakMap();
    const skip = el => !el || !el.closest || !!el.closest(EXC);
    const letters = /[A-Za-z]{2}/;
    function doText(node) {
      const cur = node.data;
      if (textSet.has(node) && textSet.get(node) === cur) return;   // that is our own change
      if (!letters.test(cur) || skip(node.parentElement)) { textOrig.delete(node); textSet.delete(node); return; }
      textOrig.set(node, cur);
      const v = lang === 'en' ? cur : t(cur);
      if (v !== cur) { textSet.set(node, v); node.data = v; } else textSet.delete(node);
    }
    function relangText(node) {   // after the language changed: start again from the English original
      const was = textSet.has(node) && textSet.get(node) === node.data ? textOrig.get(node) : node.data;
      if (was === undefined || !letters.test(was) || skip(node.parentElement)) return;
      textOrig.set(node, was);
      const v = lang === 'en' ? was : t(was);
      if (v !== node.data) { textSet.set(node, v); node.data = v; } else if (v === was) textSet.delete(node);
    }
    function doAttr(el, a, relang) {
      if (!el.getAttribute || el.closest && el.closest('[data-notr]')) return;
      const cur = el.getAttribute(a); if (cur === null) return;
      let st = attrState.get(el); if (!st) { st = {}; attrState.set(el, st); }
      const mine = st[a] && st[a].set === cur;
      const orig = mine ? st[a].orig : cur;
      if (!letters.test(orig)) return;
      const v = lang === 'en' ? orig : t(orig);
      st[a] = { orig, set: v };
      if (v !== cur) el.setAttribute(a, v);
    }
    function walk(root, relang) {
      if (!root) return;
      if (root.nodeType === 3) { relang ? relangText(root) : doText(root); return; }
      if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
      if (root.nodeType === 1 && root.matches && root.matches('script,style')) return;
      const tw = document.createTreeWalker(root, 4 | 1);   // text nodes and elements
      let n = root.nodeType === 1 ? root : tw.nextNode();
      while (n) {
        if (n.nodeType === 3) { relang ? relangText(n) : doText(n); } else if (n.nodeType === 1) ATTRS.forEach(a => { if (n.hasAttribute(a)) doAttr(n, a, relang); });
        n = tw.nextNode();
      }
    }
    function title() { const el = document.querySelector('title'); if (el && el.firstChild) walk(el, true); }
    function refresh() { walk(document.documentElement, true); try { document.documentElement.lang = lang; } catch (e) {} }
    let obs = null;
    function start() {
      if (obs) return;
      obs = new MutationObserver(recs => {
        if (lang === 'en' && !hadOther) return;
        for (const r of recs) {
          if (r.type === 'childList') r.addedNodes.forEach(n => walk(n, false));
          else if (r.type === 'characterData') doText(r.target);
          else if (r.type === 'attributes') doAttr(r.target, r.attributeName, false);
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    }
    let hadOther = false;
    api.apply = function (l) {
      const next = setLang(l);
      if (next !== 'en') hadOther = true;
      start(); refresh(); return next;
    };
    api.refresh = refresh;
    const boot = () => {
      const a = window.api;
      if (a && a.uiTheme) { a.uiTheme().then(ut => { if (ut && ut.lang) api.apply(ut.lang); }).catch(() => {}); if (a.onUiTheme) a.onUiTheme(ut => { if (ut && ut.lang) api.apply(ut.lang); }); }
    };
    // a language remembered from last time is used at once (no flash of English); the app then confirms it
    try { const r = localStorage.getItem('sp.lang'); if (r && has(r)) { /* dictionaries load before this script runs their add() calls, so apply on DOM ready */ document.addEventListener('DOMContentLoaded', () => api.apply(r)); } } catch (e) {}
    const remember = api.apply; api.apply = l => { const r = remember(l); try { localStorage.setItem('sp.lang', r); } catch (e) {} return r; };
    document.addEventListener('DOMContentLoaded', boot);
    if (document.readyState !== 'loading') boot();
  }
  return api;
});
