const assert = require('assert'), { guard } = require('../focusguard');
let t = 0, calls = 0, focused = false;
const win = { isDestroyed: () => false, webContents: { isFocused: () => focused, focus: () => { calls++; } } };
const f = guard(win, () => t);
assert.strictEqual(f(), true, 'the first focus reaches the page'); assert.strictEqual(calls, 1);
focused = true; t += 1000; assert.strictEqual(f(), false, 'already has the keyboard: nothing to do'); assert.strictEqual(calls, 1);
focused = false; t += 1000; f();
// a fight: focus events every 50 ms
const before = calls; for (let i = 0; i < 40; i++) { t += 50; f(); }
assert.ok(calls - before <= 4, 'a focus fight is cut short (' + (calls - before) + ' calls out of 40)');
t += 2000; assert.strictEqual(f(), true, 'and normal focus works again once it has calmed down');
win.isDestroyed = () => true; assert.strictEqual(f(), false, 'a closed window is left alone');
console.log('focusguard ok');
