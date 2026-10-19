const q = new URLSearchParams(location.search);
// The animation starts when the window is actually visible (a hidden window may already have run part of it);
// if the page never reports "visible", start it anyway after a moment so the card never stays invisible.
(function () {
  const go = () => document.body.classList.add('go');
  if (document.visibilityState === 'visible') go();
  else { document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') go(); }); setTimeout(go, 1200); }
})();
document.getElementById('greet').textContent = ((q.get('e') || '') + ' ' + (q.get('g') || '')).trim();
