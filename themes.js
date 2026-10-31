// Themes. Used by the main process (require) and by the windows (<script>).
// A theme colours the whole app (Home, Settings, chat, the note panel) and offers the colours for notes.
// Every theme has a light and a dark version. Note colours come in 8 "slots" in the same order in every theme and version:
// 0-5 are note colours, 6 is a light/neutral one, 7 a dark/strong one. That lets a note keep its meaning ("the pink one")
// when you switch theme, or when the app switches between light and dark.
(function (root) {
  // ui: bg (window), nav (sidebar), card (boxes, fields), fg (text), mute (secondary text), line, accent, onAccent (text on accent)
  const ui = (bg, nav, card, fg, mute, line, accent, onAccent) => ({ bg, nav, card, fg, mute, line, accent, onAccent });
  const THEMES = [
    { id: 'classic', name: 'Classic', font: 'Segoe UI',
      colors: ['#FFF2A8', '#FFD6E0', '#CDEFFF', '#D4F5C4', '#FFE0B8', '#E4D4FF', '#FFFFFF', '#2B2F3A'],
      dark:   ['#4A4325', '#4A2A35', '#213A4A', '#263F2B', '#4A3522', '#362C4C', '#2A2C31', '#F1EFE6'],
      ui: { light: ui('#f5f5f3', '#ebebe8', '#ffffff', '#1f2126', '#575a62', '#1f212621', '#2f54d6', '#ffffff'),
            dark:  ui('#17181c', '#111215', '#202227', '#ecedf0', '#a7abb5', '#ffffff21', '#8ea4ff', '#101522') } },
    { id: 'purple', name: 'Purple', font: 'Segoe UI',
      colors: ['#F1E8FF', '#FFD9F2', '#D9CCFF', '#E3F0FF', '#FFE4D6', '#E8D5FF', '#FFFFFF', '#3B2266'],
      dark:   ['#2F2342', '#47284A', '#33294A', '#22304A', '#45302D', '#3D2B4F', '#1D1626', '#F2EAFD'],
      ui: { light: ui('#f6f2fc', '#ebe2f8', '#ffffff', '#2e2045', '#5f4f7a', '#2e204521', '#7c3aed', '#ffffff'),
            dark:  ui('#17111f', '#110c18', '#21182c', '#efe7fb', '#b4a5cc', '#ffffff21', '#b794f6', '#17111f') } },
    { id: 'paper', name: 'Paper', font: 'Georgia',
      colors: ['#FBF6EA', '#F3EAD3', '#EFE3C8', '#F6EFE3', '#E8DCC3', '#F1E7D0', '#FFFFFF', '#3B342A'],
      dark:   ['#3A3226', '#3D3329', '#38301F', '#332C22', '#40321F', '#3A3125', '#2B261E', '#F5ECD9'],
      ui: { light: ui('#f5efe1', '#eae0ca', '#fffaf0', '#3b342a', '#665a48', '#3b342a24', '#8a5a2b', '#ffffff'),
            dark:  ui('#1c1914', '#15120e', '#26221b', '#efe6d4', '#b8a98f', '#ffffff1f', '#d9a86a', '#1c1914') } },
    { id: 'pastel', name: 'Pastel', font: 'Segoe UI',
      colors: ['#FFFACD', '#FFD1DC', '#BDE4F4', '#D0F0C0', '#FFDAC1', '#E0BBE4', '#F5F5F5', '#6B5B7B'],
      dark:   ['#423F2A', '#45303A', '#273E48', '#2E4130', '#47352B', '#3B2F48', '#2A2631', '#F3EEFB'],
      ui: { light: ui('#f8f4fb', '#eee5f6', '#ffffff', '#3d3550', '#625877', '#3d355021', '#8457c0', '#ffffff'),
            dark:  ui('#1b1822', '#15121b', '#25212e', '#ece6f5', '#b0a6c4', '#ffffff1f', '#c3a3f0', '#1b1822') } },
    { id: 'ocean', name: 'Ocean', font: 'Segoe UI',
      colors: ['#D6F1FF', '#B5E3F5', '#8FD0EB', '#BFE8DA', '#A7C7E7', '#E6F4F9', '#FFFFFF', '#1B4965'],
      dark:   ['#173447', '#1D3A4A', '#1F4457', '#1D3D38', '#22344A', '#183040', '#132630', '#E3F1F8'],
      ui: { light: ui('#edf6fa', '#d9ebf3', '#ffffff', '#163847', '#47616f', '#16384721', '#1b6fa8', '#ffffff'),
            dark:  ui('#0f1c24', '#0b151b', '#16262f', '#e3f1f8', '#9db6c3', '#ffffff1f', '#5bb4e8', '#0f1c24') } },
    { id: 'forest', name: 'Forest', font: 'Segoe UI',
      colors: ['#E2F0D9', '#C5E1A5', '#A9D18E', '#D7E8C0', '#C9E2D3', '#F1F7E4', '#FFFFFF', '#2F5233'],
      dark:   ['#24331F', '#2C3D22', '#334A26', '#2A3A25', '#25382E', '#2B3527', '#1A2318', '#E6F0DF'],
      ui: { light: ui('#f0f5eb', '#e0ead5', '#ffffff', '#22351e', '#4f6249', '#22351e21', '#2f7d3b', '#ffffff'),
            dark:  ui('#131a12', '#0e140d', '#1c251a', '#e6f0df', '#a3b59b', '#ffffff1f', '#7cc684', '#131a12') } },
    { id: 'sunset', name: 'Sunset', font: 'Segoe UI',
      colors: ['#FFE3D3', '#FFC9A8', '#FFAD84', '#FF9F9F', '#FFD6A5', '#F8C8DC', '#FFF5EE', '#7A2E3A'],
      dark:   ['#47302A', '#4F3226', '#55301F', '#522C30', '#4D3A25', '#4A2A3A', '#2E2023', '#FBE9E4'],
      ui: { light: ui('#fff3ec', '#fae0d2', '#ffffff', '#4a2328', '#77494f', '#4a232821', '#c0392f', '#ffffff'),
            dark:  ui('#1f1417', '#180f12', '#2a1c20', '#f8e6e2', '#c7a3a4', '#ffffff1f', '#ff8a73', '#1f1417') } },
    { id: 'midnight', name: 'Midnight', font: 'Segoe UI',
      colors: ['#E3E6F5', '#ECE3F5', '#DDE9F5', '#DDEFE6', '#F3E5DF', '#E7E3F6', '#FFFFFF', '#1E2233'],
      dark:   ['#1E2233', '#2B2342', '#1B2D3F', '#1D3329', '#3A2A26', '#2A2740', '#0F1320', '#E8EAF2'],
      ui: { light: ui('#eef0f7', '#e1e5f0', '#ffffff', '#1e2233', '#4e5670', '#1e223321', '#3d52c4', '#ffffff'),
            dark:  ui('#151a29', '#0f1320', '#1f2436', '#e8eaf2', '#aab0c6', '#ffffff21', '#8ea4ff', '#101522') } },
    { id: 'neon', name: 'Neon', font: 'Segoe UI',
      colors: ['#FFEA00', '#FF3CAC', '#00E5FF', '#39FF14', '#FF6B00', '#B388FF', '#FFFFFF', '#0A0A12'],
      dark:   ['#FFEA00', '#FF3CAC', '#00E5FF', '#39FF14', '#FF6B00', '#B388FF', '#16161F', '#FFFFFF'],
      ui: { light: ui('#fafafa', '#f0f0f5', '#ffffff', '#0a0a12', '#4a4a5c', '#0a0a1221', '#c2187c', '#ffffff'),
            dark:  ui('#0b0b14', '#05050b', '#161622', '#ffffff', '#babacd', '#ffffff24', '#ff3cac', '#0b0b14') } },
    { id: 'mono', name: 'Mono', font: 'Consolas',
      colors: ['#F1F1F1', '#E0E0E0', '#CFCFCF', '#BDBDBD', '#9E9E9E', '#6B6B6B', '#FFFFFF', '#222222'],
      dark:   ['#2A2A2A', '#333333', '#3C3C3C', '#454545', '#4F4F4F', '#5A5A5A', '#1F1F1F', '#F0F0F0'],
      ui: { light: ui('#f1f1f1', '#e4e4e4', '#ffffff', '#1e1e1e', '#4d4d4d', '#1e1e1e21', '#1e1e1e', '#ffffff'),
            dark:  ui('#141414', '#0e0e0e', '#1e1e1e', '#ececec', '#a6a6a6', '#ffffff24', '#ececec', '#111111') } }
  ];
  const LEGACY = { '#757575': 5 };   // colours older versions used, so existing notes keep their slot
  const byId = id => THEMES.find(t => t.id === id) || THEMES[0];

  // Note palettes. A palette only changes which colours the colour menu offers (and new notes start with); it never recolours a note.
  // Same 8 slots as a theme. "theme" (the default) means: use the colours of the app theme, as before.
  const NAMES8 = ['Yellow', 'Pink', 'Blue', 'Green', 'Orange', 'Purple', 'White', 'Graphite'];
  const PALETTES = [
    { id: 'standard', name: 'Standard', names: NAMES8,
      colors: ['#FFEC8B', '#FFC2D9', '#B5DEFF', '#BDEEA6', '#FFCB8F', '#D5BFFF', '#FFFFFF', '#2B2F3A'],
      dark:   ['#5A4E1C', '#5C2D42', '#1F4466', '#2D5A22', '#5E3A17', '#43306B', '#2A2C31', '#F1EFE6'] },
    { id: 'clear', name: 'Clear colours', names: NAMES8,
      colors: ['#FFE15C', '#FF9DBD', '#7EC8FF', '#8EDB78', '#FFAA5E', '#BC9CFF', '#FFFFFF', '#2B2F3A'],
      dark:   ['#6B5A00', '#7A2548', '#12507F', '#1F6B12', '#7A3F00', '#51309A', '#2A2C31', '#F1EFE6'] },
    // For colour-blind readers: the colours also differ in lightness (light yellow, mid sky blue, mid orange...), not only in hue.
    { id: 'cb', name: 'Colour-blind friendly', names: ['Pale yellow', 'Light pink', 'Lavender', 'Orange', 'Sky blue', 'Bluish green', 'White', 'Graphite'],
      colors: ['#FFF59B', '#F8CFE0', '#C6C0F0', '#EBA94F', '#5CA9E0', '#2F9E77', '#FFFFFF', '#2B2F3A'],
      dark:   ['#6B6112', '#5C3347', '#3C3768', '#7A4A0D', '#124F7A', '#13604A', '#2A2C31', '#F1EFE6'] }
  ];
  let custom = [];   // the person's own palettes: { id, name, colors: [6 light colours], letters: [6 x (null = automatic | '#rrggbb')] }

  const hexOk = h => /^#[0-9a-f]{6}$/i.test(String(h));
  function toHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0, s = 0;
    if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, s, l];
  }
  function fromHsl(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    const f = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return '#' + f(r) + f(g) + f(b);
  }
  // The dark-mode twin of a light colour: same hue, calmer and much darker.
  function darkOf(hex) { const [h, s, l] = toHsl(hex.toLowerCase()); return fromHsl(h, Math.min(1, s * 0.6), 0.1 + l * 0.14).toUpperCase(); }
  function customPalette(c) {
    const cols = c.colors.map(x => x.toUpperCase());
    return { id: c.id, name: c.name, custom: true, letters: c.letters, names: cols.map(colorName).concat(['White', 'Graphite']),
      colors: cols.concat(['#FFFFFF', '#2B2F3A']), dark: cols.map(darkOf).concat(['#2A2C31', '#F1EFE6']) };
  }
  // A plain name for a colour, for the hover text.
  function colorName(hex) {
    if (!hexOk(hex)) return 'Colour';
    const [h, s, l] = toHsl(hex.toLowerCase());
    if (l > 0.94) return 'White'; if (l < 0.14) return 'Black';
    if (s < 0.12) return l > 0.7 ? 'Light grey' : l > 0.35 ? 'Grey' : 'Graphite';
    const hue = h < 15 || h >= 345 ? 'Red' : h < 40 ? 'Orange' : h < 68 ? 'Yellow' : h < 160 ? 'Green' : h < 195 ? 'Teal' : h < 255 ? 'Blue' : h < 290 ? 'Purple' : 'Pink';
    return (hue === 'Red' && l > 0.7) ? 'Pink' : (hue === 'Orange' && l < 0.4) ? 'Brown' : hue;
  }
  // Replace the list of own palettes (keeps only well-formed ones; at most 8).
  function setCustom(list) {
    custom = (Array.isArray(list) ? list : []).filter(c => c && typeof c.id === 'string' && /^my-[a-z0-9]{1,12}$/.test(c.id) && typeof c.name === 'string' && Array.isArray(c.colors) && c.colors.length === 6 && c.colors.every(hexOk))
      .slice(0, 8).map(c => ({ id: c.id, name: c.name.slice(0, 30), colors: c.colors.map(x => x.toLowerCase()),
        letters: [0, 1, 2, 3, 4, 5].map(i => Array.isArray(c.letters) && hexOk(c.letters[i]) ? c.letters[i].toLowerCase() : null) }));
    return custom;
  }
  const customList = () => custom;
  const allPalettes = () => PALETTES.concat(custom.map(customPalette));
  const paletteById = id => allPalettes().find(p => p.id === id) || null;
  // The 8 colours to offer: a note palette when one is chosen, else the theme's.
  const palette = (id, dark, paletteId) => { const p = paletteId && paletteId !== 'theme' ? paletteById(paletteId) : null; if (p) return dark ? p.dark : p.colors; const t = byId(id); return dark ? t.dark : t.colors; };
  const paletteNames = (id, paletteId) => { const p = paletteId && paletteId !== 'theme' ? paletteById(paletteId) : null; return p ? p.names : palette(id, false).map(colorName).slice(0, 6).concat(['White', 'Graphite']); };
  // Which slot is this colour in (in any theme or palette, light or dark)? -1 when it is a custom colour.
  function slotOf(color) {
    const c = String(color || '').toLowerCase();
    for (const t of THEMES.concat(allPalettes())) for (const p of [t.colors, t.dark]) { const i = p.findIndex(x => x.toLowerCase() === c); if (i >= 0) return i; }
    return c in LEGACY ? LEGACY[c] : -1;
  }
  // The colour a note should get in `themeId` (light or dark): same slot as now, or (for a custom colour) the fallback slot.
  function mapColor(color, themeId, fallbackSlot, dark, paletteId) {
    const p = palette(themeId, dark, paletteId), i = slotOf(color);
    return p[i >= 0 ? i : ((fallbackSlot || 0) % 6)];
  }
  // Light <-> dark switch: only colours from a theme or palette move; your own custom colours stay as they are.
  function followMode(color, themeId, dark, paletteId) { return slotOf(color) >= 0 ? palette(themeId, dark, paletteId)[slotOf(color)] : color; }
  // The letter colour a custom palette asks for on this note colour (null = automatic).
  function letterFor(color, paletteId) {
    const p = paletteId && paletteId !== 'theme' ? paletteById(paletteId) : null; if (!p || !p.custom) return null;
    const c = String(color || '').toLowerCase(), i = p.colors.findIndex(x => x.toLowerCase() === c), j = p.dark.findIndex(x => x.toLowerCase() === c), k = i >= 0 ? i : j;
    return k >= 0 && k < 6 ? p.letters[k] : null;
  }
  // WCAG contrast helpers, so text on any colour stays readable.
  function lum(hex) {
    const h = String(hex).replace('#', '').slice(0, 6); if (!/^[0-9a-f]{6}$/i.test(h)) return 1;
    const f = v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * f(parseInt(h.slice(0, 2), 16) / 255) + 0.7152 * f(parseInt(h.slice(2, 4), 16) / 255) + 0.0722 * f(parseInt(h.slice(4, 6), 16) / 255);
  }
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const DARK_INK = '#25221a', LIGHT_INK = '#f3f3f0';
  const wantsLightText = bg => contrast(LIGHT_INK, bg) > contrast(DARK_INK, bg);
  // Is the text readable on this colour? Uses the letter colour when one is given, else the automatic dark or light one. Needs 4.5 : 1 (WCAG AA).
  function readable(bg, letter) { const ink = letter || (wantsLightText(bg) ? LIGHT_INK : DARK_INK), r = contrast(ink, bg); return { ratio: Math.round(r * 10) / 10, ok: r >= 4.5 }; }
  // The CSS variables a window uses (the names the pages already had).
  function vars(id, dark) {
    const u = byId(id).ui[dark ? 'dark' : 'light'];
    return { '--bg': u.bg, '--nav': u.nav, '--card': u.card, '--fg': u.fg, '--mute': u.mute, '--line': u.line, '--accent': u.accent, '--on-accent': u.onAccent,
      '--hover': u.nav, '--danger': dark ? '#ff8a80' : '#c92a2a', '--err': dark ? '#ff8a80' : '#c92a2a',
      '--user': u.accent, '--user-fg': u.onAccent, '--ai': u.card, '--code': u.nav };
  }
  const api = { THEMES, PALETTES, byId, palette, paletteNames, paletteById, allPalettes, setCustom, customList, darkOf, colorName, letterFor, readable, hexOk, slotOf, mapColor, followMode, lum, contrast, wantsLightText, DARK_INK, LIGHT_INK, vars };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.StickyThemes = api;
})(typeof self !== 'undefined' ? self : this);
