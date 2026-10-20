const assert = require('assert'), W = require('../words');
const m = W.newMap();
W.add(m, 'The meeting is at noon. Meeting notes: meeting agenda, Καλημέρα καλημερα 12345 12345 a an the');
const top = W.top(m);
assert.deepStrictEqual(top.map(x => x.k), ['meeting', 'καλημερα'], 'only words used at least twice, 4+ letters, not numbers');
assert.strictEqual(top[0].n, 3);
assert.strictEqual(top.find(x => x.k === 'meeting').w, 'meeting', 'the form you write most often');
assert.strictEqual(W.prefixAt('say mee', 7), 'mee');
assert.strictEqual(W.prefixAt('say me', 6), null, 'two letters are not enough');
assert.strictEqual(W.prefixAt('say meeting', 7), null, 'not in the middle of a word');
assert.strictEqual(W.prefixAt('a, mee ', 7), null, 'not after the word ended');
assert.deepStrictEqual(W.suggest('Mee', 5, [top]), ['meeting']);
assert.deepStrictEqual(W.suggest('meeting', 5, [top]), [], 'nothing to add to a finished word');
assert.deepStrictEqual(W.suggest('ΚΑΛΗ', 5, [top]), ['Καλημέρα'], 'case and accents ignored');
assert.strictEqual(W.rest('ΚΑΛΗ', 'Καλημέρα'), 'μέρα');
// this note's own words count too, and a word needs two uses in all
const own = W.add(W.newMap(), 'elephant elephant stable');
assert.deepStrictEqual(W.suggest('ele', 5, [top], own), ['elephant']);
assert.deepStrictEqual(W.suggest('sta', 5, [top], own), [], 'used once only');
assert.deepStrictEqual(W.suggest('ele', 5, [[{ k: 'elephant', w: 'elephant', n: 2 }, { k: 'elevator', w: 'elevator', n: 9 }]]), ['elevator', 'elephant'], 'most used first');
// limits
const big = W.newMap(); W.add(big, ('x'.repeat(40) + ' ').repeat(10)); assert.strictEqual(big.size, 0, 'very long strings are not words');
console.log('words ok');
