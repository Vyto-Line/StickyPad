const $ = s => document.querySelector(s);
const isDark = hex => (window.StickyThemes ? window.StickyThemes.wantsLightText(hex) : (() => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255 < 0.5; })());
let selecting = false, sel = [], printMsg = '', lastPick = '';
const shownIds = () => [...document.querySelectorAll('#sections .card[data-id]')].map(c => c.dataset.id);   // the notes on screen, in order   // "Select": sel is the notes in the order they were chosen (print uses that order)
let data = { groups: [], notes: [], trash: [], greeting: 'Hello', emoji: '', prefs: {} };
let view = new URLSearchParams(location.search).get('tab') === 'trash' ? 'trash' : 'notes';
let folder = '*';   // which folder chip is chosen: '*' all, a folder id, or '-' for notes without a folder
try { folder = localStorage.getItem('sp.folder') || '*'; } catch (e) {}

// Two-step buttons instead of confirm(): a native confirm box can leave text fields in Electron unable to receive typing.
function arm(btn, label, sure, action) {
  let timer = null;
  btn.onclick = () => {
    if (timer) { clearTimeout(timer); timer = null; btn.textContent = label; action(); return; }
    btn.textContent = sure;
    timer = setTimeout(() => { timer = null; btn.textContent = label; }, 3000);
  };
}

/* ---------- note cards ---------- */
// A checklist line reaches us as "☐ text" or "☑ text": it is drawn as the same round tick the note itself uses (text nodes only, never HTML).
function ticked(el, text) {
  String(text).split(/([☐☑])\s?/).forEach(x => {
    if (x === '☐' || x === '☑') {
      const c = document.createElement('span'); c.className = x === '☑' ? 'cb done' : 'cb'; c.setAttribute('role', 'img'); c.setAttribute('aria-label', x === '☑' ? 'done' : 'to do'); el.appendChild(c);
    } else if (x) el.appendChild(document.createTextNode(x));
  });
}
function card(n) {
  const lines = n.text.split('\n').map(l => l.trim()).filter(Boolean);
  const b = document.createElement('button'); b.className = 'card' + (n.open ? '' : ' closed'); b.draggable = true; b.dataset.id = n.id;
  b.style.background = n.color; b.style.color = isDark(n.color) ? '#f2f2f2' : '#1b1b1b';
  b.style.fontFamily = '"' + String(n.font).replace(/["\\]/g, '') + '", "Segoe UI", sans-serif';
  const t = document.createElement('span'); t.className = 't';
  if (n.title) t.textContent = n.title; else if (lines[0]) ticked(t, lines[0]); else t.textContent = n.locked ? 'Locked note' : n.images ? '📷 Picture note' : '(empty note)';
  const s = document.createElement('span'); s.className = 's';
  ticked(s, n.locked ? '' : (n.title ? lines : lines.slice(1)).join('\n'));
  const badges = document.createElement('span'); badges.className = 'b';
  [n.locked ? '🔒 locked' : '', n.pinned ? '📌 pinned' : '', n.images ? '📷 ' + n.images : '', n.rolled ? 'rolled up' : '', n.open ? '' : 'closed'].filter(Boolean)
    .forEach(x => { const c = document.createElement('span'); c.className = 'chip'; c.textContent = x; badges.appendChild(c); });
  b.append(t, s, badges);
  b.onclick = ev => {
    if (!selecting) { api.allShow(n.id); return; }
    if (ev && ev.shiftKey && lastPick && lastPick !== n.id) {   // Shift+click: everything between the last note clicked and this one
      const ids = shownIds(), x = ids.indexOf(lastPick), y = ids.indexOf(n.id);
      if (x >= 0 && y >= 0) { ids.slice(Math.min(x, y), Math.max(x, y) + 1).forEach(id => { if (!sel.includes(id)) sel.push(id); }); draw(); return; }
    }
    const k = sel.indexOf(n.id); if (k >= 0) sel.splice(k, 1); else sel.push(n.id);
    lastPick = n.id; draw();
  };
  if (selecting) {
    b.draggable = false; b.setAttribute('aria-pressed', sel.includes(n.id));
    if (sel.includes(n.id)) { b.classList.add('picked'); const nb = document.createElement('span'); nb.className = 'pick'; nb.textContent = sel.indexOf(n.id) + 1; nb.setAttribute('aria-label', 'Number ' + (sel.indexOf(n.id) + 1) + ' to print'); b.appendChild(nb); }
  }
  b.oncontextmenu = e => { e.preventDefault(); api.allContext(n.id); };
  b.ondragstart = e => { e.dataTransfer.setData('text/plain', n.id); e.dataTransfer.effectAllowed = 'move'; b.classList.add('dragging'); dragKind = 'note'; };
  b.ondragend = () => { b.classList.remove('dragging'); dragKind = null; };
  return b;
}

function section(g, items, label) {
  const sec = document.createElement('section'); sec.className = 'sec' + (g && g.collapsed ? ' collapsed' : '');
  const h = document.createElement('div'); h.className = 'sh';
  const name = document.createElement('span'); name.className = 'nm'; name.textContent = (g ? '📁 ' : '') + (g ? g.name : label);
  const cnt = document.createElement('span'); cnt.className = 'n'; cnt.textContent = items.length;
  if (g) {
    const tg = document.createElement('button'); tg.textContent = g.collapsed ? '▸' : '▾'; tg.title = g.collapsed ? 'Expand' : 'Collapse';
    tg.setAttribute('aria-label', tg.title); tg.onclick = () => api.grpUpdate(g.id, { collapsed: !g.collapsed }).then(refresh);
    h.append(tg, name, cnt);
    const mk = (txt, title, fn) => { const x = document.createElement('button'); x.textContent = txt; x.title = title; x.setAttribute('aria-label', title); x.onclick = fn; h.appendChild(x); };
    mk('Open all', 'Open every note in this folder', () => api.allOpenGroup(g.id));
    mk('✎', 'Rename folder', () => {
      const inp = document.createElement('input'); inp.className = 'ren'; inp.type = 'text'; inp.value = g.name; inp.maxLength = 40;
      name.replaceWith(inp); inp.focus(); inp.select();
      let done = false; const fin = ok => { if (done) return; done = true; (ok && inp.value.trim() ? api.grpUpdate(g.id, { name: inp.value.trim() }) : Promise.resolve()).then(refresh); };
      inp.onkeydown = e => { if (e.key === 'Enter') fin(true); if (e.key === 'Escape') fin(false); };
      inp.onblur = () => fin(false);
    });
    const del = document.createElement('button'); del.textContent = '✕'; del.title = 'Delete folder (its notes are kept)'; del.setAttribute('aria-label', del.title);
    let armed = null;
    del.onclick = async () => {
      if (!armed) { del.textContent = 'Delete?'; del.classList.add('armed'); armed = setTimeout(() => { armed = null; del.textContent = '✕'; del.classList.remove('armed'); }, 2500); return; }
      clearTimeout(armed); await api.grpDelete(g.id); refresh();
    };
    h.appendChild(del);
  } else { h.append(name, cnt); }
  const grid = document.createElement('div'); grid.className = 'grid'; grid.setAttribute('role', 'list');
  items.forEach(n => { const c = card(n); c.setAttribute('role', 'listitem'); grid.appendChild(c); });
  sec.append(h, grid);
  // drop a note onto a folder to move it there
  sec.ondragover = e => { e.preventDefault(); sec.classList.add('over'); };
  sec.ondragleave = e => { if (!sec.contains(e.relatedTarget)) sec.classList.remove('over'); };
  sec.ondrop = async e => { e.preventDefault(); sec.classList.remove('over'); const id = e.dataTransfer.getData('text/plain'); if (id) { await api.grpMove(id, g ? g.id : null); refresh(); } };
  return sec;
}

/* ---------- trash ---------- */
function drawTrash() {
  const box = $('#trashList'); box.innerHTML = '';
  data.trash.forEach(t => {
    const d = document.createElement('div'); d.className = 'item'; d.draggable = true;
    d.ondragstart = e => { e.dataTransfer.setData('text/plain', 'trash:' + t.id); e.dataTransfer.effectAllowed = 'move'; d.classList.add('dragging'); dragKind = 'trash'; };
    d.ondragend = () => { d.classList.remove('dragging'); dragKind = null; };
    d.style.background = t.color; d.style.color = isDark(t.color) ? '#f2f2f2' : '#1b1b1b';
    const p = document.createElement('p'); p.className = 'snip';
    p.style.fontFamily = '"' + String(t.font).replace(/["\\]/g, '') + '", "Segoe UI", sans-serif';
    const body = t.locked ? '🔒 Locked note' : (t.text.trim() || (t.images ? '📷 ' + t.images + (t.images > 1 ? ' pictures' : ' picture') : ''));
    if (t.title) { const s = document.createElement('strong'); s.textContent = t.title; p.appendChild(s); if (body) p.appendChild(document.createTextNode('\n')); }
    p.appendChild(document.createTextNode(body || (t.title ? '' : '(empty note)')));
    const m = document.createElement('p'); m.className = 'meta';
    m.textContent = 'Deleted ' + new Date(t.deletedAt).toLocaleString() + (t.images && t.text.trim() ? '  ·  📷 ' + t.images : '');
    const a = document.createElement('div'); a.className = 'acts';
    const r = document.createElement('button'); r.textContent = 'Restore'; r.onclick = () => api.trashRestore(t.id);
    const x = document.createElement('button'); x.textContent = 'Delete forever';
    arm(x, 'Delete forever', 'Sure? Cannot undo', () => api.trashPurge(t.id));
    a.append(r, x); d.append(p, m, a); box.appendChild(d);
  });
}

/* ---------- drawing ---------- */
function setView(v) { view = v === 'trash' ? 'trash' : 'notes'; draw(); }
function draw() {
  const inTrash = view === 'trash';
  $('#greet').textContent = ((data.emoji || '') + ' ' + (data.greeting || 'Hello')).trim();
  $('#tabNotes').classList.toggle('on', !inTrash); $('#tabTrash').classList.toggle('on', inTrash);
  $('#tabNotes').setAttribute('aria-selected', !inTrash); $('#tabTrash').setAttribute('aria-selected', inTrash);
  $('#trashN').textContent = data.trash.length || '';
  if (inTrash && selecting) { selecting = false; sel = []; }
  $('#notesBar').hidden = inTrash; $('#trashBar').hidden = !inTrash;
  $('#printBar').hidden = !selecting; $('#selectBtn').hidden = selecting;
  sel = sel.filter(id => data.notes.some(x => x.id === id));   // a note that was deleted meanwhile drops out
  $('#printGo').disabled = !sel.length; $('#selTrash').disabled = !sel.length; $('#selFolder').disabled = !sel.length;
  if (selecting) fillFolders();
  if (!printMsg) $('#selInfo').textContent = sel.length ? sel.length + (sel.length === 1 ? ' note' : ' notes') + ' chosen. Print uses the order of the numbers.' : 'Click notes to choose them (Shift+click for a range, Ctrl+A for all).';
  $('#sections').hidden = inTrash; $('#trashList').hidden = !inTrash;

  const total = data.notes.length;
  if (inTrash) {
    $('#count').textContent = data.trash.length ? data.trash.length + (data.trash.length === 1 ? ' deleted note' : ' deleted notes') : 'Nothing deleted';
    $('#emptyBtn').disabled = !data.trash.length;
    drawTrash();
    $('#empty').hidden = data.trash.length > 0; $('#empty').textContent = 'The trash is empty.';
    return;
  }
  const raw = $('#q').value.trim(), q = raw.toLowerCase();
  // The list only carries the first letters of each note, so the real search runs in the app (whole text, ignores capitals and accents);
  // until its answer arrives, the cards are filtered by what they show.
  const match = n => !q || (hits && hitsFor === raw ? hits.has(n.id) : (n.title + ' ' + n.text).toLowerCase().includes(q));
  const shown = data.notes.filter(match).length;
  $('#count').textContent = total ? (q ? shown + ' of ' + total + ' notes' : total + (total === 1 ? ' note' : ' notes')) + ' · right-click for more' : 'No notes yet';
  if (folder !== '*' && folder !== '-' && !data.groups.some(g => g.id === folder)) folder = '*';   // that folder was deleted
  drawChips(match);
  const box = $('#sections'); box.innerHTML = '';
  data.groups.forEach(g => { if (folder !== '*' && folder !== g.id) return; const items = data.notes.filter(n => n.group === g.id && match(n)); if (!q || items.length) box.appendChild(section(g, items)); });
  const loose = data.notes.filter(n => !n.group && match(n));
  if ((folder === '*' || folder === '-') && (loose.length || (!q && data.groups.length))) box.appendChild(section(null, loose, data.groups.length ? 'No folder' : 'Notes'));
  $('#empty').hidden = total > 0 || data.groups.length > 0; $('#empty').textContent = 'No notes yet. Press “＋ Note”.';
}
// Folder chips: click one to see only that folder; drop a card on a chip to move the note there.
function drawChips(match) {
  const box = $('#chips'); box.textContent = '';
  if (!data.groups.length) { box.hidden = true; return; }
  box.hidden = false;
  const chip = (id, label, n) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'fchip' + (folder === id ? ' on' : ''); b.setAttribute('aria-pressed', folder === id);
    b.textContent = label; const c = document.createElement('em'); c.textContent = n; b.appendChild(c);
    b.onclick = () => { folder = id; try { localStorage.setItem('sp.folder', id); } catch (e) {} draw(); };
    if (id !== '*') {
      b.ondragover = e => { e.preventDefault(); b.classList.add('over'); };
      b.ondragleave = () => b.classList.remove('over');
      b.ondrop = async e => { e.preventDefault(); b.classList.remove('over'); const nid = e.dataTransfer.getData('text/plain'); if (nid) { await api.grpMove(nid, id === '-' ? null : id); refresh(); } };
    }
    box.appendChild(b);
  };
  chip('*', 'All', data.notes.filter(match).length);
  data.groups.forEach(g => chip(g.id, g.name, data.notes.filter(n => n.group === g.id && match(n)).length));
  const loose = data.notes.filter(n => !n.group && match(n)).length; if (loose) chip('-', 'No folder', loose);
}
let hits = null, hitsFor = '', hitsSeq = 0, hitsTimer = null;
function runSearch(now) {
  clearTimeout(hitsTimer);
  const raw = $('#q').value.trim();
  if (!raw || !api.searchIds) { hits = null; hitsFor = ''; return Promise.resolve(); }
  const go = async () => { const mine = ++hitsSeq, ids = await api.searchIds(raw); if (mine !== hitsSeq) return; hits = new Set(ids); hitsFor = raw; draw(); };
  if (now) return go();
  hitsTimer = setTimeout(go, 80); return Promise.resolve();
}
async function refresh() { data = await api.allList(); await runSearch(true); draw(); }

/* ---------- wiring ---------- */
// Drag a note onto the Trash tab to delete it; drag a deleted note onto the Notes tab to bring it back.
let dragKind = null;   // 'note' or 'trash' while something is being dragged (the browser hides what is dragged until the drop)
function dropTab(sel, kind, take) {   // sel: the tab and the matching sidebar item of the Home window (which is added after this script)
  const hit = e => e.target.closest && e.target.closest(sel);
  document.addEventListener('dragover', e => { const b = hit(e); if (b && dragKind === kind) { e.preventDefault(); b.classList.add('over'); } });
  document.addEventListener('dragleave', e => { const b = hit(e); if (b) b.classList.remove('over'); });
  document.addEventListener('drop', async e => {
    const b = hit(e); if (!b) return; b.classList.remove('over');
    if (dragKind !== kind) return;
    e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || ''; dragKind = null; if (id) await take(id.replace(/^trash:/, ''));
  });
}
dropTab('#tabTrash, .hitem[data-go="trash"]', 'note', id => api.allTrash(id).then(refresh));
dropTab('#tabNotes, .hitem[data-go="notes"]', 'trash', id => api.trashRestore(id).then(refresh));
$('#tabNotes').onclick = () => setView('notes');
$('#tabTrash').onclick = () => setView('trash');
arm($('#emptyBtn'), 'Empty trash', 'Sure? Cannot undo', () => api.trashEmpty());
$('#q').addEventListener('input', () => { draw(); runSearch(); });
$('#new').onclick = () => api.allNew();
$('#tidy').onclick = () => api.tidy();
function selectMode(on) { selecting = on; sel = []; printMsg = ''; lastPick = ''; draw(); }
$('#selectBtn').onclick = () => selectMode(true);
$('#selDone').onclick = () => selectMode(false);
$('#selAll').onclick = () => selectAll();
function selectAll() { shownIds().forEach(id => { if (!sel.includes(id)) sel.push(id); }); draw(); }
function fillFolders() {   // "Move to folder": the list of folders, rebuilt only when it changes
  const f = $('#selFolder'), key = data.groups.map(g => g.id + g.name).join('|');
  if (f.dataset.key === key && f.options.length) return; f.dataset.key = key; f.textContent = '';
  const add = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; f.appendChild(o); };
  add('', 'Move to folder…'); add('-', 'No folder'); data.groups.forEach(g => add(g.id, '📁 ' + g.name));
}
$('#selFolder').onchange = async () => {
  const v = $('#selFolder').value; if (v === '' || !sel.length) return;
  const ids = sel.slice(); await Promise.all(ids.map(id => api.grpMove(id, v === '-' ? null : v)));
  const to = v === '-' ? 'no folder' : (data.groups.find(g => g.id === v) || {}).name || 'the folder';
  selectMode(false); await refresh(); $('#count').textContent = ids.length + (ids.length === 1 ? ' note' : ' notes') + ' moved to ' + to;
};
arm($('#selTrash'), 'Move to trash', 'Sure? They go to the trash', async () => {
  if (!sel.length) return; const ids = sel.slice();
  await Promise.all(ids.map(id => api.allTrash(id))); selectMode(false); await refresh();
});
$('#printGo').onclick = async () => {
  if (!sel.length) return;
  const r = await api.allPrint(sel.slice());
  if (r && r.ok) { selectMode(false); return; }
  if (r && r.cancelled) return;
  printMsg = (r && r.error) || 'Printing did not start.'; $('#selInfo').textContent = printMsg; setTimeout(() => { printMsg = ''; draw(); }, 5000);
};
function folderRow(show) { $('#folderRow').hidden = !show; if (show) { $('#fname').value = ''; $('#fname').focus(); } }
async function addFolder() { const v = $('#fname').value.trim(); if (!v) { $('#fname').focus(); return; } await api.grpNew(v); folderRow(false); refresh(); }
$('#showFolder').onclick = () => folderRow($('#folderRow').hidden);
$('#cancelFolder').onclick = () => folderRow(false);
$('#newFolder').onclick = addFolder;
$('#fname').addEventListener('keydown', e => { if (e.key === 'Enter') addFolder(); if (e.key === 'Escape') folderRow(false); });
$('#chatBtn').onclick = () => api.openChat();
$('#gear').onclick = () => api.openSettings();
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); api.allNew(); }
  if (e.key === 'Escape' && selecting && !e.target.closest('input')) selectMode(false);
  if (selecting && e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'a' && !e.target.closest('input, textarea, select')) { e.preventDefault(); selectAll(); }
});
api.onAllChanged(refresh);
api.onAllTab(setView);
refresh();
