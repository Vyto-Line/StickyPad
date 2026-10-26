const assert = require('assert'), P = require('../print');
assert.ok(P.buildHtml('t', [{ t: 'img', id: 'abc123.png', w: 40 }, { t: 'img', id: 'abc123.png' }], 'file:///d/', 'Segoe UI').includes('style="width:40%"'), 'printing follows the picture size');
const h = P.buildHtml('Plan <b>', [{ t: 'text', v: 'line 1\nline 2\n' }, { t: 'check', v: 'milk & eggs', done: true }, { t: 'check', v: 'bread', done: false }, { t: 'img', id: 'abc123.png' }, { t: 'img', id: '../evil.png' }, { t: 'text', v: '<script>x</script>' }], 'file:///data/images/', 'Segoe UI');
assert.ok(h.includes('<h1>Plan &lt;b&gt;</h1>'), 'title escaped');
assert.ok(h.includes('line 1\nline 2') && !h.includes('<script>'), 'text escaped, kept as written');
assert.ok(h.includes('milk &amp; eggs') && h.includes('&#9745;') && h.includes('&#9744;'), 'checklist boxes');
assert.ok(h.includes('src="file:///data/images/abc123.png"') && !h.includes('evil'), 'good pictures in, odd ids out');
assert.ok(h.includes('background:#fff') && h.includes('@page'), 'plain black on white page');
assert.ok(!P.buildHtml('', [], '', '').includes('<h1>'), 'no title, no heading');
assert.ok(P.buildHtml(null, null).includes('<body>'), 'bad input does not throw');
console.log('print ok');
// several notes in one page
const items = [{ title: 'First', blocks: [{ t: 'text', v: 'one' }], font: 'Georgia' }, { title: 'Second <b>', blocks: [{ t: 'check', v: 'milk', done: false }], font: '' }, null];
const same = P.buildMany(items, 'file:///i/', { newPage: false }), own = P.buildMany(items, 'file:///i/', { newPage: true });
assert.ok(same.indexOf('First') < same.indexOf('Second &lt;b&gt;'), 'notes are printed in the order given');
assert.strictEqual((same.match(/<section class="nt"/g) || []).length, 3, 'one section per note (a bad entry is an empty section, not a crash)');
assert.ok(same.includes('border-top') && !same.includes('break-before:page'), 'same page: a thin line between notes');
assert.ok(own.includes('break-before:page') && !own.includes('border-top'), 'own page: each note starts a new page');
assert.ok(same.includes('font-family:&quot;Georgia&quot;'), 'each note keeps its font');
assert.ok(P.buildMany(null).includes('<body>'), 'bad input does not throw');
console.log('print many ok');

// options: style, layout, size, include
const items3 = [{ title: 'Shopping', blocks: [{ t: 'check', v: 'milk', done: false }, { t: 'img', id: 'abc123.png' }], color: '#FFF2A8', width: 260, font: 'Segoe UI' }, { title: 'Dark', blocks: [{ t: 'text', v: 'x' }], color: '#2B3A55', width: 5000 }];
const html = o => P.build(items3, 'file:///i/', o);
assert.deepStrictEqual(P.cleanOpts(null), P.DEFAULTS, 'no choices: defaults');
assert.deepStrictEqual(P.cleanOpts({ style: 'x', layout: 'y', size: 'z', title: 0, pictures: 'no' }), { style: 'plain', layout: 'flow', size: 'normal', title: false, pictures: true }, 'unknown values fall back, flags become booleans');
assert.ok(!html({ style: 'plain' }).includes('border:1.2pt') && html({ style: 'box' }).includes('border:1.2pt') && !html({ style: 'box' }).includes('background:#FFF2A8'), 'plain has no frame, box has a frame but no fill');
const st = html({ style: 'sticky' }); assert.ok(st.includes('background:#FFF2A8;color:#111') && st.includes('background:#2B3A55;color:#fff'), 'sticky: the note colour, dark text on light and white on dark');
assert.ok(html({ layout: 'actual' }).includes('width:260px') && html({ layout: 'actual' }).includes('width:900px'), 'real size: the on-screen width, never wider than 900 px');
assert.ok(html({ layout: 'actual' }).includes('class="wrap"') && html({ layout: 'cols3' }).includes('/ 3') && html({ layout: 'cols2' }).includes('/ 2') && !html({ layout: 'flow' }).includes('class="wrap"'), 'grid layouts');
assert.ok(html({ layout: 'page' }).includes('break-before:page'), 'one per page');
assert.ok(!html({ title: false }).includes('<h1>') && !html({ pictures: false }).includes('abc123') && html({}).includes('abc123.png'), 'titles and pictures can be left out');
assert.ok(html({ size: 'small' }).includes('font:10pt') && html({ size: 'large' }).includes('font:14pt'), 'text size');
assert.ok(P.build([{ title: 'a', blocks: [], color: 'red; x', font: '"><b>' }], '', {}).includes('<section class="nt" style="font-family:&quot;b&quot;'), 'odd colours and fonts cannot break out of the page');
console.log('print options ok');
