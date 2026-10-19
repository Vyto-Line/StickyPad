'use strict';
const assert = require('assert');
const R = require('../reminders');
const now = new Date(2026, 9, 19, 13, 30, 0).getTime();   // 19 Oct 2026, 13:30 local

assert.deepStrictEqual(R.due({ a: { id: 'a', remind: now - 5 }, b: { id: 'b', remind: now + 5 }, c: { id: 'c', remind: now - 100 }, d: { id: 'd', remind: 0 }, e: { id: 'e' } }, now), ['c', 'a']);
assert.deepStrictEqual(R.due({}, now), []);
assert.deepStrictEqual(R.due(null, now), []);

assert.strictEqual(R.quick('m10', now), now + 600000);
assert.strictEqual(R.quick('h1', now), now + 3600000);
assert.strictEqual(R.quick('later', now), now + 10800000);
const tom = new Date(R.quick('tomorrow', now));
assert.strictEqual(tom.getDate(), 20); assert.strictEqual(tom.getHours(), 9); assert.strictEqual(tom.getMinutes(), 0);
assert.strictEqual(R.quick('nope', now), 0);
// "tomorrow" across a month end
const eom = new Date(R.quick('tomorrow', new Date(2026, 9, 31, 23, 50).getTime()));
assert.strictEqual(eom.getMonth(), 10); assert.strictEqual(eom.getDate(), 1);

const s = R.toLocalInput(now);
assert.strictEqual(s, '2026-10-19T13:30');
assert.strictEqual(R.fromLocalInput(s), now);
assert.strictEqual(R.fromLocalInput(''), 0); assert.strictEqual(R.fromLocalInput('garbage'), 0);
assert.strictEqual(R.toLocalInput(0), '');

assert.strictEqual(R.body('', false), '');
assert.strictEqual(R.body('☐ buy milk\nsecond', false), 'buy milk');
assert.strictEqual(R.body('\n\n  first real line  \nx', false), 'first real line');
assert.strictEqual(R.body('secret', true), 'Locked note');
assert.ok(R.body('x'.repeat(500), false).length <= 120);
console.log('reminders ok');
