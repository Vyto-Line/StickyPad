'use strict';
(function () {
// Reminder helpers (no Electron here, so they can be tested on their own).
const MIN = 60000;

// Notes whose reminder time has come, oldest first.
function due(notes, now) {
  return Object.values(notes || {}).filter(n => n && Number(n.remind) > 0 && Number(n.remind) <= now)
    .sort((a, b) => a.remind - b.remind).map(n => n.id);
}

// The time a quick button stands for. 'tomorrow' = 9:00 the next morning, 'later' = 3 hours from now.
function quick(kind, now) {
  const d = new Date(now);
  if (kind === 'm10') return now + 10 * MIN;
  if (kind === 'h1') return now + 60 * MIN;
  if (kind === 'later') return now + 180 * MIN;
  if (kind === 'tomorrow') { const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 9, 0, 0, 0); return t.getTime(); }
  return 0;
}

// A value the browser's <input type="datetime-local"> understands, in local time.
function toLocalInput(ts) {
  if (!ts) return '';
  const d = new Date(ts), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function fromLocalInput(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(v || ''));
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0, 0).getTime() : 0;
}

// The text shown in the notification.
function body(text, locked) {
  if (locked) return 'Locked note';
  const line = String(text || '').split('\n').map(s => s.replace(/^[☑☐]\s*/, '').trim()).find(Boolean) || '';
  return line.length > 120 ? line.slice(0, 117) + '…' : line;
}

const API = { due, quick, toLocalInput, fromLocalInput, body, MIN };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else self.StickyReminders = API;
})();
