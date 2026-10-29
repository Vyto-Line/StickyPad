// A note is moved by its title bar through the app (dragStart/dragEnd): the note follows the mouse, a let-go at the top maximizes, and the bar's
// double-click (seen by the page) rolls the note up/down through note:roll.
const assert = require('assert');
const H = require('./fake-electron');
(async () => {
  const { handlers: h, wins, electron } = H;
  await h['note:new']({ sender: { id: 0 } });
  const w = wins[wins.length - 1], e = H.ev(w);
  assert.strictEqual(typeof h['note:dragStart'], 'function'); assert.strictEqual(typeof h['note:dragEnd'], 'function');
  const b0 = w.getBounds();
  electron.__cursor = { x: 500, y: 500 };
  assert.strictEqual(await h['note:dragStart'](e), true);
  electron.__cursor = { x: 560, y: 540 };
  await new Promise(r => setTimeout(r, 60));
  let b = w.getBounds();
  assert.strictEqual(b.x, b0.x + 60); assert.strictEqual(b.y, b0.y + 40); assert.strictEqual(b.width, b0.width, 'the size does not change while dragging');
  await h['note:dragEnd'](e);
  electron.__cursor = { x: 900, y: 900 }; await new Promise(r => setTimeout(r, 40));
  assert.strictEqual(w.getBounds().x, b0.x + 60, 'after the let-go the note stays where it is');
  // let go at the top edge with "Snap to the sides": the note maximizes
  await h['settings:set']({}, { snapSides: true });
  electron.__cursor = { x: 600, y: 300 }; await h['note:dragStart'](e);
  electron.__cursor = { x: 600, y: 0 }; await new Promise(r => setTimeout(r, 40));
  await h['note:dragEnd'](e);
  assert.ok(w.isMaximized(), 'let go at the top edge: maximized');
  // pulling it off again restores the size
  electron.__cursor = { x: 600, y: 10 }; await h['note:dragStart'](e);
  assert.ok(!w.isMaximized(), 'dragging a maximized note brings it back to its size');
  await h['note:dragEnd'](e);
  // rolling
  electron.__cursor = { x: 700, y: 400 };
  assert.strictEqual(await h['note:roll'](e, true), true); assert.strictEqual(w.getBounds().height, 40);
  assert.strictEqual(await h['note:roll'](e, false), false); assert.ok(w.getBounds().height >= 180);
  console.log('rolldbl ok');
})().catch(x => { console.error(x); process.exit(1); });
