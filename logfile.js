'use strict';
// A small text log that never grows past a limit. When it gets too long the oldest lines are removed
// at a line break (never in the middle of a line) and the heading at the top is written again.
const fs = require('fs');
const MAX = 150000, KEEP = 100000;

function trim(old, head) {
  if (old.length <= MAX) return old;
  let tail = old.slice(-KEEP);
  if (old[old.length - KEEP - 1] !== '\n') { const i = tail.indexOf('\n'); tail = i < 0 ? '' : tail.slice(i + 1); }   // the first kept line was cut: drop what is left of it
  return head + '[older lines were removed]\n' + tail;
}
function append(file, head, line) {
  let old = ''; try { old = fs.readFileSync(file, 'utf8'); } catch {}
  fs.writeFileSync(file, (old ? trim(old, head) : head) + line + '\n');
}
module.exports = { append, trim, MAX, KEEP };
