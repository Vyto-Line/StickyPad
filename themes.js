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
  const palette = (id, dark) => { const t = byId(id); return dark ? t.dark : t.colors; };
  // Which slot is this colour in (in any theme, light or dark)? -1 when it is a custom colour.
  function slotOf(color) {
    const c = String(color || '').toLowerCase();
    for (const t of THEMES) for (const p of [t.colors, t.dark]) { const i = p.findIndex(x => x.toLowerCase() === c); if (i >= 0) return i; }
    return c in LEGACY ? LEGACY[c] : -1;
  }
  // The colour a note should get in `themeId` (light or dark): same slot as now, or (for a custom colour) the fallback slot.
  function mapColor(color, themeId, fallbackSlot, dark) {
    const p = palette(themeId, dark), i = slotOf(color);
    return p[i >= 0 ? i : ((fallbackSlot || 0) % 6)];
  }
  // Light <-> dark switch: only colours from a theme move; your own custom colours stay as they are.
  function followMode(color, themeId, dark) { return slotOf(color) >= 0 ? palette(themeId, dark)[slotOf(color)] : color; }
  // WCAG contrast helpers, so text on any colour stays readable.
  function lum(hex) {
    const h = String(hex).replace('#', '').slice(0, 6); if (!/^[0-9a-f]{6}$/i.test(h)) return 1;
    const f = v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * f(parseInt(h.slice(0, 2), 16) / 255) + 0.7152 * f(parseInt(h.slice(2, 4), 16) / 255) + 0.0722 * f(parseInt(h.slice(4, 6), 16) / 255);
  }
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const DARK_INK = '#25221a', LIGHT_INK = '#f3f3f0';
  const wantsLightText = bg => contrast(LIGHT_INK, bg) > contrast(DARK_INK, bg);
  // The CSS variables a window uses (the names the pages already had).
  function vars(id, dark) {
    const u = byId(id).ui[dark ? 'dark' : 'light'];
    return { '--bg': u.bg, '--nav': u.nav, '--card': u.card, '--fg': u.fg, '--mute': u.mute, '--line': u.line, '--accent': u.accent, '--on-accent': u.onAccent,
      '--hover': u.nav, '--danger': dark ? '#ff8a80' : '#c92a2a', '--err': dark ? '#ff8a80' : '#c92a2a',
      '--user': u.accent, '--user-fg': u.onAccent, '--ai': u.card, '--code': u.nav };
  }
  const api = { THEMES, byId, palette, slotOf, mapColor, followMode, lum, contrast, wantsLightText, DARK_INK, LIGHT_INK, vars };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.StickyThemes = api;
})(typeof self !== 'undefined' ? self : this);
