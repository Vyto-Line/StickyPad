const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const TH = window.StickyThemes;
let S = null, saving = Promise.resolve();

// Two-step buttons instead of confirm(): a native confirm box can leave text fields in Electron unable to receive typing.
function arm(btn, label, sure, action) {
  let timer = null;
  btn.onclick = () => {
    if (timer) { clearTimeout(timer); timer = null; btn.textContent = label; btn.classList.remove('armed'); action(); return; }
    btn.textContent = sure; btn.classList.add('armed');
    timer = setTimeout(() => { timer = null; btn.textContent = label; btn.classList.remove('armed'); }, 3000);
  };
}
const flash = (el, text, ms = 2500) => { el.textContent = text; clearTimeout(el._t); el._t = setTimeout(() => { el.textContent = el.dataset.default || ''; }, ms); };

/* ---------- showing the current values ---------- */
function setIfIdle(el, v) { if (document.activeElement !== el) el.value = v; }
function fill() {
  if (!S) return;
  $$('[data-set]').forEach(el => { el.checked = !!S[el.dataset.set]; });
  $$('[data-pref]').forEach(el => { const v = S.prefs[el.dataset.pref]; if (el.type === 'checkbox') el.checked = !!v; else setIfIdle(el, v); });
  $$('[data-range]').forEach(el => { const k = el.dataset.range; el.value = S[k]; $('#' + k + 'Out').textContent = S[k] + (k === 'snapDistance' ? ' px' : ' px'); });
  $$('[data-num]').forEach(el => { el.value = String(S[el.dataset.num]); });
  $('#startup').disabled = !S.packaged; $('#startupNote').hidden = S.packaged;
  $('#trashInfo').textContent = S.trashCount ? `${S.trashCount} deleted note${S.trashCount === 1 ? '' : 's'} in the trash. Permanently deletes them.` : 'The trash is empty.';
  $('#emptyTrash').disabled = !S.trashCount;
  $('#backupInfo').textContent = (S.lastBackup ? 'Last backup: ' + new Date(S.lastBackup).toLocaleString() : 'No backup yet') + ` · ${S.backupCount} kept`;
  $('#dataPath').textContent = S.dataPath; $('#resetData').hidden = !S.dataCustom;
  $('#aboutVer').textContent = 'Version ' + S.version; showUpdate(S.update);
  $('#lowMemory').checked = !!S.lowMemory; $('#lowMemRestart').hidden = !!S.lowMemory === !!S.lowMemoryActive;
  if (S.aiKeep) $('#aiKeep').value = S.aiKeep;
  $('#aboutNotes').textContent = `${S.notesCount} note${S.notesCount === 1 ? '' : 's'}, ${S.groups.length} folder${S.groups.length === 1 ? '' : 's'}`;
  drawThemes(); drawFolders(); drawKeys();
  $$('[data-mode]').forEach(b => { const on = b.dataset.mode === (S.mode || 'system'); b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
}
/* ---------- keyboard shortcuts ---------- */
const KS = window.StickyKeys;
let recording = null;
function drawKeys() {
  if (!S || !S.keys) return;
  for (const [box, ids] of [['#keysGlobal', KS.GLOBAL], ['#keysNote', KS.NOTE]]) {
    const el = $(box); if (el.contains(document.activeElement) && recording) continue;
    el.textContent = '';
    ids.forEach(id => {
      const row = document.createElement('div'); row.className = 'krow';
      const n = document.createElement('span'); n.className = 'kn'; n.textContent = KS.LABELS[id];
      const b = document.createElement('button'); b.className = 'kbtn'; b.type = 'button'; b.dataset.key = id; b.textContent = S.keys[id].replace(/\+/g, ' + ');
      b.title = 'Click, then press the new shortcut'; b.onclick = () => recordKey(id, b);
      const r = document.createElement('button'); r.className = 'krst'; r.type = 'button'; r.textContent = 'Reset'; r.hidden = S.keys[id] === KS.DEFAULTS[id]; r.dataset.reset = id;
      r.onclick = () => setKey(id, KS.DEFAULTS[id]);
      row.append(n, b, r); el.appendChild(row);
    });
  }
  const w = $('#keysWarn'), bad = (S.keysFailed || []).map(id => KS.LABELS[id]);
  w.hidden = !bad.length || !S.shortcuts; w.textContent = bad.length ? 'Windows would not give these shortcuts to StickyPad because another program uses them: ' + bad.join(', ') + '. Pick other keys.' : '';
}
function keyMsg(t) { const m = $('#keysMsg'); m.hidden = !t; m.textContent = t || ''; }
function setKey(id, accel) {
  const map = { ...S.keys, [id]: accel }; keyMsg('');
  return save({ keys: map });
}
function recordKey(id, btn) {
  if (recording) recording.stop();
  btn.textContent = 'Press the keys…'; btn.classList.add('rec'); btn.classList.remove('bad'); keyMsg('');
  const stop = () => { document.removeEventListener('keydown', onKey, true); btn.classList.remove('rec'); recording = null; btn.textContent = S.keys[id].replace(/\+/g, ' + '); };
  const onKey = e => {
    e.preventDefault(); e.stopPropagation();
    if (e.key === 'Escape') { stop(); return; }
    if (e.key === 'Backspace' || e.key === 'Delete') { stop(); setKey(id, KS.DEFAULTS[id]); return; }
    const a = KS.fromEvent(e); if (!a) return;   // only Ctrl/Alt/Shift so far: wait for the real key
    const why = KS.problem(id, a), other = !why && KS.clash(S.keys, id, a);
    if (why || other) { btn.classList.add('bad'); btn.textContent = a.replace(/\+/g, ' + '); keyMsg(why || `${a} is already used for “${KS.LABELS[other]}”.`); return; }
    stop(); setKey(id, a);
  };
  recording = { stop }; document.addEventListener('keydown', onKey, true);
  btn.onblur = () => { if (recording && recording.stop === stop) stop(); };
}
$('#keysReset').onclick = () => { keyMsg(''); save({ keys: {} }); };
function drawThemes() {
  const box = $('#themes'); box.textContent = '';
  TH.THEMES.forEach(t => {
    const b = document.createElement('button'); b.className = 'theme' + (t.id === S.theme ? ' on' : ''); b.type = 'button'; b.setAttribute('aria-pressed', t.id === S.theme);
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', t.id === S.theme); b.title = t.name + ' theme (light and dark)';
    const pv = document.createElement('span'); pv.className = 'tpv';
    for (const mode of ['light', 'dark']) {   // a tiny picture of the app in each version: sidebar, background and four note colours
      const u = t.ui[mode], half = document.createElement('span'); half.className = 'half'; half.style.background = u.bg;
      const nav = document.createElement('i'); nav.className = 'nav'; nav.style.background = u.nav; half.appendChild(nav);
      const g = document.createElement('span'); g.className = 'cols';
      (mode === 'dark' ? t.dark : t.colors).slice(0, 4).forEach(c => { const i = document.createElement('i'); i.style.background = c; g.appendChild(i); });
      half.appendChild(g); pv.appendChild(half);
    }
    const nm = document.createElement('span'); nm.className = 'tname'; nm.textContent = t.name;
    const ac = document.createElement('span'); ac.className = 'acc';
    ['light', 'dark'].forEach(m => { const i = document.createElement('i'); i.style.background = t.ui[m].accent; ac.appendChild(i); });
    nm.appendChild(ac);
    b.append(pv, nm); b.onclick = () => save({ theme: t.id }); box.appendChild(b);
  });
}
function drawFolders() {
  const box = $('#folderList'); box.textContent = '';
  if (!S.groups.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'No folders yet.'; box.appendChild(p); return; }
  S.groups.forEach(g => {
    const r = document.createElement('div'); r.className = 'frow';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = '📁 ' + g.name;
    const ren = document.createElement('button'); ren.textContent = 'Rename';
    ren.onclick = () => {
      const inp = document.createElement('input'); inp.value = g.name; inp.maxLength = 40; nm.replaceWith(inp); inp.focus(); inp.select();
      let done = false; const fin = ok => { if (done) return; done = true; (ok && inp.value.trim() ? api.grpUpdate(g.id, { name: inp.value.trim() }) : Promise.resolve()).then(load); };
      inp.onkeydown = e => { if (e.key === 'Enter') fin(true); if (e.key === 'Escape') fin(false); }; inp.onblur = () => fin(false);
    };
    const del = document.createElement('button'); del.textContent = 'Delete';
    arm(del, 'Delete', 'Sure? Notes are kept', async () => { await api.grpDelete(g.id); load(); });
    r.append(nm, ren, del); box.appendChild(r);
  });
}

/* ---------- saving ---------- */
function save(patch) { saving = saving.then(async () => { S = await api.settingsSet(patch); fill(); }); return saving; }
async function load() { S = await api.settingsGet(); fill(); }

$$('[data-set]').forEach(el => { el.onchange = () => save({ [el.dataset.set]: el.checked }); });
$$('[data-mode]').forEach(b => { b.onclick = () => save({ mode: b.dataset.mode }); });
$$('[data-pref]').forEach(el => { el.onchange = () => save({ prefs: { [el.dataset.pref]: el.type === 'checkbox' ? el.checked : el.value } }); });
$$('[data-num]').forEach(el => { el.onchange = () => save({ [el.dataset.num]: Number(el.value) }); });
$$('[data-range]').forEach(el => {
  el.oninput = () => { $('#' + el.dataset.range + 'Out').textContent = el.value + ' px'; };
  el.onchange = () => save({ [el.dataset.range]: Number(el.value) });
});
$('#applyAll').onclick = async () => { await api.themeApplyAll(S.theme); const m = $('#applyMsg'); flash(m, 'Applied to all your notes ✓'); };
arm($('#emptyTrash'), 'Empty trash', 'Sure? Cannot undo', async () => { const r = await api.settingsAction('emptyTrash'); if (r.info) { S = r.info; fill(); } });
$('#backupNow').onclick = async () => { const b = $('#backupNow'); b.disabled = true; const r = await api.settingsAction('backupNow'); b.disabled = false; if (r.ok) { S = r.info; fill(); b.textContent = 'Done ✓'; setTimeout(() => b.textContent = 'Back up now', 1800); } else $('#backupInfo').textContent = r.error || 'Backup failed.'; };
$('#openBackups').onclick = () => api.settingsAction('openBackups');
$('#openData').onclick = () => api.settingsAction('openData');
$('#exportAll').onclick = async () => {
  const r = await api.settingsAction('exportAll'), m = $('#exportInfo');
  if (r.ok) m.textContent = 'Exported ' + r.count + (r.count === 1 ? ' note' : ' notes') + (r.skipped ? ' (' + r.skipped + ' locked ' + (r.skipped === 1 ? 'note was' : 'notes were') + ' left out)' : '') + '.';
  else if (!r.cancelled) m.textContent = r.error || 'Could not export.';
};
for (const [id, kind] of [['#impKeep', 'keep'], ['#impSticky', 'sticky']]) {
  $(id).onclick = async () => {
    const b = $(id), m = $('#importOtherInfo'), old = b.textContent; b.disabled = true; b.textContent = 'Importing…';
    const r = await api.settingsAction('importOther', kind); b.disabled = false; b.textContent = old;
    if (r && r.ok) m.textContent = `Imported ${r.count} note${r.count === 1 ? '' : 's'}.` + (r.skipped ? ` ${r.skipped} trashed or empty skipped.` : '') + (r.failed ? ` ${r.failed} could not be read.` : '');
    else if (r && r.error) m.textContent = r.error;
  };
}
$('#importNotes').onclick = async () => {
  const r = await api.settingsAction('importNotes'), m = $('#importInfo');
  if (r.ok) m.textContent = 'Imported ' + r.count + (r.count === 1 ? ' note' : ' notes') + (r.failed ? ' (' + r.failed + ' could not be read)' : '') + '.';
  else if (!r.cancelled) m.textContent = r.error || (r.failed ? 'Could not read those files.' : 'Nothing imported.');
};
/* ---------- updates ---------- */
function showUpdate(u) {
  if (!u) return;
  const t = { idle: 'Not checked yet.', checking: 'Checking GitHub…', none: 'You have the latest version ✓', unsupported: u.error || 'Updates work in the installed app.',
    downloading: `Downloading version ${u.version || ''}${u.pct != null ? ' (' + u.pct + '%)' : ''}…`, ready: `Version ${u.version || ''} is ready: restart to install it.`, error: u.error || 'The update check failed.' }[u.state] || '';
  $('#updMsg').textContent = t + (u.state === 'none' && u.checkedAt ? '  ·  ' + new Date(u.checkedAt).toLocaleTimeString() : '');
  $('#updCheck').disabled = u.state === 'checking' || u.state === 'downloading' || u.state === 'ready';
  $('#updInstall').hidden = u.state !== 'ready';
}
$('#updCheck').onclick = async () => showUpdate(await api.updateCheck());
$('#updInstall').onclick = () => api.updateInstall();
$('#memBtn').onclick = async () => {
  const b = $('#memBtn'), m = $('#memInfo'); b.disabled = true;
  const r = await api.settingsAction('memory'); b.disabled = false;
  if (r && r.ok) m.textContent = `StickyPad uses ${r.total} MB in ${r.processes} processes: notes and windows ${r.notes} MB, main ${r.main} MB, graphics ${r.gpu} MB, other ${r.other} MB (${r.windows} window${r.windows === 1 ? '' : 's'} open).`;
};
$('#aiKeep').onchange = () => save({ aiKeep: $('#aiKeep').value });
$('#lowMemRestart').onclick = () => api.settingsAction('restartApp');
$('#whatsBtn').onclick = () => api.settingsAction('openWhatsNew');
$('#updLog').onclick = () => api.settingsAction('openUpdateLog');
$('#updPage').onclick = () => api.settingsAction('openReleases');
api.onUpdateEvent(showUpdate);
async function dataMove(name) { const r = await api.settingsAction(name); if (!r.ok && !r.cancelled) $('#dataMsg').textContent = r.error || 'Could not change the folder.'; }
$('#chooseData').onclick = () => dataMove('chooseDataFolder');
$('#resetData').onclick = () => dataMove('resetDataFolder');
arm($('#clearChat'), 'Clear chat', 'Sure? Cannot undo', async () => { await api.settingsAction('clearChat'); flash($('#chatMsg'), 'Chat history cleared ✓'); });
$('#chatMsg').dataset.default = 'Deletes the saved conversation.';
async function addFolder() { const v = $('#newFolder').value.trim(); if (!v) { $('#newFolder').focus(); return; } await api.grpNew(v); $('#newFolder').value = ''; load(); }
$('#addFolder').onclick = addFolder;
$('#newFolder').addEventListener('keydown', e => { if (e.key === 'Enter') addFolder(); });

/* ---------- AI ---------- */
let ai = null;
function aiFields() {
  const p = $('#aiProv').value, s = ai || {}, off = p === 'off';
  $('#aiModel').disabled = $('#aiCred').disabled = off; $('#aiSave').disabled = $('#aiTest').disabled = off && false;
  $('#aiModel').value = s.provider === p ? (s.model || '') : '';   // a model name only makes sense for the provider it was saved with
  if (p === 'claude') {
    $('#aiCredLbl').textContent = 'API key'; $('#aiCredHint').textContent = 'From console.anthropic.com. Stored encrypted for your Windows user.';
    $('#aiCred').type = 'password'; $('#aiCred').value = ''; $('#aiCred').placeholder = s.hasKey ? '•••••••• (saved)' : 'sk-ant-…';
    $('#aiModel').placeholder = (s.defaultModel || 'claude-haiku-5-5') + ' (default)'; $('#aiModelHint').textContent = 'Leave empty to use the default model.';
  } else {
    $('#aiCredLbl').textContent = 'Address'; $('#aiCredHint').textContent = 'Where Ollama is running.'; $('#aiCred').type = 'text';
    $('#aiCred').value = p === 'ollama' ? (s.url || 'http://localhost:11434') : ''; $('#aiCred').placeholder = 'http://localhost:11434';
    $('#aiModel').placeholder = p === 'ollama' ? 'e.g. llama3.2' : ''; $('#aiModelHint').textContent = 'Pick an installed model, or choose one to download it.';
  }
  $('#aiClear').hidden = !(p === 'claude' && s.hasKey);
  $('#aiOlRow').hidden = p !== 'ollama';
  OllamaUI.refresh();
}
OllamaUI.init({ onSaved: m => { $('#aiMsg').textContent = m; } });
async function aiLoad() { ai = (await api.aiGet()) || { provider: 'off' }; $('#aiProv').value = ai.provider; aiFields(); }
$('#aiProv').onchange = aiFields;
async function aiSave() {
  const p = $('#aiProv').value, patch = { provider: p, model: $('#aiModel').value };
  if (p === 'ollama') patch.url = $('#aiCred').value;
  if (p === 'claude' && $('#aiCred').value.trim()) patch.key = $('#aiCred').value;
  await api.aiSet(patch); await aiLoad();
}
$('#aiSave').onclick = async () => { await aiSave(); $('#aiMsg').textContent = 'Saved ✓'; };
$('#aiTest').onclick = async () => { await aiSave(); $('#aiMsg').textContent = 'Testing…'; const r = await api.aiRun('ping'); $('#aiMsg').textContent = r.ok ? 'Connected ✓' : r.error; };
$('#aiClear').onclick = async () => { await api.aiSet({ clearKey: true }); await aiLoad(); $('#aiMsg').textContent = 'Key removed.'; };

/* ---------- navigation and search ---------- */
function showCat(id) {
  $$('.cat').forEach(c => { c.hidden = c.id !== 'cat-' + id; });
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.cat === id));
  $('#noResults').hidden = true; $('#content').scrollTop = 0;
}
$$('#nav button').forEach(b => { b.onclick = () => { $('#sq').value = ''; filter(''); showCat(b.dataset.cat); }; });
function filter(q) {
  q = q.trim().toLowerCase();
  if (!q) { $$('.row,.frow').forEach(r => { r.hidden = false; }); const on = ($('#nav button.on') || {}).dataset; showCat(on ? on.cat : 'general'); return; }
  let any = false;
  $$('.cat').forEach(c => {
    let hit = 0;
    c.querySelectorAll('.row').forEach(r => { const m = r.textContent.toLowerCase().includes(q) || c.dataset.title.toLowerCase().includes(q); r.hidden = !m; if (m) hit++; });
    c.hidden = !hit; if (hit) any = true;
  });
  $$('#nav button').forEach(b => b.classList.remove('on'));
  $('#noResults').hidden = any;
}
$('#sq').addEventListener('input', e => filter(e.target.value));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#sq').value) { $('#sq').value = ''; filter(''); } if ((e.ctrlKey && e.key.toLowerCase() === 'f')) { e.preventDefault(); $('#sq').focus(); } });
api.onSettingsSection(id => { if (document.getElementById('cat-' + id)) { $('#sq').value = ''; filter(''); showCat(id); } });
window.addEventListener('focus', () => { load(); aiLoad(); });

(async () => {
  await load(); await aiLoad();
  const q = new URLSearchParams(location.search).get('section');
  showCat(q && document.getElementById('cat-' + q) ? q : 'general');
})();
