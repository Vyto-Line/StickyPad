// "Keep the text solid": a see-through window only with the GPU on (Low memory mode off); otherwise the whole note fades.
const assert = require('assert');
const { spawnSync } = require('child_process'), path = require('path');
function run(gpu) {
  const code = `
    const assert = require('assert'); const H = require('./fake-electron');
    (async () => {
      const { handlers: h, wins } = H; const n0 = wins.length;
      await h['note:new']({ sender: { id: 0 } }); const w = wins[wins.length - 1], e = H.ev(w);
      await h['note:update'](e, { blocks: [{ t: 'text', v: 'hello' }] });
      const g = await h['note:get'](e); assert.strictEqual(g.solidOk, ${gpu}, 'solidOk');
      assert.ok(!w.o.transparent, 'a normal note is not see-through');
      await h['note:update'](e, { opacity: 0.5 }); assert.strictEqual(w.opacity, 0.5, 'whole note fades by default');
      await h['note:update'](e, { solidText: true }); await new Promise(r => setTimeout(r, 200));
      const now = wins[wins.length - 1];
      if (${gpu}) {
        assert.notStrictEqual(now, w, 'the window is opened again as a see-through one');
        assert.strictEqual(now.o.transparent, true); assert.strictEqual(now.o.backgroundColor, '#00000000');
        const e2 = H.ev(now); const g2 = await h['note:get'](e2); assert.strictEqual(g2.solidText, true); assert.strictEqual(g2.opacity, 0.5);
        assert.ok(!now.opacity || now.opacity === 1, 'window itself stays solid: the page paints the see-through background');
        await h['note:update'](e2, { opacity: 0.4 }); assert.ok(!now.opacity || now.opacity === 1, 'moving the bar later keeps the window as it is (no flicker)');
        assert.strictEqual(wins.length, n0 + 2, 'only one extra window');
        await h['note:update'](e2, { solidText: false }); await new Promise(r => setTimeout(r, 200));
        const back = wins[wins.length - 1]; assert.ok(!back.o.transparent, 'turned off: a normal window again'); assert.strictEqual(back.opacity, 0.4, 'and the whole note fades again');
      } else {
        assert.strictEqual(wins[wins.length - 1], w, 'no see-through window without the GPU'); assert.strictEqual(w.opacity, 0.5, 'whole note still fades');
        assert.ok(!w.o.transparent);
      }
      console.log('ok'); process.exit(0);
    })().catch(err => { console.error(err); process.exit(1); });`;
  const r = spawnSync(process.execPath, ['-e', code], { cwd: __dirname, encoding: 'utf8', env: { ...process.env, SP_GPU: gpu ? '1' : '' } });
  assert.strictEqual(r.status, 0, (gpu ? 'GPU on: ' : 'GPU off: ') + r.stdout + r.stderr);
}
run(false); run(true);
console.log('solid text ok');
