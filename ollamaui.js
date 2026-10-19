'use strict';
// Model picker + "install Ollama" helper shared by the note popover and the Settings window.
// Expects #aiProv, #aiCred (address), #aiModel (text box), #aiModelSel (the list) and #aiOl (status area) on the page.
(function () {
  const $ = s => document.querySelector(s);
  const gb = b => (b / 1e9 >= 0.1 ? (b / 1e9).toFixed(1) + ' GB' : Math.max(1, Math.round(b / 1e6)) + ' MB');
  let st = null, busy = null, err = '', confirmDel = '', opts = {}, el = {};
  const isOl = () => el.prov && el.prov.value === 'ollama';
  const isInstalled = n => st && st.models.some(m => m.name === n || m.name === n + ':latest');
  const realName = n => (st && st.models.find(m => m.name === n || m.name === n + ':latest') || {}).name || n;

  function layout() {
    const ol = isOl();
    el.sel.hidden = el.box.hidden = !ol;
    el.txt.hidden = ol && el.sel.value !== '__other';
  }
  function fillSelect() {
    const cur = el.txt.value.trim();
    el.sel.textContent = '';
    const add = (parent, value, text) => { const o = document.createElement('option'); o.value = value; o.textContent = text; parent.appendChild(o); return o; };
    if (!cur) add(el.sel, '', 'Choose a model…');
    const models = st ? st.models : [];
    if (models.length) {
      const g = document.createElement('optgroup'); g.label = 'Installed';
      models.forEach(m => add(g, m.name, m.name + (m.size ? '  ·  ' + gb(m.size) : ''))); el.sel.appendChild(g);
    }
    const rec = (st ? st.recommended : []).filter(r => !isInstalled(r.name));
    if (rec.length) {
      const g = document.createElement('optgroup'); g.label = 'Download (recommended)';
      rec.forEach(r => add(g, r.name, r.label + '  ·  ' + r.size + '  ·  ' + r.note)); el.sel.appendChild(g);
    }
    add(el.sel, '__other', 'Other (type a name)…');
    if (!cur) el.sel.value = '';
    else if (isInstalled(cur)) el.sel.value = realName(cur);
    else if (rec.some(r => r.name === cur)) el.sel.value = cur;
    else el.sel.value = '__other';
  }
  const btn = (label, fn, primary) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (primary ? ' primary' : ''); b.textContent = label; b.onclick = fn; return b; };
  function render() {
    layout();
    if (!isOl()) return;
    const box = el.box; box.textContent = '';
    const msg = document.createElement('div'); msg.className = 'ol-msg';
    const acts = document.createElement('div'); acts.className = 'ol-acts';
    if (busy) {
      msg.textContent = busy.status + (busy.pct != null ? '  ' + busy.pct + '%' : '');
      const bar = document.createElement('div'); bar.className = 'ol-bar' + (busy.pct == null ? ' indet' : ''); const i = document.createElement('i'); i.style.width = (busy.pct == null ? 40 : busy.pct) + '%'; bar.appendChild(i);
      box.append(msg, bar);
      acts.appendChild(btn('Cancel', () => api.ollamaCancel(busy.kind === 'pull' ? 'pull:' + busy.name : 'install')));
    } else if (!st) {
      msg.textContent = 'Checking Ollama…'; box.appendChild(msg);
    } else if (!st.running && !st.installed) {
      msg.textContent = 'Ollama is not installed on this PC.'; box.appendChild(msg);
      if (st.canInstall) acts.appendChild(btn('Download and install Ollama', install, true));
      else { const h = document.createElement('div'); h.className = 'ol-sub'; h.textContent = 'Get it from ollama.com, then press Refresh.'; box.appendChild(h); }
    } else if (!st.running) {
      msg.textContent = 'Ollama is installed but not running.'; box.appendChild(msg);
      acts.appendChild(btn('Start Ollama', startOl, true));
    } else {
      msg.textContent = 'Ollama is running ✓  ·  ' + (st.models.length ? st.models.length + ' model' + (st.models.length === 1 ? '' : 's') + ' installed' : 'no models yet, pick one below to download it');
      box.appendChild(msg);
      const v = el.sel.value;
      if (v && v !== '__other' && !isInstalled(v)) {
        const r = st.recommended.find(x => x.name === v);
        acts.appendChild(btn('Download ' + v + (r ? ' (' + r.size + ')' : ''), () => pull(v), true));
      } else if (v && v !== '__other') {
        // an installed model: it can be removed from the disk (e.g. when it answers badly or is too slow); two clicks, so it is never an accident
        const rn = realName(v), size = (st.models.find(m => m.name === rn) || {}).size;
        if (confirmDel === rn) {
          const q = document.createElement('div'); q.className = 'ol-err'; q.textContent = 'Delete ' + rn + (size ? ' and free ' + gb(size) : '') + '? You can download it again later.'; box.appendChild(q);
          const yes = btn('Yes, delete it', () => del(rn)); yes.classList.add('danger'); acts.appendChild(yes);
          acts.appendChild(btn('Keep it', () => { confirmDel = ''; render(); }));
        } else {
          const d = btn('Delete model…', () => { confirmDel = rn; render(); }); d.classList.add('danger'); d.title = 'Remove ' + rn + ' from this PC'; acts.appendChild(d);
        }
      }
    }
    if (err) { const e = document.createElement('div'); e.className = 'ol-err'; e.textContent = err; box.appendChild(e); }
    if (!busy && !confirmDel) acts.appendChild(btn('↻', refresh));
    acts.lastChild && (acts.lastChild.title = acts.lastChild.textContent === '↻' ? 'Check again' : '');
    box.appendChild(acts);
  }
  async function refresh() {
    if (!isOl()) { layout(); return; }
    try { st = await api.ollamaStatus(el.url.value); } catch { st = { running: false, installed: false, canInstall: false, models: [], recommended: [] }; }
    if (st.installing) busy = busy || { kind: 'install', status: 'Working…', pct: null };
    else if (st.pulling && st.pulling.length) busy = busy || { kind: 'pull', name: st.pulling[0], status: 'Downloading…', pct: null };
    fillSelect(); render();
  }
  async function saveModel(v) {
    await api.aiSet({ provider: 'ollama', model: v, url: el.url.value });
    opts.onSaved && opts.onSaved('Model set to ' + v + ' ✓');
  }
  async function pull(name) {
    err = ''; busy = { kind: 'pull', name, status: 'Starting…', pct: 0 }; render();
    const r = await api.ollamaPull(name, el.url.value);
    busy = null;
    if (r.ok) { await refresh(); el.txt.value = name; fillSelect(); render(); await saveModel(name); }
    else { if (r.error) err = r.error; await refresh(); }
  }
  async function del(name) {
    err = ''; confirmDel = ''; busy = { kind: 'delete', name, status: 'Deleting ' + name + '…', pct: null }; render();
    const r = await api.ollamaDelete(name, el.url.value);
    busy = null;
    if (!r.ok) err = r.error || 'Could not delete the model.';
    else if (el.txt.value.trim() === name || el.txt.value.trim() + ':latest' === name) {   // it was the chosen one: nothing is chosen any more
      el.txt.value = ''; await api.aiSet({ provider: 'ollama', model: '', url: el.url.value }); opts.onSaved && opts.onSaved('Deleted ' + name + ' ✓');
    } else opts.onSaved && opts.onSaved('Deleted ' + name + ' ✓');
    await refresh();
  }
  async function install() { err = ''; busy = { kind: 'install', status: 'Starting…', pct: null }; render(); const r = await api.ollamaInstall(el.url.value); busy = null; if (!r.ok && r.error) err = r.error; await refresh(); }
  async function startOl() { err = ''; busy = { kind: 'install', status: 'Starting Ollama…', pct: null }; render(); const r = await api.ollamaStart(el.url.value); busy = null; if (!r.ok) err = r.error; await refresh(); }
  async function onSelect() {
    const v = el.sel.value; err = ''; confirmDel = '';
    if (v === '__other') { layout(); el.txt.focus(); render(); return; }
    layout();
    if (!v) { render(); return; }
    el.txt.value = v;
    if (isInstalled(v)) { await saveModel(realName(v)); render(); } else render();   // not downloaded yet: the Download button appears
  }
  function onEvent(m) {
    if (!isOl()) return;
    if (m.state === 'progress') {
      busy = { kind: m.type, name: m.name, status: m.status || 'Working…', pct: m.pct }; render();
    } else if (m.state === 'done') { busy = null; refresh(); }
    else if (m.state === 'cancelled') { busy = null; err = ''; refresh(); }
    else if (m.state === 'error') { busy = null; err = m.error || 'Something went wrong.'; refresh(); }
  }
  window.OllamaUI = {
    init(o) {
      opts = o || {};
      el = { sel: $('#aiModelSel'), txt: $('#aiModel'), box: $('#aiOl'), prov: $('#aiProv'), url: $('#aiCred') };
      el.sel.addEventListener('change', onSelect);
      api.onOllamaEvent(onEvent);
    },
    refresh,
    layout
  };
})();
