// A double-click on a note's title bar (Windows reports it as WM_NCLBUTTONDBLCLK with hit code HTCAPTION) rolls the note up or down.
const assert = require('assert');
const H = require('./fake-electron');
(async () => {
  const { handlers: h, wins } = H;
  await h['note:new']({ sender: { id: 0 } });
  const w = wins[wins.length - 1], hook = w.hooks && w.hooks[0xA3];
  assert.strictEqual(typeof hook, 'function', 'every note listens for a double-click on its title bar');
  const sent = () => w.webContents.sent.filter(m => m[0] === 'note:rolled').map(m => m[1]);
  const cap = Buffer.alloc(8); cap.writeUInt32LE(2, 0);   // HTCAPTION: the part of the window you drag by
  hook(cap);
  assert.deepStrictEqual(sent(), [true], 'the first double-click rolls the note up and tells the page');
  assert.strictEqual(w._b.height, 40, 'the window shrinks to the title bar');
  hook(cap);
  assert.deepStrictEqual(sent(), [true, false], 'the second one rolls it down');
  assert.ok(w._b.height >= 180, 'and it gets its height back: ' + w._b.height);
  const other = Buffer.alloc(8); other.writeUInt32LE(20, 0);   // some other part of the window (for example HTCLOSE): nothing happens
  hook(other); hook(Buffer.alloc(0));
  assert.deepStrictEqual(sent(), [true, false], 'other double-clicks and odd input are ignored');
  // Windows must not maximize the note on this double-click, even with "Snap to the sides" on
  await h['settings:set']({}, { snapSides: true });
  assert.strictEqual(w.maximizable, true);
  hook(cap);
  assert.strictEqual(w.maximizable, false, 'maximizing is switched off for the moment of the double-click');
  await new Promise(r => setTimeout(r, 150));
  assert.strictEqual(w.maximizable, false, 'a rolled-up note stays unsnappable (as the roll button does)');
  hook(cap); await new Promise(r => setTimeout(r, 150));
  assert.strictEqual(w.maximizable, true, 'rolled down again: snapping is back');
  // a note that was deleted does nothing
  console.log('rolldbl ok');
})().catch(e => { console.error(e); process.exit(1); });
