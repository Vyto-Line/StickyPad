'use strict';
// Reading the notes file safely. The one rule: an unreadable file must never be treated as "no notes", because the next save would
// replace the real notes with an empty set. Pure Node (no Electron), so it can be tested alone.
const fs = require('fs');
const path = require('path');

const sleep = ms => { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch { /* no waiting available: just try again */ } };

// Reads and parses one notes file. A file that is busy for a moment (antivirus, an installer, OneDrive, Dropbox) is tried again a few times.
// -> { ok: true, data, text } | { ok: false, missing: true } | { ok: false, error }
function readJson(file, tries = 6, wait = 150) {
  let last = '';
  for (let i = 0; i < tries; i++) {
    try {
      const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
      return { ok: true, data: JSON.parse(text), text };
    } catch (e) {
      if (e && e.code === 'ENOENT') return { ok: false, missing: true };
      last = String((e && e.message) || e);
      if (i < tries - 1) sleep(wait);
    }
  }
  return { ok: false, error: last };
}

// How many notes a parsed file holds (current format {version:2, notes:{...}}, or the very old plain object of notes).
function countNotes(d) {
  if (!d || typeof d !== 'object') return 0;
  const n = d.version === 2 ? d.notes : d;
  return n && typeof n === 'object' ? Object.keys(n).length : 0;
}

const newestFirst = names => names.slice().sort().reverse();
// Other copies of the notes that could replace an unreadable file, best first:
// the copy made at the last good start, a half-written save, copies of replaced versions, then the daily backups.
function candidates(dir, userData) {
  const out = [path.join(dir, 'notes.lastgood.json'), path.join(dir, 'notes.json.tmp')];
  try { newestFirst(fs.readdirSync(path.join(dir, 'conflicts')).filter(n => /^notes-.*\.json$/.test(n))).forEach(n => out.push(path.join(dir, 'conflicts', n))); } catch {}
  try { const root = path.join(userData, 'backups'); newestFirst(fs.readdirSync(root)).forEach(n => out.push(path.join(root, n, 'notes.json'))); } catch {}
  return out;
}
// The first other copy that can be read and holds notes. -> { data, from } | null
function recover(dir, userData) {
  for (const f of candidates(dir, userData)) {
    const r = readJson(f, 1);
    if (r.ok && countNotes(r.data) > 0) return { data: r.data, from: f };
  }
  return null;
}

// Keeps a copy of a notes file that is good (readable, holds notes), for recover(). Never replaced by an empty or unreadable file.
function keepLastGood(dir, file) {
  try {
    const r = readJson(file, 1);
    if (r.ok && countNotes(r.data) > 0) fs.writeFileSync(path.join(dir, 'notes.lastgood.json'), r.text);
  } catch {}
}
// Keeps the unreadable file itself (named with the time) so nothing is ever lost, and returns where.
function keepBroken(dir, file, now = new Date()) {
  const p = n => String(n).padStart(2, '0');
  const name = `notes.unreadable-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}.json`;
  try {
    const size = fs.statSync(file).size;   // the same unreadable file kept on every start would fill the disk: one copy of each size is enough
    const same = fs.readdirSync(dir).find(n => /^notes\.unreadable-.*\.json$/.test(n) && fs.statSync(path.join(dir, n)).size === size);
    if (same) return path.join(dir, same);
    fs.copyFileSync(file, path.join(dir, name)); return path.join(dir, name);
  } catch { return ''; }
}

module.exports = { sleep, readJson, countNotes, recover, keepLastGood, keepBroken };
