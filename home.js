'use strict';
// The "Home" sidebar: All notes, Trash, AI chat and Settings are pages of one window. This script wraps whatever page it is loaded in
// (all.html, chat.html, settings.html) with the sidebar. Notes and Trash switch inside all.html; the others load their own page.
(function () {
  const page = location.pathname.split('/').pop();
  const body = document.body;
  if (!body || body.classList.contains('homed')) return;
  const here = page === 'chat.html' ? 'chat' : page === 'settings.html' ? 'settings' : 'notes';
  const ico = d => '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
  const ITEMS = [
    ['notes', 'Notes', ico('<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>')],
    ['trash', 'Trash', ico('<path d="M5 7h14M9.5 7V4.5h5V7M7 7l.9 12.5h8.2L17 7"/>')],
    ['chat', 'Ask the AI', ico('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>')],
    ['settings', 'Settings', ico('<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>')]
  ];
  const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'home.css'; document.head.appendChild(link);
  const nav = document.createElement('nav'); nav.id = 'homeNav'; nav.setAttribute('aria-label', 'StickyPad');
  const brand = document.createElement('div'); brand.className = 'hbrand'; brand.textContent = 'StickyPad'; nav.appendChild(brand);
  const btns = {};
  for (const [id, label, icon] of ITEMS) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'hitem'; b.dataset.go = id;
    b.innerHTML = icon + '<span>' + label + '</span>' + (id === 'trash' ? '<em id="hTrashN"></em>' : '');
    b.onclick = () => go(id); nav.appendChild(b); btns[id] = b;
  }
  const foot = document.createElement('div'); foot.className = 'hfoot'; foot.textContent = 'Opens this window from anywhere.';
  const keyHint = k => { foot.textContent = (k || 'The shortcut') + ' opens this window from anywhere.'; };
  keyHint(window.StickyKeys && StickyKeys.DEFAULTS.g_all);   // the real key is read next (it can be changed in Settings > Shortcuts)
  if (api.welcomeGet) api.welcomeGet().then(r => { if (r && r.keys && r.keys.g_all) keyHint(r.keys.g_all); }).catch(() => {});
  if (api.onKeys) api.onKeys(m => { if (m && m.g_all) keyHint(m.g_all); }); nav.appendChild(foot);

  const main = document.createElement('div'); main.className = 'homeMain';
  main.style.flexDirection = getComputedStyle(body).flexDirection;   // keep the page's own layout (column, or row for Settings)
  [...body.childNodes].filter(n => n.nodeName !== 'SCRIPT').forEach(n => main.appendChild(n));
  body.insertBefore(main, body.firstChild); body.insertBefore(nav, body.firstChild);
  body.classList.add('homed');

  function mark(id) { Object.entries(btns).forEach(([k, b]) => { b.classList.toggle('on', k === id); b.setAttribute('aria-current', k === id ? 'page' : 'false'); }); }
  function go(id) {
    if (here === 'notes' && (id === 'notes' || id === 'trash')) { const t = document.getElementById(id === 'trash' ? 'tabTrash' : 'tabNotes'); t && t.click(); mark(id); return; }
    if (id === here) return;
    window.api && window.api.home && window.api.home(id);
  }
  // the Notes page tells us which of its two views is showing, and how many notes are in the trash
  function sync() {
    if (here !== 'notes') return;
    const tt = document.getElementById('tabTrash'); mark(tt && tt.classList.contains('on') ? 'trash' : 'notes');
    const n = document.getElementById('trashN'), h = document.getElementById('hTrashN'); if (n && h) h.textContent = n.textContent.trim();
  }
  mark(here);
  // Settings: its categories become sub-items under "Settings" here, so there is one menu instead of two
  if (here === 'settings') {
    const subs = document.createElement('div'); subs.className = 'hsubs'; subs.setAttribute('role', 'group'); subs.setAttribute('aria-label', 'Settings categories');
    const own = [...document.querySelectorAll('#nav button[data-cat]')];
    own.forEach(src => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'hsub'; b.dataset.cat = src.dataset.cat;
      b.textContent = [...src.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
      b.onclick = () => src.click(); subs.appendChild(b);
    });
    btns.settings.after(subs);
    const search = document.querySelector('aside .search'), content = document.getElementById('content');
    if (search && content) content.insertBefore(search, content.firstChild);   // the search box moves to the top of the page
    const paint = () => subs.querySelectorAll('.hsub').forEach(b => { const on = !!document.querySelector('#nav button.on[data-cat="' + b.dataset.cat + '"]'); b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'true' : 'false'); });
    const mo = new MutationObserver(paint); own.forEach(src => mo.observe(src, { attributes: true, attributeFilter: ['class'] })); paint();
  }
  if (here === 'notes') {
    const obs = new MutationObserver(sync);
    ['tabTrash', 'tabNotes', 'trashN'].forEach(i => { const e = document.getElementById(i); e && obs.observe(e, { attributes: true, childList: true, characterData: true, subtree: true }); });
    sync();
  }
})();
