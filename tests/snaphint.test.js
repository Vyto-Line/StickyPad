// Snapping made easier to find: a Finder command, and a hint shown once when a note is let go at a screen edge.
const assert = require('assert');
const H = require('./fake-electron');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const { handlers: h, wins } = H;
  await h['note:new']({ sender: { id: 0 } }); const w = wins[wins.length - 1];
  const moved = (x, y) => { w.setPosition(x, y); ((w.ls || {}).moved || []).forEach(f => f()); };
  const hints = () => w.webContents.sent.filter(a => a[0] === 'note:snaphint').length;
  moved(600, 400); assert.strictEqual(hints(), 0, 'in the middle of the screen: no hint');
  moved(5, 400); assert.strictEqual(hints(), 1, 'let go at the left edge: the hint appears');
  moved(0, 400); moved(1650, 400); assert.strictEqual(hints(), 1, 'and only once');
  assert.strictEqual((await h['settings:get']({})).snapSides, false, 'the hint never turns anything on');
  await h['snaphint:answer']({}, false); assert.strictEqual((await h['settings:get']({})).snapSides, false);
  // the hint is not shown when snapping is already on, or for a rolled-up note
  const opened = []; // (Settings opens through the answer: just check it answers)
  assert.strictEqual(await h['snaphint:answer']({}, true), true);
  // Finder: the command is found, says how it is now, and flips the setting
  const r = await h['search:query']({}, '>snap');
  const c = r.find(x => x.cmd === 'snap-sides-toggle'); assert.ok(c, 'found by typing "snap"');
  assert.ok(/Now: off/.test(c.snippet[0].t), 'it says it is off now: ' + c.snippet[0].t);
  assert.strictEqual(await h['search:run']({}, 'snap-sides-toggle'), true); await wait(150);
  assert.strictEqual((await h['settings:get']({})).snapSides, true, 'running it turns snapping on');
  assert.strictEqual(w.maximizable, true, 'and Windows snapping is switched on for open notes');
  assert.ok(/Now: on/.test((await h['search:query']({}, '>snap')).find(x => x.cmd === 'snap-sides-toggle').snippet[0].t), 'now says on');
  await h['search:run']({}, 'snap-sides-toggle'); await wait(150);
  assert.strictEqual((await h['settings:get']({})).snapSides, false, 'and off again');
  console.log('snaphint ok');
})().catch(e => { console.error(e); process.exit(1); });
