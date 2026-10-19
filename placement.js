'use strict';
// Where a note should appear when screens come and go. Pure functions: a "display" is { id, bounds, workArea } like Electron's.
const area = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
const MIN_SHOWN = 80, TITLE_H = 36;
// Enough of the note is on this screen to grab it by its title.
function reachable(b, d) {
  const w = d.workArea, ix = Math.min(b.x + b.width, w.x + w.width) - Math.max(b.x, w.x), iy = Math.min(b.y + 30, w.y + w.height) - Math.max(b.y, w.y);
  return ix >= Math.min(MIN_SHOWN, b.width) && iy >= Math.min(24, TITLE_H);
}
function clampTo(b, d) {
  const w = d.workArea, width = Math.min(b.width, w.width), height = Math.min(b.height, w.height);
  return { x: Math.min(Math.max(b.x, w.x), w.x + w.width - width), y: Math.min(Math.max(b.y, w.y), w.y + w.height - height), width, height };
}
// The display a rectangle is mostly on ('' if none).
function displayOf(b, displays) {
  let best = null, ba = 0;
  for (const d of displays) { const a = area(b, d.bounds); if (a > ba) { ba = a; best = d; } }
  return best;
}
// home = { id, bounds } remembered with the note: the screen it was on and that screen's size/place back then.
// -> { bounds, moved } : where to show the note now. moved = true when it had to leave its screen.
function place(bounds, home, displays, primaryId) {
  if (!displays || !displays.length) return { bounds, moved: false };
  const primary = displays.find(d => d.id === primaryId) || displays[0];
  const hd = home && displays.find(d => d.id === home.id);
  if (hd && reachable(bounds, hd)) return { bounds, moved: false };
  if (!hd) {
    const cur = displayOf(bounds, displays);
    if (cur && reachable(bounds, cur)) return { bounds, moved: false };   // it sits on another screen that is still there
  }
  // its screen is gone (or it is off screen): put it on the main screen at the same relative spot
  const from = home && home.bounds && home.bounds.width ? home.bounds : (hd ? hd.bounds : null);
  let b = { ...bounds };
  if (from && !hd) {
    const rx = (bounds.x - from.x) / from.width, ry = (bounds.y - from.y) / from.height, w = primary.workArea;
    b.x = Math.round(w.x + rx * w.width); b.y = Math.round(w.y + ry * w.height);
  }
  b = clampTo(b, hd || primary);
  return { bounds: b, moved: b.x !== bounds.x || b.y !== bounds.y || b.width !== bounds.width || b.height !== bounds.height };
}
// A screen was plugged back in: notes whose home it is go back to where they were. -> bounds or null
function comeHome(home, savedBounds, displays) {
  if (!home) return null;
  const hd = displays.find(d => d.id === home.id); if (!hd || !reachable(savedBounds, hd)) return null;
  return savedBounds;
}
module.exports = { place, comeHome, displayOf, reachable, clampTo, area };
