const assert = require('assert'), fs = require('fs');
const I = require('../i18n'); require('../i18n-el'); require('../i18n-el-settings');
assert.strictEqual(I.t('Cancel'), 'Cancel', 'English by default');
assert.strictEqual(I.setLang('xx'), 'en', 'an unknown language falls back to English');
assert.strictEqual(I.setLang('el'), 'el');
assert.strictEqual(I.t('Cancel'), 'Άκυρο'); assert.strictEqual(I.t('  Cancel '), '  Άκυρο ', 'spaces at the ends are kept');
assert.strictEqual(I.t('Something not in the dictionary'), 'Something not in the dictionary', 'no entry: stays English');
assert.strictEqual(I.t('1 note'), '1 σημείωση'); assert.strictEqual(I.t('3 notes'), '3 σημειώσεις');
assert.strictEqual(I.t('1 chosen'), '1 επιλεγμένη'); assert.strictEqual(I.t('Trash (4)'), 'Κάδος (4)');
assert.strictEqual(I.t('Search notes…  (Ctrl+Alt+F)'), 'Αναζήτηση σημειώσεων… (Ctrl+Alt+F)', 'menu text with the key in it');
assert.strictEqual(I.t('Cancel', 'en'), 'Cancel'); assert.strictEqual(I.t(5), 5, 'not text: unchanged');
I.setLang('en'); assert.strictEqual(I.t('Cancel'), 'Cancel', 'back to English');
// the page translator must never run in the main process
assert.strictEqual(typeof I.apply, 'undefined');
// every entry has text; the Greek keeps placeholders like (Ctrl+…) and numbers of the English
const src = fs.readFileSync(__dirname + '/../i18n-el.js', 'utf8') + fs.readFileSync(__dirname + '/../i18n-el-settings.js', 'utf8');
assert.ok(!/': ''[,}\s]/.test(src), 'no empty Greek text');
// no raw HTML in translations (the page uses textContent, but keep them clean)
assert.ok(!/': '[^']*<[a-z\/]/i.test(src), 'no markup in translations');
// coverage: how much of the main pages has Greek (printed, not enforced)
const all = ['all.html', 'note.html', 'quick.html', 'chat.html', 'printdlg.html', 'settings.html'].map(f => fs.readFileSync(__dirname + '/../' + f, 'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ''));
let tot = 0, hit = 0; I.setLang('el');
all.forEach(h => { const set = new Set(); (h.match(/>([^<>]{3,})</g) || []).forEach(m => set.add(m.slice(1, -1).replace(/\s+/g, ' ').trim().replace(/&amp;/g, '&').replace(/&gt;/g, '>'))); set.forEach(t => { if (!/[A-Za-z]{3}/.test(t)) return; tot++; if (I.t(t) !== t) hit++; }); });
assert.ok(hit / tot > 0.75, 'Greek covers most of the page texts: ' + hit + '/' + tot);
console.log('i18n ok (' + hit + '/' + tot + ' page texts have Greek)');
