// Snap to the sides of the screen, as main.js uses it: off by default, half / whole screen, old size back on drag-away.
const assert = require('assert');
const H = require('./fake-electron');
(async () => {
  const { handlers: h, wins, electron } = H;
  await h['note:new']({ sender: { id: 0 } });
  const w = wins[wins.length - 1], moved = () => (w.ls.moved || []).forEach(f => f());
  const st = async () => h['settings:get']({});
  assert.strictEqual((await st()).snapSides, false, 'off by default');
  // off: nothing happens at the edge
  w._b = { x: 40, y: 50, width: 300, height: 320 }; electron.__cursor = { x: 0, y: 500 }; moved();
  assert.strictEqual(w._b.width, 300, 'off: the note stays as it is');
  await h['settings:set']({}, { snapSides: true }); assert.strictEqual((await st()).snapSides, true);
  // on: left edge fills the left half of the work area
  w._b = { x: 40, y: 50, width: 300, height: 320 }; electron.__cursor = { x: 0, y: 500 }; moved();
  assert.deepStrictEqual(w._b, { x: 0, y: 0, width: 960, height: 1040 });
  // dragged to the right edge: right half, and the first (small) size is still the one remembered
  electron.__cursor = { x: 1919, y: 500 }; moved(); assert.deepStrictEqual(w._b, { x: 960, y: 0, width: 960, height: 1040 });
  electron.__cursor = { x: 900, y: 0 }; moved(); assert.deepStrictEqual(w._b, { x: 0, y: 0, width: 1920, height: 1040 }, 'top: the whole screen');
  // let go in the middle of the screen: back to the old size, at the mouse
  electron.__cursor = { x: 960, y: 400 }; moved();
  assert.strictEqual(w._b.width, 300); assert.strictEqual(w._b.height, 320); assert.ok(w._b.x >= 0 && w._b.x + 300 <= 1920 && Math.abs(w._b.y - 382) <= 1, JSON.stringify(w._b));
  // once restored it is an ordinary note again: another drop in the middle changes nothing
  const keep = { ...w._b }; electron.__cursor = { x: 700, y: 700 }; moved(); assert.strictEqual(w._b.width, 300); void keep;
  // a corner does nothing
  w._b = { x: 100, y: 100, width: 300, height: 320 }; electron.__cursor = { x: 0, y: 5 }; moved(); assert.strictEqual(w._b.width, 300, 'corner: nothing');
  // sized by hand while snapped: that size is kept
  electron.__cursor = { x: 0, y: 500 }; moved(); assert.strictEqual(w._b.width, 960);
  w._b = { x: 0, y: 0, width: 700, height: 600 }; (w.ls.resized || []).forEach(f => f()); electron.__cursor = { x: 500, y: 500 }; moved(); assert.strictEqual(w._b.width, 700, 'hand-sized note keeps its size');
  // turning the switch off forgets everything
  await h['settings:set']({}, { snapSides: false }); electron.__cursor = { x: 0, y: 500 }; w._b = { x: 10, y: 10, width: 300, height: 320 }; moved(); assert.strictEqual(w._b.width, 300);
  console.log('sidesnap main ok');
})().catch(e => { console.error(e); process.exit(1); });
