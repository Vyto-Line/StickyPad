// Copies the notes file, chat history and pictures into a dated folder, keeping only the newest few.
const fs = require('fs');
const path = require('path');

const pad = n => String(n).padStart(2, '0');
const stamp = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
const isBackupName = n => /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/.test(n);

function list(userData) {
  const root = path.join(userData, 'backups');
  try { return fs.readdirSync(root).filter(n => isBackupName(n) && fs.statSync(path.join(root, n)).isDirectory()).sort(); } catch { return []; }
}
function prune(userData, keep) {
  const root = path.join(userData, 'backups'), dirs = list(userData);
  while (dirs.length > keep) fs.rmSync(path.join(root, dirs.shift()), { recursive: true, force: true });
}
function makeBackup(userData, keep = 7, now = new Date(), backupsIn = userData) {   // data is read from userData; backups go to backupsIn (so they are not copied to every synced PC)
  const dir = path.join(backupsIn, 'backups', stamp(now));
  fs.mkdirSync(dir, { recursive: true });
  for (const f of ['notes.json', 'chat.json']) {
    const src = path.join(userData, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, f));
  }
  const img = path.join(userData, 'images');
  if (fs.existsSync(img)) fs.cpSync(img, path.join(dir, 'images'), { recursive: true });
  prune(backupsIn, keep);
  return dir;
}
const sameDay = (a, b = Date.now()) => !!a && new Date(a).toDateString() === new Date(b).toDateString();

module.exports = { makeBackup, list, prune, sameDay, stamp };
