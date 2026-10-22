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
  { id: 'welcome', label: 'Welcome tour', hint: 'The short introduction', words: 'help intro tutorial' },
  { id: 'print', label: 'Print the note I was just in', hint: 'Opens the Windows print window (Ctrl+P inside a note)', words: 'printer paper pdf' },
  { id: 'settings-general', label: 'Settings: General', hint: 'Start-up, name, language, memory', words: 'startup launch splash language name memory' },
  { id: 'settings-appearance', label: 'Settings: Appearance', hint: 'Themes, light and dark, fonts', words: 'look colours colors theme font' },
  { id: 'settings-notes', label: 'Settings: Notes', hint: 'Text prediction, dates, trash', words: 'predict dates trash retention snap' },
  { id: 'settings-shortcuts', label: 'Settings: Keyboard shortcuts', hint: 'See and change the keys', words: 'keys hotkeys ctrl alt keyboard' },
  { id: 'settings-access', label: 'Settings: Accessibility', hint: 'Text size, contrast, bigger buttons', words: 'accessibility comfort vision screen reader' },
  { id: 'settings-folders', label: 'Settings: Folders', hint: 'Organise your notes in folders', words: 'groups organise organize' },
  { id: 'settings-about', label: 'Settings: About and updates', hint: 'Version, check for updates, logs', words: 'version update upgrade release' },
  { id: 'updates', label: 'Check for updates', hint: 'Settings → About', words: 'new version upgrade release' },
  { id: 'quiet-toggle', label: 'Hide note buttons when idle (turn on or off)', hint: 'Only the text stays on screen until you move the mouse or type', words: 'fade idle title bar clean minimal quiet hide ui' },
  { id: 'access-bigger', label: 'Make the interface bigger', hint: 'Text and buttons of every window, one step up', words: 'accessibility zoom text size larger increase' },
  { id: 'access-smaller', label: 'Make the interface smaller', hint: 'Text and buttons of every window, one step down', words: 'accessibility zoom text size decrease' },
  { id: 'access-contrast', label: 'High contrast (turn on or off)', hint: 'Stronger text and borders, solid colours', words: 'accessibility contrast' },
  { id: 'access-big', label: 'Bigger buttons (turn on or off)', hint: 'Larger note title-bar buttons', words: 'accessibility large touch' },
  { id: 'access-focus', label: 'Always show the keyboard focus (turn on or off)', hint: 'A clear outline around what the keyboard is on', words: 'accessibility keyboard focus outline' },
  { id: 'access-motion', label: 'Reduce motion (turn on or off)', hint: 'No startup animation or sliding effects', words: 'accessibility animation splash' },
  { id: 'access-read', label: 'Easier-to-read notes (turn on or off)', hint: 'Wider spacing and a wide, familiar font', words: 'accessibility dyslexia spacing' },
  { id: 'access-sr', label: 'Screen reader announcements (turn on or off)', hint: 'Narrator and NVDA are told what changed', words: 'accessibility narrator nvda' },
  { id: 'access-reset', label: 'Accessibility: back to the defaults', hint: 'Turn every comfort option off', words: 'reset off' },
  { id: 'log-perf', label: 'Open the performance log', hint: 'Slow windows, freezes, slow saves', words: 'slow lag freeze performance' },
  { id: 'log-ai', label: 'Open the AI log', hint: 'What the AI answered, or why it did not', words: 'ollama model error' },
  { id: 'log-update', label: 'Open the update log', hint: 'What the last update check found', words: 'version' }
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
