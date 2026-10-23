const $ = s => document.querySelector(s);
const msgsEl = $('#msgs'), input = $('#input'), sendBtn = $('#send');
let messages = [], noteId = null, busy = false, curId = null, curBubble = null, curText = '', provider = 'off', stick = true;

/* ---------- tiny, safe markdown (everything is inserted as text, never as HTML) ---------- */
function inline(parent, text) {
  text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/).forEach(part => {
    if (!part) return;
    let el;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) { el = document.createElement('code'); el.textContent = part.slice(1, -1); }
    else if (part.startsWith('**') && part.endsWith('**') && part.length > 4) { el = document.createElement('strong'); el.textContent = part.slice(2, -2); }
    else el = document.createTextNode(part);
    parent.appendChild(el);
  });
}
function blocks(root, text) {
  const lines = text.replace(/\r/g, '').split('\n');
  let para = [], list = null;
  const flushPara = () => { if (para.length) { const p = document.createElement('p'); para.forEach((l, i) => { if (i) p.appendChild(document.createElement('br')); inline(p, l); }); root.appendChild(p); para = []; } };
  const flushList = () => { list = null; };
  for (const raw of lines) {
    const line = raw.trimEnd(), ul = /^\s*[-*•]\s+(.*)$/.exec(line), ol = /^\s*\d+[.)]\s+(.*)$/.exec(line), h = /^#{1,3}\s+(.*)$/.exec(line);
    if (ul || ol) {
      flushPara();
      const tag = ul ? 'UL' : 'OL';
      if (!list || list.tagName !== tag) { list = document.createElement(tag); root.appendChild(list); }
      const li = document.createElement('li'); inline(li, (ul || ol)[1]); list.appendChild(li);
    } else if (!line.trim()) { flushPara(); flushList(); }
    else if (h) { flushPara(); flushList(); const p = document.createElement('p'), b = document.createElement('strong'); inline(b, h[1]); p.appendChild(b); root.appendChild(p); }
    else { flushList(); para.push(line); }
  }
  flushPara();
}
function renderMd(el, text) {
  el.textContent = '';
  text.split('```').forEach((part, i) => {
    if (i % 2 === 1) { const pre = document.createElement('pre'), code = document.createElement('code'); code.textContent = part.replace(/^[A-Za-z0-9_+-]*\n/, '').replace(/\n$/, ''); pre.appendChild(code); el.appendChild(pre); }
    else blocks(el, part);
  });
}

/* ---------- drawing ---------- */
const nearBottom = () => msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 60;
msgsEl.addEventListener('scroll', () => { stick = nearBottom(); });
const toBottom = () => { if (stick) msgsEl.scrollTop = msgsEl.scrollHeight; };

function addMsg(role, text) {
  $('#empty').hidden = true;
  const wrap = document.createElement('div'); wrap.className = 'msg ' + (role === 'user' ? 'user' : 'ai');
  const b = document.createElement('div'); b.className = 'bubble';
  if (role === 'user') b.textContent = text; else renderMd(b, text);
  wrap.appendChild(b); msgsEl.appendChild(wrap); toBottom();
  return { wrap, b };
}
function addActions(wrap, text) {
  const a = document.createElement('div'); a.className = 'acts';
  const copy = document.createElement('button'); copy.textContent = 'Copy';
  copy.onclick = async () => { try { await navigator.clipboard.writeText(text); copy.textContent = 'Copied ✓'; setTimeout(() => copy.textContent = 'Copy', 1400); } catch (e) {} };
  const save = document.createElement('button'); save.textContent = 'Save as note';
  save.onclick = async () => { if (await api.chatSaveAsNote(text)) { save.textContent = 'Saved ✓'; setTimeout(() => save.textContent = 'Save as note', 1600); } };
  // "Apply to note": only while a single note is attached. Asks once how: replace the note, or add at the end.
  const apply = document.createElement('button'); apply.className = 'apply'; apply.textContent = 'Apply to note'; apply.hidden = !canApply();
  apply.title = 'Put this answer into the attached note (the old text stays in Earlier versions)';
  const rep = document.createElement('button'), add = document.createElement('button'), no = document.createElement('button');
  rep.textContent = 'Replace the note'; add.textContent = 'Add at the end'; no.textContent = 'Cancel'; [rep, add, no].forEach(x => { x.hidden = true; x.className = 'choice'; });
  const msg = document.createElement('span'); msg.className = 'applymsg'; msg.setAttribute('role', 'status');
  const ask = on => { apply.hidden = on || !canApply(); [rep, add, no].forEach(x => x.hidden = !on); msg.textContent = ''; };
  apply.onclick = () => ask(true); no.onclick = () => ask(false);
  const go = async mode => {
    ask(false); const r = await api.chatApply({ noteId, text, mode });
    msg.textContent = r && r.ok ? (mode === 'append' ? 'Added to the note ✓' : 'Note replaced ✓ (old text is in Earlier versions)') : (r && r.error) || 'Could not apply.';
    msg.classList.toggle('err', !(r && r.ok)); setTimeout(() => { msg.textContent = ''; }, 5000);
  };
  rep.onclick = () => go('replace'); add.onclick = () => go('append');
  a.append(copy, save, apply, rep, add, no, msg); wrap.appendChild(a);
}
const canApply = () => !!noteId && noteId !== '*';
function syncApply() { msgsEl.querySelectorAll('.acts .apply').forEach(b => { b.hidden = !canApply(); }); }
function drawAll() {
  [...msgsEl.querySelectorAll('.msg')].forEach(n => n.remove());
  $('#empty').hidden = messages.length > 0;
  messages.forEach(m => { const r = addMsg(m.role, m.content); if (m.role === 'assistant') addActions(r.wrap, m.content); });
  stick = true; toBottom();
}
function setBusy(b) {
  busy = b; sendBtn.textContent = b ? 'Stop' : 'Send'; sendBtn.classList.toggle('stop', b);
}
const persist = async () => { await api.chatSave({ messages, noteId }); refreshList(); };

/* ---------- talking to the model ---------- */
function generate() {
  if (busy) return;
  setBusy(true); stick = true;
  curId = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); curText = '';
  const r = addMsg('assistant', ''); curBubble = r;
  const dots = document.createElement('span'); dots.className = 'typing'; dots.innerHTML = '<i></i><i></i><i></i>'; r.b.appendChild(dots);
  curSources = null;
  api.chatSend({ id: curId, messages, noteId });
}
let raf = 0;
function paint() { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; if (curBubble) { renderMd(curBubble.b, curText); toBottom(); } }); }

let curSources = null;
api.onChatEvent(m => {
  if (m.id !== curId) return;
  if (m.type === 'sources') { curSources = Array.isArray(m.titles) ? m.titles.slice(0, 8) : null; return; }
  if (m.type === 'chunk') { curText += m.text; paint(); return; }
  const r = curBubble; curBubble = null; curId = null; setBusy(false);
  if (m.type === 'error') {
    r.b.classList.add('error'); r.b.textContent = m.error; if (window.StickyAccess) StickyAccess.announce(m.error);
    const a = document.createElement('div'); a.className = 'acts';
    const retry = document.createElement('button'); retry.textContent = 'Retry';
    retry.onclick = () => { r.wrap.remove(); generate(); };
    a.appendChild(retry); r.wrap.appendChild(a);
    return;
  }
  if (!curText.trim()) { r.wrap.remove(); if (!messages.length) $('#empty').hidden = false; return; }   // stopped before anything arrived
  renderMd(r.b, curText); addActions(r.wrap, curText);
  if (curSources && curSources.length) { const s = document.createElement('div'); s.className = 'src'; s.textContent = 'Looked at: ' + curSources.join(' · '); r.wrap.appendChild(s); }
  messages.push({ role: 'assistant', content: curText }); persist();
  if (window.StickyAccess) StickyAccess.announce('The AI answered. ' + curText.replace(/\s+/g, ' ').slice(0, 300));
});

function send() {
  if (busy) { api.chatStop(curId); return; }
  const text = input.value.trim(); if (!text) return;
  if (provider === 'off') { addMsg('ai', 'The AI is switched off. Open Settings > AI and set up Ollama or the Claude API first.').b.classList.add('error'); return; }
  input.value = ''; autosize();
  messages.push({ role: 'user', content: text }); addMsg('user', text); persist();
  generate();
}
sendBtn.onclick = send;
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!busy) send(); }
  if (e.key === 'Escape' && busy) api.chatStop(curId);
});
function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; }
input.addEventListener('input', autosize);

/* ---------- header, context, new chat ---------- */
$('#close').onclick = () => api.chatClose();
// Leaving a chat while it is answering: the answer is dropped (the question stays), and nothing leaks into the next chat.
function leaveChat() { if (busy) { const id = curId; curId = null; curBubble = null; curText = ''; setBusy(false); api.chatStop(id); } }
async function showChat(v) {
  messages = v.messages || []; noteId = v.noteId || null; await loadNotes(noteId); drawAll(); refreshList(); input.focus();
}
const newChat = async () => { leaveChat(); await showChat(await api.chatNew()); };
$('#newChat').onclick = newChat; $('#listNew').onclick = newChat;
async function loadNotes(select) {
  const list = await api.chatNotes(), sel = $('#ctx');
  sel.innerHTML = ''; const none = document.createElement('option'); none.value = ''; none.textContent = 'No note'; sel.appendChild(none);
  const all = document.createElement('option'); all.value = '*'; all.textContent = '★ All my notes (search them)'; sel.appendChild(all);
  list.forEach(n => { const o = document.createElement('option'); o.value = n.id; o.textContent = n.title; sel.appendChild(o); });
  const want = select !== undefined ? select : noteId;
  sel.value = want === '*' || list.some(n => n.id === want) ? want : ''; noteId = sel.value || null; syncApply();
}
$('#ctx').onchange = e => { noteId = e.target.value || null; persist(); syncApply(); };
api.onChatAttach(async id => { await loadNotes(id); persist(); input.focus(); });

const SUGGEST = ['Help me plan my day', 'Give me three ideas for a weekend trip', 'Explain something simply: how does a VPN work?'];
// The model chip: the models you have installed (Ollama) or the usual Claude models; the choice is the same one as in Settings > AI.
const CLAUDE_MODELS = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'];
const MORE = '__more';
async function drawModel(st) {
  const sel = $('#mdl'), off = st.provider === 'off';
  $('#aiOff').hidden = !off; $('#mdlchip').hidden = off;
  if (off) return;
  let names = [];
  if (st.provider === 'ollama') { try { names = ((await api.ollamaStatus()).models || []).map(m => m.name); } catch {} }
  else names = CLAUDE_MODELS.slice();
  const cur = st.model || '';
  if (cur && !names.includes(cur)) names.unshift(cur);
  sel.textContent = '';
  const add = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); };
  if (!names.length) add('', st.provider === 'ollama' ? 'No model installed' : 'Default model');
  names.forEach(n => add(n, n));
  add(MORE, st.provider === 'ollama' ? 'Get more models…' : 'Other model…');
  sel.value = names.includes(cur) ? cur : (names[0] || '');
}
$('#mdl').onchange = async e => {
  if (e.target.value === MORE || e.target.value === '') { api.home('settings', 'ai'); setStatus(await api.chatLoad()); return; }
  await api.aiSet({ model: e.target.value }); setStatus(await api.chatLoad());
};
$('#aiOff').onclick = () => api.home('settings', 'ai');
function setStatus(st) {
  provider = st.provider; drawModel(st);
  $('#status').textContent = provider === 'off' ? 'AI is off. Set it up in Settings > AI' : (provider === 'ollama' ? 'Ollama' : 'Claude') + (st.model ? ' · ' + st.model : '');
  $('#emptyText').textContent = provider === 'off' ? 'The AI is off. Open Settings > AI and choose Ollama or the Claude API.' : 'Ask me anything. Pick a note with 📎 below and I will use it as context.';
}
(async () => {
  const st = await api.chatLoad();
  messages = st.messages; noteId = st.noteId; setStatus(st);
  const q = new URLSearchParams(location.search).get('note');
  await loadNotes(q || noteId);
  if (q) persist();
  $('#chips').innerHTML = '';
  SUGGEST.forEach(t => { const c = document.createElement('button'); c.className = 'chip'; c.textContent = t; c.onclick = () => { input.value = t; autosize(); input.focus(); }; $('#chips').appendChild(c); });
  drawAll(); input.focus(); refreshList();
})();
window.addEventListener('focus', async () => { setStatus(await api.chatLoad()); await loadNotes(); });


/* ---------- the list of chats (left) ---------- */
let listQ = '', openMenu = null, armedDel = 0;
const listEl = $('#chatList');
function closeMenu() { if (openMenu) { openMenu.remove(); openMenu = null; } listEl.querySelectorAll('.cmore[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false')); }
async function refreshList() {
  const r = await api.chatList(listQ); if (!r) return;
  $('#histNote').hidden = r.history !== false;
  $('#delAll').hidden = !r.items.length;
  listEl.textContent = ''; openMenu = null;
  if (!r.items.length) { const p = document.createElement('p'); p.className = 'cnone'; p.textContent = listQ ? 'No chat matches.' : 'Your chats show up here.'; listEl.appendChild(p); return; }
  r.items.forEach(c => listEl.appendChild(row(c)));
}
function row(c) {
  const el = document.createElement('div'); el.className = 'crow' + (c.current ? ' cur' : ''); el.dataset.id = c.id;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'citem'; b.title = c.title;
  if (c.current) b.setAttribute('aria-current', 'true');
  const t = document.createElement('span'); t.className = 't'; t.textContent = c.title; b.appendChild(t);
  if (c.pinned) { const p = document.createElement('span'); p.className = 'pin'; p.textContent = '📌'; p.setAttribute('role', 'img'); p.setAttribute('aria-label', 'Pinned'); b.appendChild(p); }
  b.onclick = async () => { if (c.current) return; leaveChat(); await showChat(await api.chatSelect(c.id)); };
  const m = document.createElement('button'); m.type = 'button'; m.className = 'cmore'; m.textContent = '⋯'; m.setAttribute('aria-label', 'More for ' + c.title); m.setAttribute('aria-haspopup', 'menu'); m.setAttribute('aria-expanded', 'false');
  m.onclick = e => { e.stopPropagation(); const was = openMenu && openMenu.parentNode === el; closeMenu(); if (!was) menu(el, m, c); };
  el.append(b, m); return el;
}
function menu(el, anchor, c) {
  const mn = document.createElement('div'); mn.className = 'cmenu'; mn.setAttribute('role', 'menu');
  const add = (label, fn, cls) => { const x = document.createElement('button'); x.type = 'button'; x.setAttribute('role', 'menuitem'); x.textContent = label; if (cls) x.className = cls; x.onclick = e => { e.stopPropagation(); closeMenu(); fn(); }; mn.appendChild(x); };
  add('Rename', () => rename(el, c));
  add(c.pinned ? 'Unpin' : 'Pin to top', async () => { await api.chatPin(c.id, !c.pinned); refreshList(); });
  add('Save as note', async () => { const ok = await api.chatToNote(c.id); if (window.StickyAccess) StickyAccess.announce(ok ? 'Saved as a note.' : 'Could not save.'); });
  add('Delete chat', () => askDelete(el, c), 'danger');
  el.appendChild(mn); openMenu = mn; anchor.setAttribute('aria-expanded', 'true');
  mn.querySelector('button').focus();
  mn.addEventListener('keydown', e => {
    const bs = [...mn.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); bs[(i + 1) % bs.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); bs[(i + bs.length - 1) % bs.length].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeMenu(); anchor.focus(); }
  });
}
function rename(el, c) {
  el.textContent = ''; const inp = document.createElement('input'); inp.className = 'crename'; inp.value = c.title; inp.maxLength = 80; inp.setAttribute('aria-label', 'Chat name');
  let done = false; const fin = async save => { if (done) return; done = true; if (save) await api.chatRename(c.id, inp.value); refreshList(); };
  inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); fin(true); } else if (e.key === 'Escape') { e.preventDefault(); fin(false); } };
  inp.onblur = () => fin(true); el.appendChild(inp); inp.focus(); inp.select();
}
// deleting asks first, right in the row (no pop-up window)
function askDelete(el, c) {
  el.textContent = ''; const a = document.createElement('div'); a.className = 'cask'; a.setAttribute('role', 'alertdialog'); a.setAttribute('aria-label', 'Delete this chat?');
  const s = document.createElement('span'); s.textContent = 'Delete this chat?';
  const yes = document.createElement('button'); yes.type = 'button'; yes.className = 'yes'; yes.textContent = 'Delete';
  const no = document.createElement('button'); no.type = 'button'; no.textContent = 'Keep';
  yes.onclick = async () => { const wasCur = c.current; if (wasCur) leaveChat(); const v = await api.chatDelete(c.id); if (wasCur) await showChat(v); else refreshList(); if (window.StickyAccess) StickyAccess.announce('Chat deleted.'); };
  no.onclick = () => refreshList(); a.onkeydown = e => { if (e.key === 'Escape') { e.preventDefault(); refreshList(); } };
  a.append(s, yes, no); el.appendChild(a); no.focus();
}
$('#delAll').onclick = async function () {
  const b = this;
  if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Sure? This deletes every chat'; clearTimeout(armedDel); armedDel = setTimeout(() => { b.classList.remove('armed'); b.textContent = 'Delete all chats'; }, 4000); return; }
  clearTimeout(armedDel); b.classList.remove('armed'); b.textContent = 'Delete all chats';
  leaveChat(); await showChat(await api.chatDeleteAll());
};
let sTimer = 0;
$('#chatSearch').addEventListener('input', e => { listQ = e.target.value; clearTimeout(sTimer); sTimer = setTimeout(refreshList, 120); });
document.addEventListener('click', e => { if (openMenu && !e.target.closest('.cmenu')) closeMenu(); });
// show or hide the list (remembered; starts hidden in a narrow window)
(function () {
  let want = null; try { want = localStorage.getItem('sp.chatList'); } catch (e) {}
  const show = want === null ? innerWidth >= 860 : want === '1', b = $('#toggleChats');
  const set = on => { document.body.classList.toggle('nochats', !on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); };
  set(show);
  b.onclick = () => { const on = document.body.classList.contains('nochats'); set(on); try { localStorage.setItem('sp.chatList', on ? '1' : '0'); } catch (e) {} };
})();
