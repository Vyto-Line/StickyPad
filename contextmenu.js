// The right-click menu for text: Electron shows no menu of its own, so notes had nothing to offer on right-click.
// buildTemplate() turns what the page reported (params) into a menu template; main.js shows it. Kept apart so it can be tested.
const MAX_SUGGESTIONS = 5;

function buildTemplate(params, wc) {
  const p = params || {}, f = p.editFlags || {};
  const out = [];
  const text = typeof p.selectionText === 'string' && p.selectionText !== '';
  if (!p.isEditable && !text) return out;   // nothing to copy and nowhere to paste: no menu
  if (p.isEditable) {
    const word = typeof p.misspelledWord === 'string' ? p.misspelledWord : '';
    if (word) {
      const sug = Array.isArray(p.dictionarySuggestions) ? p.dictionarySuggestions.slice(0, MAX_SUGGESTIONS) : [];
      for (const s of sug) out.push({ label: s, click: () => { try { wc.replaceMisspelling(s); } catch (e) {} } });
      if (!sug.length) out.push({ label: 'No suggestions', enabled: false });
      out.push({ label: 'Add to dictionary', click: () => { try { wc.session.addWordToSpellCheckerDictionary(word); } catch (e) {} } });
      out.push({ type: 'separator' });
    }
    out.push({ label: 'Cut', role: 'cut', enabled: f.canCut !== false && text });
    out.push({ label: 'Copy', role: 'copy', enabled: f.canCopy !== false && text });
    out.push({ label: 'Paste', role: 'paste', enabled: f.canPaste !== false });
    // in a note, text copied from a formatted note keeps its formatting when pasted: this pastes the words only
    if (wc && typeof wc.getURL === 'function' && /note\.html/.test(String(wc.getURL()))) out.push({ label: 'Paste as plain text', accelerator: 'CommandOrControl+Shift+V', enabled: f.canPaste !== false, click: () => { try { wc.send('ctx:plainPaste'); wc.paste(); } catch (e) {} } });
    out.push({ type: 'separator' });
    out.push({ label: 'Select all', role: 'selectAll', enabled: f.canSelectAll !== false });
  } else {
    out.push({ label: 'Copy', role: 'copy', enabled: f.canCopy !== false });
    out.push({ type: 'separator' });
    out.push({ label: 'Select all', role: 'selectAll', enabled: f.canSelectAll !== false });
  }
  return out;
}

module.exports = { buildTemplate };
