'use strict';
// Spell checking in notes (the red wavy underline and the corrections in the right-click menu).
// On Windows the engine needs a dictionary per language, which Chromium downloads the first time. This module chooses the languages
// (English and Greek, plus the language of Windows) and writes what happens to the performance log, so a missing dictionary can be seen.
const WANT = ['en-US', 'el'];

function languages(available, system) {
  const have = new Set(Array.isArray(available) ? available : []);
  const out = [];
  [...WANT, ...(Array.isArray(system) ? system : [])].forEach(l => {
    const hit = have.has(l) ? l : (have.has(String(l).split('-')[0]) ? String(l).split('-')[0] : null);
    if (hit && !out.includes(hit)) out.push(hit);
  });
  return out;
}

function setup(ses, system, log) {
  const note = (w, extra) => { try { log('SPELL ' + w + (extra ? ': ' + extra : '')); } catch {} };
  try {
    ['spellcheck-dictionary-initialized', 'spellcheck-dictionary-download-begin', 'spellcheck-dictionary-download-success', 'spellcheck-dictionary-download-failure']
      .forEach(ev => ses.on(ev, (e, lang) => note(ev.replace('spellcheck-dictionary-', ''), lang)));
    const langs = languages(ses.availableSpellCheckerLanguages, system);
    if (langs.length) ses.setSpellCheckerLanguages(langs);
    note('languages', langs.join(', ') || 'none available');
    if (ses.spellCheckerEnabled === false) ses.setSpellCheckerEnabled(true);
  } catch (err) { note('setup failed', err && err.message); }
}

module.exports = { setup, languages, WANT };
