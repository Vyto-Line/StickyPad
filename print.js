'use strict';
// Notes as a printable page. Pure functions: no Electron, no disk.
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const IMG_ID = /^[a-z0-9]{6,40}\.(png|jpe?g|webp|gif)$/;
const fontOf = f => String(f || '').replace(/["\\<>;{}]/g, '').slice(0, 60);
const colorOf = c => /^#[0-9a-fA-F]{6}$/.test(String(c || '')) ? String(c) : '#FFF2A8';

// What the person can choose (Print options window). Anything else is replaced by the default.
const STYLES = ['plain', 'box', 'sticky'];                        // no frame / a thin frame / filled with the note's colour
const LAYOUTS = ['flow', 'page', 'cols2', 'cols3', 'actual'];     // one after another / one per page / 2 or 3 columns / real size, side by side from the top left
const SIZES = ['small', 'normal', 'large'];
const DEFAULTS = { style: 'plain', layout: 'flow', size: 'normal', title: true, pictures: true };
function cleanOpts(o) {
  o = o && typeof o === 'object' ? o : {};
  return {
    style: STYLES.includes(o.style) ? o.style : DEFAULTS.style,
    layout: LAYOUTS.includes(o.layout) ? o.layout : DEFAULTS.layout,
    size: SIZES.includes(o.size) ? o.size : DEFAULTS.size,
    title: o.title === undefined ? DEFAULTS.title : !!o.title,
    pictures: o.pictures === undefined ? DEFAULTS.pictures : !!o.pictures
  };
}

// The inside of one note: its heading and its text, checklist items and pictures.
// imgBase: file address of the pictures folder (ends with a slash). Pictures whose id looks wrong are left out.
function inner(title, blocks, imgBase, o) {
  const t = String(title || '').trim(), out = [];
  (Array.isArray(blocks) ? blocks : []).forEach(b => {
    if (!b) return;
    if (b.t === 'text' && typeof b.v === 'string') out.push('<div class="tx">' + esc(b.v.replace(/\n$/, '')) + '</div>');
    else if (b.t === 'check' && typeof b.v === 'string') out.push('<div class="ck"><span class="bx">' + (b.done ? '&#9745;' : '&#9744;') + '</span><span class="' + (b.done ? 'dn' : '') + '">' + esc(b.v) + '</span></div>');
    else if (b.t === 'img' && o.pictures && IMG_ID.test(String(b.id || '')) && imgBase) out.push('<div class="im"><img src="' + esc(imgBase + b.id) + '" alt=""></div>');
  });
  return (t && o.title ? '<h1>' + esc(t) + '</h1>' : '') + out.join('\n');
}
// dark text on light colours, white on dark ones
const inkOn = hex => { const n = parseInt(hex.slice(1), 16), l = 0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255); return l < 110 ? '#fff' : '#111'; };

const PT = { small: 10, normal: 12, large: 14 };
function css(o) {
  const fs = PT[o.size], gap = 10;
  let c = '@page{margin:15mm}html,body{background:#fff;color:#000}body{font:' + fs + 'pt/1.45 "Segoe UI",Arial,sans-serif;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    'h1{font-size:' + Math.round(fs * 1.5) + 'pt;margin:0 0 ' + Math.round(fs * 0.8) + 'pt;overflow-wrap:anywhere}.tx{white-space:pre-wrap;overflow-wrap:anywhere}.ck{display:flex;gap:6pt;margin:2pt 0;break-inside:avoid}.bx{flex:none}.dn{text-decoration:line-through;opacity:.7}' +
    '.im{margin:8pt 0;break-inside:avoid}.im img{max-width:100%;max-height:200mm}.nt{box-sizing:border-box;overflow-wrap:anywhere}';
  if (o.style !== 'plain') c += '.nt{border:1.2pt solid #444;border-radius:8pt;padding:' + gap + 'pt ' + (gap + 2) + 'pt;break-inside:avoid}';
  if (o.style === 'sticky') c += '.nt{border-color:rgba(0,0,0,.35)}';
  const wrap = '.wrap{display:flex;flex-wrap:wrap;align-items:flex-start;gap:' + gap + 'pt}';
  if (o.layout === 'flow') c += o.style === 'plain' ? '.nt+.nt{margin-top:22pt;padding-top:14pt;border-top:1px solid #999}' : '.nt{margin-bottom:' + gap + 'pt}';
  else if (o.layout === 'page') c += '.nt+.nt{break-before:page}.nt{break-inside:auto}';
  else if (o.layout === 'cols2' || o.layout === 'cols3') { const n = o.layout === 'cols2' ? 2 : 3; c += wrap + '.wrap>.nt{width:calc((100% - ' + gap * (n - 1) + 'pt) / ' + n + ')}'; }
  else c += wrap + '.wrap>.nt{max-width:100%}';   // 'actual': each note has the width it has on screen (set on the note)
  return c;
}
// items: [{ title, blocks, font, color, width }] in print order. One note or many.
function build(items, imgBase, opts) {
  const o = cleanOpts(opts), list = Array.isArray(items) ? items : [];
  const secs = list.map(it => {
    it = it || {};
    const f = fontOf(it.font), col = colorOf(it.color), st = [];
    if (f) st.push('font-family:&quot;' + esc(f) + '&quot;,&quot;Segoe UI&quot;,Arial,sans-serif');
    if (o.style === 'sticky') st.push('background:' + col, 'color:' + inkOn(col));
    if (o.layout === 'actual') st.push('width:' + Math.max(160, Math.min(900, Math.round(Number(it.width) || 300))) + 'px');
    return '<section class="nt"' + (st.length ? ' style="' + st.join(';') + '"' : '') + '>' + inner(it.title, it.blocks, imgBase, o) + '</section>';
  }).join('\n');
  const grid = o.layout === 'cols2' || o.layout === 'cols3' || o.layout === 'actual';
  const t = list.length === 1 && list[0] && String(list[0].title || '').trim() ? String(list[0].title).trim() : (list.length > 1 ? 'StickyPad notes' : 'Note');
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(t) + '</title><style>' + css(o) + '</style></head><body>' +
    (grid ? '<div class="wrap">' + secs + '</div>' : secs) + '</body></html>';
}
// Compatibility with the first version (one note, plain, full width).
const buildHtml = (title, blocks, imgBase, font) => build([{ title, blocks, font }], imgBase, DEFAULTS);
const buildMany = (items, imgBase, opts) => build(items, imgBase, { ...DEFAULTS, layout: opts && opts.newPage ? 'page' : 'flow' });
module.exports = { build, buildHtml, buildMany, cleanOpts, DEFAULTS, STYLES, LAYOUTS, SIZES, esc };
