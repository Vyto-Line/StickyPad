'use strict';
// Where StickyPad keeps its data, and safe ways to write it. Pure Node (no Electron) so it can be tested alone.
// The data folder can be moved into a folder that OneDrive, Dropbox, Google Drive, Syncthing, ... keeps in sync,
// which is how the same notes show up on every PC. A tiny pointer file in the normal app folder remembers where it is.
const fs = require('fs');
const path = require('path');

const POINTER = 'location.json';
const DATA_FILES = ['notes.json', 'chat.json'];

function resolve(defaultDir) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(defaultDir, POINTER), 'utf8')).dir;
    if (typeof d === 'string' && path.isAbsolute(d) && fs.statSync(d).isDirectory()) return d;
  } catch { /* no pointer, or the folder is gone (drive not connected): use the normal folder */ }
  return defaultDir;
}

function writeAtomic(file, text) {   // write to a temp file first so a crash or full disk can never leave half a notes file
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

// Moves to newDir. If newDir already holds notes (another PC set it up) they are adopted, never overwritten.
function setLocation(defaultDir, currentDir, newDir) {
  if (typeof newDir !== 'string' || !path.isAbsolute(newDir)) throw new Error('Choose a folder.');
  fs.mkdirSync(newDir, { recursive: true });
  if (path.resolve(newDir) === path.resolve(currentDir)) return { adopted: false, same: true };
  const has = fs.existsSync(path.join(newDir, 'notes.json'));
  if (!has) {
    for (const f of DATA_FILES) { const s = path.join(currentDir, f); if (fs.existsSync(s)) fs.copyFileSync(s, path.join(newDir, f)); }
    const img = path.join(currentDir, 'images');
    if (fs.existsSync(img)) fs.cpSync(img, path.join(newDir, 'images'), { recursive: true });
  }
  if (path.resolve(newDir) === path.resolve(defaultDir)) { try { fs.unlinkSync(path.join(defaultDir, POINTER)); } catch {} }
  else writeAtomic(path.join(defaultDir, POINTER), JSON.stringify({ dir: newDir }));
  return { adopted: has, same: false };
}
const resetLocation = (defaultDir, currentDir) => setLocation(defaultDir, currentDir, defaultDir);

// Keeps a copy of a notes file that is about to be replaced by a different device's version.
function keepConflict(dir, text, now = new Date()) {
  const d = path.join(dir, 'conflicts'); fs.mkdirSync(d, { recursive: true });
  const p = n => String(n).padStart(2, '0');
  const name = `notes-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}_${p(now.getHours())}-${p(now.getMinutes())}-${p(now.getSeconds())}.json`;
  fs.writeFileSync(path.join(d, name), text);
  const all = fs.readdirSync(d).filter(f => /^notes-.*\.json$/.test(f)).sort();
  while (all.length > 10) fs.unlinkSync(path.join(d, all.shift()));
  return path.join(d, name);
}

const mtimeOf = file => { try { return fs.statSync(file).mtimeMs; } catch { return 0; } };

module.exports = { resolve, writeAtomic, setLocation, resetLocation, keepConflict, mtimeOf, POINTER };
