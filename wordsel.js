'use strict';
// Double-click selects the word only. On Windows the browser engine also selects the spaces after it; macOS and Linux do not.
// After a double-click the trailing spaces are taken off the selection (in the note text and in the topic box).
// trimEnd(text, a, b): the new end of the selection a..b (never trims it down to nothing). Pure, tested in Node.
const SPACE = /[ \t ]/;
function trimEnd(text, a, b) {
  let e = b;
  while (e > a + 1 && SPACE.test(text[e - 1])) e--;
  return SPACE.test(text[e - 1] || '') ? b : e;   // a selection that is only spaces is left as it is
}
if (typeof module !== 'undefined' && module.exports) module.exports = { trimEnd };
if (typeof document !== 'undefined' && /note\.html$/i.test(location.pathname)) document.addEventListener('dblclick', e => {
  const t = e.target, ed = document.getElementById('ed');
  if (t && t.tagName === 'INPUT' && t.type === 'text') {
    const a = t.selectionStart, b = t.selectionEnd, n = trimEnd(t.value, a, b);
    if (n !== b) t.setSelectionRange(a, n, t.selectionDirection);
    return;
  }
  if (!ed || !ed.contains(t)) return;
  const sel = getSelection(); if (!sel || !sel.rangeCount || sel.isCollapsed) return;
  const r = sel.getRangeAt(0), n = r.endContainer;
  if (n.nodeType !== 3) return;
  const start = r.startContainer === n ? r.startOffset : 0, end = trimEnd(n.data, start, r.endOffset);
  if (end === r.endOffset) return;
  const r2 = r.cloneRange(); r2.setEnd(n, end); sel.removeAllRanges(); sel.addRange(r2);
});
