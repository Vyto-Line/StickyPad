'use strict';
// Notes as a plain, printable page (black on white, no colours). Pure functions: no Electron, no disk.
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const IMG_ID = /^[a-z0-9]{6,40}\.(png|jpe?g|webp|gif)$/;
const fontOf = f => String(f || '').replace(/["\\<>;{}]/g, '').slice(0, 60);

// The inside of one note: its heading and its text, checklist items and pictures.
// imgBase: file address of the pictures folder (ends with a slash). Pictures whose id looks wrong are left out.
function inner(title, blocks, imgBase) {
  const t = String(title || '').trim(), out = [];
  (Array.isArray(blocks) ? blocks : []).forEach(b => {
    if (!b) return;
    if (b.t === 'text' && typeof b.v === 'string') out.push('<div class="tx">' + esc(b.v.replace(/\n$/, '')) + '</div>');
    else if (b.t === 'check' && typeof b.v === 'string') out.push('<div class="ck"><span class="bx">' + (b.done ? '&#9745;' : '&#9744;') + '</span><span class="' + (b.done ? 'dn' : '') + '">' + esc(b.v) + '</span></div>');
    else if (b.t === 'img' && IMG_ID.test(String(b.id || '')) && imgBase) out.push('<div class="im"><img src="' + esc(imgBase + b.id) + '" alt=""></div>');
  });
  return (t ? '<h1>' + esc(t) + '</h1>' : '') + out.join('\n');
}
function page(docTitle, body, font, extraCss) {
  const f = fontOf(font);
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(docTitle) + '</title><style>' +
    '@page{margin:18mm}html,body{background:#fff;color:#000}body{font:12pt/1.45 ' + (f ? '"' + f + '",' : '') + '"Segoe UI",Arial,sans-serif;margin:0}' +
    'h1{font-size:18pt;margin:0 0 10pt}.tx{white-space:pre-wrap;overflow-wrap:anywhere}.ck{display:flex;gap:6pt;margin:2pt 0;break-inside:avoid}.bx{flex:none}.dn{text-decoration:line-through;color:#444}' +
    '.im{margin:8pt 0;break-inside:avoid}.im img{max-width:100%;max-height:230mm}' + (extraCss || '') +
    '</style></head><body>' + body + '</body></html>';
}

// One note.
function buildHtml(title, blocks, imgBase, font) {
  return page(String(title || '').trim() || 'Note', inner(title, blocks, imgBase), font);
}
// Several notes, in the order given. newPage: every note starts on a new page; otherwise they follow one another on the same page
// (a thin line between them) and a new page starts only when one is full.
function buildMany(items, imgBase, opts) {
  const newPage = !!(opts && opts.newPage);
  const body = (Array.isArray(items) ? items : []).map(it => {
    const f = fontOf(it && it.font);
    return '<section class="nt"' + (f ? ' style="font-family:&quot;' + esc(f) + '&quot;,&quot;Segoe UI&quot;,Arial,sans-serif"' : '') + '>' + inner(it && it.title, it && it.blocks, imgBase) + '</section>';
  }).join('\n');
  const css = newPage ? '.nt+.nt{break-before:page}' : '.nt+.nt{margin-top:22pt;padding-top:14pt;border-top:1px solid #999}.nt{break-inside:auto}';
  return page('StickyPad notes', body, '', css);
}
module.exports = { buildHtml, buildMany, esc };
