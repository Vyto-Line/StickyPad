// Drag a .stickypad, Markdown or text file onto any StickyPad window and it becomes a new note (it shows up in All notes too).
// Pictures dragged into a note are left to the note itself.
(function () {
  const OK = /\.(stickypad|md|markdown|txt|text)$/i;
  let depth = 0, hint = null, toast = null, timer = null;
  const hasFiles = e => !!(e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0);
  const onlyImages = e => { const it = Array.prototype.slice.call((e.dataTransfer && e.dataTransfer.items) || []); return it.length > 0 && it.every(x => x.kind === 'file' && /^image\//.test(x.type)); };
  function box(id, css, text) { const d = document.createElement('div'); d.id = id; d.style.cssText = css; d.textContent = text; document.body.appendChild(d); return d; }
  function showHint() {
    if (!hint) hint = box('spDropHint', 'position:fixed;inset:6px;z-index:99999;border:2px dashed #4263eb;border-radius:12px;background:rgba(66,99,235,.12);color:inherit;display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;font:600 13px "Segoe UI",sans-serif;pointer-events:none', 'Drop to add as a note');
    hint.hidden = false;
  }
  const hideHint = () => { depth = 0; if (hint) hint.hidden = true; };
  function say(text) {
    if (!toast) toast = box('spDropToast', 'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:99999;max-width:90%;background:#1c2030;color:#fff;border-radius:10px;padding:8px 14px;font:13px "Segoe UI",sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.3);pointer-events:none', '');
    toast.setAttribute('role', 'status'); toast.textContent = text; toast.hidden = false;
    clearTimeout(timer); timer = setTimeout(() => { toast.hidden = true; }, 3500);
  }
  window.addEventListener('dragenter', e => { if (hasFiles(e) && !onlyImages(e)) { depth++; showHint(); } }, true);
  window.addEventListener('dragleave', e => { if (hasFiles(e) && depth > 0 && --depth === 0) hideHint(); }, true);
  window.addEventListener('dragover', e => { if (hasFiles(e) && !onlyImages(e)) { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; } }, true);
  window.addEventListener('drop', e => {
    if (!hasFiles(e)) return;
    hideHint();
    const files = Array.prototype.slice.call(e.dataTransfer.files || []);
    if (files.length && files.every(f => /^image\//.test(f.type))) return;   // pictures: the note handles them
    e.preventDefault(); e.stopPropagation();   // (otherwise Windows would open the file inside this window)
    const mine = files.filter(f => OK.test(f.name || ''));
    if (!mine.length) { say('StickyPad can add .stickypad, .md and .txt files.'); return; }
    if (!window.api || !window.api.dropFiles) return;
    window.api.dropFiles(mine).then(r => {
      if (!r) return;
      const n = r.count || 0, bad = r.failed || 0;
      say(n ? (n === 1 ? 'Added 1 note' : 'Added ' + n + ' notes') + (bad ? ' (' + bad + ' could not be read)' : '') : bad ? 'That file could not be read.' : 'Nothing to add.');
    }).catch(() => say('That file could not be added.'));
  }, true);
})();
