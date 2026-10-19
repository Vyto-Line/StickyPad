'use strict';
// A small bar at the bottom of a note (and of the Home window) for updates. When a new version is found it offers "Download"; while it
// downloads it shows a glowing neon progress bar; when it is ready it says "Restart to update". It builds its own markup and style, so every window can use
// it with one script tag.
(function () {
  if (!window.api || !window.api.onUpdateEvent || !window.api.updateState) return;
  let bar = null, dismissed = '', version = '';
  const CSS =
    '#updbar{position:fixed;left:8px;right:8px;bottom:8px;z-index:60;display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;padding:7px 8px 7px 12px;border-radius:12px;' +
      'background:rgba(14,12,26,.95);color:#fff;font:12.5px "Segoe UI",system-ui,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,.08)}' +
    '#updbar[hidden]{display:none}#updbar .ub-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#updbar button{flex:none;border:0;border-radius:8px;font:inherit;cursor:pointer;padding:4px 10px}' +
    '#updbar .ub-go,#updbar .ub-dl{background:#ffd54a;color:#1c1a12;font-weight:600}#updbar .ub-go:hover,#updbar .ub-dl:hover{background:#ffe07a}#updbar .ub-go[hidden],#updbar .ub-dl[hidden]{display:none}' +
    '#updbar .ub-x{background:transparent;color:#fff;opacity:.7;padding:4px 7px}#updbar .ub-x:hover{opacity:1}' +
    '#updbar button:focus-visible{outline:2px solid #00e5ff;outline-offset:1px}' +
    // the neon progress bar
    '#updbar .ub-track{flex-basis:100%;height:7px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;position:relative}#updbar .ub-track[hidden]{display:none}' +
    '#updbar .ub-fill{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:99px;transition:width .35s ease;' +
      'background:linear-gradient(90deg,#ff2bd6,#a855ff 45%,#00e5ff);box-shadow:0 0 6px #ff2bd6,0 0 12px rgba(168,85,255,.8),0 0 18px rgba(0,229,255,.6)}' +
    '#updbar .ub-fill::after{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent);' +
      'background-size:40% 100%;background-repeat:no-repeat;animation:ubshine 1.4s linear infinite}' +
    '#updbar .ub-track.indet .ub-fill{width:35%;animation:ubslide 1.3s ease-in-out infinite}' +
    '#updbar .ub-pct{font-variant-numeric:tabular-nums;color:#7df3ff;text-shadow:0 0 6px rgba(0,229,255,.8);font-weight:600}' +
    '@keyframes ubshine{from{background-position:-40% 0}to{background-position:140% 0}}' +
    '@keyframes ubslide{0%{left:-35%}100%{left:100%}}' +
    '@media (prefers-reduced-motion:reduce){#updbar .ub-fill::after{animation:none}#updbar .ub-track.indet .ub-fill{animation:none;left:0;width:100%;opacity:.6}}' +
    'body:has(#datebar:not([hidden])) #updbar{bottom:46px}body.rolled #updbar{display:none}';
  function build() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    bar = document.createElement('div'); bar.id = 'updbar'; bar.hidden = true; bar.setAttribute('role', 'status'); bar.setAttribute('aria-live', 'polite');
    bar.innerHTML = '<span class="ub-t"></span><span class="ub-pct"></span><button type="button" class="ub-dl">Download</button><button type="button" class="ub-go">Restart to update</button>' +
      '<button type="button" class="ub-x" aria-label="Hide" title="Hide">✕</button>' +
      '<div class="ub-track" role="progressbar" aria-label="Downloading the update" aria-valuemin="0" aria-valuemax="100"><i class="ub-fill"></i></div>';
    bar.querySelector('.ub-dl').onclick = () => { bar.querySelector('.ub-dl').disabled = true; Promise.resolve(window.api.updateDownload && window.api.updateDownload()).then(apply).catch(() => {}); };
    bar.querySelector('.ub-go').onclick = () => { bar.querySelector('.ub-go').disabled = true; window.api.updateInstall(); };
    bar.querySelector('.ub-x').onclick = () => { dismissed = (bar.dataset.state || '') + ':' + version; bar.hidden = true; };
    document.body.appendChild(bar);
  }
  function apply(s) {
    if (!s) return;
    const st = s.state;
    if (st !== 'available' && st !== 'downloading' && st !== 'ready') { if (bar) bar.hidden = true; return; }
    if (s.version) version = s.version;
    if (dismissed === st + ':' + version) return;   // hidden with ✕: stays hidden for this step of this version
    if (!bar) build();
    bar.dataset.state = st;
    const t = bar.querySelector('.ub-t'), pct = bar.querySelector('.ub-pct'), go = bar.querySelector('.ub-go'), dl = bar.querySelector('.ub-dl'), tr = bar.querySelector('.ub-track'), fill = bar.querySelector('.ub-fill');
    dl.hidden = st !== 'available';
    if (st === 'available') {
      t.textContent = 'Update' + (version ? ' ' + version : '') + ' is available';
      pct.textContent = ''; go.hidden = true; tr.hidden = true; dl.disabled = false;
    } else if (st === 'downloading') {
      const p = Number.isFinite(s.pct) && s.pct > 0 ? Math.min(100, Math.round(s.pct)) : null;
      t.textContent = 'Downloading update' + (version ? ' ' + version : '') + '…';
      pct.textContent = p == null ? '' : p + '%';
      go.hidden = true; tr.hidden = false;
      tr.classList.toggle('indet', p == null); fill.style.width = p == null ? '' : p + '%';
      if (p == null) tr.removeAttribute('aria-valuenow'); else tr.setAttribute('aria-valuenow', String(p));
    } else {
      t.textContent = 'Update ' + (version ? version + ' ' : '') + 'is ready';
      pct.textContent = ''; go.hidden = false; go.disabled = false; tr.hidden = true;
    }
    bar.hidden = false;
  }
  window.api.onUpdateEvent(apply);
  Promise.resolve(window.api.updateState()).then(apply).catch(() => {});
})();
