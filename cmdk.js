// Ctrl+K in any StickyPad window opens the search and command window.
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && !e.isComposing && e.key.toLowerCase() === 'k') { e.preventDefault(); try { api.searchOpen(); } catch {} }
}, true);
