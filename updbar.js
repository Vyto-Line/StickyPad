'use strict';
// A small message at the bottom of a note (and of the All notes window) when an update is ready: "Restart to update".
// It builds its own markup and style so every window can use it with one script tag.
(function () {
  if (!window.api || !window.api.onUpdateEvent || !window.api.updateState) return;
  let bar = null, dismissed = false, version = '';
  function build() {
    const st = document.createElement('style');
    st.textContent = '#updbar{position:fixed;left:8px;right:8px;bottom:8px;z-index:60;display:flex;align-items:center;gap:8px;padding:6px 8px 6px 12px;border-radius:12px;background:rgba(32,34,40,.94);color:#fff;font:12.5px "Segoe UI",system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.28)}' +
      '#updbar[hidden]{display:none}#updbar .ub-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#updbar button{flex:none;border:0;border-radius:8px;font:inherit;cursor:pointer;padding:4px 10px}' +
      '#updbar .ub-go{background:#ffd54a;color:#1c1a12;font-weight:600}#updbar .ub-go:hover{background:#ffe07a}' +
      '#updbar .ub-x{background:transparent;color:#fff;opacity:.7;padding:4px 7px}#updbar .ub-x:hover{opacity:1}' +
      'body:has(#datebar:not([hidden])) #updbar{bottom:46px}body.rolled #updbar{display:none}';
    document.head.appendChild(st);
    bar = document.createElement('div'); bar.id = 'updbar'; bar.hidden = true; bar.setAttribute('role', 'status');
    bar.innerHTML = '<span class="ub-t"></span><button type="button" class="ub-go">Restart to update</button><button type="button" class="ub-x" aria-label="Later" title="Later">✕</button>';
    bar.querySelector('.ub-go').onclick = () => { bar.querySelector('.ub-go').disabled = true; window.api.updateInstall(); };
    bar.querySelector('.ub-x').onclick = () => { dismissed = true; bar.hidden = true; };
    document.body.appendChild(bar);
  }
  function apply(s) {
    if (!s) return;
    if (s.state === 'ready') {
      if (dismissed && s.version === version) return;
      if (s.version !== version) dismissed = false;
      version = s.version || ''; if (!bar) build();
      bar.querySelector('.ub-t').textContent = 'Update ' + (version ? version + ' ' : '') + 'is ready';
      bar.hidden = false;
    } else if (bar) bar.hidden = true;
  }
  window.api.onUpdateEvent(apply);
  Promise.resolve(window.api.updateState()).then(apply).catch(() => {});
})();
