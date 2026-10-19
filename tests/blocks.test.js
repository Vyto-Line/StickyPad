// A long note must keep every line when it is saved (it used to be cut after 400 blocks).
const fs = require('fs'), path = require('path'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const pick = re => { const m = src.match(re); assert(m, 'not found in main.js: ' + re); return m[0]; };
const code = pick(/const DAY[^\n]*\n/) + 'const IMG_ID=/^[A-Za-z0-9_.-]+$/;' + pick(/const textOf[^\n]*\n/) + pick(/function sanitizeBlocks[\s\S]*?\n}\n/) + ';module.exports={sanitizeBlocks,textOf}';
const m = { exports: {} }; new Function('module', code)(m);
const { sanitizeBlocks, textOf } = m.exports;
const blocks = [{ t: 'text', v: 'a'.repeat(300000) }];
for (let i = 0; i < 1500; i++) blocks.push({ t: 'check', v: 'item ' + i, done: false }, { t: 'text', v: 'x' + i });
const out = sanitizeBlocks(blocks);
assert.strictEqual(out.length, blocks.length);
assert.strictEqual(out.at(-1).v, 'x1499');
assert(textOf(out).endsWith('x1499'));
assert.strictEqual(sanitizeBlocks([{ t: 'check', v: '   ', done: false }]).length, 0, 'empty checklist items are still dropped');
console.log('blocks ok');
