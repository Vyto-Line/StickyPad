// Snap to the sides of the screen = Windows' own snapping, switched on per note by the setting (off by default).
const assert = require('assert');
const H = require('./fake-electron');
(async () => {
  const { handlers: h, wins } = H;
  const mk = async () => { await h['note:new']({ sender: { id: 0 } }); return wins[wins.length - 1]; };
  const a = await mk();
  assert.strictEqual((await h['settings:get']({})).snapSides, false, 'off by default');
  assert.strictEqual(a.o.maximizable, false, 'off: a new note opens as before (Windows snapping stays off)');
  await h['settings:set']({}, { snapSides: true });
  assert.strictEqual(a.maximizable, true, 'turning it on switches Windows snapping on for notes that are already open');
  const b = await mk(); assert.strictEqual(b.o.maximizable, true, 'and for notes opened afterwards');
  // a rolled-up note keeps it off, and gets it back when unrolled
  const e = H.ev(b); await h['note:roll'](e, true); assert.strictEqual(b.maximizable, false, 'rolled-up: off');
  await h['note:roll'](e, false); assert.strictEqual(b.maximizable, true, 'unrolled: on again');
  // turning it off again: a snapped (maximized) note goes back to normal
  a._max = true; await h['settings:set']({}, { snapSides: false });
  assert.strictEqual(a.maximizable, false); assert.strictEqual(a._max, false, 'off: a note that was filling the screen is let go'); assert.strictEqual(b.maximizable, false);
  console.log('snapnative ok');
})().catch(e => { console.error(e); process.exit(1); });
