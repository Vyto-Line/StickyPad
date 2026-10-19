'use strict';
// Paints Home, Settings and the AI chat with the chosen theme (light or dark version). Loaded in <head>: it first uses the
// colours remembered from last time (no flash of the wrong colours), then asks the app and follows every change.
(function () {
  const KEY = 'sp.uitheme';
  function paint(t) {
    if (!t || !t.vars) return;
    const r = document.documentElement;
    Object.entries(t.vars).forEach(([k, v]) => r.style.setProperty(k, v));
    r.style.colorScheme = t.dark ? 'dark' : 'light';
    r.dataset.ui = t.dark ? 'dark' : 'light'; r.dataset.theme = t.id || '';
    try { localStorage.setItem(KEY, JSON.stringify({ id: t.id, dark: t.dark, vars: t.vars })); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('sp-theme', { detail: t })); } catch (e) {}
  }
  try { paint(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) {}
  const api = window.api;
  if (api && api.uiTheme) { api.uiTheme().then(paint).catch(() => {}); if (api.onUiTheme) api.onUiTheme(paint); }
  window.StickyUiTheme = { paint };
})();
