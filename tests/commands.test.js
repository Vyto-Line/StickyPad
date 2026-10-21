const assert = require('assert'), C = require('../commands');
const ids = q => C.match(q).map(c => c.id);
assert.deepStrictEqual(ids(''), [], 'no text: no actions mixed into the notes');
assert.ok(ids('dark').includes('dark'), 'a word finds its action');
assert.ok(ids('back up').includes('backup') && ids('backup').includes('backup'), 'with or without the space? "back up" and "backup"');
assert.ok(ids('BACKUP').includes('settings-data'), 'capitals do not matter, keywords count');
assert.ok(ids('Θ').length === 0, 'unrelated text finds nothing');
assert.ok(ids('new').length <= 3, 'at most 3 actions next to notes');
assert.strictEqual(C.match('>').length, C.COMMANDS.length, '">" alone lists every action');
assert.deepStrictEqual(C.match('> trash').map(c => c.id)[0], 'trash');
assert.strictEqual(C.match('>zzzz').length, 0);
assert.ok(C.byId('dark') && !C.byId('rm -rf') && !C.byId(undefined), 'only known ids run');
assert.strictEqual(new Set(C.COMMANDS.map(c => c.id)).size, C.COMMANDS.length, 'ids are unique');
console.log('commands ok');
// the newer actions: settings pages, accessibility, logs, print
assert.ok(ids('accessibility').length >= 1 && C.match('> access').length >= 8, 'accessibility actions are found');
assert.ok(C.match('> perf').some(c => c.id === 'log-perf') && C.match('> shortcuts').some(c => c.id === 'settings-shortcuts'), 'logs and settings pages are found');
assert.ok(C.byId('print') && C.byId('access-bigger') && C.byId('access-reset'), 'print and text size are actions');
