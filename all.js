const $ = s => document.querySelector(s);
const isDark = hex => (window.StickyThemes ? window.StickyThemes.wantsLightText(hex) : (() => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255 < 0.5; })());
let selecting = false, sel = [], tsel = [], printMsg = '', lastPick = '', uit = null;   // tsel: the chosen deleted notes (Trash tab); uit: the app theme and note palette
const shownIds = () => [...document.querySelectorAll('#sections .card[data-id]')].map(c => c.dataset.id);   // the notes on screen, in order   // "Select": sel is the notes in the order they were chosen (print uses that order)
let data = { groups: [], notes: [], trash: [], greeting: 'Hello', emoji: '', prefs: {} };
let view = new URLSearchParams(location.search).get('tab') === 'trash' ? 'trash' : 'notes';
let folder = '*';   // which folder chip is chosen: '*' all, a folder id, or '-' for notes without a folder
try { folder = localStorage.getItem('sp.folder') || '*'; } catch (e) {}
/* ---------- Sort by ---------- */
const SORTS = [['edited', 'Last edited'], ['az', 'A to Z'], ['za', 'Z to A'], ['colour', 'Colour'], ['open', 'Open first']];
let sortBy = 'edited';
try { const v = localStorage.getItem('sp.sort'); if (SORTS.some(x => x[0] === v)) sortBy = v; } catch (e) {}
const titleKey = n => String(n.title || (n.text || '').split('\n').map(x => x.trim()).find(Boolean) || '').toLowerCase();
// The order of the cards: pinned notes always first, then the chosen order (ties: the most recently edited first).
function sortNotes(list) {
  const slot = n => { const k = window.StickyThemes ? window.StickyThemes.slotOf(n.color) : -1; return k < 0 ? 99 : k; };
  const cmp = {
    edited: () => 0,
    az: (a, b) => titleKey(a).localeCompare(titleKey(b), undefined, { numeric: true, sensitivity: 'base' }),
    za: (a, b) => titleKey(b).localeCompare(titleKey(a), undefined, { numeric: true, sensitivity: 'base' }),
    colour: (a, b) => slot(a) - slot(b),
    open: (a, b) => (b.open ? 1 : 0) - (a.open ? 1 : 0)
  }[sortBy];
  return list.slice().sort((a, b) => ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) || cmp(a, b) || ((b.updated || 0) - (a.updated || 0)));
}
function sortMenu(open) {
  const m = $('#sortMenu'); m.hidden = !open; $('#sortBtn').setAttribute('aria-expanded', open);
  if (!open) return;
  m.textContent = '';
  SORTS.forEach(([k, label]) => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitemradio'); b.setAttribute('aria-checked', k === sortBy);
    const t = document.createElement('span'); t.className = 'tk'; t.textContent = k === sortBy ? '✓' : ''; b.append(t, label);
    b.onclick = () => { sortBy = k; try { localStorage.setItem('sp.sort', k); } catch (e) {} sortMenu(false); draw(); $('#sortBtn').focus(); };
    m.appendChild(b);
  });
  const h = document.createElement('p'); h.className = 'hint'; h.textContent = 'Pinned notes always stay first.'; m.appendChild(h);
  m.querySelector('button[aria-checked=true]').focus();
}

// Two-step buttons instead of confirm(): a native confirm box can leave text fields in Electron unable to receive typing.
function arm(btn, label, sure, action) {
  let timer = null;
  btn.onclick = () => {
    if (timer) { clearTimeout(timer); timer = null; btn.textContent = label; action(); return; }
    btn.textContent = sure;
    timer = setTimeout(() => { timer = null; btn.textContent = label; }, 3000);
  };
}

/* ---------- dragging one or several notes ---------- */
// What was dropped: one note id, "trash:<id>", or "ids:[...]" / "tids:[...]" when several chosen notes are dragged together.
function dropIds(dt) {
  const t = dt.getData('text/plain') || '';
  if (t.startsWith('ids:') || t.startsWith('tids:')) { try { const a = JSON.parse(t.slice(t.indexOf(':') + 1)); return Array.isArray(a) ? a.filter(x => typeof x === 'string').slice(0, 2000) : []; } catch (e) { return []; } }
  return t ? [t.replace(/^trash:/, '')] : [];
}
function dragBadge(e, text) {   // a small label ("3 notes") follows the pointer instead of one card
  const d = document.createElement('div'); d.textContent = text;
  d.style.cssText = 'position:fixed;left:-300px;top:-300px;padding:7px 13px;border-radius:12px;background:#20232b;color:#fff;font:600 13px Segoe UI,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.4)';
  document.body.appendChild(d); try { e.dataTransfer.setDragImage(d, 12, 12); } catch (x) {} setTimeout(() => d.remove(), 0);
}
async function moveIds(ids, gid) {
  if (!ids.length) return;
  await Promise.all(ids.map(id => api.grpMove(id, gid)));
  if (ids.length > 1) { selectMode(false); await refresh(); const to = gid ? (data.groups.find(g => g.id === gid) || {}).name || 'the folder' : 'no folder'; $('#count').textContent = ids.length + ' notes moved to ' + to; } else refresh();
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
    b.setAttribute('aria-pressed', sel.includes(n.id));
    if (sel.includes(n.id)) { b.classList.add('picked'); const nb = document.createElement('span'); nb.className = 'pick'; nb.textContent = sel.indexOf(n.id) + 1; nb.setAttribute('aria-label', 'Number ' + (sel.indexOf(n.id) + 1) + ' to print'); b.appendChild(nb); }
  }
  b.oncontextmenu = e => { e.preventDefault(); api.allContext(n.id); };
  b.ondragstart = e => { const many = selecting && sel.includes(n.id) && sel.length > 1; e.dataTransfer.setData('text/plain', many ? 'ids:' + JSON.stringify(sel) : n.id); e.dataTransfer.effectAllowed = 'move'; b.classList.add('dragging'); dragKind = 'note'; if (many) dragBadge(e, sel.length + ' notes'); };
  b.ondragend = () => { b.classList.remove('dragging'); dragKind = null; };
  return b;
}

function section(g, items, label) {
  const sec = document.createElement('section'); sec.className = 'sec' + (g && g.collapsed ? ' collapsed' : '');
  const h = document.createElement('div'); h.className = 'sh';
  const name = document.createElement('span'); name.className = 'nm'; name.textContent = (g ? '📁 ' : '') + (g ? g.name : label); if (g) name.setAttribute('data-notr', '');
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
  sec.ondrop = async e => { e.preventDefault(); sec.classList.remove('over'); await moveIds(dropIds(e.dataTransfer), g ? g.id : null); };
  return sec;
}

/* ---------- trash ---------- */
function drawTrash() {
  const box = $('#trashList'); box.innerHTML = '';
  data.trash.forEach(t => {
    const d = document.createElement('div'); d.className = 'item'; d.draggable = true;
    d.ondragstart = e => { const many = selecting && tsel.includes(t.id) && tsel.length > 1; e.dataTransfer.setData('text/plain', many ? 'tids:' + JSON.stringify(tsel) : 'trash:' + t.id); if (many) dragBadge(e, tsel.length + ' notes'); e.dataTransfer.effectAllowed = 'move'; d.classList.add('dragging'); dragKind = 'trash'; };
    d.ondragend = () => { d.classList.remove('dragging'); dragKind = null; };
    d.style.background = t.color; d.style.color = isDark(t.color) ? '#f2f2f2' : '#1b1b1b'; d.dataset.id = t.id;
    if (selecting) {
      const on = tsel.includes(t.id); d.classList.toggle('picked', on); d.setAttribute('role', 'checkbox'); d.setAttribute('aria-checked', on); d.tabIndex = 0;
      const pick = () => { const k = tsel.indexOf(t.id); if (k >= 0) tsel.splice(k, 1); else tsel.push(t.id); draw(); };
      d.onclick = pick; d.onkeydown = ev => { if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); pick(); } };
    }
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
    if (selecting) a.hidden = true;   // the buttons of each note step aside while choosing
    a.append(r, x); d.append(p, m, a); box.appendChild(d);
  });
}

/* ---------- drawing ---------- */
function setView(v) { const nv = v === 'trash' ? 'trash' : 'notes'; if (nv !== view) { selecting = false; sel = []; tsel = []; closePop(); } view = nv; draw(); }
function draw() {
  const inTrash = view === 'trash';
  $('#greet').textContent = ((data.emoji || '') + ' ' + (data.greeting || 'Hello')).trim();
  $('#tabNotes').classList.toggle('on', !inTrash); $('#tabTrash').classList.toggle('on', inTrash);
  $('#tabNotes').setAttribute('aria-selected', !inTrash); $('#tabTrash').setAttribute('aria-selected', inTrash);
  $('#trashN').textContent = data.trash.length || '';
  $('#notesBar').hidden = inTrash; $('#trashBar').hidden = !inTrash;
  $('#printBar').hidden = !selecting; $('#selectBtn').hidden = selecting; $('#trashSelect').hidden = selecting; $('#emptyBtn').hidden = selecting;
  sel = sel.filter(id => data.notes.some(x => x.id === id));   // a note that was deleted meanwhile drops out
  tsel = tsel.filter(id => data.trash.some(x => x.id === id));
  const cur = inTrash ? tsel : sel;
  $('#selBar').hidden = !(selecting && !inTrash); $('#tselBar').hidden = !(selecting && inTrash); document.body.classList.toggle('selbar', selecting); document.body.classList.toggle('selecting', selecting);
  ['#printGo', '#selExport', '#selColour', '#selFolder', '#selMore', '#selTrash'].forEach(i => { $(i).disabled = !sel.length; });
  ['#tselRestore', '#tselPurge'].forEach(i => { $(i).disabled = !tsel.length; });
  $('#selN').textContent = sel.length + ' chosen'; $('#tselN').textContent = tsel.length + ' chosen';
  if (!selecting) closePop();
  if (!printMsg) $('#selInfo').textContent = cur.length ? cur.length + (cur.length === 1 ? ' note' : ' notes') + ' chosen.' + (inTrash ? '' : ' Print uses the order of the numbers.') : (inTrash ? 'Click deleted notes to choose them.' : 'Click notes to choose them (Shift+click for a range, Ctrl+A for all).');
  $('#sections').hidden = inTrash; $('#trashList').hidden = !inTrash;

  const total = data.notes.length;
  if (inTrash) {
    $('#count').textContent = data.trash.length ? data.trash.length + (data.trash.length === 1 ? ' deleted note' : ' deleted notes') : 'Nothing deleted';
    $('#emptyBtn').disabled = !data.trash.length;
    drawTrash();
    $('#empty').hidden = data.trash.length > 0; $('#empty').textContent = 'The trash is empty.';
    return;
  }
  $('#sortLbl').textContent = (SORTS.find(x => x[0] === sortBy) || SORTS[0])[1];
  const raw = $('#q').value.trim(), q = raw.toLowerCase();
  // The list only carries the first letters of each note, so the real search runs in the app (whole text, ignores capitals and accents);
  // until its answer arrives, the cards are filtered by what they show.
  const match = n => !q || (hits && hitsFor === raw ? hits.has(n.id) : (n.title + ' ' + n.text).toLowerCase().includes(q));
  const shown = data.notes.filter(match).length;
  $('#count').textContent = total ? (q ? shown + ' of ' + total + ' notes' : total + (total === 1 ? ' note' : ' notes')) : 'No notes yet';
  if (folder !== '*' && folder !== '-' && !data.groups.some(g => g.id === folder)) folder = '*';   // that folder was deleted
  drawChips(match);
  drawPins(q);
  const box = $('#sections'); box.innerHTML = '';
  data.groups.forEach(g => { if (folder !== '*' && folder !== g.id) return; const items = sortNotes(data.notes.filter(n => n.group === g.id && match(n))); if (!q || items.length) box.appendChild(section(g, items)); });
  const loose = sortNotes(data.notes.filter(n => !n.group && match(n)));
  if ((folder === '*' || folder === '-') && (loose.length || (!q && data.groups.length))) box.appendChild(section(null, loose, data.groups.length ? 'No folder' : 'Notes'));
  $('#empty').hidden = total > 0 || data.groups.length > 0; $('#empty').textContent = 'No notes yet. Press “＋ Note”.';
}
// The pinned notes in one row at the top: one click opens a note. Not shown while searching or choosing notes.
function drawPins(q) {
  const box = $('#pinStrip'), list = sortNotes(data.notes.filter(n => n.pinned));
  box.hidden = !list.length || !!q || selecting; if (box.hidden) return;
  box.textContent = ''; const l = document.createElement('span'); l.className = 'pl'; l.textContent = '📌 Pinned'; box.appendChild(l);
  list.forEach(n => {
    const b = document.createElement('button'); b.type = 'button'; b.className = n.open ? '' : 'closed'; b.dataset.id = n.id;
    const lines = String(n.text || '').split('\n').map(x => x.trim()).filter(Boolean);
    b.textContent = n.title || (lines[0] || '').replace(/^[☐☑]\s?/, '') || (n.locked ? 'Locked note' : '(empty note)');
    b.setAttribute('data-notr', ''); b.style.background = n.color; b.style.color = isDark(n.color) ? '#f2f2f2' : '#1b1b1b'; b.title = (n.open ? 'Show this note' : 'Open this note');
    b.onclick = () => api.allShow(n.id); b.oncontextmenu = e => { e.preventDefault(); api.allContext(n.id); };
    box.appendChild(b);
  });
}
// Folder chips: click one to see only that folder; drop a card on a chip to move the note there.
function drawChips(match) {
  const box = $('#chips'); box.textContent = '';
  if (!data.groups.length) { box.hidden = true; return; }
  box.hidden = false;
  const chip = (id, label, n) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'fchip' + (folder === id ? ' on' : ''); b.setAttribute('aria-pressed', folder === id);
    b.textContent = label; if (id !== '*' && id !== '-') b.setAttribute('data-notr', ''); const c = document.createElement('em'); c.textContent = n; b.appendChild(c);
    b.onclick = () => { folder = id; try { localStorage.setItem('sp.folder', id); } catch (e) {} draw(); };
    if (id !== '*') {
      b.ondragover = e => { e.preventDefault(); b.classList.add('over'); };
      b.ondragleave = () => b.classList.remove('over');
      b.ondrop = async e => { e.preventDefault(); b.classList.remove('over'); await moveIds(dropIds(e.dataTransfer), id === '-' ? null : id); };
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
let undoTimer = null;
function showUndo() {   // "N notes moved to the trash. Undo" for a few seconds
  clearTimeout(undoTimer); const u = data.undo, bar = $('#undoBar');
  if (!u || !u.count || view === 'trash') { bar.hidden = true; return; }
  $('#undoTxt').textContent = u.count === 1 ? 'Note moved to the trash' : u.count + ' notes moved to the trash'; bar.hidden = false;
  undoTimer = setTimeout(() => { bar.hidden = true; }, Math.max(500, u.left || 5000));
}
$('#undoBtn').onclick = async () => { $('#undoBar').hidden = true; clearTimeout(undoTimer); await api.allUndoTrash(); refresh(); };
async function refresh() { data = await api.allList(); await runSearch(true); draw(); showUndo(); }

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
    e.preventDefault(); const ids = dropIds(e.dataTransfer); dragKind = null; if (ids.length) await take(ids);
  });
}
dropTab('#tabTrash, .hitem[data-go="trash"]', 'note', ids => (ids.length === 1 ? api.allTrash(ids[0]) : api.allBulk('trash', ids)).then(() => { if (ids.length > 1) selectMode(false); refresh(); }));
dropTab('#tabNotes, .hitem[data-go="notes"]', 'trash', ids => (ids.length === 1 ? api.trashRestore(ids[0]) : api.trashBulk('restore', ids)).then(() => { if (ids.length > 1) selectMode(false); refresh(); }));
$('#tabNotes').onclick = () => setView('notes');
$('#tabTrash').onclick = () => setView('trash');
arm($('#emptyBtn'), 'Empty trash', 'Sure? Cannot undo', () => api.trashEmpty());
$('#q').addEventListener('input', () => { draw(); runSearch(); });
$('#new').onclick = () => api.allNew();
$('#sortBtn').onclick = () => sortMenu($('#sortMenu').hidden);
document.addEventListener('mousedown', e => { if (!$('#sortMenu').hidden && !e.target.closest('.sortwrap')) sortMenu(false); });
$('#sortMenu').addEventListener('keydown', e => { const bs = [...$('#sortMenu').querySelectorAll('button')], i = bs.indexOf(document.activeElement); if (e.key === 'ArrowDown') { e.preventDefault(); bs[(i + 1) % bs.length].focus(); } if (e.key === 'ArrowUp') { e.preventDefault(); bs[(i + bs.length - 1) % bs.length].focus(); } if (e.key === 'Escape') { e.stopImmediatePropagation(); sortMenu(false); $('#sortBtn').focus(); } }, true);
$('#tidy').onclick = () => api.tidy();
function selectMode(on) { selecting = on; sel = []; tsel = []; printMsg = ''; lastPick = ''; closePop(); draw(); }
$('#selectBtn').onclick = () => selectMode(true);
$('#trashSelect').onclick = () => selectMode(true);
$('#selDone').onclick = () => selectMode(false);
$('#selAll').onclick = () => selectAll();
function selectAll() {
  if (view === 'trash') { [...document.querySelectorAll('#trashList .item[data-id]')].forEach(d => { if (!tsel.includes(d.dataset.id)) tsel.push(d.dataset.id); }); draw(); return; }
  shownIds().forEach(id => { if (!sel.includes(id)) sel.push(id); }); draw();
}
const say = t => { printMsg = t; $('#selInfo').textContent = t; setTimeout(() => { if (printMsg === t) { printMsg = ''; draw(); } }, 4500); };
const plural = n => n + (n === 1 ? ' note' : ' notes');
/* ---- the small menus above the bar (Colour, Folder, More) ---- */
let popFor = '';
function closePop() { const p = $('#selPop'); if (p) p.hidden = true; popFor = ''; ['#selColour', '#selFolder', '#selMore'].forEach(i => { const b = $(i); if (b) b.setAttribute('aria-expanded', 'false'); }); }
function openPop(kind, btn, build) {
  if (popFor === kind) { closePop(); return; }
  closePop(); const p = $('#selPop'); p.textContent = ''; build(p); popFor = kind; btn.setAttribute('aria-expanded', 'true');
  const bar = $('#selBar').getBoundingClientRect(), r = btn.getBoundingClientRect(); p.hidden = false;
  p.style.right = 'auto'; p.style.left = Math.max(4, Math.min(bar.width - p.offsetWidth - 4, r.left - bar.left + r.width / 2 - p.offsetWidth / 2)) + 'px';
  const first = p.querySelector('button'); if (first) first.focus();
}
const mi = (p, text, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'mi'; b.setAttribute('role', 'menuitem'); b.textContent = text; b.onclick = fn; p.appendChild(b); return b; };
async function bulk(action, arg, doneText) {
  const ids = sel.slice(); if (!ids.length) return null;
  const r = await api.allBulk(action, ids, arg); closePop();
  if (r && r.cancelled) return r;
  const note = r && r.skipped ? ' (' + r.skipped + ' locked or not open, left alone)' : '';
  if (r && r.ok) { await refresh(); say(doneText(r) + note); } else say((r && r.error) || 'Nothing was changed.');
  return r;
}
$('#selColour').onclick = () => openPop('colour', $('#selColour'), p => {
  const h = document.createElement('div'); h.className = 'ph'; h.textContent = (uit && uit.paletteName) || 'Colour'; p.appendChild(h);
  const g = document.createElement('div'); g.className = 'sws'; const names = (uit && uit.names) || [];
  ((uit && uit.palette) || (window.StickyThemes ? window.StickyThemes.palette('classic', false) : [])).forEach((c, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.title = names[i] || c; b.setAttribute('aria-label', 'Colour ' + (names[i] || c));
    b.onclick = () => bulk('colour', c, r => plural(r.done) + ' recoloured'); g.appendChild(b);
  });
  p.appendChild(g);
});
$('#selFolder').onclick = () => openPop('folder', $('#selFolder'), p => {
  mi(p, 'No folder', () => moveSel(null, 'no folder'));
  data.groups.forEach(g => mi(p, '📁 ' + g.name, () => moveSel(g.id, g.name)).setAttribute('data-notr', ''));
});
async function moveSel(gid, name) {
  const ids = sel.slice(); if (!ids.length) return; closePop();
  await Promise.all(ids.map(id => api.grpMove(id, gid)));
  selectMode(false); await refresh(); $('#count').textContent = plural(ids.length) + ' moved to ' + name;
}
$('#selMore').onclick = () => openPop('more', $('#selMore'), p => {
  mi(p, 'Open', () => bulk('open', null, r => plural(r.done) + ' opened'));
  mi(p, 'Close', () => bulk('close', null, r => plural(r.done) + ' closed'));
  mi(p, 'Pin on top', () => bulk('pin', null, r => plural(r.done) + ' pinned'));
  mi(p, 'Unpin', () => bulk('unpin', null, r => plural(r.done) + ' unpinned'));
});
$('#selExport').onclick = () => bulk('export', null, r => plural(r.done) + ' exported');
document.addEventListener('mousedown', e => { if (popFor && !e.target.closest('#selPop, #selBar .fb')) closePop(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && popFor) { e.stopImmediatePropagation(); const b = { colour: '#selColour', folder: '#selFolder', more: '#selMore' }[popFor]; closePop(); if (b) $(b).focus(); } }, true);
arm($('#selTrash'), 'Trash', 'Sure?', async () => {
  if (!sel.length) return; const ids = sel.slice();
  const r = await api.allBulk('trash', ids); selectMode(false); await refresh();
  if (r && r.skipped) say(r.skipped + (r.skipped === 1 ? ' locked note was' : ' locked notes were') + ' left alone');
});
$('#tselRestore').onclick = async () => { const ids = tsel.slice(); if (!ids.length) return; const r = await api.trashBulk('restore', ids); selectMode(false); await refresh(); $('#count').textContent = plural((r && r.done) || 0) + ' restored'; };
arm($('#tselPurge'), 'Delete forever', 'Sure? Cannot undo', async () => { const ids = tsel.slice(); if (!ids.length) return; await api.trashBulk('purge', ids); selectMode(false); await refresh(); });
$('#printGo').onclick = async () => {
  if (!sel.length) return;
  const r = await api.allPrint(sel.slice());
  if (r && r.ok) { selectMode(false); return; }
  if (r && r.cancelled) return;
  say((r && r.error) || 'Printing did not start.');
};
function folderRow(show) { $('#folderRow').hidden = !show; if (show) { $('#fname').value = ''; $('#fname').focus(); } }
async function addFolder() { const v = $('#fname').value.trim(); if (!v) { $('#fname').focus(); return; } await api.grpNew(v); folderRow(false); refresh(); }
$('#showFolder').onclick = () => folderRow($('#folderRow').hidden);
$('#cancelFolder').onclick = () => folderRow(false);
$('#newFolder').onclick = addFolder;
$('#fname').addEventListener('keydown', e => { if (e.key === 'Enter') addFolder(); if (e.key === 'Escape') folderRow(false); });
$('#chatBtn').onclick = () => api.openChat();
$('#gear').onclick = () => api.openSettings();
let homeKeys = null;
if (api.welcomeGet) api.welcomeGet().then(r => { homeKeys = r && r.keys; }).catch(() => {});
document.addEventListener('keydown', e => { if (window.StickyKeysHelp && StickyKeysHelp.isShortcut(e)) { e.preventDefault(); StickyKeysHelp.toggle('home', homeKeys); } });
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); api.allNew(); }
  if (e.key === 'Escape' && selecting && !e.target.closest('input')) selectMode(false);
  if (selecting && e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'a' && !e.target.closest('input, textarea, select')) { e.preventDefault(); selectAll(); }
});
if (api.uiTheme) { api.uiTheme().then(t => { uit = t; }).catch(() => {}); if (api.onUiTheme) api.onUiTheme(t => { uit = t; }); }
api.onAllChanged(refresh);
api.onAllTab(setView);
refresh();
