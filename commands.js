'use strict';
// The actions you can type into the search window (Ctrl+K). Pure data and matching; main.js runs them.
const search = require('./search');
const COMMANDS = [
  { id: 'new', label: 'New note', hint: 'Start an empty note', words: 'create add write' },
  { id: 'clip', label: 'New note from the clipboard', hint: 'Make a note from the text you last copied', words: 'paste' },
  { id: 'home', label: 'Open Home (all notes)', hint: 'See every note, folder and search', words: 'all notes browse' },
  { id: 'trash', label: 'Open the trash', hint: 'Bring back or remove deleted notes', words: 'deleted bin restore' },
  { id: 'chat', label: 'Open AI chat', hint: 'Ask questions about your notes', words: 'assistant ollama' },
  { id: 'settings', label: 'Open Settings', hint: 'Look, shortcuts, AI, backups', words: 'preferences options' },
  { id: 'settings-ai', label: 'Set up the AI helper', hint: 'Settings → AI', words: 'ollama model' },
  { id: 'settings-data', label: 'Backups and restore', hint: 'Settings → Data', words: 'backup restore recover export import data folder' },
  { id: 'backup', label: 'Back up now', hint: 'Make a backup copy of your notes', words: 'backup save copy' },
  { id: 'dark', label: 'Dark mode', hint: 'Switch the look to dark', words: 'theme night' },
  { id: 'light', label: 'Light mode', hint: 'Switch the look to light', words: 'theme day' },
  { id: 'system', label: 'Match Windows (light or dark)', hint: 'Follow the Windows setting', words: 'theme mode automatic system' },
  { id: 'showall', label: 'Show all notes', hint: 'Bring every note to the front', words: 'reopen' },
  { id: 'tidy', label: 'Tidy up notes', hint: 'Lay the open notes out in rows', words: 'arrange organize' },
  { id: 'welcome', label: 'Welcome tour', hint: 'The short introduction', words: 'help intro tutorial' }
];
// ">" at the start means "commands only" (all of them when nothing follows). Otherwise a command shows when every word you typed is in it.
function match(query, max = 3) {
  let q = String(query == null ? '' : query).trim(), only = false;
  if (q.startsWith('>')) { only = true; q = q.slice(1).trim(); }
  const words = search.queryWords(q);
  if (!only && !words.length) return [];
  const out = [];
  for (const c of COMMANDS) {
    const hay = search.fold(c.label + ' ' + c.words);
    const labelFold = search.fold(c.label);
    if (!words.every(w => hay.includes(w))) continue;
    out.push({ c, score: words.reduce((s, w) => s + (labelFold.startsWith(w) ? 3 : labelFold.includes(w) ? 2 : 1), 0) });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, only ? 50 : max).map(x => x.c);
}
const byId = id => COMMANDS.find(c => c.id === id) || null;
module.exports = { COMMANDS, match, byId };
