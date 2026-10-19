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
