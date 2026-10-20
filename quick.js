const $ = s => document.querySelector(s);
const q = $('#q'), list = $('#list');
let rows = [], sel = 0, seq = 0, timer = null;

// Pieces of text with the matching parts marked (built with text nodes, never as HTML).
function fill(el, segs) {
  (segs || []).forEach(p => {
    if (p.h) { const m = document.createElement('mark'); m.textContent = p.t; el.appendChild(m); } else el.appendChild(document.createTextNode(p.t));
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
    const dot = document.createElement('span'); dot.className = 'dot'; dot.style.background = r.color || '#ffe9a8';
    const tx = document.createElement('span'); tx.className = 'tx';
    const t = document.createElement('div'); t.className = 't'; if (r.pinned) t.appendChild(document.createTextNode('📌 ')); if (r.locked) t.appendChild(document.createTextNode('🔒 ')); fill(t, r.title);
    const s = document.createElement('div'); s.className = 's'; fill(s, r.snippet);
    tx.append(t, s);
    const m = document.createElement('span'); m.className = 'm'; m.textContent = [r.folder, ago(r.updated)].filter(Boolean).join(' · ');
    b.append(dot, tx, m);
    b.onclick = () => open(i);
    b.onmousemove = () => { if (sel !== i) move(i); };
    list.appendChild(b);
  });
  const none = !rows.length;
  $('#empty').hidden = !none; list.hidden = none;
  $('#empty').textContent = q.value.trim() ? 'No note has all of those words.' : 'No notes yet.';
  $('#count').textContent = q.value.trim() && rows.length ? rows.length + (rows.length === 1 ? ' note' : ' notes') : '';
  q.setAttribute('aria-activedescendant', rows.length ? 'r' + sel : '');
}
function move(i) {   // only the highlight changes; the list is not rebuilt
  const kids = list.children; if (!kids.length) return;
  i = (i + kids.length) % kids.length;
  kids[sel] && (kids[sel].classList.remove('on'), kids[sel].setAttribute('aria-selected', 'false'));
  sel = i; kids[sel].classList.add('on'); kids[sel].setAttribute('aria-selected', 'true'); kids[sel].scrollIntoView({ block: 'nearest' });
  q.setAttribute('aria-activedescendant', 'r' + sel);
}
function open(i) { const r = rows[i]; if (r) api.searchShow(r.id); }
async function run() {
  const mine = ++seq, res = await api.searchQuery(q.value);
  if (mine !== seq) return;   // a newer search was started meanwhile
  rows = res; sel = 0; draw();
}
q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 60); });
q.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); move(sel + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); move(sel - 1); }
  else if (e.key === 'Enter') { e.preventDefault(); open(sel); }
  else if (e.key === 'Escape') { e.preventDefault(); api.searchClose(); }
});
window.addEventListener('keydown', e => { if (e.key === 'Escape') api.searchClose(); });
window.addEventListener('focus', () => q.focus());
run(); q.focus();
