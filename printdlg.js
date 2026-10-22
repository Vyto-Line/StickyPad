const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
let many = false, busy = false, timer = null;
const val = n => (document.querySelector('input[name="' + n + '"]:checked') || {}).value;
const set = (n, v) => { const r = document.querySelector('input[name="' + n + '"][value="' + v + '"]'); if (r) r.checked = true; };
const opts = () => ({ style: val('style'), layout: val('layout'), size: val('size'), title: $('#inTitle').checked, pictures: $('#inPics').checked });
function preview() {
  clearTimeout(timer);
  timer = setTimeout(async () => { try { $('#frame').srcdoc = await api.printPreview(opts()); } catch (e) {} }, 80);
}
async function init() {
  const info = await api.printInfo(); many = info.many;
  $('#head').textContent = many ? 'Print ' + info.count + ' notes' : 'Print this note';
  $('#what').textContent = (info.titles.join(', ') + (info.count > info.titles.length ? ' …' : '')) + (info.skipped ? '  (' + info.skipped + ' locked or empty skipped)' : '');
  $$('[data-many]').forEach(l => { l.hidden = !many; });
  const o = info.opts;
  set('style', o.style); set('layout', many || ['flow', 'actual'].includes(o.layout) ? o.layout : 'flow'); set('size', o.size);
  $('#inTitle').checked = o.title; $('#inPics').checked = o.pictures;
  $$('input').forEach(i => { i.onchange = preview; });
  preview();
}
$('#go').onclick = async () => {
  if (busy) return; busy = true; $('#go').disabled = true; $('#msg').textContent = '';
  const r = await api.printGo(opts());
  busy = false; $('#go').disabled = false;
  if (r && r.ok) return;   // the window closes itself
  if (r && r.cancelled) return;
  $('#msg').textContent = (r && r.error) || 'Printing did not start.';
};
$('#cancel').onclick = () => api.printClose();
document.addEventListener('keydown', e => { if (e.key === 'Escape') api.printClose(); });
init();
