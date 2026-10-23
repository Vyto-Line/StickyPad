const $ = s => document.querySelector(s);
const ed = $('#ed'), MAXW = 800;
let note, timer;
let KEYMAP = StickyKeys.DEFAULTS;   // the shortcuts (Settings > Shortcuts can change them)
const KEY = (e, id) => StickyKeys.matches(e, KEYMAP[id]);
if (window.api.onKeys) api.onKeys(m => { KEYMAP = m || StickyKeys.DEFAULTS; });
const srcCache = new Map();
let themeId = 'classic', scopeAll = false, uiDarkNow = false;
const TH = window.StickyThemes;

const isDark = hex => TH.wantsLightText(hex);   // light text reads better on this colour (WCAG contrast)

/* ---------- themes ---------- */
function buildSwatches() {
  document.querySelectorAll('.sw[data-c]').forEach(x => x.remove());
  TH.palette(themeId, uiDarkNow).forEach(c => {
    const b = document.createElement('button'); b.className = 'sw'; b.dataset.c = c;
    b.style.background = c; b.title = c; b.setAttribute('aria-label', 'Colour ' + c);
    b.onclick = () => set({ color: c }); $('#swatches').insertBefore(b, $('#customSw'));
  });
  if (note) apply();
}
function buildThemes() {   // (the theme picker now lives in Settings > Appearance; kept for windows that still have it)
  const box = $('#themes'); if (!box) return; box.textContent = '';
  TH.THEMES.forEach(t => {
    const b = document.createElement('button'); b.className = 'theme' + (t.id === themeId ? ' on' : ''); b.type = 'button';
    b.setAttribute('aria-pressed', t.id === themeId); b.title = t.name + ' theme';
    const dots = document.createElement('span'); dots.className = 'dots';
    TH.palette(t.id, uiDarkNow).slice(0, 4).forEach(c => { const d = document.createElement('i'); d.style.background = c; dots.appendChild(d); });
    const nm = document.createElement('span'); nm.textContent = t.name;
    b.append(dots, nm); b.onclick = () => applyTheme(t.id); box.appendChild(b);
  });
}
function paintScope() { if (!$('#scopeThis')) return; $('#scopeThis').classList.toggle('on', !scopeAll); $('#scopeAll').classList.toggle('on', scopeAll); }
async function applyTheme(id) {
  themeId = id; buildThemes(); buildSwatches();
  const t = TH.byId(id);
  if (scopeAll) { await api.themeApplyAll(id); }   // the app updates every note and tells each window
  else { await api.themeSet(id); set({ color: TH.mapColor(note.color, id, 0, uiDarkNow), font: t.font }); }
}
if ($('#scopeThis')) { $('#scopeThis').onclick = () => { scopeAll = false; try { localStorage.setItem('sp.scope', 'this'); } catch (e) {} paintScope(); }; $('#scopeAll').onclick = () => { scopeAll = true; try { localStorage.setItem('sp.scope', 'all'); } catch (e) {} paintScope(); }; }
api.onStyle(st => { note.color = st.color; note.font = st.font; apply(); });
// the app-wide theme changed (another theme, or light/dark): new swatches and the theme's accent colour
if (api.onUiTheme) api.onUiTheme(t => { if (!t) return; themeId = t.id; uiDarkNow = !!t.dark; buildThemes(); buildSwatches(); });

function apply() {
  document.documentElement.style.setProperty('--bg', note.color);
  const dk = isDark(note.color); document.body.classList.toggle('dark', dk);
  const acc = TH.byId(themeId).ui[dk ? 'dark' : 'light'];   // the theme's accent, in the version that reads well on this note
  document.body.style.setProperty('--accent', acc.accent); document.body.style.setProperty('--on-accent', acc.onAccent);
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
  $('#lockSum').textContent = note.locked ? 'On' : 'Off';
  $('#lockNew').hidden = !!note.locked; $('#lockOld').hidden = !note.locked || locked;
  $('#pin').classList.toggle('on', note.pinned);
  $('#pin').setAttribute('aria-pressed', note.pinned);
  $('#size').value = note.size; $('#sizeLabel').textContent = note.size + 'px';
  const op = Number.isFinite(note.opacity) ? note.opacity : 1, tr = Math.round((1 - op) * 100); $('#opac').value = tr; $('#opacLabel').textContent = tr + '%';
  // "keep the text solid": the window is see-through and only the background gets the transparency (needs the GPU on)
  $('#solidText').checked = !!note.solidText && !!note.solidOk; $('#solidText').disabled = !note.solidOk; $('#solidHint').hidden = !!note.solidOk;
  const rgb = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(note.color || '');
  if (note.solidText && note.solidOk && rgb && op < 1) document.documentElement.style.setProperty('--bgA', `rgba(${parseInt(rgb[1], 16)},${parseInt(rgb[2], 16)},${parseInt(rgb[3], 16)},${op})`);
  else document.documentElement.style.removeProperty('--bgA');
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
  ed.spellcheck = !blocks.some(b => b.t === 'text' && b.v.length > 200000);   // checking the spelling of millions of letters makes a huge note crawl
  blocks.forEach(b => {
    if (b.t === 'img') { const src = b.src || srcCache.get(b.id); if (src) ed.appendChild(makeImg(b.id, src)); }
    else if (b.t === 'check') ed.appendChild(makeTodo(b.v, b.done));
    else if (b.v.length > BIG_TEXT) bigText(b.v);
    else ed.appendChild(document.createTextNode(b.v));
  });
  mark();
}
// A very long text (hundreds of thousands of letters) is shown as many short blocks of about 100 lines. One giant block has to be laid out again
// as a whole at every key press (about 0.3 s for 2 MB); short blocks only redo the one you type in. The text is exactly the same: each block
// keeps its own line breaks, and serialize() joins them back without adding or losing anything.
const BIG_TEXT = 20000, CHUNK_LINES = 100;   // from 20,000 letters (about 3,500 words) a note is drawn in short blocks: typing in one block of 190,000 letters took 130 ms a key, now 33
function bigText(v) {
  const lines = v.split('\n'), last = lines.length - 1;
  for (let i = 0; i <= last; i += CHUNK_LINES) {
    const end = Math.min(last + 1, i + CHUNK_LINES), d = document.createElement('div');
    d.className = end > last ? 'chunk last' : 'chunk'; d.style.setProperty('--l', end - i);   // --l: how many lines (the page guesses the height of blocks it has not drawn yet from it)
    d.textContent = lines.slice(i, end).join('\n') + (end > last ? '' : '\n');
    ed.appendChild(d);
  }
}
// Reading a huge note back out of the page takes a while, and it was done again and again (on opening, for the undo copy, for the date check, for saving).
// The result is kept until something in the editor really changes. Checklists are left out because ticking a box changes no element.
let memoBlocks = null;
const memoWatch = new MutationObserver(() => { memoBlocks = null; });
memoWatch.observe(ed, { childList: true, characterData: true, subtree: true, attributes: true });
function serialize() {
  if (memoWatch.takeRecords().length) memoBlocks = null;
  if (memoBlocks) return memoBlocks;
  const out = serializeNow();
  if (ed.textContent.length > 100000 && !ed.querySelector('.todo')) { memoWatch.takeRecords(); memoBlocks = out; }
  return out;
}
function serializeNow() {
  // The text is collected in pieces and joined at the end. Asking a half-built giant string whether it ends with a line break forces the browser to
  // glue it together each time, which took almost a second for a 3.7 MB note.
  const blocks = []; let parts = [], size = 0, endNl = false;
  const add = t => { if (t) { parts.push(t); size += t.length; endNl = t.charCodeAt(t.length - 1) === 10; } };
  const flush = () => { if (size) { blocks.push({ t: 'text', v: parts.join('') }); parts = []; size = 0; endNl = false; } };
  const walk = node => {
    for (const c of node.childNodes) {
      if (c.nodeType === 3) add(c.nodeValue);
      else if (c.nodeName === 'BR') add('\n');
      else if (c.nodeName === 'IMG') { flush(); if (c.dataset.id) blocks.push({ t: 'img', id: c.dataset.id }); }
      else if (c.classList && c.classList.contains('todo')) {
        flush(); const tx = c.querySelector('.tx'), box = c.querySelector('input');
        if (tx) blocks.push({ t: 'check', v: tx.textContent, done: !!(box && box.checked) });
        else { const w = c.textContent.replace(/×/g, ''); if (w.trim()) blocks.push({ t: 'text', v: w }); }   // damaged item: keep its words
      }
      else if (c.nodeType === 1) { if (size && !endNl) add('\n'); walk(c); if (size && !endNl && !(c.classList && c.classList.contains('last') && c.classList.contains('chunk'))) add('\n'); }
    }
  };
  walk(ed);
  if (size && endNl) { const last = parts.pop(); size -= 1; const cut = last.slice(0, -1); if (cut) parts.push(cut); }   // the browser's trailing placeholder line break
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
ed.addEventListener('focus', () => { const p = $('#panel'); if (!p.hidden && !document.body.classList.contains('dock')) {   // when the panel sits beside the text it stays open
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
  const atStart = (r.startContainer === ed && r.startOffset === 0) || (r.startOffset === 0 && (r.startContainer === first || first.contains(r.startContainer)) && (first.nodeType === 3 || r.startContainer === first || (first.classList && first.classList.contains('chunk'))));
  const atEnd = (r.endContainer === ed && r.endOffset === n) || (last.nodeType === 3 && r.endContainer === last && r.endOffset === last.nodeValue.length) || (last.classList && last.classList.contains('chunk') && r.endContainer.nodeType === 3 && last.contains(r.endContainer) && r.endOffset === r.endContainer.nodeValue.length);
  return atStart && atEnd;
}
function clearNote() {   // empties the note completely and leaves a clean caret
  ed.replaceChildren();
  const r = document.createRange(); r.selectNodeContents(ed); r.collapse(true); placeCaret(r);
  mark(); queue();
}
// In a very long note the blocks far away are not drawn yet, and the browser cannot put the caret inside one: Ctrl+End goes there by itself.
function bigEnd() {
  const last = ed.lastElementChild; if (!last || !last.classList.contains('chunk')) return false;
  ed.scrollTop = ed.scrollHeight;   // draws the last blocks (twice: the first guess of their height is corrected once they are drawn)
  const r = document.createRange(); let n = last; while (n.lastChild) n = n.lastChild;
  if (n.nodeType === 3) r.setStart(n, n.nodeValue.length); else r.selectNodeContents(last);
  r.collapse(false); placeCaret(r);
  ed.scrollTop = ed.scrollHeight; return true;
}
ed.addEventListener('keydown', e => {
  if (e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'End' && bigEnd()) { e.preventDefault(); return; }
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
// What to paste as text: cells copied from Excel come with a trailing line break that would add an empty line.
function pasteText(cd) {
  let t = cd.getData('text/plain');
  if (/\r?\n$/.test(t) && /<table|Excel\.Sheet|schemas-microsoft-com:office:excel/i.test(cd.getData('text/html'))) t = t.replace(/\r?\n$/, '');
  return t;
}
ed.addEventListener('paste', e => {
  e.preventDefault();
  const t = pasteText(e.clipboardData);
  // Excel (and some other apps) put the text AND a picture of it on the clipboard: when there is text, the text wins.
  // A picture is pasted only when there is nothing to read.
  if (/\S/.test(t)) { insertText(t); mark(); queue(); schedule(); return; }
  const imgs = [...(e.clipboardData.files || [])].filter(f => f.type.startsWith('image/'));
  if (imgs.length) { addFiles(imgs); return; }
  if (t) { insertText(t); mark(); queue(); schedule(); }
});
// Copy and cut: a checklist item is copied as its words only (no tick box, no remove button, no [x]).
function plainFrom(frag) {
  let out = '', endNl = false;   // endNl: the line break at the very end was added after a checklist item, not typed
  const add = t => { if (t) { out += t; endNl = false; } };
  const nl = () => { if (out && !out.endsWith('\n')) { out += '\n'; endNl = true; } };
  (function walk(n) {
    for (const c of n.childNodes) {
      if (c.nodeType === 3) add(c.nodeValue);
      else if (c.nodeName === 'BR') add('\n');
      else if (c.nodeType === 1) {
        if (c.nodeName === 'INPUT' || c.nodeName === 'IMG' || c.classList.contains('x')) continue;
        if (c.classList.contains('todo')) { nl(); walk(c); nl(); } else walk(c);
      }
    }
  })(frag);
  return endNl ? out.replace(/\n$/, '') : out;
}
function copyCut(e) {
  const sel = getSelection(); if (!sel.rangeCount || sel.isCollapsed || !ed.contains(sel.anchorNode)) return;
  const r = sel.getRangeAt(0);
  if (![...ed.querySelectorAll('.todo')].some(t => r.intersectsNode(t))) return;   // no checklist in the selection: the normal copy
  e.preventDefault(); e.clipboardData.setData('text/plain', plainFrom(r.cloneContents()));
  if (e.type === 'cut') document.execCommand('delete');
}
ed.addEventListener('copy', copyCut); ed.addEventListener('cut', copyCut);
ed.addEventListener('dragover', e => e.preventDefault());
ed.addEventListener('drop', e => {
  e.preventDefault();
  const imgs = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
  if (imgs.length) { addFiles(imgs); return; }
  const t = e.dataTransfer.getData('text/plain');
  if (t) { insertText(t); mark(); queue(); schedule(); }
});

/* ---------- Ctrl + mouse wheel: bigger or smaller text ---------- */
let zoomAcc = 0, zoomAt = 0;
document.addEventListener('wheel', e => {
  if (!e.ctrlKey) return;
  e.preventDefault();   // (also stops the page from zooming as a picture)
  if (!note || bodyLocked()) return;
  const now = Date.now(); if (now - zoomAt > 400) zoomAcc = 0; zoomAt = now;
  zoomAcc += e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;   // a mouse notch is about 100; a touchpad sends many small ones
  const n = Math.min(4, Math.floor(Math.abs(zoomAcc) / 40)); if (!n) return;
  const step = (zoomAcc < 0 ? 1 : -1) * n; zoomAcc = 0;
  const sz = Math.max(10, Math.min(48, Math.round(note.size || 15) + step));
  if (sz !== note.size) set({ size: sz });
}, { passive: false });

/* ---------- text prediction: after a few letters, offers words you have used before ---------- */
const SW = window.StickyWords, acBox = $('#ac');
let wordsMain = [], ownWords = null, ownAt = 0, ownDirty = true, acList = [], acIdx = 0, acNav = false, acFor = '';
const predictOn = () => !!(note && note.predict !== false && SW && !bodyLocked());
async function loadWords() { try { wordsMain = (api.wordsGet ? await api.wordsGet() : []) || []; } catch (e) { wordsMain = []; } }
function ownMap() {   // the words of this note (kept for 1.5 s while you type, so a long note stays quick)
  if (!ownWords || (ownDirty && Date.now() - ownAt > 1500)) {
    let t = ''; const tw = document.createTreeWalker(ed, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n && t.length < 400000; n = tw.nextNode()) {
      if (n.nodeType === 3) t += n.nodeValue;
      else if (n.nodeName === 'BR' || n.nodeName === 'IMG' || n.classList.contains('todo') || n.classList.contains('x')) t += '\n';
    }
    ownWords = SW.add(SW.newMap(), t); ownAt = Date.now(); ownDirty = false;
  }
  return ownWords;
}
function acHide() { acBox.hidden = true; acList = []; acNav = false; acFor = ''; }
function acPrefixNow() {
  const s = getSelection();
  if (!s.rangeCount || !s.isCollapsed || !ed.contains(s.anchorNode) || s.anchorNode.nodeType !== 3) return null;
  return SW.prefixAt(s.anchorNode.nodeValue, s.anchorOffset);
}
function acPaint() {
  acBox.replaceChildren();
  acList.forEach((w, i) => {
    const d = document.createElement('div'); d.className = 'acr' + (i === acIdx ? ' on' : ''); d.setAttribute('role', 'option'); d.setAttribute('aria-selected', i === acIdx ? 'true' : 'false');
    const a = document.createElement('span'); a.className = 'pre'; a.textContent = w.slice(0, acFor.length);
    const b = document.createElement('b'); b.textContent = w.slice(acFor.length); d.append(a, b);
    if (i === acIdx) { const k = document.createElement('kbd'); k.textContent = 'Tab'; d.append(k); }
    d.onmousedown = ev => { ev.preventDefault(); acAccept(i); };   // (mousedown, so the note keeps its caret)
    acBox.appendChild(d);
  });
  acBox.hidden = false;
  const r = getSelection().getRangeAt(0).cloneRange(); r.collapse(true);
  let rc = r.getClientRects()[0];
  if (!rc) { const el = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement; rc = el.getBoundingClientRect(); }
  const bw = acBox.offsetWidth, bh = acBox.offsetHeight;
  const x = Math.max(4, Math.min(rc.left, innerWidth - bw - 4));
  let y = rc.bottom + 3; if (y + bh > innerHeight - 4) y = Math.max(4, rc.top - bh - 3);
  acBox.style.left = x + 'px'; acBox.style.top = y + 'px';
}
function acUpdate(e) {
  if (!predictOn() || (e && (e.isComposing || /^(insertFromPaste|insertFromDrop|history)/.test(e.inputType || '')))) { acHide(); return; }
  const p = acPrefixNow(); if (!p) { acHide(); return; }
  ownDirty = true;
  const list = SW.suggest(p, 5, [wordsMain], ownMap());
  if (!list.length) { acHide(); return; }
  acList = list; acIdx = 0; acNav = false; acFor = p; acPaint();
}
function acAccept(i) {
  const w = acList[i], p = acFor; if (!w) return;
  acHide(); commitNow();   // so Ctrl+Z takes back just the finished word
  insertText(SW.rest(p, w)); mark(); queue(); commitNow(); ownDirty = true;
}
ed.addEventListener('input', acUpdate);
ed.addEventListener('keydown', e => {
  if (acBox.hidden || e.isComposing) return;
  const plain = !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey;
  if (plain && e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); acAccept(acIdx); }
  else if (plain && e.key === 'Enter' && acNav) { e.preventDefault(); e.stopPropagation(); acAccept(acIdx); }   // Enter finishes the word only after you picked one with the arrows
  else if (plain && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); e.stopPropagation(); acIdx = (acIdx + (e.key === 'ArrowDown' ? 1 : acList.length - 1)) % acList.length; acNav = true; acPaint(); }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); acHide(); }
}, true);
document.addEventListener('selectionchange', () => { if (!acBox.hidden && acPrefixNow() !== acFor) acHide(); });
ed.addEventListener('blur', acHide); ed.addEventListener('scroll', acHide);
window.addEventListener('blur', acHide);

/* ---------- startup ---------- */
async function reload() {
  note = await api.get(); if (note && note.keys) KEYMAP = note.keys;
  render(note.blocks && note.blocks.length ? note.blocks : (note.text && !note.locked ? [{ t: 'text', v: note.text }] : []));
  apply(); remindPaint(); undoS = []; redoS = []; undoChars = 0; cur = snap(); ownDirty = true; acHide(); loadWords();
}
/* ---------- find in note (Ctrl+F) ---------- */
const FIND_MAX = 500000, FIND_PAINT = 1500;   // every match is counted (up to half a million); only the ones near the current match are painted, which keeps a huge note fast
let finds = [], findAt = -1, findTimer = null;
const FMEMO = new Map(), ASCII = /^[\x00-\x7f]*$/;
const fold1 = ch => {
  let r = FMEMO.get(ch);
  if (r === undefined) { const f = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); const c = f === 'ς' ? 'σ' : f; r = c.length === 1 ? c : ch.toLowerCase().slice(0, 1) || ch; if (FMEMO.size < 5000) FMEMO.set(ch, r); }
  return r;
};
const foldAll = s => { if (ASCII.test(s)) return s.toLowerCase(); let o = ''; for (const ch of s) o += fold1(ch); return o; };   // ignores case and Greek/Latin accents, one character in -> one character out
// Where the matches are: [{ n: text node, i: position }]. (A range is only made for a match when it is painted or visited.)
function findRanges(q) {
  const out = []; if (!q) return out;
  const needle = foldAll(q);
  const tw = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement && n.parentElement.closest('.x') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  for (let n = tw.nextNode(); n && out.length < FIND_MAX; n = tw.nextNode()) {
    const t = n.nodeValue; if (t.length < needle.length) continue;
    const hay = foldAll(t); if (hay.length !== t.length) continue;   // (never expected; skip a node that would shift positions)
    for (let i = hay.indexOf(needle); i !== -1 && out.length < FIND_MAX; i = hay.indexOf(needle, i + needle.length)) out.push({ n, i, len: needle.length });
  }
  return out;
}
const rangeOf = f => { const r = document.createRange(); r.setStart(f.n, f.i); r.setEnd(f.n, f.i + f.len); return r; };
function findPaint() {
  const hl = window.CSS && CSS.highlights; if (!hl) return;
  hl.delete('find'); hl.delete('find-cur');
  if (!finds.length) return;
  const from = Math.max(0, findAt - FIND_PAINT), to = Math.min(finds.length, Math.max(findAt, 0) + FIND_PAINT);
  const rs = []; for (let k = from; k < to; k++) { try { rs.push(rangeOf(finds[k])); } catch {} }
  hl.set('find', new Highlight(...rs));
  if (findAt >= 0) { try { hl.set('find-cur', new Highlight(rangeOf(finds[findAt]))); } catch {} }
}
function findCount() {
  const q = $('#findIn').value;
  $('#findCnt').textContent = !q ? '' : !finds.length ? 'No match' : (findAt + 1).toLocaleString() + ' / ' + finds.length.toLocaleString() + (finds.length >= FIND_MAX ? '+' : '');
  if (q && window.StickyAccess) StickyAccess.announce($('#findCnt').textContent === 'No match' ? 'No match' : 'Match ' + $('#findCnt').textContent.replace('/', 'of'));
}
function findGo(i, scroll = true) {
  if (!finds.length) { findAt = -1; findPaint(); findCount(); return; }
  findAt = (i + finds.length) % finds.length; findPaint(); findCount();
  if (!scroll) return;
  let r; try { r = rangeOf(finds[findAt]).getBoundingClientRect(); } catch { return; }
  const box = ed.getBoundingClientRect();
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

// The settings panel sits beside the text: a narrow note grows wider while it is open (the app does that), and goes back when it closes.
new MutationObserver(async () => {
  const open = !$('#panel').hidden;
  if (open && screen.availWidth >= 700) document.body.classList.add('dock');   // at once, so nothing jumps
  const docked = await api.panel(open);
  document.body.classList.toggle('dock', !!docked && open);
  if (!open) document.body.classList.remove('dock');
}).observe($('#panel'), { attributes: true, attributeFilter: ['hidden'] });

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
  const all = noteAsText(), found = StickyDates.first(all.length > 100000 ? all.slice(0, 100000) : all, Date.now());   // a huge note is only searched at its start
  if (!found || dateDismissed.has(found.text + '|' + found.at)) { bar.hidden = true; dateFound = null; return; }
  dateFound = found;
  const when = new Date(found.at), now = new Date(), sameDay = when.toDateString() === now.toDateString();
  const label = (sameDay ? 'today' : when.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })) + ' ' + when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  $('#dateTxt').textContent = `“${found.text.length > 18 ? found.text.slice(0, 17) + '…' : found.text}” → ${label}`;
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
  $('#remSum').textContent = t ? new Date(t).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : 'None';
  $('#remMsg').textContent = t ? 'Reminder: ' + new Date(t).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Pick a time and a Windows notification will bring this note back.';
}
async function remindSet(ts) { const v = await api.remind(ts); if (note) note.remind = v; remindPaint(); }
$('#remAt').addEventListener('change', () => { const t = REM.fromLocalInput($('#remAt').value); if (t > Date.now()) remindSet(t); else if (!$('#remAt').value) remindSet(0); else $('#remMsg').textContent = 'Pick a time in the future.'; });
$('#remClear').onclick = () => remindSet(0);
document.querySelectorAll('.rq').forEach(b => { b.onclick = () => remindSet(REM.quick(b.dataset.q, Date.now())); });

// An answer from the AI chat was put into this note: show it and keep Ctrl+Z working (the text from before is one step back)
async function appliedFromChat() {
  commitNow();                                   // anything typed a moment ago becomes its own undo step
  const before = cur; clearTimeout(timer); timer = null;   // the app already holds the new text: a late save of the old text must not overwrite it
  note = await api.get(); if (note && note.keys) KEYMAP = note.keys;
  render(note.blocks && note.blocks.length ? note.blocks : (note.text && !note.locked ? [{ t: 'text', v: note.text }] : []));
  apply(); remindPaint();
  const s = snap(); if (s !== before) { pushUndo(before); redoS.length = 0; cur = s; }
}
api.onApplied(() => { appliedFromChat().catch(() => {}); });
api.onReload(() => { if (!timer && !edit && document.activeElement !== $('#topic')) reload(); });   // a note changed on another PC
(async () => {
  await reload();
  aiLoad();
  try { themeId = ((await api.info()) || {}).theme || 'classic'; } catch (e) {}
  try { const ut = api.uiTheme ? await api.uiTheme() : null; if (ut) { themeId = ut.id; uiDarkNow = !!ut.dark; } } catch (e) {}
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
$('#opac').addEventListener('input', e => set({ opacity: 1 - (+e.target.value) / 100 }));
$('#solidText').addEventListener('change', e => set({ solidText: e.target.checked }));
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
    else if (b.t === 'check') out += (out && !out.endsWith('\n') ? '\n' : '') + b.v + '\n';   // just the words: no [ ] or [x]
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
async function printThis() {
  const m = $('#exportMsg');
  if (bodyLocked()) { m.textContent = 'Unlock the note first.'; return; }
  if (timer) saveNow();
  const r = await api.notePrint(); m.textContent = r && r.error ? r.error : '';
}
$('#printBtn').onclick = printThis;
document.addEventListener('keydown', e => { if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); printThis(); } });
$('#exportBtn').onclick = async () => {
  if (bodyLocked()) { $('#exportMsg').textContent = 'Unlock the note first.'; return; }
  if (timer) saveNow();
  const r = await api.noteExport(); const m = $('#exportMsg');
  m.textContent = r && r.ok ? 'Saved' + (r.picsLeftOut ? ' (plain text files cannot hold pictures: use .stickypad or Markdown to keep them)' : '') + '.' : r && r.error ? r.error : '';
};
document.addEventListener('keydown', e => { if (KEY(e, 'n_copy')) { e.preventDefault(); copyNote(); } });

async function refreshInfo() {
  chkRow();
  const i = await api.info();
  const g = $('#grp'); g.innerHTML = '';
  const none = document.createElement('option'); none.value = ''; none.textContent = '— No folder —'; g.appendChild(none);
  i.groups.forEach(x => { const o = document.createElement('option'); o.value = x.id; o.textContent = x.name; g.appendChild(o); });
  g.value = note.group || ''; grpPaint();
}
function grpPaint() { const g = $('#grp'), o = g.selectedOptions[0]; $('#grpSum').textContent = g.value && o ? o.textContent : 'None'; }
$('#grp').onchange = e => { note.group = e.target.value || null; api.grpMove(note.id, note.group); grpPaint(); };
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
      if (t) node = t; else if (a.nodeType === 3 && a.parentNode === ed && (a.nodeValue.trim() || mode === 'continue')) node = a;   // an empty text node (left behind by an earlier edit) is not a place to work
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
  const r = await api.aiEdit({ id: edit.id, mode, text: orig, to: mode === 'translate' ? trTo || undefined : undefined });
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
  if (window.StickyAccess) StickyAccess.announce('The AI has finished editing the note.');
  editEnd(); ed.focus(); mark(); queue(); commitNow(); saveNow();
  editBarShow('done', 'Done');
}
function editFail(msg) { if (window.StickyAccess) StickyAccess.announce(msg); editRevert(); aiShow('Something went wrong', msg, [['Close', aiClose, true]]); }
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
// Translate…: a small menu. The note's language is detected here and shown as "Greek (Auto-detected)"; that language is greyed out in the list.
let trTo = null;
const trMenu = $('#trmenu');
function trClose() { trMenu.hidden = true; $('#aiTr').setAttribute('aria-expanded', 'false'); }
function trRender(src) {
  const q = $('#trSearch').value.trim().toLowerCase(), box = $('#trList'); box.textContent = '';
  let last = ''; try { last = localStorage.getItem('sp.trTo') || ''; } catch (e) {}
  const items = StickyLangs.LANGS.filter(l => !q || l.name.toLowerCase().includes(q) || l.native.toLowerCase().includes(q));
  items.forEach(l => {
    const b = document.createElement('button'), same = !!(src && src.code === l.code);
    b.type = 'button'; b.className = 'tritem'; b.setAttribute('role', 'option'); b.dataset.code = l.code; b.disabled = same;
    b.setAttribute('aria-selected', l.code === last && !same ? 'true' : 'false');
    const n = document.createElement('span'); n.textContent = l.name; b.appendChild(n);
    const s = document.createElement('span'); s.className = 'nat'; s.textContent = same ? 'same as the note' : l.native; b.appendChild(s);
    b.onclick = () => { try { localStorage.setItem('sp.trTo', l.code); } catch (e) {} trGo(l.code); };
    box.appendChild(b);
  });
  if (!items.length) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = 'No language matches.'; box.appendChild(p); }
}
function trOpen() {
  if (edit || aiBusy || bodyLocked()) return;
  if (!trMenu.hidden) { trClose(); return; }   // the button opens and closes the list
  if (!aiCfgState || aiCfgState.provider === 'off') { liveEdit(); return; }   // shows the "turn the AI on" hint
  const t = editTarget('translate');
  if (t.err) { aiShow('Translate', t.err, [['Close', aiClose, true]]); return; }
  const src = StickyLangs.detect(t.text);
  $('#trFrom').textContent = src ? src.name + ' (Auto-detected)' : 'Auto-detected';
  $('#trSearch').value = ''; trRender(src);
  trMenu.hidden = false; trMenu._src = src; $('#aiTr').setAttribute('aria-expanded', 'true'); trMenu.scrollIntoView({ block: 'nearest' });
  const pick = trMenu.querySelector('.tritem[aria-selected="true"]:not(:disabled)') || trMenu.querySelector('.tritem:not(:disabled)');
  (pick || $('#trSearch')).focus();
}
function trGo(code) { trClose(); trTo = code; $('#editMode').value = 'translate'; liveEdit().finally(() => { trTo = null; }); }
$('#aiTr').onclick = trOpen;
$('#trClose').onclick = () => { trClose(); $('#aiTr').focus(); };
$('#trSearch').addEventListener('input', () => trRender(trMenu._src));
trMenu.addEventListener('keydown', e => {
  const items = [...trMenu.querySelectorAll('.tritem:not(:disabled)')], i = items.indexOf(document.activeElement);
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); trClose(); $('#aiTr').focus(); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0] || $('#trSearch')).focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); if (i <= 0) $('#trSearch').focus(); else items[i - 1].focus(); }
  else if (e.key === 'Enter' && document.activeElement === $('#trSearch') && items[0]) { e.preventDefault(); items[0].click(); }
});
ed.addEventListener('input', () => { if (!editBar.hidden && !edit) editBarHide(); });
function updateAiButtons() {
  const off = !aiCfgState || aiCfgState.provider === 'off', locked = bodyLocked();
  $('#aiTitle').disabled = $('#aiSum').disabled = $('#aiFix').disabled = $('#aiList').disabled = $('#aiEdit').disabled = $('#aiTr').disabled = off || locked; $('#aiChat').disabled = off || locked; $('#aiRun').disabled = $('#aiAction').disabled = off || locked;
  if (off) { $('#aiSetup').open = true; if (!trMenu.hidden) trClose(); }
  const prov = aiCfgState && aiCfgState.provider, label = off ? 'Off' : prov === 'claude' ? 'Claude' : 'Ollama' + (aiCfgState.model ? ' · ' + aiCfgState.model : '');
  $('#aiState').textContent = locked ? 'Locked' : off ? 'Off' : 'On'; $('#aiSetupState').textContent = label;
  $('#aiHint').textContent = locked ? 'Unlock this note first.' : off ? 'Turn the AI on under Model and connection below.' : 'Works on the selected text, or the whole note.';
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
    if (st && !st.running) { $('#aiHint').textContent = 'Ollama is not running. Press Start under Model and connection below.'; $('#aiSetup').open = true; }
    else if (st && st.running && !has(aiCfgState.model)) { $('#aiHint').textContent = 'The model "' + aiCfgState.model + '" is not installed yet. Pick it under Model and connection below and press Download.'; $('#aiSetup').open = true; }
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
let lastWarm = 0;
function warmModel() {   // opening the AI tab means you are about to use it: load the local model now (never at start-up)
  if (Date.now() - lastWarm < 240000) return; lastWarm = Date.now();
  try { api.aiWarmup(); } catch (e) {}
}
// The panel is one list (Look, This note, AI). showTab only brings a part into view; the AI part is always ready.
function showTab(t) {
  aiLoad();
  if (t === 'ai') $('#rowAI').open = true;
  const target = t === 'ai' ? $('#aiAction') : t === 'note' ? $('#rowRem') : null;
  if (target) target.scrollIntoView({ block: 'nearest' });
}
$('#cfg').onclick = () => {
  const p = $('#panel'); p.hidden = !p.hidden; $('#cfg').setAttribute('aria-expanded', !p.hidden);
  if (!p.hidden) { p.scrollTop = 0; showTab(); refreshInfo(); }
};
// One list of AI actions and one Run button (the old buttons stay hidden, so their code and shortcuts keep working)
const AI_DO = { summarize: () => runAI('summarize'), grammar: () => runAI('grammar'), checklist: () => runAI('checklist'), title: () => runAI('title') };
$('#aiRun').onclick = () => { const v = $('#aiAction').value; if (AI_DO[v]) return AI_DO[v](); $('#editMode').value = v; liveEdit(); };
try { const last = localStorage.getItem('sp.aiAction'); if (last && $('#aiAction').querySelector('option[value="' + last + '"]')) $('#aiAction').value = last; } catch (e) {}
$('#aiAction').addEventListener('change', () => { try { localStorage.setItem('sp.aiAction', $('#aiAction').value); } catch (e) {} });
['pointerenter', 'focus'].forEach(ev => { $('#aiAction').addEventListener(ev, warmModel); $('#aiRun').addEventListener(ev, warmModel); });   // load the local model only when you are about to use it
// only one row of "This note" open at a time; opening Earlier versions loads them
document.querySelectorAll('#panel details.prow:not(.free)').forEach(d => d.addEventListener('toggle', () => {
  if (!d.open) return;
  document.querySelectorAll('#panel details.prow:not(.free)').forEach(o => { if (o !== d) o.open = false; });
  if (d.id === 'rowHist' && $('#histBox').hidden) histOpen();
}));
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
$('#allSet').onclick = () => openAllSettings();

/* ---------- the note's scroll bar (see note.css) ---------- */
const sb = $('#sb'), sbt = $('#sbt');
let sbDrag = null, sbQueued = false;
function sbSync() {
  sbQueued = false;
  const vis = ed.scrollHeight > ed.clientHeight + 1 && !document.body.classList.contains('rolled') && ed.offsetParent !== null;
  if (!vis) { sb.hidden = true; return; }
  const r = ed.getBoundingClientRect();
  sb.hidden = false; sb.style.left = Math.round(r.right - 16) + 'px'; sb.style.top = Math.round(r.top) + 'px'; sb.style.height = Math.round(r.height) + 'px';
  const track = r.height, ratio = ed.clientHeight / ed.scrollHeight, th = Math.max(36, Math.round(track * ratio));
  const room = Math.max(1, ed.scrollHeight - ed.clientHeight), top = Math.round((track - th) * Math.min(1, Math.max(0, ed.scrollTop / room)));
  sbt.style.height = th + 'px'; sbt.style.top = top + 'px';
}
const sbAsk = () => { if (!sbQueued) { sbQueued = true; requestAnimationFrame(sbSync); } };
ed.addEventListener('scroll', sbAsk, { passive: true });
window.addEventListener('resize', sbAsk);
ed.addEventListener('input', sbAsk);
new ResizeObserver(sbAsk).observe(ed);
setInterval(() => { if (!document.hidden) sbAsk(); }, 500);   // the text can grow or shrink without any event (pictures loading, parts of a huge note being drawn)
sb.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  e.preventDefault();   // keep the caret where it is
  sb.setPointerCapture(e.pointerId);
  const tr = sbt.getBoundingClientRect();
  if (e.target === sbt) sbDrag = { y: e.clientY, top: ed.scrollTop };
  else { ed.scrollTop += (e.clientY < tr.top ? -1 : 1) * ed.clientHeight * 0.9; sbAsk(); return; }   // click on the empty track: one page up or down
  sb.classList.add('drag');
});
sb.addEventListener('mousedown', e => e.preventDefault());   // (the pointer event alone does not stop the text field losing focus)
sb.addEventListener('pointermove', e => {
  if (!sbDrag) return;
  const r = ed.getBoundingClientRect(), th = sbt.offsetHeight, span = Math.max(1, r.height - th);
  ed.scrollTop = sbDrag.top + (e.clientY - sbDrag.y) * (ed.scrollHeight - ed.clientHeight) / span;
});
const sbEnd = () => { sbDrag = null; sb.classList.remove('drag'); };
sb.addEventListener('pointerup', sbEnd); sb.addEventListener('pointercancel', sbEnd); sb.addEventListener('lostpointercapture', sbEnd);
sb.addEventListener('wheel', e => { ed.scrollTop += e.deltaY; e.preventDefault(); }, { passive: false });
sbAsk();
