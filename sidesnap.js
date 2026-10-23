'use strict';
// "Snap a note to a side of the screen" (Settings > Notes, off by default).
// Let go of a note with the mouse pushed against the left or right edge of a screen and it fills that half; against the top edge and it fills the screen.
// Pure functions (tested in Node). displays: [{ id, bounds, workArea }] like Electron's; cursor: { x, y }.
const EDGE = 6;       // how close to the screen edge the mouse has to be (pixels)
const CORNER = 80;    // corners are left alone, so a note dropped in a corner just stays where it is
const inside = (p, b) => p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height;
// -> { zone: 'left' | 'right' | 'top', bounds } or null
function zone(cursor, displays) {
  if (!cursor || !Array.isArray(displays)) return null;
  const d = displays.find(x => inside(cursor, x.bounds)); if (!d) return null;
  const b = d.bounds, wa = d.workArea;
  const other = p => displays.some(x => x !== d && inside(p, x.bounds));   // an edge that touches another screen is not the end of the desktop
  const nearL = cursor.x <= b.x + EDGE && !other({ x: b.x - 1, y: cursor.y });
  const nearR = cursor.x >= b.x + b.width - 1 - EDGE && !other({ x: b.x + b.width, y: cursor.y });
  const nearT = cursor.y <= b.y + EDGE && !other({ x: cursor.x, y: b.y - 1 });
  const nearCornerY = cursor.y < b.y + CORNER || cursor.y > b.y + b.height - CORNER, nearCornerX = cursor.x < b.x + CORNER || cursor.x > b.x + b.width - CORNER;
  const half = Math.floor(wa.width / 2);
  if (nearT && !nearCornerX) return { zone: 'top', bounds: { x: wa.x, y: wa.y, width: wa.width, height: wa.height } };
  if (nearL && !nearCornerY && !nearT) return { zone: 'left', bounds: { x: wa.x, y: wa.y, width: half, height: wa.height } };
  if (nearR && !nearCornerY && !nearT) return { zone: 'right', bounds: { x: wa.x + half, y: wa.y, width: wa.width - half, height: wa.height } };
  return null;
}
// Where a snapped note goes when it is dragged away: its old size, with the mouse at the same relative place on the title.
function restoreAt(prev, snapped, cursor, workArea) {
  const w = Math.min(prev.width, workArea.width), h = Math.min(prev.height, workArea.height);
  const frac = snapped.width ? Math.min(1, Math.max(0, (cursor.x - snapped.x) / snapped.width)) : 0.5;
  const x = Math.round(Math.min(Math.max(cursor.x - w * frac, workArea.x), workArea.x + workArea.width - w));
  const y = Math.round(Math.min(Math.max(cursor.y - 18, workArea.y), workArea.y + workArea.height - h));
  return { x, y, width: w, height: h };
}
const same = (a, b, t = 2) => !!a && !!b && Math.abs(a.x - b.x) <= t && Math.abs(a.y - b.y) <= t && Math.abs(a.width - b.width) <= t && Math.abs(a.height - b.height) <= t;
module.exports = { zone, restoreAt, same, EDGE, CORNER };
