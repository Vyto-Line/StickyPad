(() => {
  const L = { ollama: [], ai: [], update: [], ui: [], acc: [] };
  const REC = [{name:'llama3.2:1b',label:'Llama 3.2 · 1B',size:'1.3 GB',note:'Fastest'},{name:'llama3.2:3b',label:'Llama 3.2 · 3B',size:'2.0 GB',note:'Recommended'},{name:'llama3.1:8b',label:'Llama 3.1 · 8B',size:'4.9 GB',note:'Best'}];
  const S = window.__S = { calls: [], editMode: 'ok', stop: false,
    ai: { provider: 'ollama', model: 'llama3.2', url: 'http://localhost:11434', hasKey: false, defaultModel: 'claude-haiku-5-5' },
    ol: { running: true, installed: true, canInstall: true, local: true, models: [{ name: 'llama3.2:latest', size: 2e9 }], recommended: REC, pulling: [], installing: false },
    note: { id: 'n1', title: '', blocks: window.__BLOCKS || [{ t: 'text', v: 'helo wrold this is a tset' }], color: '#FFF2A8', font: 'Segoe UI', size: 15, locked: false, unlocked: false, pinned: false, group: null } };
  const emit = (k, m) => L[k].forEach(f => f(m));
  window.__applied = () => (L.applied || []).forEach(f => f());
  window.__emit = emit; window.__emitUpdate = m => L.update.forEach(f => f(m));
  const over = {
    get: async () => JSON.parse(JSON.stringify(S.note)),
    wordsGet: async () => window.__WORDS || [],
    searchIds: async q => (S.all ? S.all.notes : [{ id: 'n1', title: 'Shopping', text: 'milk, eggs' }]).filter(n => (n.full || n.title + ' ' + n.text).toLowerCase().includes(String(q).toLowerCase())).map(n => n.id),
    searchQuery: async q => { S.calls.push(['searchQuery', q]); return window.__RESULTS ? window.__RESULTS(q) : []; },
    notePrint: async () => { S.calls.push(['notePrint']); return { ok: true }; },
    allPrint: async (ids, o) => { S.calls.push(['allPrint', ids, o]); return window.__PRINT ? window.__PRINT(ids, o) : { ok: true, skipped: 0 }; },
    allTrash: async id => { S.calls.push(['allTrash', id]); return true; },
    trashRestore: async id => { S.calls.push(['trashRestore', id]); return true; },
    searchShow: async id => { S.calls.push(['searchShow', id]); return true; },
    settingsAction: async (n, a) => { S.calls.push(['settingsAction', n, a]); return window.__SA ? window.__SA(n, a) : { ok: true }; },
    prefs: async p => { S.calls.push(['prefs', JSON.parse(JSON.stringify(p))]); return p; },
    themeSet: async id => { S.calls.push(['themeSet', id]); return id; },
    themeApplyAll: async id => { S.calls.push(['themeApplyAll', id]); return id; },
    welcomeGet: async () => ({ keys: window.__KEYS || { g_new: 'Ctrl+Alt+N', g_all: 'Ctrl+Alt+Q', g_find: 'Ctrl+Alt+F' }, name: window.__NAME || '', fresh: window.__FRESH !== false }),
    welcomeClose: async o => { S.calls.push(['welcomeClose', o || {}]); },
    dropFiles: async files => { S.calls.push(['dropFiles', files.map(f => f.name)]); return window.__DROP || { ok: true, count: files.length, failed: 0 }; },
    searchClose: async () => { S.calls.push(['searchClose']); },
    searchOpen: async () => { S.calls.push(['searchOpen']); },
    searchRun: async id => { S.calls.push(['searchRun', id]); return true; },
    saveImage: async () => 'img' + Math.random().toString(36).slice(2, 8),
    histList: async () => ({ locked: false, items: S.hist || [{ t: Date.now() - 3600e3, words: 12, pics: 0, preview: 'old first line' }, { t: Date.now() - 86400e3, words: 3, pics: 1, preview: '' }] }),
    histRestore: async t => { S.calls.push(['histRestore', t]); S.note.blocks = [{ t: 'text', v: 'RESTORED' }]; return true; },
    panel: async open => { S.calls.push(['panel', open]); return !!open && window.innerWidth >= 560; },
    linkMenu: async u => { S.calls.push(['linkMenu', u]); return true; },
    openLink: async u => { S.calls.push(['openLink', u]); return true; },
    aiWarmup: async () => { S.calls.push(['warm']); return true; },
    remind: async ts => { S.calls.push(['remind', ts]); S.note.remind = ts; return ts; },
    aiGet: async () => ({ ...S.ai }),
    aiSet: async p => { S.calls.push(['aiSet', p]); Object.assign(S.ai, p.provider ? { provider: p.provider } : {}, p.model != null ? { model: p.model } : {}, p.url ? { url: p.url } : {}); return true; },
    ollamaStatus: async () => JSON.parse(JSON.stringify(S.ol)),
    ollamaStart: async () => { S.calls.push(['start']); await new Promise(r => setTimeout(r, 50)); S.ol.running = true; return { ok: true }; },
    ollamaPull: async (name) => {
      S.calls.push(['pull', name]);
      for (const p of [10, 55, 100]) { await new Promise(r => setTimeout(r, 60)); emit('ollama', { type: 'pull', name, state: 'progress', status: 'pulling', pct: p }); }
      if (S.pullFail) { emit('ollama', { type: 'pull', name, state: 'error', error: 'disk full' }); return { ok: false, error: 'disk full' }; }
      S.ol.models.push({ name, size: 1.3e9 }); emit('ollama', { type: 'pull', name, state: 'done' }); return { ok: true };
    },
    accessGet: async () => Object.assign({ size: 100, contrast: false, read: false, motion: false, focus: false, big: false, sr: false }, window.__ACCESS || {}),
    accessSet: async p => { S.calls.push(['accessSet', p]); window.__ACCESS = Object.assign(window.__ACCESS || {}, p); L.acc.forEach(f => f(Object.assign({ size: 100, contrast: false, read: false, motion: false, focus: false, big: false, sr: false }, window.__ACCESS))); return window.__ACCESS; },
    onAccess: cb => L.acc.push(cb), setZoom: f => { S.zoom = f; },
    uiTheme: async () => (S.uiTheme ? JSON.parse(JSON.stringify(S.uiTheme)) : null), onUiTheme: cb => L.ui.push(cb),
    grpMove: async (id, g) => { S.calls.push(['grpMove', id, g]); if (S.all) { const n = S.all.notes.find(x => x.id === id); if (n) n.group = g; } return true; },
    home: async (id, arg) => { S.calls.push(['home', id, arg]); return true; },
    ollamaDelete: async name => { S.calls.push(['delete', name]); if (S.delFail) return { ok: false, error: 'Ollama is busy' }; S.ol.models = S.ol.models.filter(m => m.name !== name); return { ok: true }; },
    ollamaInstall: async () => {
      S.calls.push(['install']);
      for (const [s, p] of [['Downloading Ollama…', 30], ['Downloading Ollama…', 90], ['Installing Ollama…', null], ['Starting Ollama…', null]]) { await new Promise(r => setTimeout(r, 60)); emit('ollama', { type: 'install', state: 'progress', status: s, pct: p }); }
      S.ol.installed = true; S.ol.running = true; emit('ollama', { type: 'install', state: 'done' }); return { ok: true };
    },
    ollamaCancel: async w => { S.calls.push(['cancel', w]); },
    aiEdit: async ({ id, mode, text }) => {
      S.calls.push(['edit', mode, text]);
      if (S.editMode === 'error') { emit('ai', { id, type: 'error', error: 'Ollama is not running' }); return true; }
      const out = S.editOut || 'Hello world, this is a test.'; const parts = out.match(/\S+\s*/g);
      S.stop = false;
      for (const p of parts) { await new Promise(r => setTimeout(r, S.editDelay || 40)); if (S.stop) { emit('ai', { id, type: 'done', stopped: true }); return true; } emit('ai', { id, type: 'chunk', text: p }); }
      emit('ai', { id, type: 'done', text: out }); return true;
    },
    aiEditStop: async () => { S.stop = true; },
    openSettings: async s => { S.calls.push(['openSettings', s]); },
    update: async p => { S.calls.push(['update', p]); S.lastUpdate = p; },
    info: async () => ({ groups: [], theme: 'classic', snap: true, hideTaskbar: false, startup: false, packaged: true, trashCount: 0 }),
    allList: async () => S.all ? JSON.parse(JSON.stringify(S.all)) : ({ emoji: '☀️', greeting: 'Good morning', notes: [{ id: 'n1', title: 'Shopping', text: 'milk, eggs', color: '#FFF2A8', group: null, updated: Date.now(), open: true }], groups: [], trash: [], prefs: {} }),
    chatLoad: async () => ({ messages: [], noteId: null, notes: [], ai: { provider: 'ollama' } }),
    chatNotes: async () => [],
    aiRun: async () => ({ ok: true, text: 'ok' }),
    settingsGet: async () => { const base = { lowMemory: true, lowMemoryActive: true, aiKeep: '5m', version: '1.10.0', packaged: true, prefs: {}, theme: 'classic', trashCount: 0, backupCount: 0, dataPath: 'C:/x', snapDistance: 20, trashDays: 30, groups: [], shortcuts: true, defaultSize: 'm' }; const set = S.set || (S.set = { shortcuts: true, suggestDates: true, keysFailed: [], keysSaved: {} }); return { ...base, ...set, keys: window.StickyKeys ? window.StickyKeys.merge(set.keysSaved) : {} }; },
    settingsSet: async p => { S.calls.push(['settingsSet', JSON.parse(JSON.stringify(p))]); const set = S.set || (S.set = { shortcuts: true, suggestDates: true, keysFailed: [], keysSaved: {} }); if (p.keys) set.keysSaved = window.StickyKeys.merge(p.keys); Object.keys(p).forEach(k => { if (k !== 'keys') set[k] = p[k]; }); return over.settingsGet(); },
    openAll: async () => { S.calls.push(['openAll']); },
    onApplied: cb => { (L.applied = L.applied || []).push(cb); },
    updateState: async () => S.updateNow || null,
    whatsNewGet: async () => S.whats || { version: '1.14.12', off: false, sections: [{ version: '1.14.12', blocks: [{ t: 'p', v: 'Sample **intro**.' }, { t: 'li', v: '**One thing.** With `code` and *style* <b>not html</b>.' }] }, { version: '1.14.11', blocks: [{ t: 'li', v: 'Older item.' }] }] },
    whatsNewClose: async o => { S.calls.push(['whatsNewClose', o]); },
    updateCheck: async () => { S.calls.push(['updateCheck']); return S.updateResult || { state: 'none', checkedAt: Date.now() }; }, updateInstall: async () => { S.calls.push(['updateInstall']); }, updateDownload: async () => { S.calls.push(['updateDownload']); return { state: 'downloading', version: (S.updateNow && S.updateNow.version) || '1.14.16', pct: 0 }; },
    onUpdateEvent: cb => L.update.push(cb),
    onOllamaEvent: cb => L.ollama.push(cb), onAiEvent: cb => L.ai.push(cb),
  };
  window.api = new Proxy(over, { get: (t, k) => k in t ? t[k] : (String(k).startsWith('on') ? () => {} : async () => null) });
})();
