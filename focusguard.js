'use strict';
// When a window gets focus, hand the keyboard to its page so typing works. Two windows doing this to each other
// (for example Home and What's new opening in the same moment) can pass the focus back and forth forever and the screen flickers.
// So: do nothing when the page already has the keyboard, and stop completely if it happens many times in a row.
function guard(win, now = Date.now, opts = {}) {
  const gap = opts.gap || 400, max = opts.max || 4;
  let last = 0, burst = 0;
  return function onFocus() {
    if (!win || (win.isDestroyed && win.isDestroyed())) return false;
    const t = now();
    burst = t - last < gap ? burst + 1 : 0; last = t;
    if (burst >= max) return false;   // a focus fight: leave the focus alone until it calms down
    const wc = win.webContents;
    try { if (wc.isFocused && wc.isFocused()) return false; wc.focus(); return true; } catch { return false; }
  };
}
module.exports = { guard };
