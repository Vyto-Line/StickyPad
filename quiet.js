'use strict';
// "Hide the note's buttons when idle" (Settings > Notes). The title bar, buttons and topic fade away and only the note's text stays.
// They come back the moment the mouse moves over the note, a key is pressed or the note is clicked.
// decide() is pure (tested in Node); the rest wires it to the note window.
const MODES = ['off', 'away', 'blur', 'both'], DELAYS = [3, 10, 30];
const DEFAULT = { mode: 'off', delay: 10 };
function clean(q) {
  q = q && typeof q === 'object' ? q : {};
  return { mode: MODES.includes(q.mode) ? q.mode : DEFAULT.mode, delay: DELAYS.includes(q.delay) ? q.delay : DEFAULT.delay };
}
// s: { mode, delay (seconds), now, over (mouse is on the note), lastMove, lastKey, focused, blurredAt, hold (something is open that must stay visible) }
function decide(s) {
  if (!s || s.mode === 'off' || s.hold) return false;
  const ms = (s.delay || DEFAULT.delay) * 1000;
  const away = !s.over && s.now - Math.max(s.lastMove || 0, s.lastKey || 0) >= ms;
  const blurred = !s.focused && s.now - (s.blurredAt || 0) >= ms;
  if (s.mode === 'away') return away;
  if (s.mode === 'blur') return blurred;
  return away || blurred;   // both
}
if (typeof module !== 'undefined' && module.exports) module.exports = { MODES, DELAYS, DEFAULT, clean, decide };
if (typeof window !== 'undefined' && window.api && /note\.html$/i.test(location.pathname)) (function () {
  const root = document.documentElement, $ = id => document.getElementById(id);
  let cfg = DEFAULT, timer = null, hidden = false;
  const st = { over: false, lastMove: Date.now(), lastKey: Date.now(), focused: document.hasFocus(), blurredAt: Date.now() };
  const open = el => el && !el.hidden;
  // anything that has to stay in sight: open panels, search, AI, lock screen, a rolled-up note, the topic being edited, or an accessibility option that needs the buttons
  function hold() {
    const a = window.StickyAccess ? window.StickyAccess.get() : {};
    return a.sr || a.contrast || document.body.classList.contains('rolled') || open($('panel')) || open($('findbar')) || open($('editbar')) || open($('aibox')) || open($('lockscreen')) || document.activeElement === $('topic');
  }
  function apply(h) { if (h !== hidden) { hidden = h; root.classList.toggle('quiet', h); } }
  function tick() { apply(decide({ ...st, mode: cfg.mode, delay: cfg.delay, now: Date.now(), hold: hold() })); }
  function wake() { st.lastMove = Date.now(); apply(false); }
  function set(q) {
    cfg = clean(q); clearInterval(timer); timer = null;
    if (cfg.mode === 'off') { apply(false); return; }
    wake(); timer = setInterval(tick, 400);
  }
  document.addEventListener('mousemove', () => { st.over = true; wake(); }, true);
  document.addEventListener('mousedown', () => { st.over = true; wake(); }, true);
  document.addEventListener('keydown', () => { st.lastKey = Date.now(); apply(false); }, true);
  root.addEventListener('mouseleave', () => { st.over = false; st.lastMove = Date.now(); });
  window.addEventListener('focus', () => { st.focused = true; apply(false); });
  window.addEventListener('blur', () => { st.focused = false; st.over = false; st.blurredAt = Date.now(); });
  api.quietGet().then(set).catch(() => {});
  api.onQuiet(set);
})();
