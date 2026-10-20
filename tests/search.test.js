const assert = require('assert'), S = require('../search');
const N = (id, title, text, o = {}) => ({ id, title, text, updated: 1000, ...o });
const notes = [
  N('a', 'Shopping', 'milk, eggs and bread\nbuy coffee too', { updated: 1 }),
  N('b', 'Meeting', 'Talk with Νίκος about the budget. ' + 'filler '.repeat(200) + 'The Budget is due Friday', { updated: 5 }),
  N('c', 'Καλημέρα', 'Η συνάντηση είναι αύριο στις 10', { updated: 3 }),
  N('d', '', 'secret plan about the budget', { lock: true, updated: 9 }),
  N('e', 'Budget 2026', 'numbers', { updated: 2 })
];
const ix = S.createIndex();
const ids = (q, o) => S.search(ix, notes, q, o).map(r => r.id);
const txt = segs => segs.map(s => s.t).join('');

// finds words deep inside a long note (the old Home search only read the first 240 letters)
assert.ok(ids('friday').includes('b'), 'text far from the start is found');
// case and accents do not matter, Greek included
assert.deepStrictEqual(ids('KALIMERA'), [], 'Latin letters do not match Greek ones');
assert.deepStrictEqual(ids('καλημερα'), ['c'], 'accents ignored in the title');
assert.deepStrictEqual(ids('συναντηση'), ['c'], 'accents ignored in the text');
assert.deepStrictEqual(ids('ΝΙΚΟΣ'), ['b'], 'capitals and accents ignored');
// every word must be present (in any order, title or text)
assert.deepStrictEqual(ids('budget friday'), ['b']);
assert.deepStrictEqual(ids('friday budget'), ['b']);
assert.deepStrictEqual(ids('milk friday'), []);
// ranking: a title hit beats a text hit; locked note text is never searched but it is not shown as a title match either
const r = ids('budget'); assert.deepStrictEqual(r, ['e', 'b'], r.join());
assert.ok(!ids('secret').length, 'the text of a locked note is not searched');
// snippets: the matching part is marked and the text is cut around it
const rb = S.search(ix, notes, 'friday')[0];
assert.ok(rb.snippet.some(s => s.h && s.t.toLowerCase() === 'friday'), JSON.stringify(rb.snippet));
assert.ok(txt(rb.snippet).startsWith('…'), 'long notes are cut with …');
assert.ok(txt(rb.snippet).length < 160);
const ra = S.search(ix, notes, 'eggs')[0]; assert.strictEqual(txt(ra.snippet), 'milk, eggs and bread · buy coffee too', 'lines are joined');
assert.deepStrictEqual(S.search(ix, notes, 'shop')[0].title, [{ t: 'Shop', h: true }, { t: 'ping', h: false }]);
// no query: newest first, with the first words of each note
const e0 = S.search(ix, notes, ''); assert.deepStrictEqual(e0.map(x => x.id), ['d', 'b', 'c', 'e', 'a']); assert.deepStrictEqual(e0[0].snippet, []);
assert.strictEqual(txt(e0[4].snippet), 'milk, eggs and bread · buy coffee too');
assert.deepStrictEqual(S.search(ix, notes, '', { max: 2 }).length, 2);
assert.deepStrictEqual(S.matchIds(ix, notes, 'budget').sort(), ['b', 'e']);
// the cache re-reads a note that changed, and forgets deleted notes
notes[0] = N('a', 'Shopping', 'now with zucchini', { updated: 50 }); assert.deepStrictEqual(ids('zucchini'), ['a']); assert.deepStrictEqual(ids('eggs'), []);
const before = ix.size(); notes.pop(); S.search(ix, notes, 'x'); assert.ok(ix.size() < before, 'cache pruned');
// folding keeps the length, so positions stay valid
for (const s of ['Ωραία ΜΕΡΑ ς', 'İstanbul', 'ΆΈΉ', 'a😀b']) assert.strictEqual(S.fold(s).length, s.length, s);
// speed: 3000 notes of ~2 KB, first search folds everything, the next ones are quick
const big = Array.from({ length: 3000 }, (_, i) => N('n' + i, 'Note ' + i, ('lorem ipsum dolor sit amet ' + i + ' ').repeat(70), { updated: i }));
const ix2 = S.createIndex(); let t0 = Date.now(); S.search(ix2, big, 'dolor 2999'); const first = Date.now() - t0;
t0 = Date.now(); for (let i = 0; i < 20; i++) S.search(ix2, big, 'ipsum ' + i); const per = (Date.now() - t0) / 20;
assert.ok(first < 3000, 'first search ' + first + ' ms'); assert.ok(per < 250, 'later searches ' + per + ' ms each');
console.log('search ok  (3000 notes: first ' + first + ' ms, then ' + per.toFixed(0) + ' ms)');
