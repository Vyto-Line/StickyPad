// Note colour themes. Used by the main process (require) and by the note window (<script>).
(function (root) {
  // Every theme has 8 colours in the same "slots": 0-5 are note colours, 6 is a light/neutral, 7 is a dark/strong one.
  // That lets a note keep its meaning (e.g. "the pink one") when you switch theme.
  const THEMES = [
    { id: 'classic',  name: 'Classic',  font: 'Segoe UI',        colors: ['#FFF2A8','#FFD6E0','#CDEFFF','#D4F5C4','#FFE0B8','#E4D4FF','#FFFFFF','#2B2F3A'] },
    { id: 'paper',    name: 'Paper',    font: 'Georgia',         colors: ['#FBF6EA','#F3EAD3','#EFE3C8','#F6EFE3','#E8DCC3','#F1E7D0','#FFFFFF','#3B342A'] },
    { id: 'pastel',   name: 'Pastel',   font: 'Segoe UI',        colors: ['#FFFACD','#FFD1DC','#BDE4F4','#D0F0C0','#FFDAC1','#E0BBE4','#F5F5F5','#6B5B7B'] },
    { id: 'midnight', name: 'Midnight', font: 'Segoe UI',        colors: ['#1E2233','#2B2342','#1B2D3F','#1D3329','#3A2A26','#2A2740','#0F1320','#E8EAF2'] },
    { id: 'neon',     name: 'Neon',     font: 'Segoe UI',        colors: ['#FFEA00','#FF3CAC','#00E5FF','#39FF14','#FF6B00','#B388FF','#FFFFFF','#0A0A12'] },
    { id: 'ocean',    name: 'Ocean',    font: 'Segoe UI',        colors: ['#D6F1FF','#B5E3F5','#8FD0EB','#BFE8DA','#A7C7E7','#E6F4F9','#FFFFFF','#1B4965'] },
    { id: 'forest',   name: 'Forest',   font: 'Segoe UI',        colors: ['#E2F0D9','#C5E1A5','#A9D18E','#D7E8C0','#C9E2D3','#F1F7E4','#FFFFFF','#2F5233'] },
    { id: 'sunset',   name: 'Sunset',   font: 'Segoe UI',        colors: ['#FFE3D3','#FFC9A8','#FFAD84','#FF9F9F','#FFD6A5','#F8C8DC','#FFF5EE','#7A2E3A'] },
    { id: 'mono',     name: 'Mono',     font: 'Consolas',        colors: ['#F1F1F1','#E0E0E0','#CFCFCF','#BDBDBD','#9E9E9E','#757575','#FFFFFF','#222222'] }
  ];
  const byId = id => THEMES.find(t => t.id === id) || THEMES[0];
  // Which slot is this colour in (in any theme)? -1 when it is a custom colour.
  function slotOf(color) {
    const c = String(color || '').toLowerCase();
    for (const t of THEMES) { const i = t.colors.findIndex(x => x.toLowerCase() === c); if (i >= 0) return i; }
    return -1;
  }
  // The colour a note should get in `themeId`: same slot as now, or (for a custom colour) the fallback slot.
  function mapColor(color, themeId, fallbackSlot) {
    const t = byId(themeId), i = slotOf(color);
    return t.colors[i >= 0 ? i : ((fallbackSlot || 0) % 6)];
  }
  const api = { THEMES, byId, slotOf, mapColor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.StickyThemes = api;
})(typeof self !== 'undefined' ? self : this);
