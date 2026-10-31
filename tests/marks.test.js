const assert = require('assert');
const M = require('../marks');
// clean: only known kinds, whole numbers, inside the text; joined and sorted
assert.deepStrictEqual(M.clean([[0, 3, 'b'], [3, 5, 'b'], [1, 2, 'zz'], [-4, 2, 'i'], [2, 99, 'u'], ['a', 2, 'b'], [4, 4, 'b'], 'x', null], 8),
  [[0, 5, 'b'], [0, 2, 'i'], [2, 8, 'u']].sort((a, b) => a[0] - b[0] || a[1] - b[1] || (a[2] < b[2] ? -1 : 1)));
assert.deepStrictEqual(M.clean('nonsense', 5), []); assert.deepStrictEqual(M.clean(undefined, 5), []);
assert.deepStrictEqual(M.clean([[0, 1, 'h7'], [0, 1, 'c8'], [0, 1, 'h6'], [0, 1, 'c7']], 5), [[0, 1, 'c7'], [0, 1, 'h6']]);
// covered / remove / add
const m = [[2, 6, 'b']];
assert.ok(M.covered(m, 2, 6, 'b') && M.covered(m, 3, 5, 'b') && !M.covered(m, 1, 6, 'b') && !M.covered(m, 2, 7, 'b') && !M.covered(m, 2, 6, 'i'));
assert.ok(M.covered([[0, 3, 'b'], [3, 5, 'b']], 1, 5, 'b'), 'touching parts count as one');
assert.deepStrictEqual(M.remove(m, 3, 5, 'b'), [[2, 3, 'b'], [5, 6, 'b']]);
assert.deepStrictEqual(M.remove(m, 0, 10, 'b'), []);
assert.deepStrictEqual(M.add([[0, 2, 'b']], 2, 5, 'b', 10), [[0, 5, 'b']], 'adding next to the same kind joins them');
assert.deepStrictEqual(M.add([[0, 6, 'h1']], 2, 4, 'h3', 10), [[0, 2, 'h1'], [2, 4, 'h3'], [4, 6, 'h1']], 'a new highlight replaces the old one there');
assert.deepStrictEqual(M.add([[0, 6, 'c2']], 0, 6, 'c5', 10), [[0, 6, 'c5']]);
assert.deepStrictEqual(M.add([[0, 6, 'h1']], 0, 6, 'c5', 10).sort(), [[0, 6, 'c5'], [0, 6, 'h1']], 'a highlight and a letter colour can go together');
assert.deepStrictEqual(M.clear([[0, 6, 'b'], [0, 6, 'h2'], [0, 6, 'c3'], [8, 9, 'u']], 1, 5).map(x => x.join()).sort(), ['0,1,b', '0,1,c3', '0,1,h2', '5,6,b', '5,6,c3', '5,6,h2', '8,9,u']);
// runs
assert.deepStrictEqual(M.runs('Hello big world', [[6, 9, 'b'], [6, 15, 'i']]), [{ text: 'Hello ', kinds: [] }, { text: 'big', kinds: ['b', 'i'] }, { text: ' world', kinds: ['i'] }]);
assert.deepStrictEqual(M.runs('abc', []), [{ text: 'abc', kinds: [] }]);
assert.deepStrictEqual(M.runs('', []), []);
// HTML for the clipboard and printing
assert.strictEqual(M.toHtml('a<b', [[0, 1, 'b']]), '<b>a</b>&lt;b');
assert.ok(/background-color:#ffe680/.test(M.toHtml('x', [[0, 1, 'h1']])));
assert.ok(/color:#c5221f/.test(M.toHtml('x', [[0, 1, 'c2']])) && /color:#ff8a80/.test(M.toHtml('x', [[0, 1, 'c2']], true)));
assert.ok(/text-decoration:underline line-through/.test(M.toHtml('x', [[0, 1, 'u'], [0, 1, 's']])));
assert.strictEqual(M.toHtml('a\nb', []), 'a<br>b', 'line breaks stay line breaks');
// Markdown
assert.strictEqual(M.toMarkdown('say hello now', [[4, 9, 'b']]), 'say **hello** now');
assert.strictEqual(M.toMarkdown('a b ', [[0, 4, 'i']]), '*a b* ', 'spaces stay outside the stars');
assert.strictEqual(M.toMarkdown('x', [[0, 1, 'b'], [0, 1, 'i'], [0, 1, 's']]), '***~~x~~***');
assert.strictEqual(M.toMarkdown('plain', []), 'plain');
// sanitize: a damaged list can never point outside the text
assert.deepStrictEqual(M.sanitize({ v: 'abc', m: [[0, 99, 'b'], [5, 6, 'i']] }), [[0, 3, 'b']]);
assert.strictEqual(M.sanitize({ v: 'abc' }), undefined); assert.strictEqual(M.sanitize({ v: 'abc', m: 'x' }), undefined); assert.strictEqual(M.sanitize(null), undefined);
// huge input is capped
const big = Array.from({ length: 30000 }, (_, i) => [i * 2, i * 2 + 1, 'b']);
assert.ok(M.clean(big, 100000).length <= 5000);
console.log('marks ok');
