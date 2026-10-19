'use strict';
// Keyboard shortcuts: the defaults, turning a key press into text like "Ctrl+Shift+T", and checking it. No Electron needed.
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.StickyKeys = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  const GLOBAL = {
    g_new: ['New note', 'Ctrl+Alt+N'], g_all: ['All notes', 'Ctrl+Alt+A'], g_chat: ['AI chat', 'Ctrl+Alt+C'],
    g_settings: ['Settings', 'Ctrl+Alt+S'], g_clip: ['New note from the clipboard', 'Ctrl+Alt+V']
  };
  const NOTE = {
    n_new: ['New note', 'Ctrl+N'], n_todo: ['Add a checklist item', 'Ctrl+Shift+C'], n_find: ['Find in the note', 'Ctrl+F'],
    n_copy: ['Copy note as text', 'Ctrl+Shift+T'], n_edit: ['Live AI edit', 'Ctrl+Shift+E'], n_settings: ['All settings', 'Ctrl+,']
  };
  const LABELS = {}, DEFAULTS = {};
  [GLOBAL, NOTE].forEach(g => Object.keys(g).forEach(k => { LABELS[k] = g[k][0]; DEFAULTS[k] = g[k][1]; }));
  const isGlobal = id => Object.prototype.hasOwnProperty.call(GLOBAL, id), isNote = id => Object.prototype.hasOwnProperty.call(NOTE, id);
  // keys a note needs for itself (editing, undo, cut and paste); they cannot be taken
  const RESERVED = ['Ctrl+A', 'Ctrl+C', 'Ctrl+V', 'Ctrl+X', 'Ctrl+Z', 'Ctrl+Y', 'Ctrl+Shift+Z', 'Ctrl+B', 'Ctrl+I', 'Ctrl+U'];

  const PUNCT = { Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`' };
  const NAMED = { Space: 'Space', Enter: 'Enter', Tab: 'Tab', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown', Insert: 'Insert', Delete: 'Delete' };
  const KNOWN = new Set([...Object.values(PUNCT), ...Object.values(NAMED)]);

  // The key part of an event, written the same on every keyboard layout (so Ctrl+F works with a Greek layout too).
  function keyName(e) {
    const c = e.code || '';
    let m;
    if ((m = /^Key([A-Z])$/.exec(c))) return m[1];
    if ((m = /^Digit([0-9])$/.exec(c))) return m[1];
    if ((m = /^F([0-9]{1,2})$/.exec(c)) && +m[1] >= 1 && +m[1] <= 24) return 'F' + m[1];
    if (PUNCT[c]) return PUNCT[c];
    if (NAMED[c]) return NAMED[c];
    return '';
  }
  function fromEvent(e) {
    const k = keyName(e); if (!k) return '';
    const mods = []; if (e.ctrlKey) mods.push('Ctrl'); if (e.altKey) mods.push('Alt'); if (e.shiftKey) mods.push('Shift');
    return mods.concat(k).join('+');
  }
  // Tidy text of a shortcut ("ctrl + shift + t" -> "Ctrl+Shift+T"); '' when it is not a usable shortcut.
  function norm(s) {
    const parts = String(s || '').split('+').map(x => x.trim()).filter(Boolean);
    if (String(s || '').trim().endsWith('++')) parts.push('+');
    let ctrl = false, alt = false, shift = false, key = '';
    for (const p of parts) {
      const l = p.toLowerCase();
      if (l === 'ctrl' || l === 'control') ctrl = true; else if (l === 'alt') alt = true; else if (l === 'shift') shift = true;
      else if (key) return ''; else key = p;
    }
    if (!key) return '';
    if (key.length === 1) key = key.toUpperCase();
    else if (/^f\d{1,2}$/i.test(key)) key = key.toUpperCase();
    else { const f = [...KNOWN].find(x => x.toLowerCase() === key.toLowerCase()); if (!f) return ''; key = f; }
    if (key.length === 1 && !/[A-Z0-9]/.test(key) && !KNOWN.has(key)) return '';
    if (/^F\d{1,2}$/.test(key) && (+key.slice(1) < 1 || +key.slice(1) > 24)) return '';
    return (ctrl ? 'Ctrl+' : '') + (alt ? 'Alt+' : '') + (shift ? 'Shift+' : '') + key;
  }
  // Why a shortcut cannot be used for this action ('' when it is fine).
  function problem(id, accel) {
    const a = norm(accel); if (!a) return 'That is not a usable shortcut.';
    const hasMod = /^(Ctrl|Alt)/.test(a), isF = /\+?F\d{1,2}$/.test(a);
    if (!hasMod && !(isF && isNote(id))) return 'Use Ctrl or Alt together with a key.';
    if (RESERVED.includes(a)) return a + ' is needed for editing.';
    return '';
  }
  // Saved shortcuts + defaults -> the full set; bad or clashing entries fall back to the default.
  function merge(saved) {
    const out = {}, used = {};
    for (const id of Object.keys(DEFAULTS)) {
      let a = norm(saved && saved[id]); if (!a || problem(id, a)) a = DEFAULTS[id];
      out[id] = a;
    }
    // two actions of the same kind with the same keys: the later one goes back to its default
    for (const id of Object.keys(out)) {
      const g = isGlobal(id) ? 'g' : 'n', key = g + out[id];
      if (used[key]) out[id] = DEFAULTS[id]; used[g + out[id]] = id;
    }
    return out;
  }
  // Which other action of the same kind already has these keys?
  function clash(map, id, accel) {
    const a = norm(accel);
    return Object.keys(map).find(o => o !== id && isGlobal(o) === isGlobal(id) && map[o] === a) || '';
  }
  const toElectron = a => norm(a).replace(/(^|\+)Ctrl(?=\+)/g, '$1Control');
  const matches = (e, accel) => !!accel && fromEvent(e) === accel;
  return { DEFAULTS, LABELS, GLOBAL: Object.keys(GLOBAL), NOTE: Object.keys(NOTE), RESERVED, fromEvent, keyName, norm, problem, merge, clash, toElectron, matches, isGlobal };
});
