'use strict';
// Turning notes from other apps into StickyPad notes. Pure functions: they get the file contents and return
// [{ title, blocks, color, folder, created, updated }]. No Electron, no disk.
const sqliteread = require('./sqliteread');
const COLORS = { yellow: '#FFF2A8', pink: '#FFD6E0', blue: '#CDEFFF', green: '#D4F5C4', orange: '#FFE0B8', purple: '#E4D4FF', white: '#FFFFFF', dark: '#2B2F3A' };

const KEEP_COLOR = { DEFAULT: 'white', RED: 'pink', ORANGE: 'orange', YELLOW: 'yellow', GREEN: 'green', TEAL: 'green', BLUE: 'blue', CERULEAN: 'blue', PURPLE: 'purple', PINK: 'pink', BROWN: 'orange', GRAY: 'white' };
// One Google Keep note (Google Takeout gives one .json file per note).
function fromKeep(jsonText) {
  let j; try { j = JSON.parse(String(jsonText).replace(/^﻿/, '')); } catch { return null; }
  if (!j || typeof j !== 'object' || !('textContent' in j || 'listContent' in j || 'title' in j)) return null;
  if (j.isTrashed) return { skipped: 'trashed' };
  const blocks = [];
  if (Array.isArray(j.listContent) && j.listContent.length) j.listContent.forEach(it => { const v = String((it && it.text) || '').replace(/\s*\n\s*/g, ' ').trim(); if (v) blocks.push({ t: 'check', v, done: !!(it && it.isChecked) }); });
  else if (String(j.textContent || '').trim()) blocks.push({ t: 'text', v: String(j.textContent).replace(/\r\n?/g, '\n').replace(/\s+$/, '') });
  if (!blocks.length && !String(j.title || '').trim()) return { skipped: 'empty' };
  const us = n => (Number.isFinite(+n) && +n > 0 ? Math.round(+n / 1000) : 0);
  return {
    title: String(j.title || '').trim().slice(0, 60), blocks, color: COLORS[KEEP_COLOR[String(j.color || 'DEFAULT').toUpperCase()] || 'white'],
    folder: Array.isArray(j.labels) && j.labels[0] && j.labels[0].name ? String(j.labels[0].name).slice(0, 40) : '', created: us(j.createdTimestampUsec), updated: us(j.userEditedTimestampUsec), archived: !!j.isArchived
  };
}

const STICKY_COLOR = { yellow: 'yellow', green: 'green', blue: 'blue', pink: 'pink', purple: 'purple', gray: 'white', grey: 'white', charcoal: 'dark' };
const ticksToMs = t => (Number.isFinite(+t) && +t > 621355968000000000 ? Math.round((+t - 621355968000000000) / 10000) : 0);
// Windows Sticky Notes: the plum.sqlite file (and its -wal file when there is one).
function fromStickyNotes(dbBuf, walBuf) {
  const db = sqliteread.open(dbBuf, walBuf), out = [];
  if (!db.tables().some(t => t.toLowerCase() === 'note')) throw new Error('This file has no Sticky Notes in it.');
  for (const r of db.rows('Note')) {
    if (r.DeletedAt) continue;
    const lines = String(r.Text || '').replace(/\\id=[0-9a-fA-F-]{8,}\s?/g, '').split(/\r\n|\r|\n/);
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    const text = lines.join('\n').replace(/^\s*\n/, '');
    if (!text.trim()) continue;
    out.push({ title: '', blocks: [{ t: 'text', v: text }], color: COLORS[STICKY_COLOR[String(r.Theme || '').toLowerCase()] || 'yellow'], folder: '', created: ticksToMs(r.CreatedAt), updated: ticksToMs(r.UpdatedAt) });
  }
  return out;
}
module.exports = { fromKeep, fromStickyNotes, ticksToMs, COLORS };
