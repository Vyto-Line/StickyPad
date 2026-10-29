// A double-click on a note's title bar (Windows reports it as WM_NCLBUTTONDBLCLK with hit code HTCAPTION) rolls the note up or down.
const assert = require('assert');
const H = require('./fake-electron');
(async () => {
  const { handlers: h, wins } = H;
  await h['note:new']({ sender: { id: 0 } });
  const w = wins[wins.length - 1], hook = w.hooks && w.hooks[0xA3];
  assert.strictEqual(typeof hook, 'function', 'every note listens for a double-click on its title bar');
  const hk = async b => { await new Promise(r => setTimeout(r, 650)); hook(b); };   // (one roll per double-click: 0.6 s apart at least)
  const sent = () => w.webContents.sent.filter(m => m[0] === 'note:rolled').map(m => m[1]);
  const cap = Buffer.alloc(8); cap.writeUInt32LE(2, 0);   // HTCAPTION: the part of the window you drag by
  await hk(cap);
  assert.deepStrictEqual(sent(), [true], 'the first double-click rolls the note up and tells the page');
  assert.strictEqual(w._b.height, 40, 'the window shrinks to the title bar');
  await hk(cap);
  assert.deepStrictEqual(sent(), [true, false], 'the second one rolls it down');
  assert.ok(w._b.height >= 180, 'and it gets its height back: ' + w._b.height);
  const other = Buffer.alloc(8); other.writeUInt32LE(20, 0);   // some other part of the window (for example HTCLOSE): nothing happens
  hook(other); hook(Buffer.alloc(0));
  assert.deepStrictEqual(sent(), [true, false], 'other double-clicks and odd input are ignored');
  // Windows must not maximize the note on this double-click, even with "Snap to the sides" on
  await h['settings:set']({}, { snapSides: true });
  assert.strictEqual(w.maximizable, true);
  await hk(cap);
  assert.strictEqual(w.maximizable, false, 'maximizing is switched off for the moment of the double-click');
  await new Promise(r => setTimeout(r, 150));
  assert.strictEqual(w.maximizable, false, 'a rolled-up note stays unsnappable (as the roll button does)');
  await hk(cap); await new Promise(r => setTimeout(r, 150));
  assert.strictEqual(w.maximizable, true, 'rolled down again: snapping is back');
  // second way in: Windows maximized the note anyway after a double-click on its title bar -> put it back and roll it up instead
  await h['settings:set']({}, { snapSides: true });
  const bn = w._b; H.electron.__cursor = { x: bn.x + 100, y: bn.y + 10 };
  const normal = { ...w._b };   // the size the note had before Windows maximized it
  w._max = true; w._b = { x: 0, y: 0, width: 1920, height: 1040 }; w.getNormalBounds = () => normal;   // (full screen while maximized)
  await new Promise(r => setTimeout(r, 800)); w.emit('maximize'); await new Promise(r => setTimeout(r, 200));
  assert.strictEqual(w._max, false, 'the note is taken out of full screen');
  assert.deepStrictEqual(sent().slice(-1), [true], 'and rolled up');
  assert.strictEqual(w._b.width, normal.width, 'it rolls from its normal width, not the full-screen one: ' + w._b.width);
  assert.strictEqual(w._b.height, 40, 'down to the title bar');
  assert.strictEqual(w.opacity, 1, 'and is visible again');
  w.getNormalBounds = () => w._b;
  // not on the title bar (Win+Up, or a snap by dragging to the screen edge): stays maximized
  await hk(cap); await new Promise(r => setTimeout(r, 150));   // roll it down again
  H.electron.__cursor = { x: bn.x + 100, y: bn.y + 300 }; w._max = true; w.emit('maximize');
  assert.strictEqual(w._max, true, 'a maximize with the mouse elsewhere is left alone');
  H.electron.__cursor = { x: bn.x + 100, y: 2 }; w._b = { ...bn, y: 0 }; w._max = true; w.emit('maximize');
  assert.strictEqual(w._max, true, 'and so is one with the mouse at the very top edge of the screen (a note dragged there and snapped)');
  w._b = bn;
  // two quick presses on the title bar (hit code 2) count as a double-click even when Windows sends no double-click message
  w._max = false; await new Promise(r => setTimeout(r, 700)); const press = w.hooks[0xA1], n0 = sent().length;
  assert.strictEqual(typeof press, 'function', 'the title-bar press is listened to');
  H.electron.__cursor = { x: bn.x + 100, y: bn.y + 12 };
  press(cap); assert.strictEqual(sent().length, n0, 'one press alone does nothing');
  press(cap); assert.strictEqual(sent().length, n0 + 1, 'the second quick press rolls the note');
  const hit = Buffer.alloc(8); hit.writeUInt32LE(20, 0); press(hit); press(hit);
  assert.strictEqual(sent().length, n0 + 1, 'presses elsewhere on the window do nothing');
  // first click: Windows' move loop ends without the note having moved -> the page is told to get ready for a second click
  H.electron.__cursor = { x: bn.x + 100, y: bn.y + 12 };
  const armed = () => w.webContents.sent.filter(m => m[0] === 'note:armdbl').length, a0 = armed();
  w.emit('moved'); assert.strictEqual(armed(), a0 + 1, 'a click on the title bar (the note did not move) arms the double-click');
  w.emit('will-move'); w.emit('moved'); assert.strictEqual(armed(), a0 + 1, 'dragging the note does not');
  w.emit('will-resize'); w.emit('moved'); assert.strictEqual(armed(), a0 + 1, 'nor does resizing it');
  H.electron.__cursor = { x: bn.x + 100, y: bn.y + 200 }; w.emit('moved'); assert.strictEqual(armed(), a0 + 1, 'nor a click away from the title bar');
  console.log('rolldbl ok');
})().catch(e => { console.error(e); process.exit(1); });
