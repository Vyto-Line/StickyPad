'use strict';
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
const L = require('../logfile');
const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lg-')), 'x.log'), head = 'HEADER one\nHEADER two\n';
L.append(f, head, 'first'); assert.strictEqual(fs.readFileSync(f, 'utf8'), head + 'first\n', 'a new log starts with its heading');
L.append(f, head, 'second'); assert.strictEqual(fs.readFileSync(f, 'utf8'), head + 'first\nsecond\n', 'the heading is written once');
// grow past the limit with lines of a different length so a cut is likely to land inside a line
for (let i = 0; i < 4000; i++) L.append(f, head, '2026-10-26T10:00:00.000Z  v1.15.3  SLOW SAVE line number ' + i + ' ' + 'x'.repeat(i % 37));
const t = fs.readFileSync(f, 'utf8'), lines = t.split('\n');
assert.ok(t.length <= L.MAX + 200, 'the log stays small: ' + t.length);
assert.ok(t.startsWith(head + '[older lines were removed]\n'), 'the heading stays and a note says lines were removed');
const body = lines.slice(3, -1);
assert.ok(body.length > 100 && body.every(l => /^2026-10-26T10:00:00\.000Z {2}v1\.15\.3 {2}SLOW SAVE line number \d+ x*$/.test(l)), 'every line is whole, none cut in half');
assert.ok(body[body.length - 1].includes('number 3999'), 'the newest line is kept');
// the cut landing exactly on a line start keeps that line
const exact = ('a'.repeat(99) + '\n').repeat(1600); assert.ok(exact.length > L.MAX);
const r = L.trim(exact, 'H\n'); assert.ok(r.split('\n').slice(2, -1).every(l => l === 'a'.repeat(99)), 'exact cut keeps whole lines');
assert.strictEqual(L.trim('short\n', 'H\n'), 'short\n', 'a short log is untouched');
console.log('logfile ok');
