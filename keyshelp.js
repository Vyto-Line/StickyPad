'use strict';
// The keyboard shortcuts panel (Ctrl+/): a small window-sized card listing the shortcuts that work here. Text only (textContent), no HTML from outside.
(function (root) {
  const FIXED_NOTE = [['Bold', 'Ctrl+B'], ['Italic', 'Ctrl+I'], ['Underline', 'Ctrl+U'], ['Undo', 'Ctrl+Z'], ['Redo', 'Ctrl+Y'], ['Paste as plain text', 'Ctrl+Shift+V'], ['Select all', 'Ctrl+A'], ['This list', 'Ctrl+/']];
  const FIXED_HOME = [['New note', 'Ctrl+N'], ['Choose every note (in Select mode)', 'Ctrl+A'], ['Leave Select mode or close a menu', 'Esc'], ['This list', 'Ctrl+/']];
  const CSS = '#kh{position:fixed;inset:0;z-index:99;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);font:13px/1.4 "Segoe UI",system-ui,sans-serif}' +
    '#kh[hidden]{display:none}#kh .card{width:min(420px,calc(100% - 20px));max-height:calc(100% - 20px);overflow:auto;padding:14px 16px;border-radius:14px;background:#fff;color:#1f2126;box-shadow:0 10px 40px rgba(0,0,0,.35)}' +
    '@media (prefers-color-scheme:dark){#kh .card{background:#25272e;color:#ecedf0}}' +
    '#kh h2{margin:0 0 6px;font-size:15px}#kh h3{margin:12px 0 4px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;opacity:.65}' +
    '#kh .r{display:flex;justify-content:space-between;gap:14px;padding:3px 0;border-bottom:1px solid rgba(128,128,128,.18)}#kh .r:last-child{border-bottom:0}' +
    '#kh kbd{font:600 11.5px Consolas,monospace;padding:1px 7px;border-radius:6px;background:rgba(128,128,128,.2);white-space:nowrap}' +
    '#kh .x{margin-top:10px;font:inherit;font-weight:600;color:inherit;background:rgba(128,128,128,.2);border:0;border-radius:9px;padding:6px 14px;cursor:pointer}';
  let el = null, back = null;
  function build(groups) {
    if (!el) {
      const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
      el = document.createElement('div'); el.id = 'kh'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Keyboard shortcuts');
      el.addEventListener('mousedown', e => { if (e.target === el) hide(); });
      document.body.appendChild(el);
    }
    el.textContent = '';
    const card = document.createElement('div'); card.className = 'card'; const h = document.createElement('h2'); h.textContent = 'Keyboard shortcuts'; card.appendChild(h);
    groups.forEach(([title, rows]) => {
      const t = document.createElement('h3'); t.textContent = title; card.appendChild(t);
      rows.forEach(([label, keys]) => { const r = document.createElement('div'); r.className = 'r'; const a = document.createElement('span'); a.textContent = label; const k = document.createElement('kbd'); k.textContent = keys; r.append(a, k); card.appendChild(r); });
    });
    const x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.textContent = 'Close (Esc)'; x.onclick = hide; card.appendChild(x);
    el.appendChild(card); return x;
  }
  function hide() { if (!el || el.hidden) return; el.hidden = true; try { if (back && back.focus) back.focus(); } catch (e) {} back = null; }
  // scope: 'note' or 'home'; map: the shortcuts as set in Settings (id -> text)
  function show(scope, map) {
    const K = root.StickyKeys, m = map || K.DEFAULTS, ids = Object.keys(K.LABELS);
    const rows = pre => ids.filter(i => i.startsWith(pre)).map(i => [K.LABELS[i], m[i] || K.DEFAULTS[i]]);
    const groups = scope === 'note' ? [['In this note', rows('n_').concat(FIXED_NOTE)], ['Anywhere in Windows', rows('g_')]] : [['In Home', FIXED_HOME], ['Anywhere in Windows', rows('g_')]];
    back = document.activeElement; const x = build(groups); el.hidden = false; x.focus({ preventScroll: true }); const cd = el.querySelector('.card'); if (cd) cd.scrollTop = 0;
  }
  function toggle(scope, map) { if (el && !el.hidden) hide(); else show(scope, map); }
  const isOpen = () => !!(el && !el.hidden);
  document.addEventListener('keydown', e => { if (isOpen() && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); hide(); } }, true);
  root.StickyKeysHelp = { show, hide, toggle, isOpen, isShortcut: e => e.ctrlKey && !e.altKey && !e.shiftKey && (e.code === 'Slash' || e.key === '/') };
})(typeof self !== 'undefined' ? self : this);
