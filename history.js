'use strict';
// Version history: a few older copies of each note, kept next to the notes file in /history/<noteId>.json.
// Pure Node (no Electron) so it can be tested on its own.
const fs = require('fs'), path = require('path');
const datadir = require('./datadir');

const MIN = 60000;
const LIMITS = { versions: 30, bytes: 4e6, one: 8e6, gap: 5 * MIN, cutFrom: 200, cutTo: 0.5, cutGap: 20000 };
const SAFE = /^[a-z0-9]{3,40}$/;

const fileOf = (dir, id) => path.join(dir, 'history', id + '.json');
const textLen = bs => (bs || []).reduce((n, b) => n + (b.t === 'text' || b.t === 'check' ? b.v.length : 0), 0);
const hasStuff = bs => (bs || []).some(b => (b.t === 'text' && b.v.trim()) || (b.t === 'check' && b.v.trim()) || b.t === 'img');

function read(dir, id) {
  if (!SAFE.test(id)) return [];
  try { const a = JSON.parse(fs.readFileSync(fileOf(dir, id), 'utf8')); return Array.isArray(a) ? a.filter(e => e && e.t && Array.isArray(e.blocks)) : []; } catch { return []; }
}
function write(dir, id, arr) {
  fs.mkdirSync(path.join(dir, 'history'), { recursive: true });
  datadir.writeAtomic(fileOf(dir, id), JSON.stringify(arr));
}

// Should the note's previous content be kept before it is replaced by `next`?
// Yes when the last kept copy is old enough, or when most of the text has suddenly gone.
function shouldKeep(prev, next, lastT, now) {
  if (!hasStuff(prev)) return false;
  const a = textLen(prev), b = textLen(next);
  if (a >= LIMITS.cutFrom && b < a * LIMITS.cutTo && now - lastT >= LIMITS.cutGap) return true;
  return now - lastT >= LIMITS.gap;
}

// Stores a copy. Returns true when something was written.
function add(dir, id, entry, now = Date.now()) {
  if (!SAFE.test(id) || !hasStuff(entry.blocks)) return false;
  const json = JSON.stringify(entry.blocks);
  if (json.length > LIMITS.one) return false;
  const all = read(dir, id);
  if (all.length && JSON.stringify(all[all.length - 1].blocks) === json) return false;   // nothing new since the last copy
  all.push({ t: now, title: String(entry.title || '').slice(0, 60), chars: textLen(entry.blocks), blocks: entry.blocks });
  let size = all.reduce((n, e) => n + JSON.stringify(e.blocks).length, 0);
  while (all.length > 1 && (all.length > LIMITS.versions || size > LIMITS.bytes)) size -= JSON.stringify(all.shift().blocks).length;
  write(dir, id, all);
  return true;
}

const lastTime = (dir, id) => { const a = read(dir, id); return a.length ? a[a.length - 1].t : 0; };

function list(dir, id) {
  return read(dir, id).map(e => {
    const first = (e.blocks.find(b => (b.t === 'text' || b.t === 'check') && b.v.trim()) || { v: '' }).v.split('\n').map(s => s.trim()).find(Boolean) || '';
    const words = e.blocks.reduce((n, b) => n + ((b.t === 'text' || b.t === 'check') ? (b.v.match(/\S+/g) || []).length : 0), 0);
    return { t: e.t, words, pics: e.blocks.filter(b => b.t === 'img').length, preview: first.slice(0, 60) };
  }).reverse();   // newest first
}
const get = (dir, id, t) => read(dir, id).find(e => e.t === t) || null;

function remove(dir, id) { if (SAFE.test(id)) try { fs.unlinkSync(fileOf(dir, id)); } catch {} }
function ids(dir) { try { return fs.readdirSync(path.join(dir, 'history')).filter(f => /\.json$/.test(f)).map(f => f.slice(0, -5)).filter(i => SAFE.test(i)); } catch { return []; } }
function pictureIds(dir) {
  const out = new Set();
  ids(dir).forEach(id => read(dir, id).forEach(e => e.blocks.forEach(b => { if (b.t === 'img' && b.id) out.add(b.id); })));
  return out;
}

module.exports = { read, add, list, get, remove, ids, pictureIds, shouldKeep, lastTime, hasStuff };
