'use strict';
// Restoring notes from a backup. Pure Node (no Electron): lists what can be restored and does the safe file work; main.js puts the notes in memory.
const fs = require('fs');
const path = require('path');
const backup = require('./backup');
const safeload = require('./safeload');

const NAME = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/;

// Everything that can be restored, newest first: the daily backups, and the copy made at the last good start.
// -> [{ id, kind, stamp, when, notes, trash, ok }]  (ok = false when that file cannot be read)
function entries(userData, dataDir) {
  const out = [];
  for (const name of backup.list(userData).reverse()) {
    const file = path.join(userData, 'backups', name, 'notes.json'), r = safeload.readJson(file, 1);
    const m = /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/.exec(name);
    const when = m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() : 0;
    if (!r.ok) { out.push({ id: 'b:' + name, kind: 'backup', stamp: name, when, notes: 0, trash: 0, ok: false }); continue; }
    out.push({ id: 'b:' + name, kind: 'backup', stamp: name, when, notes: safeload.countNotes(r.data), trash: Array.isArray(r.data && r.data.trash) ? r.data.trash.length : 0, ok: true });
  }
  const lg = path.join(dataDir, 'notes.lastgood.json'), r = safeload.readJson(lg, 1);
  if (r.ok && safeload.countNotes(r.data) > 0) { let when = 0; try { when = fs.statSync(lg).mtimeMs; } catch {} out.push({ id: 'lastgood', kind: 'lastgood', stamp: '', when, notes: safeload.countNotes(r.data), trash: 0, ok: true }); }
  return out;
}
// An id from the settings page -> where its files are. Only ids this module made are accepted (no paths from outside).
function locate(userData, dataDir, id) {
  const m = /^b:(.+)$/.exec(String(id));
  if (m && NAME.test(m[1])) { const dir = path.join(userData, 'backups', m[1]); return fs.existsSync(path.join(dir, 'notes.json')) ? { file: path.join(dir, 'notes.json'), images: path.join(dir, 'images') } : null; }
  if (id === 'lastgood') { const f = path.join(dataDir, 'notes.lastgood.json'); return fs.existsSync(f) ? { file: f, images: path.join(dataDir, 'images') } : null; }
  return null;
}
// Before a restore replaces everything: a copy of what there is now (not a dated backup, so it is never pushed out; the newest 3 are kept).
function safetyCopy(userData, dataDir, now = new Date()) {
  const root = path.join(userData, 'backups'), dir = path.join(root, 'before-restore-' + backup.stamp(now));
  fs.mkdirSync(dir, { recursive: true });
  for (const f of ['notes.json', 'chat.json']) { const s = path.join(dataDir, f); if (fs.existsSync(s)) fs.copyFileSync(s, path.join(dir, f)); }
  const img = path.join(dataDir, 'images'); if (fs.existsSync(img)) fs.cpSync(img, path.join(dir, 'images'), { recursive: true });
  const old = fs.readdirSync(root).filter(n => /^before-restore-/.test(n)).sort();
  while (old.length > 3) fs.rmSync(path.join(root, old.shift()), { recursive: true, force: true });
  return dir;
}
// Copies the picture files of a backup that are missing now. `ids` are the picture file names the restored notes use.
function copyImages(fromDir, toDir, ids, valid) {
  let n = 0; if (!fs.existsSync(fromDir)) return 0;
  fs.mkdirSync(toDir, { recursive: true });
  for (const id of ids) {
    if (!valid.test(id)) continue;
    const s = path.join(fromDir, id), d = path.join(toDir, id);
    try { if (fs.existsSync(s) && !fs.existsSync(d)) { fs.copyFileSync(s, d); n++; } } catch {}
  }
  return n;
}
module.exports = { entries, locate, safetyCopy, copyImages };
