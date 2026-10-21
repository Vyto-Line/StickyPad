'use strict';
// A note as a plain, printable page (black on white, no colours). Pure function: no Electron, no disk.
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// imgBase: file address of the pictures folder (ends with a slash). Pictures whose id looks wrong are left out.
function buildHtml(title, blocks, imgBase, font) {
  const t = String(title || '').trim(), out = [];
  (Array.isArray(blocks) ? blocks : []).forEach(b => {
    if (!b) return;
    if (b.t === 'text' && typeof b.v === 'string') out.push('<div class="tx">' + esc(b.v.replace(/\n$/, '')) + '</div>');
    else if (b.t === 'check' && typeof b.v === 'string') out.push('<div class="ck"><span class="bx">' + (b.done ? '&#9745;' : '&#9744;') + '</span><span class="' + (b.done ? 'dn' : '') + '">' + esc(b.v) + '</span></div>');
    else if (b.t === 'img' && /^[a-z0-9]{6,40}\.(png|jpe?g|webp|gif)$/.test(String(b.id || '')) && imgBase) out.push('<div class="im"><img src="' + esc(imgBase + b.id) + '" alt=""></div>');
  });
  const f = String(font || '').replace(/["\\<>]/g, '');
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(t || 'Note') + '</title><style>' +
    '@page{margin:18mm}html,body{background:#fff;color:#000}body{font:12pt/1.45 ' + (f ? '"' + f + '",' : '') + '"Segoe UI",Arial,sans-serif;margin:0}' +
    'h1{font-size:18pt;margin:0 0 10pt}.tx{white-space:pre-wrap;overflow-wrap:anywhere}.ck{display:flex;gap:6pt;margin:2pt 0;break-inside:avoid}.bx{flex:none}.dn{text-decoration:line-through;color:#444}' +
    '.im{margin:8pt 0;break-inside:avoid}.im img{max-width:100%;max-height:230mm}' +
    '</style></head><body>' + (t ? '<h1>' + esc(t) + '</h1>' : '') + out.join('\n') + '</body></html>';
}
module.exports = { buildHtml, esc };
