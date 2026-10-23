const $ = s => document.querySelector(s);
const q = $('#q'), list = $('#list');
let rows = [], sel = 0, seq = 0, timer = null;

// Pieces of text with the matching parts marked (built with text nodes, never as HTML).
// A checklist item reaches us as "☐ text" or "☑ text"; it is drawn as the same round tick circle the note itself uses.
function addText(el, t) {
  String(t).split(/([☐☑])\s?/).forEach(x => {
    if (x === '☐' || x === '☑') {
      const c = document.createElement('span'); c.className = x === '☑' ? 'cb done' : 'cb'; c.setAttribute('role', 'img'); c.setAttribute('aria-label', x === '☑' ? 'done' : 'to do'); el.appendChild(c);
    } else if (x) el.appendChild(document.createTextNode(x));
  });
}
function fill(el, segs) {
  (segs || []).forEach(p => {
    if (p.h) { const m = document.createElement('mark'); addText(m, p.t); el.appendChild(m); } else addText(el, p.t);
  });
}
const ago = ts => {
  if (!ts) return '';
  const d = (Date.now() - ts) / 864e5;
  if (d < 1) return 'today'; if (d < 2) return 'yesterday'; if (d < 31) return Math.floor(d) + ' days ago';
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d > 330 ? 'numeric' : undefined });
};
function draw() {
  list.textContent = '';
  rows.forEach((r, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'r' + (i === sel ? ' on' : ''); b.id = 'r' + i;
    b.setAttribute('role', 'option'); b.setAttribute('aria-selected', i === sel);
    const dot = document.createElement('span'); dot.className = r.cmd ? 'dot cmd' : 'dot'; if (r.cmd) dot.textContent = '›'; else dot.style.background = r.color || '#ffe9a8';
    const tx = document.createElement('span'); tx.className = 'tx';
    const t = document.createElement('div'); t.className = 't'; if (r.pinned) t.appendChild(document.createTextNode('📌 ')); if (r.locked) t.appendChild(document.createTextNode('🔒 ')); fill(t, r.title);
    const s = document.createElement('div'); s.className = 's'; fill(s, r.snippet);
    tx.append(t, s);
    const m = document.createElement('span'); m.className = 'm'; m.textContent = r.cmd ? 'action' : [r.folder, ago(r.updated)].filter(Boolean).join(' · ');
    b.append(dot, tx, m);
    b.onclick = () => open(i);
    b.onmousemove = () => { if (sel !== i) move(i); };
    list.appendChild(b);
  });
  const none = !rows.length;
  $('#empty').hidden = !none; list.hidden = none;
  $('#empty').textContent = q.value.trim() ? (q.value.trim().startsWith('>') ? 'No action matches.' : 'No note has all of those words.') : 'No notes yet.';
  const nn = rows.filter(r => !r.cmd).length; $('#count').textContent = q.value.trim() && nn ? nn + (nn === 1 ? ' note' : ' notes') : '';
  q.setAttribute('aria-activedescendant', rows.length ? 'r' + sel : '');
}
function move(i) {   // only the highlight changes; the list is not rebuilt
  const kids = list.children; if (!kids.length) return;
  i = (i + kids.length) % kids.length;
  kids[sel] && (kids[sel].classList.remove('on'), kids[sel].setAttribute('aria-selected', 'false'));
  sel = i; kids[sel].classList.add('on'); kids[sel].setAttribute('aria-selected', 'true'); kids[sel].scrollIntoView({ block: 'nearest' });
  q.setAttribute('aria-activedescendant', 'r' + sel);
}
function open(i) { const r = rows[i]; if (!r) return; if (r.cmd) api.searchRun(r.cmd); else api.searchShow(r.id); }
async function run() {
  const mine = ++seq, res = await api.searchQuery(q.value);
  if (mine !== seq) return;   // a newer search was started meanwhile
  rows = res; sel = 0; draw();
}
// "Actions" / "Notes": the same switch as typing > at the start of the box
const modeBtn = $('#mode');
function showMode() {
  const acts = q.value.trimStart().startsWith('>');
  modeBtn.textContent = acts ? '‹ Notes' : '› Actions'; modeBtn.classList.toggle('on', acts);
  modeBtn.setAttribute('aria-label', acts ? 'Back to searching notes' : 'Show actions'); q.placeholder = acts ? 'Type to find an action' : 'Search notes, or type > for actions';
}
modeBtn.addEventListener('click', () => { q.value = q.value.trimStart().startsWith('>') ? '' : '>'; showMode(); q.focus(); run(); });
q.addEventListener('input', () => { showMode(); clearTimeout(timer); timer = setTimeout(run, 60); });
q.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); move(sel + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); move(sel - 1); }
  else if (e.key === 'Enter') { e.preventDefault(); open(sel); }
  else if (e.key === 'Escape') { e.preventDefault(); api.searchClose(); }
});
window.addEventListener('keydown', e => { if (e.key === 'Escape') api.searchClose(); });
window.addEventListener('focus', () => q.focus());
showMode(); run(); q.focus();
