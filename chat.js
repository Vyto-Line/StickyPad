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
  a.append(copy, save); wrap.appendChild(a);
}
function drawAll() {
  [...msgsEl.querySelectorAll('.msg')].forEach(n => n.remove());
  $('#empty').hidden = messages.length > 0;
  messages.forEach(m => { const r = addMsg(m.role, m.content); if (m.role === 'assistant') addActions(r.wrap, m.content); });
  stick = true; toBottom();
}
function setBusy(b) {
  busy = b; sendBtn.textContent = b ? 'Stop' : 'Send'; sendBtn.classList.toggle('stop', b);
}
const persist = () => api.chatSave({ messages, noteId });

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
    r.b.classList.add('error'); r.b.textContent = m.error;
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
});

function send() {
  if (busy) { api.chatStop(curId); return; }
  const text = input.value.trim(); if (!text) return;
  if (provider === 'off') { addMsg('ai', 'The AI is switched off. Open a note, press ⋯ → AI tab, and set up Ollama or the Claude API first.').b.classList.add('error'); return; }
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
$('#newChat').onclick = () => { if (busy) api.chatStop(curId); messages = []; persist(); drawAll(); input.focus(); };
async function loadNotes(select) {
  const list = await api.chatNotes(), sel = $('#ctx');
  sel.innerHTML = ''; const none = document.createElement('option'); none.value = ''; none.textContent = 'No note'; sel.appendChild(none);
  const all = document.createElement('option'); all.value = '*'; all.textContent = '★ All my notes (search them)'; sel.appendChild(all);
  list.forEach(n => { const o = document.createElement('option'); o.value = n.id; o.textContent = n.title; sel.appendChild(o); });
  const want = select !== undefined ? select : noteId;
  sel.value = want === '*' || list.some(n => n.id === want) ? want : ''; noteId = sel.value || null;
}
$('#ctx').onchange = e => { noteId = e.target.value || null; persist(); };
api.onChatAttach(async id => { await loadNotes(id); persist(); input.focus(); });

const SUGGEST = ['Help me plan my day', 'Give me three ideas for a weekend trip', 'Explain something simply: how does a VPN work?'];
function setStatus(st) {
  provider = st.provider;
  $('#status').textContent = provider === 'off' ? 'AI is off. Set it up in a note: ⋯ → AI' : (provider === 'ollama' ? 'Ollama' : 'Claude') + (st.model ? ' · ' + st.model : '');
  $('#emptyText').textContent = provider === 'off' ? 'The AI is off. Open a note, press ⋯ → AI, and choose Ollama or the Claude API.' : 'Ask me anything. Pick a note with 📎 below and I will use it as context.';
}
(async () => {
  const st = await api.chatLoad();
  messages = st.messages; noteId = st.noteId; setStatus(st);
  const q = new URLSearchParams(location.search).get('note');
  await loadNotes(q || noteId);
  if (q) persist();
  $('#chips').innerHTML = '';
  SUGGEST.forEach(t => { const c = document.createElement('button'); c.className = 'chip'; c.textContent = t; c.onclick = () => { input.value = t; autosize(); input.focus(); }; $('#chips').appendChild(c); });
  drawAll(); input.focus();
})();
window.addEventListener('focus', async () => { setStatus(await api.chatLoad()); await loadNotes(); });
