const $ = s => document.querySelector(s);
const ed = $('#ed'), MAXW = 800;
let note, timer;
let KEYMAP = StickyKeys.DEFAULTS;   // the shortcuts (Settings > Shortcuts can change them)
const KEY = (e, id) => StickyKeys.matches(e, KEYMAP[id]);
if (window.api.onKeys) api.onKeys(m => { KEYMAP = m || StickyKeys.DEFAULTS; });
const srcCache = new Map();
let themeId = 'classic', scopeAll = false;
const TH = window.StickyThemes;

const isDark = hex => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255 < 0.5; };

/* ---------- themes ---------- */
function buildSwatches() {
  document.querySelectorAll('.sw[data-c]').forEach(x => x.remove());
  TH.byId(themeId).colors.forEach(c => {
    const b = document.createElement('button'); b.className = 'sw'; b.dataset.c = c;
    b.style.background = c; b.title = c; b.setAttribute('aria-label', 'Colour ' + c);
    b.onclick = () => set({ color: c }); $('#swatches').insertBefore(b, $('#customSw'));
  });
  if (note) apply();
}
function buildThemes() {
  const box = $('#themes'); box.textContent = '';
  TH.THEMES.forEach(t => {
    const b = document.createElement('button'); b.className = 'theme' + (t.id === themeId ? ' on' : ''); b.type = 'button';
    b.setAttribute('aria-pressed', t.id === themeId); b.title = t.name + ' theme';
    const dots = document.createElement('span'); dots.className = 'dots';
    t.colors.slice(0, 4).forEach(c => { const d = document.createElement('i'); d.style.background = c; dots.appendChild(d); });
    const nm = document.createElement('span'); nm.textContent = t.name;
    b.append(dots, nm); b.onclick = () => applyTheme(t.id); box.appendChild(b);
  });
}
function paintScope() { $('#scopeThis').classList.toggle('on', !scopeAll); $('#scopeAll').classList.toggle('on', scopeAll); }
async function applyTheme(id) {
  themeId = id; buildThemes(); buildSwatches();
  const t = TH.byId(id);
  if (scopeAll) { await api.themeApplyAll(id); }   // the app updates every note and tells each window
  else { await api.themeSet(id); set({ color: TH.mapColor(note.color, id, 0), font: t.font }); }
}
$('#scopeThis').onclick = () => { scopeAll = false; try { localStorage.setItem('sp.scope', 'this'); } catch (e) {} paintScope(); };
$('#scopeAll').onclick = () => { scopeAll = true; try { localStorage.setItem('sp.scope', 'all'); } catch (e) {} paintScope(); };
api.onStyle(st => { note.color = st.color; note.font = st.font; apply(); });

function apply() {
  document.documentElement.style.setProperty('--bg', note.color);
  document.body.classList.toggle('dark', isDark(note.color));
  ed.style.fontFamily = '"' + note.font.replace(/["\\]/g, '') + '", "Segoe UI", sans-serif';
  ed.style.fontSize = note.size + 'px';
  if (document.activeElement !== $('#topic')) $('#topic').value = note.title || '';
  $('#topic').title = note.title || 'Topic';
  const locked = bodyLocked();
  document.body.classList.toggle('rolled', !!note.rolled);
  $('#roll').title = note.rolled ? 'Roll down' : 'Roll up';
  $('#lockscreen').hidden = !locked; ed.hidden = locked; $('#chk').disabled = locked;
  if (typeof updateAiButtons === 'function') updateAiButtons();
  $('#lock').hidden = !note.locked; $('#lock').classList.toggle('on', !!note.locked);
  $('#lockNew').hidden = !!note.locked; $('#lockOld').hidden = !note.locked || locked;
  $('#pin').classList.toggle('on', note.pinned);
  $('#pin').setAttribute('aria-pressed', note.pinned);
  $('#size').value = note.size; $('#sizeLabel').textContent = note.size + 'px';
  $('#font').value = note.font; $('#color').value = note.color;
  document.querySelectorAll('.sw[data-c]').forEach(b => b.classList.toggle('on', b.dataset.c.toLowerCase() === note.color.toLowerCase()));
}
const set = p => { Object.assign(note, p); apply(); api.update(p); };

/* ---------- editor: text + pictures ---------- */
function makeImg(id, src) {
  const im = document.createElement('img');
  srcCache.set(id, src);
  im.src = src; im.dataset.id = id; im.alt = 'Picture'; im.contentEditable = 'false'; im.draggable = false;
  return im;
}
function makeTodo(text, done) {
  const d = document.createElement('div'); d.className = 'todo' + (done ? ' done' : '');
  const c = document.createElement('input'); c.type = 'checkbox'; c.checked = !!done; c.contentEditable = 'false'; c.setAttribute('aria-label', 'Done');
  const t = document.createElement('span'); t.className = 'tx'; t.textContent = text || '';
  const x = document.createElement('button'); x.className = 'x'; x.type = 'button'; x.textContent = '×'; x.contentEditable = 'false';
  x.tabIndex = -1; x.title = 'Remove this item'; x.setAttribute('aria-label', 'Remove this item');
  d.append(c, t, x); return d;
}
const closestTodo = node => { const el = node && (node.nodeType === 1 ? node : node.parentElement); const td = el && el.closest('.todo'); return td && ed.contains(td) ? td : null; };
function todoTx(el) { return el && el.classList && el.classList.contains('todo') ? el.querySelector('.tx') : null; }
// Finds a spot, near where an item used to be, that the editor can really type in.
function typableSpotAfterRemoval(prev, next) {
  const r = document.createRange(), endOf = n => { r.setStart(n, n.nodeValue.length); return r; };
  if (todoTx(prev)) { r.selectNodeContents(todoTx(prev)); r.collapse(false); return r; }
  if (prev && prev.nodeType === 3) return endOf(prev);
  if (prev && prev.nodeName === 'BR') {   // a spot right after a line break next to a block is not typable; use the end of the line above
    const pp = prev.previousSibling;
    if (pp && pp.nodeType === 3) return endOf(pp);
    if (todoTx(pp)) { r.selectNodeContents(todoTx(pp)); r.collapse(false); return r; }
    r.setStartBefore(prev); return r;
  }
  if (todoTx(next)) { r.setStart(todoTx(next), 0); return r; }
  if (next && next.nodeType === 3) { r.setStart(next, 0); return r; }
  if (next && next.nodeName === 'BR') { r.setStartBefore(next); return r; }
  if (prev || next) {   // only a picture is left beside it: give the cursor an empty line to stand on
    const br = document.createElement('br');
    if (prev) prev.after(br); else next.before(br);
    r.setStartAfter(br); return r;
  }
  r.selectNodeContents(ed); r.collapse(false); return r;
}
// Removes a checklist item and puts the caret where you would expect to keep typing.
function removeTodo(td) {
  const prev = td.previousSibling, next = td.nextSibling;
  td.remove();
  placeCaret(typableSpotAfterRemoval(prev, next)); mark(); queue(); commitNow();
}
// Turns one checklist item into an ordinary line of text and returns the new text node.
function todoToText(t) {
  const prev = t.previousSibling, frag = document.createDocumentFragment();
  const lineStart = !prev || prev.nodeName === 'BR' || prev.nodeName === 'IMG' || (prev.nodeType === 3 && prev.nodeValue.endsWith('\n'));
  if (!lineStart) frag.appendChild(document.createElement('br'));
  const tn = document.createTextNode(t.querySelector('.tx').textContent);
  frag.append(tn, document.createElement('br'));
  t.replaceWith(frag);
  return tn;
}
function focusTodo(t) { const r = document.createRange(); r.setStart(t.querySelector('.tx'), 0); placeCaret(r); }
// true as soon as the note holds any visible text, a picture or a checklist item (stops at the first one, so it is cheap even for huge notes)
function hasStuff() {
  for (const c of ed.childNodes) {
    if (c.nodeType === 3) { if (/\S/.test(c.nodeValue)) return true; }
    else if (c.nodeType === 1 && (c.nodeName === 'IMG' || (c.classList && c.classList.contains('todo')) || /\S/.test(c.textContent))) return true;
  }
  return false;
}
const mark = () => ed.classList.toggle('empty', !hasStuff());
// A checklist item that lost its text span (a rough multi-item delete can do that) is turned back into a plain line, so nothing breaks or gets lost.
function repairTodos() {
  const bad = ed.querySelectorAll('.todo:not(:has(> .tx))');
  bad.forEach(t => {
    const txt = t.textContent.replace(/×/g, '');
    const frag = document.createDocumentFragment();
    if (txt.trim()) { frag.append(document.createTextNode(txt), document.createElement('br')); }
    t.replaceWith(frag);
  });
  return bad.length;
}
function render(blocks) {
  ed.textContent = '';
  blocks.forEach(b => {
    if (b.t === 'img') { const src = b.src || srcCache.get(b.id); if (src) ed.appendChild(makeImg(b.id, src)); }
    else if (b.t === 'check') ed.appendChild(makeTodo(b.v, b.done));
    else ed.appendChild(document.createTextNode(b.v));
  });
  mark();
}
function serialize() {
  const blocks = []; let buf = '';
  const flush = () => { if (buf) { blocks.push({ t: 'text', v: buf }); buf = ''; } };
  const walk = node => {
    for (const c of node.childNodes) {
      if (c.nodeType === 3) buf += c.nodeValue;
      else if (c.nodeName === 'BR') buf += '\n';
      else if (c.nodeName === 'IMG') { flush(); if (c.dataset.id) blocks.push({ t: 'img', id: c.dataset.id }); }
      else if (c.classList && c.classList.contains('todo')) {
        flush(); const tx = c.querySelector('.tx'), box = c.querySelector('input');
        if (tx) blocks.push({ t: 'check', v: tx.textContent, done: !!(box && box.checked) });
        else { const w = c.textContent.replace(/×/g, ''); if (w.trim()) blocks.push({ t: 'text', v: w }); }   // damaged item: keep its words
      }
      else if (c.nodeType === 1) { if (buf && !buf.endsWith('\n')) buf += '\n'; walk(c); if (buf && !buf.endsWith('\n')) buf += '\n'; }
    }
  };
  walk(ed);
  if (buf.endsWith('\n')) buf = buf.slice(0, -1);   // the browser's trailing placeholder line break
  flush();
  return blocks;
}
const bodyLocked = () => note && note.locked && !note.unlocked;
const saveNow = () => { clearTimeout(timer); timer = null; if (bodyLocked()) return; api.update({ blocks: serialize() }); };
const queue = () => { clearTimeout(timer); timer = setTimeout(saveNow, 200); };

/* ---------- undo / redo (covers typing and pictures) ---------- */
let cur = '[]', undoS = [], redoS = [], hTimer = null, undoChars = 0;
const UNDO_BUDGET = 8e6;   // total characters kept for undo: a very long note must not eat all the memory
function pushUndo(s) { undoS.push(s); undoChars += s.length; while ((undoS.length > 100 || undoChars > UNDO_BUDGET) && undoS.length > 1) undoChars -= undoS.shift().length; }
function popUndo() { const s = undoS.pop(); undoChars -= s.length; return s; }
const snap = () => JSON.stringify(serialize());
function commitNow() {
  clearTimeout(hTimer); hTimer = null;
  const s = snap(); if (s === cur) return;
  pushUndo(cur);
  redoS.length = 0; cur = s;
}
const schedule = () => { clearTimeout(hTimer); hTimer = setTimeout(commitNow, 400); };
function restore(s) {
  cur = s; render(JSON.parse(s));
  ed.focus();   // the redraw drops focus, so take it back before placing the caret
  const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); placeCaret(r);
  saveNow();
}
function undo() { commitNow(); if (!undoS.length) return; redoS.push(cur); restore(popUndo()); }
function redo() { commitNow(); if (!redoS.length) return; pushUndo(cur); restore(redoS.pop()); }

function caretRange() {
  const sel = getSelection();
  if (sel.rangeCount && ed.contains(sel.anchorNode)) return sel.getRangeAt(0);
  const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); return r;
}
function placeCaret(r) { if (document.activeElement !== ed) ed.focus(); const sel = getSelection(); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); }
function insertText(t) {
  const r = caretRange(); r.deleteContents();
  if (closestTodo(r.startContainer)) t = t.replace(/\s*[\r\n]+\s*/g, ' ');
  const n = document.createTextNode(t.replace(/\r\n?/g, '\n')); r.insertNode(n); r.setStartAfter(n); placeCaret(r);
}
function insertImg(id, src) {
  let r = caretRange();
  const td = closestTodo(r.startContainer); if (td) { r = document.createRange(); r.setStartAfter(td); r.collapse(true); }
  r.deleteContents();
  const im = makeImg(id, src); r.insertNode(im);
  if (!im.nextSibling) im.after(document.createElement('br'));   // gives you a line to keep typing on
  r.setStartAfter(im.nextSibling && im.nextSibling.nodeName === 'BR' ? im.nextSibling : im); placeCaret(r);
}
async function shrink(file) {
  const bmp = await createImageBitmap(file), s = Math.min(1, MAXW / bmp.width);
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * s)); c.height = Math.max(1, Math.round(bmp.height * s));
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/webp', 0.85);
}
async function addFiles(files) {
  for (const f of files) {
    try { const url = await shrink(f), id = await api.saveImage(url); if (id) { insertImg(id, note && note.imgBase ? note.imgBase + id : url); commitNow(); } } catch (e) {}   // shown from its file, not from a big text copy in memory
  }
  mark(); saveNow();
}
function addTodo() {
  if (bodyLocked()) return;
  const r = caretRange(), cur = closestTodo(r.startContainer), t = makeTodo('', false);
  if (cur) cur.after(t); else { r.deleteContents(); r.insertNode(t); }
  focusTodo(t); mark(); queue(); commitNow();
}
const clearSel = () => ed.querySelectorAll('img.sel').forEach(i => i.classList.remove('sel'));

// the settings popover closes as soon as you go back to typing
ed.addEventListener('focus', () => { const p = $('#panel'); if (!p.hidden && window.innerWidth < 560) {   // in a wide window the panel sits beside the text, so it stays open
    p.hidden = true; $('#cfg').setAttribute('aria-expanded', 'false'); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && edit) { api.aiEditStop(edit.id); return; } if (e.key === 'Escape' && !aiBox.hidden) { aiToken++; aiBusy = false; aiClose(); return; } if (e.key === 'Escape' && !$('#panel').hidden) { $('#panel').hidden = true; $('#cfg').setAttribute('aria-expanded', 'false'); } });
ed.addEventListener('input', () => { repairTodos(); mark(); queue(); schedule(); });
ed.addEventListener('beforeinput', e => {
  if (e.inputType === 'historyUndo') { e.preventDefault(); undo(); }
  else if (e.inputType === 'historyRedo') { e.preventDefault(); redo(); }
  else if (allSelected()) {
    if (e.inputType.startsWith('delete')) { e.preventDefault(); commitNow(); clearNote(); commitNow(); }   // cut and every kind of delete
    else if (e.inputType.startsWith('insert') && e.inputType !== 'insertCompositionText') { commitNow(); clearNote(); }   // typing or pasting over everything: start from an empty note
  }
});
ed.addEventListener('blur', () => { if (timer) saveNow(); });
/* ---------- select all, then delete or type: replaces the WHOLE note, whatever is in it ---------- */
function selectAllNote() { clearSel(); const r = document.createRange(); r.selectNodeContents(ed); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
function allSelected() {
  const s = getSelection(); if (!s.rangeCount || s.isCollapsed || !ed.contains(s.anchorNode)) return false;
  const r = s.getRangeAt(0), n = ed.childNodes.length;
  if (r.startContainer === ed && r.startOffset === 0 && r.endContainer === ed && r.endOffset === n) return true;
  // dragged or shift-selected from the very start to the very end
  const first = ed.firstChild, last = ed.lastChild; if (!first) return false;
  const atStart = (r.startContainer === ed && r.startOffset === 0) || (r.startOffset === 0 && (r.startContainer === first || first.contains(r.startContainer)) && (first.nodeType === 3 || r.startContainer === first));
  const atEnd = (r.endContainer === ed && r.endOffset === n) || (last.nodeType === 3 && r.endContainer === last && r.endOffset === last.nodeValue.length);
  return atStart && atEnd;
}
function clearNote() {   // empties the note completely and leaves a clean caret
  ed.replaceChildren();
  const r = document.createRange(); r.selectNodeContents(ed); r.collapse(true); placeCaret(r);
  mark(); queue();
}
ed.addEventListener('keydown', e => {
  if (e.ctrlKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); selectAllNote(); return; }
  if ((e.key === 'Delete' || e.key === 'Backspace') && !e.ctrlKey && !e.altKey && allSelected()) { e.preventDefault(); clearNote(); commitNow(); return; }
  if (e.ctrlKey && !e.altKey) {
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return; }
  }
  if (KEY(e, 'n_todo')) { e.preventDefault(); addTodo(); return; }
  const sel = getSelection(), td = sel.rangeCount ? closestTodo(sel.anchorNode) : null;
  if (td) {
    const tx = td.querySelector('.tx');
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      if (!tx.textContent.trim()) {   // Enter on an empty item turns it back into a normal line
        const br = document.createElement('br'); td.replaceWith(br);
        const r = document.createRange(); r.setStartBefore(br); placeCaret(r);
      } else {
        let after = ''; const a = sel.anchorNode, off = sel.anchorOffset;
        if (a.nodeType === 3 && tx.contains(a)) { after = a.nodeValue.slice(off); a.nodeValue = a.nodeValue.slice(0, off); }
        const nt = makeTodo(after, false); td.after(nt); focusTodo(nt);
      }
      mark(); queue(); commitNow(); return;
    }
    if (e.key === 'Backspace' && sel.isCollapsed) {
      if (!tx.textContent) { e.preventDefault(); removeTodo(td); return; }   // empty item: remove it
      const atStart = sel.anchorOffset === 0 && (sel.anchorNode === tx || sel.anchorNode === tx.firstChild);
      if (atStart) {   // start of a filled item: drop the tick box but keep the words
        e.preventDefault(); const tn = todoToText(td);
        const r = document.createRange(); r.setStart(tn, 0); placeCaret(r); mark(); queue(); commitNow(); return;
      }
    }
  }
  if (e.key === 'Enter' && !e.ctrlKey && !e.isComposing) { e.preventDefault(); document.execCommand('insertLineBreak'); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const s = ed.querySelector('img.sel');
    if (s) { e.preventDefault(); s.remove(); mark(); saveNow(); commitNow(); }
  }
});
ed.addEventListener('change', e => {
  if (e.target.type === 'checkbox') { e.target.closest('.todo').classList.toggle('done', e.target.checked); mark(); queue(); commitNow(); }
});
ed.addEventListener('mousedown', e => { if (e.target.closest && e.target.closest('.todo .x')) e.preventDefault(); });   // keep the caret where it was
ed.addEventListener('click', e => {
  const x = e.target.closest && e.target.closest('.todo .x');
  if (x) { removeTodo(x.closest('.todo')); return; }
  clearSel(); if (e.target.tagName === 'IMG') e.target.classList.add('sel');
});
ed.addEventListener('paste', e => {
  e.preventDefault();
  const imgs = [...(e.clipboardData.files || [])].filter(f => f.type.startsWith('image/'));
  if (imgs.length) { addFiles(imgs); return; }
  const t = e.clipboardData.getData('text/plain');
  if (t) { insertText(t); mark(); queue(); schedule(); }
});
ed.addEventListener('dragover', e => e.preventDefault());
ed.addEventListener('drop', e => {
  e.preventDefault();
  const imgs = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
  if (imgs.length) { addFiles(imgs); return; }
  const t = e.dataTransfer.getData('text/plain');
  if (t) { insertText(t); mark(); queue(); schedule(); }
});

/* ---------- startup ---------- */
async function reload() {
  note = await api.get(); if (note && note.keys) KEYMAP = note.keys;
  render(note.blocks && note.blocks.length ? note.blocks : (note.text && !note.locked ? [{ t: 'text', v: note.text }] : []));
  apply(); remindPaint(); undoS = []; redoS = []; undoChars = 0; cur = snap();
}
/* ---------- find in note (Ctrl+F) ---------- */
const FIND_MAX = 5000;
let finds = [], findAt = -1, findTimer = null;
const fold1 = ch => { const f = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); const c = f === 'ς' ? 'σ' : f; return c.length === 1 ? c : ch.toLowerCase().slice(0, 1) || ch; };
const foldAll = s => { let o = ''; for (const ch of s) o += fold1(ch); return o; };   // ignores case and Greek/Latin accents, one character in -> one character out
function findRanges(q) {
  const out = []; if (!q) return out;
  const needle = foldAll(q);
  const tw = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement && n.parentElement.closest('.x') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  for (let n = tw.nextNode(); n && out.length < FIND_MAX; n = tw.nextNode()) {
    const t = n.nodeValue; if (t.length < needle.length) continue;
    const hay = foldAll(t); if (hay.length !== t.length) continue;   // (never expected; skip a node that would shift positions)
    for (let i = hay.indexOf(needle); i !== -1 && out.length < FIND_MAX; i = hay.indexOf(needle, i + needle.length)) {
      const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + needle.length); out.push(r);
    }
  }
  return out;
}
function findPaint() {
  const hl = window.CSS && CSS.highlights; if (!hl) return;
  hl.delete('find'); hl.delete('find-cur');
  if (!finds.length) return;
  hl.set('find', new Highlight(...finds));
  if (findAt >= 0) hl.set('find-cur', new Highlight(finds[findAt]));
}
function findCount() {
  const q = $('#findIn').value;
  $('#findCnt').textContent = !q ? '' : !finds.length ? 'No match' : (findAt + 1) + ' / ' + finds.length + (finds.length >= FIND_MAX ? '+' : '');
}
function findGo(i, scroll = true) {
  if (!finds.length) { findAt = -1; findPaint(); findCount(); return; }
  findAt = (i + finds.length) % finds.length; findPaint(); findCount();
  if (!scroll) return;
  const r = finds[findAt].getBoundingClientRect(), box = ed.getBoundingClientRect();
  if (r.top < box.top + 8 || r.bottom > box.bottom - 8) ed.scrollTop += r.top - box.top - box.height / 2;
}
function findRun(keep) {
  const q = $('#findIn').value, prev = findAt;
  finds = findRanges(q);
  findAt = finds.length ? (keep && prev >= 0 ? Math.min(prev, finds.length - 1) : 0) : -1;
  findGo(findAt, !keep);
}
function findOpen() {
  if (bodyLocked()) return;
  const bar = $('#findbar'), inp = $('#findIn');
  const sel = window.getSelection();
  if (sel && !sel.isCollapsed && ed.contains(sel.anchorNode)) { const s = sel.toString(); if (s && s.length <= 80 && !s.includes('\n')) inp.value = s; }
  bar.hidden = false; inp.focus(); inp.select(); findRun(false);
}
function findClose() {
  $('#findbar').hidden = true; finds = []; findAt = -1; findPaint();
  const hl = window.CSS && CSS.highlights; if (hl) { hl.delete('find'); hl.delete('find-cur'); }
  ed.focus();
}
$('#findIn').addEventListener('input', () => { clearTimeout(findTimer); findTimer = setTimeout(() => findRun(false), 120); });
$('#findIn').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); clearTimeout(findTimer); if (!finds.length) findRun(false); else findGo(findAt + (e.shiftKey ? -1 : 1)); }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); findClose(); }
});
$('#findNext').onclick = () => findGo(findAt + 1);
$('#findPrev').onclick = () => findGo(findAt - 1);
$('#findX').onclick = findClose;
ed.addEventListener('input', () => { if (!$('#findbar').hidden) { clearTimeout(findTimer); findTimer = setTimeout(() => findRun(true), 250); } });
document.addEventListener('keydown', e => {
  if (KEY(e, 'n_find')) { e.preventDefault(); findOpen(); }
  else if (e.key === 'F3' && !$('#findbar').hidden) { e.preventDefault(); findGo(findAt + (e.shiftKey ? -1 : 1)); }
});

/* ---------- links (Ctrl+click opens them) and a reminder for dates written in the note ---------- */
const LINKHL = (window.CSS && CSS.highlights && window.Highlight) ? new Highlight() : null;
if (LINKHL) CSS.highlights.set('links', LINKHL);
function linkRanges() {
  const out = [];
  const tw = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n && out.length < 2000; n = tw.nextNode()) {
    const v = n.nodeValue; if (v.length < 4 || !/[:@.]/.test(v)) continue;
    for (const l of StickyLinks.find(v)) { const r = document.createRange(); r.setStart(n, l.start); r.setEnd(n, l.end); out.push({ r, url: l.url }); }
  }
  return out;
}
function paintLinks() { if (!LINKHL) return; LINKHL.clear(); if (bodyLocked()) return; linkRanges().forEach(x => LINKHL.add(x.r)); }
function linkAt(cx, cy) {
  if (bodyLocked()) return '';
  const el = document.elementFromPoint(cx, cy); if (!el || !ed.contains(el)) return '';
  const r = document.caretRangeFromPoint ? document.caretRangeFromPoint(cx, cy) : null;
  if (!r || r.startContainer.nodeType !== 3 || !ed.contains(r.startContainer)) return '';
  const l = StickyLinks.at(r.startContainer.nodeValue, r.startOffset); if (!l) return '';
  const lr = document.createRange(); lr.setStart(r.startContainer, l.start); lr.setEnd(r.startContainer, l.end);
  for (const q of lr.getClientRects()) if (cx >= q.left - 1 && cx <= q.right + 1 && cy >= q.top - 1 && cy <= q.bottom + 1) return l.url;   // really on the text, not just near it
  return '';
}
ed.addEventListener('click', e => {
  if (!(e.ctrlKey || e.metaKey) || e.button !== 0) return;
  const u = linkAt(e.clientX, e.clientY); if (u) { e.preventDefault(); api.openLink(u); }
});
let hoverRaf = 0;
ed.addEventListener('mousemove', e => {
  if (hoverRaf) return; const x = e.clientX, y = e.clientY, ctrl = e.ctrlKey || e.metaKey;
  hoverRaf = requestAnimationFrame(() => { hoverRaf = 0; ed.classList.toggle('linkhover', ctrl && !!linkAt(x, y)); });
});
ed.addEventListener('mouseleave', () => ed.classList.remove('linkhover'));
ed.addEventListener('contextmenu', e => { const u = linkAt(e.clientX, e.clientY); if (u) { e.preventDefault(); api.linkMenu(u); } });   // right-click on a link: open / copy

// dates: "tomorrow at 5pm", "αύριο στις 17:30" ... -> offer a reminder (rules, not the AI: instant, works offline)
const dateDismissed = new Set();
let dateFound = null;
function dateCheck() {
  const bar = $('#datebar');
  if (!note || bodyLocked() || note.suggestDates === false || note.remind > Date.now()) { bar.hidden = true; dateFound = null; return; }
  const found = StickyDates.first(noteAsText(), Date.now());
  if (!found || dateDismissed.has(found.text + '|' + found.at)) { bar.hidden = true; dateFound = null; return; }
  dateFound = found;
  const when = new Date(found.at), now = new Date(), sameDay = when.toDateString() === now.toDateString();
  const label = (sameDay ? 'today' : when.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })) + ' ' + when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  $('#dateTxt').textContent = `“${found.text.length > 28 ? found.text.slice(0, 27) + '…' : found.text}” → ${label}`;
  $('#dateTxt').title = 'Set a reminder for ' + label;
  bar.hidden = false;
}
$('#dateSet').onclick = async () => { if (!dateFound) return; const f = dateFound; $('#datebar').hidden = true; await remindSet(f.at); };
$('#dateNo').onclick = () => { if (dateFound) dateDismissed.add(dateFound.text + '|' + dateFound.at); $('#datebar').hidden = true; dateFound = null; };
var lookTimer = 0;
function scheduleLook() { clearTimeout(lookTimer); lookTimer = setTimeout(() => { paintLinks(); dateCheck(); }, 700); }
new MutationObserver(scheduleLook).observe(ed, { childList: true, subtree: true, characterData: true });
$('#aiTitle').onclick = () => runAI('title');

/* ---------- version history ---------- */
async function histOpen() {
  const box = $('#histBox'); if (!box.hidden) { box.hidden = true; return; }
  const list = $('#histList'); list.textContent = ''; box.hidden = false;
  const r = (await api.histList()) || { items: [] };
  $('#histMsg').textContent = r.locked ? 'A locked note keeps no older copies.' : r.items.length ? 'Copies are kept while you edit. Restoring keeps today\u2019s version here too.' : 'No older copies yet. They appear as you keep editing.';
  r.items.forEach(it => {
    const row = document.createElement('div'); row.className = 'hrow'; row.setAttribute('role', 'listitem');
    const m = document.createElement('div'); m.className = 'hm';
    const b = document.createElement('b'); b.textContent = new Date(it.t).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const s = document.createElement('span'); s.textContent = it.words + (it.words === 1 ? ' word' : ' words') + (it.pics ? ' \u00b7 ' + it.pics + ' pic' + (it.pics > 1 ? 's' : '') : '') + (it.preview ? ' \u00b7 ' + it.preview : '');
    m.append(b, s);
    const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = 'Restore'; let armed = null;
    btn.onclick = async () => {
      if (!armed) { btn.textContent = 'Sure?'; armed = setTimeout(() => { armed = null; btn.textContent = 'Restore'; }, 3000); return; }
      clearTimeout(armed); armed = null; btn.disabled = true;
      if (timer) saveNow();
      const ok = await api.histRestore(it.t);
      if (ok) { await reload(); $('#histBox').hidden = true; ed.focus(); } else { btn.disabled = false; btn.textContent = 'Failed'; }
    };
    row.append(m, btn); list.appendChild(row);
  });
}
$('#histBtn').onclick = histOpen;

/* ---------- reminder ---------- */
const REM = window.StickyReminders;
function remindPaint() {
  const t = note && note.remind > 0 ? note.remind : 0;
  $('#remAt').value = REM.toLocalInput(t); $('#remClear').style.visibility = t ? 'visible' : 'hidden';
  document.body.classList.toggle('hasRemind', !!t); if (typeof scheduleLook === 'function') scheduleLook();
  $('#remMsg').textContent = t ? 'Reminder: ' + new Date(t).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Pick a time and a Windows notification will bring this note back.';
}
async function remindSet(ts) { const v = await api.remind(ts); if (note) note.remind = v; remindPaint(); }
$('#remAt').addEventListener('change', () => { const t = REM.fromLocalInput($('#remAt').value); if (t > Date.now()) remindSet(t); else if (!$('#remAt').value) remindSet(0); else $('#remMsg').textContent = 'Pick a time in the future.'; });
$('#remClear').onclick = () => remindSet(0);
document.querySelectorAll('.rq').forEach(b => { b.onclick = () => remindSet(REM.quick(b.dataset.q, Date.now())); });

api.onReload(() => { if (!timer && !edit && document.activeElement !== $('#topic')) reload(); });   // a note changed on another PC
(async () => {
  await reload();
  aiLoad();
  try { themeId = ((await api.info()) || {}).theme || 'classic'; } catch (e) {}
  buildSwatches(); buildThemes();
  try { scopeAll = localStorage.getItem('sp.scope') === 'all'; } catch (e) {}
  paintScope();
  apply();
  if (!bodyLocked()) { const r = document.createRange(); r.selectNodeContents(ed); placeCaret((r.collapse(false), r)); ed.focus(); }
})();

/* ---------- toolbar and panel ---------- */
$('#color').addEventListener('input', e => set({ color: e.target.value }));
$('#font').addEventListener('change', e => { const f = e.target.value.trim(); if (f) set({ font: f }); });
$('#size').addEventListener('input', e => set({ size: +e.target.value }));
$('#pin').onclick = async () => { note.pinned = await api.pin(!note.pinned); apply(); };
/* ---------- removing checklist items in bulk ---------- */
function chkRow() {
  const all = ed.querySelectorAll('.todo').length, done = ed.querySelectorAll('.todo.done').length;
  $('#chkTools').hidden = !all; $('#clearDone').hidden = !done;
}
$('#clearDone').onclick = () => { ed.querySelectorAll('.todo.done').forEach(t => t.remove()); mark(); queue(); commitNow(); chkRow(); };
$('#toText').onclick = () => {
  ed.querySelectorAll('.todo').forEach(t => todoToText(t));
  ed.normalize(); mark(); queue(); commitNow(); chkRow();
};

/* ---------- copy the whole note as plain text ---------- */
function noteForCopy() {
  const parts = [];
  const topic = $('#topic').value.trim(); if (topic) parts.push(topic + '\n');
  let out = '';
  serialize().forEach(b => {
    if (b.t === 'text') out += b.v;
    else if (b.t === 'check') out += (out && !out.endsWith('\n') ? '\n' : '') + (b.done ? '[x] ' : '[ ] ') + b.v + '\n';
  });
  parts.push(out.replace(/\n{3,}/g, '\n\n').trim());
  return parts.join('\n').trim();
}
async function copyNote() {
  if (bodyLocked()) return;
  const b = $('#copyTxt'), old = 'Copy note as text';
  try { await navigator.clipboard.writeText(noteForCopy()); b.textContent = 'Copied ✓'; } catch (x) { b.textContent = 'Could not copy'; }
  setTimeout(() => { b.textContent = old; }, 1400);
}
$('#copyTxt').onclick = copyNote;
$('#exportBtn').onclick = async () => {
  if (bodyLocked()) { $('#exportMsg').textContent = 'Unlock the note first.'; return; }
  if (timer) saveNow();
  const r = await api.noteExport(); const m = $('#exportMsg');
  m.textContent = r && r.ok ? 'Saved' + (r.pics ? ' (pictures are not included in the file)' : '') + '.' : r && r.error ? r.error : '';
};
document.addEventListener('keydown', e => { if (KEY(e, 'n_copy')) { e.preventDefault(); copyNote(); } });

async function refreshInfo() {
  chkRow();
  const i = await api.info();
  const g = $('#grp'); g.innerHTML = '';
  const none = document.createElement('option'); none.value = ''; none.textContent = '— No folder —'; g.appendChild(none);
  i.groups.forEach(x => { const o = document.createElement('option'); o.value = x.id; o.textContent = x.name; g.appendChild(o); });
  g.value = note.group || '';
  $('#snapCk').checked = i.snap;
  $('#startup').checked = i.startup; $('#startup').disabled = !i.packaged; $('#startupNote').hidden = i.packaged;
  $('#hideTb').checked = i.hideTaskbar;
  $('#trashCount').textContent = i.trash || '';
}
$('#startup').onchange = async e => { e.target.checked = await api.setStartup(e.target.checked); };
$('#hideTb').onchange = async e => { e.target.checked = await api.setHideTaskbar(e.target.checked); };
$('#allBtn').onclick = () => api.openAll();
$('#newBtn').onclick = () => api.newNote();
$('#tidyBtn').onclick = () => api.tidy();
$('#grp').onchange = e => { note.group = e.target.value || null; api.grpMove(note.id, note.group); };
$('#snapCk').onchange = async e => { e.target.checked = await api.setSnap(e.target.checked); };
$('#chk').onclick = () => { addTodo(); ed.focus(); };
$('#topic').addEventListener('input', e => { note.title = e.target.value; api.update({ title: note.title }); });
$('#topic').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ed.focus(); } });
$('#roll').onclick = async () => { if (timer) saveNow(); note.rolled = await api.roll(!note.rolled); apply(); };

/* ---------- AI helper: summarise and fix grammar ---------- */
let aiCfgState = null, aiBusy = false, aiToken = 0;
const aiBox = $('#aibox');
function aiClose() { aiBox.hidden = true; $('#aiBody').textContent = ''; $('#aiActs').textContent = ''; }
function aiShow(title, body, actions) {
  $('#aiTitle').textContent = title;
  const b = $('#aiBody'); b.textContent = '';
  if (typeof body === 'string') b.textContent = body; else if (body) b.appendChild(body);
  const acts = $('#aiActs'); acts.textContent = '';
  actions.forEach(([label, fn, primary]) => { const x = document.createElement('button'); x.className = 'btn' + (primary ? ' primary' : ''); x.textContent = label; x.onclick = fn; acts.appendChild(x); });
  aiBox.hidden = false;
}
// Shows what changed between two strings, word by word: removed words struck through, new words highlighted.
function diffNode(a, b) {
  const A = a.split(/(\s+)/), B = b.split(/(\s+)/), n = A.length, m = B.length, frag = document.createDocumentFragment();
  const push = (cls, txt) => { if (!txt) return; if (!cls) { frag.appendChild(document.createTextNode(txt)); return; } const s = document.createElement('span'); s.className = cls; s.textContent = txt; frag.appendChild(s); };
  if (n * m > 250000) { push('add', b); return frag; }
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let k = m - 1; k >= 0; k--) L[i][k] = A[i] === B[k] ? L[i + 1][k + 1] + 1 : Math.max(L[i + 1][k], L[i][k + 1]);
  let i = 0, k = 0;
  while (i < n && k < m) { if (A[i] === B[k]) { push('', A[i]); i++; k++; } else if (L[i + 1][k] >= L[i][k + 1]) push('del', A[i++]); else push('add', B[k++]); }
  while (i < n) push('del', A[i++]); while (k < m) push('add', B[k++]);
  return frag;
}
function textSegments() {   // every run of text and every checklist item, so fixes keep pictures and structure intact
  const out = [];
  for (const c of ed.childNodes) {
    if (c.nodeType === 3 && c.nodeValue.trim()) out.push({ text: c.nodeValue, get: () => c.nodeValue, set: v => { c.nodeValue = v; }, ok: () => c.isConnected });
    else if (c.classList && c.classList.contains('todo')) { const tx = c.querySelector('.tx'); if (tx.textContent.trim()) out.push({ text: tx.textContent, get: () => tx.textContent, set: v => { tx.textContent = v; }, ok: () => tx.isConnected }); }
  }
  return out;
}
const noteAsText = () => serialize().map(b => b.t === 'text' ? b.v : b.t === 'check' ? (b.done ? '[x] ' : '[ ] ') + b.v : '').filter(Boolean).join('\n').trim();

function showChecklist(items) {
  const list = document.createElement('div');
  items.forEach(it => { const r = document.createElement('div'); r.className = 'cl' + (it.done ? ' done' : ''); const b = document.createElement('b'), s = document.createElement('span'); s.textContent = it.text; r.append(b, s); list.appendChild(r); });
  const build = mode => {
    const imgs = [...ed.querySelectorAll(':scope > img')];
    if (mode === 'replace') ed.textContent = '';
    else { const last = ed.lastChild; if (last && last.nodeName !== 'BR' && !(last.classList && last.classList.contains('todo')) && !(last.nodeType === 3 && last.nodeValue.endsWith('\n'))) ed.appendChild(document.createElement('br')); }
    items.forEach(it => ed.appendChild(makeTodo(it.text, it.done)));
    if (mode === 'replace') imgs.forEach(i => ed.appendChild(i));   // pictures move below the list
    mark(); queue(); commitNow(); aiClose();
  };
  aiShow('Checklist (' + items.length + ' items)', list, [
    ['Replace', () => build('replace'), true], ['Add below', () => build('add')], ['Cancel', aiClose]
  ]);
}
function showSummary(text) {
  aiShow('Summary', text, [
    ['Add to top', () => { ed.insertBefore(document.createTextNode('Summary:\n' + text + '\n\n'), ed.firstChild); mark(); queue(); commitNow(); aiClose(); }, true],
    ['Copy', async e => { try { await navigator.clipboard.writeText(text); e.target.textContent = 'Copied'; } catch (x) {} }],
    ['Close', aiClose]
  ]);
}
function showGrammar(segs, items) {
  const changed = []; items.forEach((s, i) => { if (s !== segs[i].text) changed.push(i); });
  if (!changed.length) { aiShow('Grammar', 'No mistakes found ✓', [['Close', aiClose, true]]); return; }
  const list = document.createElement('div');
  changed.slice(0, 6).forEach(i => { const d = document.createElement('div'); d.className = 'chg'; d.appendChild(diffNode(segs[i].text.trim(), items[i].trim())); list.appendChild(d); });
  if (changed.length > 6) { const m = document.createElement('div'); m.className = 'more'; m.textContent = '…and ' + (changed.length - 6) + ' more'; list.appendChild(m); }
  aiShow('Grammar suggestions', list, [
    ['Apply ' + (changed.length === 1 ? 'fix' : changed.length + ' fixes'), () => {
      changed.forEach(i => { const s = segs[i]; if (s.ok() && s.get() === s.text) s.set(items[i]); });   // skip anything you edited meanwhile
      mark(); queue(); commitNow(); aiClose();
    }, true],
    ['Cancel', aiClose]
  ]);
}
function showTitle(t) {
  aiShow('Suggested title', t, [
    ['Use this title', () => { const f = $('#topic'); f.value = t; f.dispatchEvent(new Event('input', { bubbles: true })); aiClose(); }, true],
    ['Try again', () => { aiClose(); runAI('title'); }],
    ['Cancel', aiClose]
  ]);
}
async function runAI(task) {
  if (aiBusy || bodyLocked()) return;
  if (!aiCfgState) aiCfgState = (await api.aiGet()) || { provider: 'off' };
  if (aiCfgState.provider === 'off') { showTab('ai'); $('#aiHint').textContent = 'Choose Ollama or Claude below first.'; return; }
  $('#panel').hidden = true; $('#cfg').setAttribute('aria-expanded', 'false');
  if (timer) saveNow();
  let segs = null, payload;
  if (task === 'summarize') {
    payload = { text: noteAsText() };
    if (!payload.text) { aiShow('Summary', 'There is nothing to summarise yet.', [['Close', aiClose, true]]); return; }
  } else if (task === 'title') {
    payload = { text: noteAsText() };
    if (!payload.text) { aiShow('Title', 'There is nothing to title yet.', [['Close', aiClose, true]]); return; }
  } else if (task === 'checklist') {
    payload = { text: noteAsText() };
    if (!payload.text) { aiShow('Checklist', 'There is nothing to turn into a checklist yet.', [['Close', aiClose, true]]); return; }
  } else {
    segs = textSegments();
    if (!segs.length) { aiShow('Grammar', 'There is no text to check yet.', [['Close', aiClose, true]]); return; }
    payload = { items: segs.map(s => s.text) };
  }
  aiBusy = true; const mine = ++aiToken;
  const w = document.createElement('span'), sp = document.createElement('span'); sp.className = 'spin'; w.append(sp, document.createTextNode('Asking the AI…'));
  aiShow(task === 'summarize' ? 'Summary' : task === 'title' ? 'Title' : task === 'checklist' ? 'Checklist' : 'Grammar', w, [['Cancel', () => { aiToken++; aiBusy = false; aiClose(); }]]);
  const r = await api.aiRun(task === 'summarize' ? 'summarize' : task === 'title' ? 'title' : task === 'checklist' ? 'checklist' : 'grammar', payload);
  if (mine !== aiToken) return;   // cancelled
  aiBusy = false;
  if (!r.ok) { aiShow('Something went wrong', r.error, [['Close', aiClose, true]]); return; }
  if (task === 'title') showTitle(r.text); else if (task === 'summarize') showSummary(r.text); else if (task === 'checklist') showChecklist(r.items); else showGrammar(segs, r.items);
}

/* ---------- live edit: the AI rewrites your text right in the note while you watch ---------- */
let edit = null;
const editBar = $('#editbar');
function editBarShow(state, msg) {
  editBar.hidden = false; $('#editMsg').textContent = msg;
  editBar.classList.toggle('run', state === 'run');
  $('#editStop').hidden = state !== 'run'; $('#editUndo').hidden = $('#editKeep').hidden = state !== 'done';
}
const editBarHide = () => { editBar.hidden = true; };
// What gets edited: the selection, or else the block of text that holds the cursor (or the end of the note when continuing).
function editTarget(mode) {
  const sel = getSelection(), inEd = sel.rangeCount && ed.contains(sel.anchorNode);
  const tx = n => { const t = n && (n.nodeType === 1 ? n : n.parentElement); return t && t.closest ? t.closest('.tx') : null; };
  let range, text, inTodo = false;
  if (inEd && !sel.isCollapsed) {
    range = sel.getRangeAt(0).cloneRange();
    if (range.cloneContents().querySelector('img, .todo, input')) return { err: 'Select plain text only (no pictures or checklist items).' };
    text = range.toString(); inTodo = !!tx(range.startContainer);
  } else {
    let node = null;
    if (inEd) {
      const a = sel.anchorNode, t = tx(a);
      if (t) node = t; else if (a.nodeType === 3 && a.parentNode === ed) node = a;
    }
    if (!node) {   // the cursor is somewhere without text: use the last block of text
      const runs = [...ed.childNodes].filter(c => (c.nodeType === 3 && c.nodeValue.trim()) || (c.classList && c.classList.contains('todo') && c.querySelector('.tx').textContent.trim()));
      const last = runs[runs.length - 1]; node = last ? (last.nodeType === 3 ? last : last.querySelector('.tx')) : null;
    }
    if (node) { range = document.createRange(); range.selectNodeContents(node); text = node.textContent; inTodo = node.nodeType === 1; }
    else if (mode === 'continue') { range = document.createRange(); range.selectNodeContents(ed); range.collapse(false); text = ''; }
    else return { err: 'There is no text to edit yet.' };
  }
  if (mode !== 'continue' && !text.trim()) return { err: 'There is no text to edit yet.' };
  return { range, text, inTodo };
}
async function liveEdit() {
  if (edit || aiBusy || bodyLocked()) return;
  if (!aiCfgState) aiCfgState = (await api.aiGet()) || { provider: 'off' };
  if (aiCfgState.provider === 'off') { showTab('ai'); $('#panel').hidden = false; $('#aiHint').textContent = 'Choose Ollama or Claude below first.'; return; }
  const mode = $('#editMode').value, t = editTarget(mode);
  if (t.err) { aiShow('Edit live', t.err, [['Close', aiClose, true]]); return; }
  $('#panel').hidden = true; $('#cfg').setAttribute('aria-expanded', 'false');
  if (timer) saveNow(); commitNow();
  const cont = mode === 'continue', orig = t.text;
  const lead = cont ? (orig && !/\s$/.test(orig) ? (t.inTodo ? ' ' : ' ') : '') : (orig.match(/^\s*/) || [''])[0], trail = cont ? '' : (orig.match(/\s*$/) || [''])[0];
  if (cont) t.range.collapse(false); else t.range.deleteContents();
  const out = document.createTextNode(cont ? lead : orig.match(/^\s*/)[0]); t.range.insertNode(out);
  edit = { id: 'e' + Date.now(), node: out, acc: '', cont, lead, trail, inTodo: t.inTodo, pre: cur };
  ed.contentEditable = 'false'; mark();
  editBarShow('run', 'Editing…');
  const r = await api.aiEdit({ id: edit.id, mode, text: orig });
  void r;
}
function editPaint() {
  const e = edit; if (!e) return;
  let s = e.acc; if (!e.cont) s = s.replace(/^\s+/, '');
  if (e.inTodo) s = s.replace(/\s*[\r\n]+\s*/g, ' ');
  e.node.nodeValue = e.lead + s;
  const rr = document.createRange(); rr.selectNodeContents(e.node);
  const b = rr.getBoundingClientRect(), eb = ed.getBoundingClientRect();
  if (b.bottom > eb.bottom) ed.scrollTop += b.bottom - eb.bottom + 24;
}
function editEnd() { ed.contentEditable = 'true'; edit = null; }
function editRevert() {
  const pre = edit && edit.pre; editEnd();
  restore(pre); editBarHide();
}
function editDone(stopped) {
  if (!edit) return;
  if (stopped || !edit.acc.trim()) { editRevert(); return; }
  let s = edit.acc; if (!edit.cont) s = s.replace(/^\s+/, ''); else s = s.replace(/^\s+/, '').replace(/\s+$/, '');
  s = s.replace(/\s+$/, ''); if (edit.inTodo) s = s.replace(/\s*[\r\n]+\s*/g, ' ');
  edit.node.nodeValue = edit.lead + s + edit.trail;
  editEnd(); ed.focus(); mark(); queue(); commitNow(); saveNow();
  editBarShow('done', 'Done');
}
function editFail(msg) { editRevert(); aiShow('Something went wrong', msg, [['Close', aiClose, true]]); }
api.onAiEvent(m => {
  if (!edit || m.id !== edit.id) return;
  if (m.type === 'chunk') { edit.acc += m.text; editPaint(); }
  else if (m.type === 'done') editDone(!!m.stopped);
  else if (m.type === 'error') editFail(m.error);
});
$('#editStop').onclick = () => { if (edit) api.aiEditStop(edit.id); };
$('#editUndo').onclick = () => { undo(); editBarHide(); };
$('#editKeep').onclick = () => { editBarHide(); ed.focus(); };
$('#aiEdit').onclick = liveEdit;
$('#aiTr').onclick = () => { $('#editMode').value = 'translate'; liveEdit(); };
ed.addEventListener('input', () => { if (!editBar.hidden && !edit) editBarHide(); });
function updateAiButtons() {
  const off = !aiCfgState || aiCfgState.provider === 'off', locked = bodyLocked();
  $('#aiTitle').disabled = $('#aiSum').disabled = $('#aiFix').disabled = $('#aiList').disabled = $('#aiEdit').disabled = $('#aiTr').disabled = off || locked; $('#aiChat').disabled = locked;
  $('#aiHint').textContent = locked ? 'Unlock this note first.' : off ? 'Turn the AI on below to use these.' : 'Works on the text of this note. Select text to translate or edit just that part.';
  if (!locked && !off) modelCheck();
}
// Tells you right away when the chosen Ollama model has not been downloaded, instead of failing on the first request.
let modelCheckBusy = false;
async function modelCheck() {
  const c = aiCfgState; if (modelCheckBusy || !c || c.provider !== 'ollama' || !c.model) return;
  modelCheckBusy = true;
  try {
    const st = await api.ollamaStatus(c.url);
    if (!aiCfgState || aiCfgState.provider !== 'ollama' || bodyLocked()) return;
    const has = n => st && st.models && st.models.some(m => m.name === n || m.name === n + ':latest');
    if (st && !st.running) $('#aiHint').textContent = 'Ollama is not running. Open the Setup section below and press Start.';
    else if (st && st.running && !has(aiCfgState.model)) $('#aiHint').textContent = 'The model "' + aiCfgState.model + '" is not installed yet. Pick it in Setup below and press Download.';
  } catch (e) {} finally { modelCheckBusy = false; }
}
function aiFields() {
  const p = $('#aiProv').value, s = aiCfgState || {};
  $('#aiModel').disabled = $('#aiCred').disabled = p === 'off';
  $('#aiModel').value = s.provider === p ? (s.model || '') : '';
  if (p === 'claude') {
    $('#aiCredLbl').textContent = 'API key'; $('#aiCred').type = 'password'; $('#aiCred').value = '';
    $('#aiCred').placeholder = s.hasKey ? '•••••••• (saved)' : 'sk-ant-…'; $('#aiModel').placeholder = (s.defaultModel || 'claude-haiku-5-5') + ' (default)';
  } else {
    $('#aiCredLbl').textContent = 'Address'; $('#aiCred').type = 'text'; $('#aiCred').value = p === 'ollama' ? (s.url || 'http://localhost:11434') : '';
    $('#aiCred').placeholder = 'http://localhost:11434'; $('#aiModel').placeholder = p === 'ollama' ? 'e.g. llama3.2' : '';
  }
  $('#aiClear').hidden = !(p === 'claude' && s.hasKey);
  OllamaUI.refresh();
}
OllamaUI.init({ onSaved: m => { $('#aiMsg').textContent = m; aiLoadQuiet(); } });
async function aiLoadQuiet() { aiCfgState = (await api.aiGet()) || aiCfgState; updateAiButtons(); }
async function aiLoad() { aiCfgState = (await api.aiGet()) || { provider: 'off', model: '', url: '', hasKey: false }; $('#aiProv').value = aiCfgState.provider; aiFields(); updateAiButtons(); }
$('#aiProv').onchange = aiFields;
$('#aiSum').onclick = () => runAI('summarize');
$('#aiFix').onclick = () => runAI('grammar');
$('#aiList').onclick = () => runAI('checklist');
$('#aiChat').onclick = () => { if (timer) saveNow(); api.openChat(note.id); };
$('#aiSave').onclick = async () => {
  const p = $('#aiProv').value, patch = { provider: p, model: $('#aiModel').value };
  if (p === 'ollama') patch.url = $('#aiCred').value;
  if (p === 'claude' && $('#aiCred').value.trim()) patch.key = $('#aiCred').value;
  await api.aiSet(patch); await aiLoad(); $('#aiMsg').textContent = 'Saved.';
};
$('#aiTest').onclick = async () => {
  await $('#aiSave').onclick(); $('#aiMsg').textContent = 'Testing…';
  const r = await api.aiRun('ping'); $('#aiMsg').textContent = r.ok ? 'Connected ✓' : r.error;
};
$('#aiClear').onclick = async () => { await api.aiSet({ clearKey: true }); await aiLoad(); $('#aiMsg').textContent = 'Key removed.'; };
$('#allTop').onclick = () => api.openAll();
$('#openSettings').onclick = () => { $('#panel').hidden = true; $('#cfg').setAttribute('aria-expanded', 'false'); api.openSettings(); };

/* ---------- lock ---------- */
const lockMsg = t => { $('#lockmsg').textContent = t; };
async function lockNow() { if (timer) saveNow(); await api.relock(); await reload(); }
$('#lockBtn').onclick = async () => {
  const pw = $('#lockpw').value;
  if (pw.length < 4) { lockMsg('Use at least 4 characters.'); return; }
  if (timer) saveNow();
  if (await api.lock(pw)) { $('#lockpw').value = ''; lockMsg(''); await reload(); } else lockMsg('Could not lock this note.');
};
$('#lock').onclick = async () => {
  if (note.locked && note.unlocked) await lockNow();
  else if (note.locked) $('#pw').focus();
};
$('#relockBtn').onclick = lockNow;
$('#unlockBtn').onclick = async () => {
  if (await api.unlock($('#pw').value)) { $('#pw').value = ''; $('#pwmsg').textContent = ''; await reload(); ed.focus(); }
  else $('#pwmsg').textContent = 'Wrong password.';
};
$('#pw').addEventListener('keydown', e => { if (e.key === 'Enter') $('#unlockBtn').click(); });
$('#rmLockBtn').onclick = async () => {
  if (await api.removeLock($('#rmpw').value)) { $('#rmpw').value = ''; lockMsg('Lock removed.'); await reload(); } else lockMsg('Wrong password.');
};
$('#trashBtn').onclick = () => api.openTrash();
let lastWarm = 0;
function warmModel() {   // opening the AI tab means you are about to use it: load the local model now (never at start-up)
  if (Date.now() - lastWarm < 240000) return; lastWarm = Date.now();
  try { api.aiWarmup(); } catch (e) {}
}
function showTab(t) {
  if (!['style', 'note', 'app', 'ai'].includes(t)) t = 'style';
  ['style', 'note', 'app', 'ai'].forEach(k => { $('#pg-' + k).hidden = k !== t; });
  document.querySelectorAll('.tabs button[data-tab]').forEach(b => { const on = b.dataset.tab === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  try { localStorage.setItem('sp.tab', t); } catch (e) {}
  $('#panel').scrollTop = 0;
  if (t === 'ai') { aiLoad(); warmModel(); }
}
document.querySelectorAll('.tabs button[data-tab]').forEach(b => { b.onclick = () => showTab(b.dataset.tab); });
$('#cfg').onclick = () => {
  const p = $('#panel'); p.hidden = !p.hidden; $('#cfg').setAttribute('aria-expanded', !p.hidden);
  if (!p.hidden) { let t = 'style'; try { t = localStorage.getItem('sp.tab') || 'style'; } catch (e) {} showTab(t); refreshInfo(); }
};
$('#close').onclick = () => { if (timer) saveNow(); api.close(); };
$('#del').onclick = () => api.remove();
document.addEventListener('keydown', e => {
  if (e.ctrlKey && !e.altKey && document.activeElement === document.body && !bodyLocked()) {
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return; }
  }
});
document.addEventListener('keydown', e => {   // Ctrl+A anywhere outside a text field selects the whole note
  if (e.ctrlKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'a' && !bodyLocked()) {
    const a = document.activeElement, tag = a && a.tagName;
    if (a !== ed && !(a && a.closest && a.closest('#ed')) && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') { e.preventDefault(); ed.focus(); selectAllNote(); }
  }
});
document.addEventListener('keydown', e => { if (KEY(e, 'n_new')) { e.preventDefault(); api.newNote(); } });
document.addEventListener('keydown', e => { if (KEY(e, 'n_edit')) { e.preventDefault(); liveEdit(); } });
document.addEventListener('keydown', e => { if (KEY(e, 'n_settings')) { e.preventDefault(); openAllSettings(); } });
function openAllSettings(section) { $('#panel').hidden = true; $('#cfg').setAttribute('aria-expanded', 'false'); api.openSettings(section); }
$('#tabSettings').onclick = () => openAllSettings();
