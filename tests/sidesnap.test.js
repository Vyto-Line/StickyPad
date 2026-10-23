const S = require('../sidesnap.js'), assert = require('assert');
const one = [{ id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1040 } }];   // taskbar at the bottom
const z = (x, y, ds = one) => S.zone({ x, y }, ds);
assert.deepStrictEqual(z(0, 500), { zone: 'left', bounds: { x: 0, y: 0, width: 960, height: 1040 } });
assert.deepStrictEqual(z(1919, 500), { zone: 'right', bounds: { x: 960, y: 0, width: 960, height: 1040 } }, 'right half starts where the left one ends');
assert.deepStrictEqual(z(900, 0), { zone: 'top', bounds: { x: 0, y: 0, width: 1920, height: 1040 } }, 'top fills the work area (the taskbar stays visible)');
assert.strictEqual(z(5, 500).zone, 'left'); assert.strictEqual(z(7, 500), null, 'only right at the edge');
assert.strictEqual(z(960, 500), null); assert.strictEqual(z(0, 10), null, 'top-left corner does nothing'); assert.strictEqual(z(0, 1075), null, 'bottom-left corner does nothing');
assert.strictEqual(z(1919, 5), null, 'top-right corner does nothing'); assert.strictEqual(z(40, 0), null, 'near the corner along the top does nothing');
assert.strictEqual(z(-5, 500), null, 'outside every screen'); assert.strictEqual(S.zone(null, one), null); assert.strictEqual(S.zone({ x: 1, y: 1 }, null), null);
// odd widths: the two halves add up
const odd = [{ id: 1, bounds: { x: 0, y: 0, width: 1367, height: 768 }, workArea: { x: 0, y: 0, width: 1367, height: 728 } }];
assert.strictEqual(z(0, 300, odd).bounds.width + z(1366, 300, odd).bounds.width, 1367);
// two screens side by side: the line between them is not an edge, the outer edges are
const two = [{ id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1040 } }, { id: 2, bounds: { x: 1920, y: 0, width: 1280, height: 1024 }, workArea: { x: 1920, y: 0, width: 1280, height: 984 } }];
assert.strictEqual(z(1919, 500, two), null); assert.strictEqual(z(1920, 500, two), null);
assert.deepStrictEqual(z(3199, 500, two), { zone: 'right', bounds: { x: 2560, y: 0, width: 640, height: 984 } }); assert.strictEqual(z(0, 500, two).zone, 'left');
assert.deepStrictEqual(z(2500, 0, two).bounds, { x: 1920, y: 0, width: 1280, height: 984 }, 'top uses the screen the mouse is on');
// a screen above and below (negative y): top edge of the lower one touches the other, so no top snap there
const stacked = [{ id: 1, bounds: { x: 0, y: -1080, width: 1920, height: 1080 }, workArea: { x: 0, y: -1080, width: 1920, height: 1080 } }, { id: 2, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1040 } }];
assert.strictEqual(z(900, 0, stacked), null); assert.strictEqual(z(900, -1080, stacked).zone, 'top');
// dragging away: old size, mouse at the same relative spot on the title, kept on the screen
const snapped = { x: 0, y: 0, width: 960, height: 1040 }, prev = { x: 300, y: 200, width: 320, height: 400 }, wa = one[0].workArea;
assert.deepStrictEqual(S.restoreAt(prev, snapped, { x: 480, y: 300 }, wa), { x: 320, y: 282, width: 320, height: 400 });
assert.deepStrictEqual(S.restoreAt(prev, snapped, { x: 0, y: 0 }, wa), { x: 0, y: 0, width: 320, height: 400 }, 'never off the screen');
assert.deepStrictEqual(S.restoreAt(prev, snapped, { x: 959, y: 1039 }, wa).y, 640);
assert.deepStrictEqual(S.restoreAt({ width: 5000, height: 5000 }, snapped, { x: 10, y: 10 }, wa), { x: 0, y: 0, width: 1920, height: 1040 });
assert.ok(S.same({ x: 0, y: 0, width: 960, height: 1040 }, { x: 1, y: 0, width: 960, height: 1039 }) && !S.same(snapped, prev) && !S.same(null, snapped));
// the note pushed past the edge counts too, even when the mouse is not exactly on the edge (a small note grabbed by the middle of its title)
const W = (x, y, width = 300, height = 320) => ({ x, y, width, height });
assert.strictEqual(S.zone({ x: 150, y: 500 }, one, W(-150, 400)).zone, 'left', 'note half off the left edge');
assert.strictEqual(S.zone({ x: 1800, y: 500 }, one, W(1650, 400)).zone, 'right');
assert.strictEqual(S.zone({ x: 600, y: 400 }, one, W(450, -40)).zone, 'top');
assert.strictEqual(S.zone({ x: 150, y: 500 }, one, W(-10, 400)), null, 'only a little past the edge: nothing');
assert.strictEqual(S.zone({ x: 150, y: 500 }, one, W(0, 400)), null, 'just touching the edge: nothing (the old edge snap handles that)');
assert.strictEqual(S.zone({ x: 150, y: 20 }, one, W(-150, -30)), null, 'pushed into a corner: nothing');
assert.strictEqual(S.zone({ x: 150, y: 500 }, two, W(1770, 400)), null, 'past the line between two screens is not the end of the desktop');
assert.strictEqual(S.zone({ x: 1500, y: 500 }, one), S.zone({ x: 1500, y: 500 }, one, undefined), 'window bounds are optional');
console.log('sidesnap ok');
