// Formatting in the other places a note goes: Markdown export, printing, and the safe storage (older versions ignore the marks).
const assert = require('assert');
const convert = require('../convert'), print = require('../print');
const blocks = [{ t: 'text', v: 'Say hello now\n', m: [[4, 9, 'b'], [10, 13, 'i']] }, { t: 'check', v: 'Rent a car', done: false, m: [[0, 4, 's']] }, { t: 'text', v: 'plain' }];
const md = convert.toMarkdown('', blocks);
assert.ok(md.includes('Say **hello** *now*'), 'Markdown keeps bold and italic: ' + md);
assert.ok(md.includes('- [ ] ~~Rent~~ a car'), 'and strikethrough in a checklist item: ' + md);
assert.ok(md.trim().endsWith('plain'));
const txt = convert.toText('', blocks);
assert.ok(txt.includes('Say hello now') && txt.includes('[ ] Rent a car') && !/[*~]/.test(txt), 'plain text export has no marks: ' + txt);
// an old note (no marks) comes out exactly as before
assert.strictEqual(convert.toMarkdown('', [{ t: 'text', v: 'a *b* c' }]), 'a *b* c\n');
const o = { ...print.DEFAULTS, pictures: false }, html = print.buildHtml ? print.build([{ title: 'T', blocks }], '', o) : '';
assert.ok(html.includes('<b>hello</b>') && html.includes('<i>now</i>'), 'printing keeps bold and italic');
assert.ok(/text-decoration:line-through[^>]*>Rent|Rent/.test(html) && html.includes('text-decoration:line-through'), 'and strikethrough in an item');
assert.ok(print.build([{ title: 'T', blocks: [{ t: 'text', v: '<script>x</script>', m: [[0, 8, 'b']] }] }], '', o).indexOf('<script>x') === -1, 'marked text is escaped too');
console.log('format ok');
