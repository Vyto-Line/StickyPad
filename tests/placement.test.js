const assert = require('assert'), P = require('../placement');
const D1 = { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1040 } };
const D2 = { id: 2, bounds: { x: 1920, y: 0, width: 2560, height: 1440 }, workArea: { x: 1920, y: 0, width: 2560, height: 1400 } };
const nb = (x, y, w = 300, h = 320) => ({ x, y, width: w, height: h });
// normal cases: nothing moves
assert.strictEqual(P.place(nb(100, 100), null, [D1], 1).moved, false);
assert.strictEqual(P.place(nb(2500, 200), { id: 2, bounds: D2.bounds }, [D1, D2], 1).moved, false);
// second screen unplugged: the note comes to the main screen, same relative place
let r = P.place(nb(1920 + 1280, 720), { id: 2, bounds: D2.bounds }, [D1], 1);
assert.ok(r.moved && r.bounds.x === 960 && r.bounds.y === 520, JSON.stringify(r));
// far right-bottom corner is clamped inside
r = P.place(nb(1920 + 2400, 1300), { id: 2, bounds: D2.bounds }, [D1], 1); assert.ok(r.moved && r.bounds.x + r.bounds.width <= 1920 && r.bounds.y + r.bounds.height <= 1040, JSON.stringify(r));
// a note with no remembered home but off screen is brought back
r = P.place(nb(5000, 4000), null, [D1], 1); assert.ok(r.moved && r.bounds.x <= 1620 && r.bounds.y <= 720);
// screen is back: the original place is used again
assert.deepStrictEqual(P.comeHome({ id: 2, bounds: D2.bounds }, nb(3200, 720), [D1, D2]), nb(3200, 720));
assert.strictEqual(P.comeHome({ id: 3, bounds: D2.bounds }, nb(3200, 720), [D1, D2]), null);
// note bigger than the screen is shrunk to fit
r = P.place(nb(5000, 0, 3000, 2000), { id: 2, bounds: D2.bounds }, [D1], 1); assert.ok(r.bounds.width <= 1920 && r.bounds.height <= 1040);
assert.strictEqual(P.displayOf(nb(2000, 10), [D1, D2]).id, 2);
console.log('placement ok');
// settings panel makes a narrow note wider
{
  const wa = { x: 0, y: 0, width: 1920, height: 1040 };
  let g = P.growForPanel({ x: 100, y: 10, width: 300, height: 320 }, wa); assert.ok(g.grown && g.bounds.width === 630 && g.bounds.x === 100);
  g = P.growForPanel({ x: 1700, y: 10, width: 300, height: 320 }, wa); assert.ok(g.grown && g.bounds.x === 1290 && g.bounds.width === 630);
  g = P.growForPanel({ x: 5, y: 10, width: 600, height: 320 }, wa); assert.strictEqual(g.grown, false);
  g = P.growForPanel({ x: 0, y: 0, width: 300, height: 320 }, { x: 0, y: 0, width: 500, height: 600 }); assert.strictEqual(g.bounds.width, 500, 'never wider than the screen');
  console.log('panel grow ok');
}
