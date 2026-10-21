'use strict';
// Accessibility options (Settings > Accessibility): interface size, high contrast, easier-to-read notes, reduced motion, visible keyboard focus,
// bigger buttons and screen reader announcements. Loaded in <head> of every window: it first uses what was remembered last time (so the window
// opens already set up), then asks the app and follows every change.
(function () {
  const KEY = 'sp.access', DEF = { size: 100, contrast: false, read: false, motion: null, focus: true, big: false, sr: true };
  const isNote = /note\.html$/i.test(location.pathname);   // notes keep their own text size: only their buttons and look change
  let cur = Object.assign({}, DEF), zoomed = null, live = null;
  const reduced = () => { try { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
  function apply(a) {
    cur = Object.assign({}, DEF, a || {});
    const c = document.documentElement.classList;
    c.toggle('a11y-hc', !!cur.contrast); c.toggle('a11y-read', !!cur.read); c.toggle('a11y-focus', cur.focus !== false); c.toggle('a11y-big', !!cur.big);
    c.toggle('a11y-motion', cur.motion === true || (cur.motion === null && reduced()));
    const f = isNote ? 1 : (cur.size || 100) / 100;
    if (f !== zoomed) { zoomed = f; try { if (window.api && window.api.setZoom) window.api.setZoom(f); } catch (e) { /* ignore */ } }
    try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch (e) { /* private window or blocked storage */ }
    try { window.dispatchEvent(new CustomEvent('sp-access', { detail: cur })); } catch (e) { /* ignore */ }
  }
  // a hidden line that screen readers read out; nothing is shown on screen
  function announce(msg) {
    if (!cur.sr || !msg) return;
    if (!live) {
      live = document.createElement('div'); live.id = 'a11yLive'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
      live.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden';
      (document.body || document.documentElement).appendChild(live);
    }
    live.textContent = ''; setTimeout(() => { if (live) live.textContent = String(msg); }, 50);   // clearing first makes the same sentence be read again
  }
  const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'access.css'; document.head.appendChild(link);
  try { apply(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { apply(null); }
  const api = window.api;
  if (api && api.accessGet) { api.accessGet().then(a => apply(a)).catch(() => {}); if (api.onAccess) api.onAccess(a => apply(a)); }
  try { if (window.matchMedia) matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => apply(cur)); } catch (e) { /* older engine */ }
  window.StickyAccess = { apply, announce, get: () => Object.assign({}, cur) };
})();
