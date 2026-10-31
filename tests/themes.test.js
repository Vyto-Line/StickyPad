// Every theme, light and dark: text must stay readable (WCAG AA 4.5:1) and every theme must have 8 note colours in both versions.
const assert = require('assert'), T = require('../themes');
const bad = [];
for (const t of T.THEMES) {
  assert.strictEqual(t.colors.length, 8, t.id); assert.strictEqual(t.dark.length, 8, t.id + ' dark');
  for (const mode of ['light', 'dark']) {
    const u = t.ui[mode];
    for (const [tok, bgk] of [['fg', 'bg'], ['fg', 'nav'], ['fg', 'card'], ['mute', 'bg'], ['mute', 'nav'], ['mute', 'card'], ['onAccent', 'accent']]) {
      const r = T.contrast(u[tok], u[bgk]); if (r < 4.5) bad.push(`${t.id}/${mode}: ${tok} on ${bgk} = ${r.toFixed(2)}`);
    }
    if (T.contrast(u.accent, u.bg) < 3) bad.push(`${t.id}/${mode}: accent on bg = ${T.contrast(u.accent, u.bg).toFixed(2)}`);   // links and selected items
    for (const c of (mode === 'dark' ? t.dark : t.colors)) {
      const ink = T.wantsLightText(c) ? T.LIGHT_INK : T.DARK_INK, r = T.contrast(ink, c);
      if (r < 4.5) bad.push(`${t.id}/${mode}: text on note ${c} = ${r.toFixed(2)}`);
    }
  }
}
assert.deepStrictEqual(bad, [], 'low contrast:\n' + bad.join('\n'));
// slots survive theme and light/dark switches; custom colours stay put when following light/dark
assert.strictEqual(T.slotOf('#FFD6E0'), 1);
assert.strictEqual(T.mapColor('#FFD6E0', 'purple', 0, false), '#FFD9F2');
assert.strictEqual(T.mapColor('#FFD6E0', 'purple', 0, true), '#47284A');
assert.strictEqual(T.followMode('#FFF2A8', 'classic', true), '#4A4325');
assert.strictEqual(T.followMode('#4A4325', 'classic', false), '#FFF2A8');
assert.strictEqual(T.followMode('#123456', 'classic', true), '#123456');
assert.strictEqual(T.slotOf('#757575'), 5, 'old Mono grey keeps its slot');
assert.strictEqual(T.byId('nope').id, 'classic');
assert.ok(T.byId('purple').name === 'Purple');
const v = T.vars('purple', true); assert.strictEqual(v['--accent'], '#b794f6'); assert.ok(v['--bg'] && v['--on-accent'] && v['--mute']);
console.log('themes ok');

// ---- note palettes (1.16) ----
{
  const assert = require('assert'), T = require('../themes');
  for (const p of T.PALETTES) {
    assert.strictEqual(p.colors.length, 8); assert.strictEqual(p.dark.length, 8); assert.strictEqual(p.names.length, 8);
    assert.ok(p.colors.every(c => T.readable(c).ok), p.id + ': text readable on every light colour');
    assert.ok(p.dark.every(c => T.readable(c).ok), p.id + ': text readable on every dark colour');
  }
  // the colour-blind set differs in lightness, not only in hue
  const cb = T.paletteById('cb').colors.slice(0, 6).map(T.lum).sort((a, b) => a - b);
  for (let i = 1; i < cb.length; i++) assert.ok(cb[i] - cb[i - 1] > 0.04, 'colour-blind set: lightness steps apart');
  // no built-in colour is used for a different slot in another built-in palette (a note keeps its meaning)
  const seen = {};
  for (const p of T.PALETTES) for (const arr of [p.colors, p.dark]) arr.forEach((c, i) => { const k = c.toLowerCase(); if (seen[k] !== undefined) assert.strictEqual(seen[k], i, 'slot clash ' + c); seen[k] = i; });
  // own palettes: validated, dark twin made, slots work, letters
  const own = T.setCustom([{ id: 'my-a', name: 'Beach', colors: ['#ffe9a0', '#ffc4c4', '#bfe3ff', '#c9f2c0', '#ffd9a8', '#e1ccff'], letters: [null, '#7a0000'] }, { id: 'bad', name: 'x', colors: [] }, { id: 'my-b', name: 'Short', colors: ['#fff'] }]);
  assert.strictEqual(own.length, 1);
  assert.strictEqual(T.palette('classic', false, 'my-a')[1], '#FFC4C4');
  assert.ok(T.readable(T.palette('classic', true, 'my-a')[0]).ok);
  assert.strictEqual(T.palette('classic', false, 'nope')[0], T.palette('classic', false)[0], 'an unknown palette falls back to the theme');
  assert.strictEqual(T.slotOf('#ffc4c4'), 1);
  assert.strictEqual(T.mapColor('#FFC4C4', 'classic', 0, true, 'my-a'), T.palette('classic', true, 'my-a')[1]);
  assert.strictEqual(T.followMode('#123456', 'classic', true, 'my-a'), '#123456', 'a colour of your own never moves');
  assert.strictEqual(T.letterFor('#FFC4C4', 'my-a'), '#7a0000'); assert.strictEqual(T.letterFor('#FFE9A0', 'my-a'), null); assert.strictEqual(T.letterFor('#FFC4C4', 'standard'), null);
  assert.strictEqual(T.letterFor(T.palette('classic', true, 'my-a')[1], 'my-a'), '#7a0000', 'the dark twin keeps the letter colour');
  assert.strictEqual(T.colorName('#FFEC8B'), 'Yellow'); assert.strictEqual(T.colorName('#ffffff'), 'White'); assert.strictEqual(T.colorName('nonsense'), 'Colour');
  assert.strictEqual(T.readable('#7a7a7a').ok, false); assert.strictEqual(T.readable('#7a7a7a', '#000000').ok, true);
  T.setCustom([]);
  console.log('palettes ok');
}
