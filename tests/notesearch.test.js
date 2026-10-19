const assert = require('assert'), N = require('../notesearch');
const notes = [
  { id: 'a', title: 'Λογιστής', text: 'Ραντεβού με τον λογιστή την Τρίτη. Να πάρω τα τιμολόγια και το ΑΦΜ.', updated: 3 },
  { id: 'b', title: 'Ψώνια', text: 'γάλα, ψωμί, αυγά', updated: 5 },
  { id: 'c', title: 'Trip', text: 'Flights to Rome in May. Hotel near the station.', updated: 4 },
  { id: 'd', title: '', text: 'τηλέφωνο λογιστή 2101234567', updated: 1 }
];
let r = N.build(notes, 'Τι είχα γράψει για τον λογιστή;'); assert.ok(r.matched); assert.deepStrictEqual(r.used.map(x => x.id), ['a', 'd'], JSON.stringify(r.used)); assert.ok(r.context.includes('τιμολόγια'));
r = N.build(notes, 'when is my flight to rome'); assert.deepStrictEqual(r.used.map(x => x.id), ['c']);
r = N.build(notes, 'ΛΟΓΙΣΤΕΣ'); assert.ok(r.used.some(x => x.id === 'a'), 'accents/case/ending do not matter');
r = N.build(notes, 'what do I have?'); assert.ok(!r.matched && r.used.length === 4 && r.used[0].id === 'b', 'no clear match -> the newest notes');
r = N.build(notes, 'λογιστή', { total: 120 }); assert.strictEqual(r.used.length <= 1, true);
assert.ok(N.build([{ id: 'x', title: 't', text: 'x'.repeat(5000) }], 'x').context.length < 1700);
assert.deepStrictEqual(N.build([], 'hi'), { context: '', used: [], matched: false, titles: [], count: 0 });
console.log('notesearch ok');
