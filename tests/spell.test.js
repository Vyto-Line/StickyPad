const assert = require('assert');
const spell = require('../spell');
assert.deepStrictEqual(spell.languages(['en-US', 'el', 'de'], ['de-DE']), ['en-US', 'el', 'de'], 'English, Greek and the language of Windows');
assert.deepStrictEqual(spell.languages(['en-US'], ['en-US']), ['en-US'], 'no duplicates, missing languages left out');
assert.deepStrictEqual(spell.languages(undefined, undefined), [], 'odd input is safe');
const logged = []; let set = null; const ev = {};
spell.setup({ on: (e, f) => { ev[e] = f; }, availableSpellCheckerLanguages: ['en-US', 'el'], setSpellCheckerLanguages: l => { set = l; } }, ['el-GR'], l => logged.push(l));
assert.deepStrictEqual(set, ['en-US', 'el']);
ev['spellcheck-dictionary-download-failure']({}, 'el');
assert.ok(logged.some(l => /SPELL languages: en-US, el/.test(l)) && logged.some(l => /download-failure: el/.test(l)), 'what happens is written to the log');
spell.setup(null, [], l => logged.push(l));   // never throws
console.log('spell ok');
