const assert = require('assert'), D = require('../dates');
const now = new Date(2026, 9, 19, 15, 30).getTime();   // Mon 19 Oct 2026 15:30
const at = (s) => { const r = D.parse(s, now); return r.length ? new Date(r[0].at) : null; };
const eq = (s, y, mo, d, h, mi) => { const x = at(s); assert.ok(x, 'no date in: ' + s); assert.deepStrictEqual([x.getFullYear(), x.getMonth() + 1, x.getDate(), x.getHours(), x.getMinutes()], [y, mo, d, h, mi], s + ' -> ' + x); };
eq('Meeting tomorrow at 5pm', 2026, 10, 20, 17, 0);
eq('Συνάντηση αύριο στις 17:30', 2026, 10, 20, 17, 30);
eq('ΑΥΡΙΟ 9:15', 2026, 10, 20, 9, 15);
eq('call on 15/11 10:00', 2026, 11, 15, 10, 0);
eq('παράδοση 3/11/2026', 2026, 11, 3, 9, 0);
eq('on 2026-12-24 18:00 dinner', 2026, 12, 24, 18, 0);
eq('Στις 15 Νοεμβρίου 2026 στις 11:00', 2026, 11, 15, 11, 0);
eq('Nov 15th 6pm', 2026, 11, 15, 18, 0);
eq('1 Ιανουαρίου', 2027, 1, 1, 9, 0);
eq('Την Παρασκευή στις 8', 2026, 10, 23, 8, 0);
eq('see you friday 14:00', 2026, 10, 23, 14, 0);
eq('Δευτέρα 10:00', 2026, 10, 26, 10, 0);   // today is Monday and 10:00 has passed
eq('Δευτέρα 18:00', 2026, 10, 19, 18, 0);
eq('στις 18:45 πάρε φάρμακο', 2026, 10, 19, 18, 45);
eq('at 9am', 2026, 10, 20, 9, 0);
eq('9:00 pm gym', 2026, 10, 19, 21, 0);
eq('σε 2 ώρες', 2026, 10, 19, 17, 30);
eq('in 45 minutes', 2026, 10, 19, 16, 15);
eq('σε 3 μέρες', 2026, 10, 22, 15, 30);
eq('μεθαύριο 12:00', 2026, 10, 21, 12, 0);
eq('Thursday at 3 pm', 2026, 10, 22, 15, 0);
// not dates
for (const s of ['price 5.50 euro', 'room 12', 'I have 3 cats and 10 dogs', 'version 1.14.1', 'ratio 3.5', 'ήταν χθες', 'on 31/02', 'call 210 1234567']) assert.strictEqual(D.parse(s, now).length, 0, 'false positive: ' + s);
// highlighting positions
const r = D.parse('Πάμε αύριο στις 17:30 παραλία', now)[0]; assert.strictEqual('Πάμε αύριο στις 17:30 παραλία'.slice(r.start, r.end), 'αύριο στις 17:30');
assert.strictEqual(D.first('nothing', now), null);
console.log('dates ok');
