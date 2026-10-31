(() => {
  const L = { ollama: [], ai: [], update: [], ui: [], acc: [] };
  const REC = [{name:'llama3.2:1b',label:'Llama 3.2 · 1B',size:'1.3 GB',note:'Fastest'},{name:'llama3.2:3b',label:'Llama 3.2 · 3B',size:'2.0 GB',note:'Recommended'},{name:'llama3.1:8b',label:'Llama 3.1 · 8B',size:'4.9 GB',note:'Best'}];
  const S = window.__S = { calls: [], editMode: 'ok', stop: false,
    ai: { provider: 'ollama', model: 'llama3.2', url: 'http://localhost:11434', hasKey: false, defaultModel: 'claude-haiku-5-5' },
    ol: { running: true, installed: true, canInstall: true, local: true, models: [{ name: 'llama3.2:latest', size: 2e9 }], recommended: REC, pulling: [], installing: false },
    note: { id: 'n1', title: '', blocks: window.__BLOCKS || [{ t: 'text', v: 'helo wrold this is a tset' }], color: '#FFF2A8', font: 'Segoe UI', size: 15, locked: false, unlocked: false, pinned: false, group: null } };
  const chatCur = () => { S.chats = S.chats || []; let c = S.chats.find(x => x.id === S.chatCur); if (!c) { c = { id: 'c' + (S.chats.length + 1), title: 'New chat', messages: [], updated: Date.now() }; S.chats.push(c); S.chatCur = c.id; } return c; };
  const chatView = () => { const c = chatCur(); return { chatId: c.id, messages: c.messages, noteId: c.noteId || null, history: S.chatHistory !== false, provider: 'ollama', model: 'llama3.2', notes: [], ai: { provider: 'ollama' } }; };
  const emit = (k, m) => L[k].forEach(f => f(m));
  window.__applied = () => (L.applied || []).forEach(f => f());
  window.__emit = emit; window.__emitUpdate = m => L.update.forEach(f => f(m));
  const over = {
    get: async () => JSON.parse(JSON.stringify(S.note)),
    wordsGet: async () => window.__WORDS || [],
    searchIds: async q => (S.all ? S.all.notes : [{ id: 'n1', title: 'Shopping', text: 'milk, eggs' }]).filter(n => (n.full || n.title + ' ' + n.text).toLowerCase().includes(String(q).toLowerCase())).map(n => n.id),
    searchQuery: async q => { S.calls.push(['searchQuery', q]); return window.__RESULTS ? window.__RESULTS(q) : []; },
    printInfo: async () => window.__PINFO || { count: 1, skipped: 0, many: false, titles: ['Shopping'], opts: { style: 'box', layout: 'actual', size: 'normal', title: true, pictures: true } },
    printPreview: async o => { S.calls.push(['printPreview', o]); return '<!doctype html><body><p>preview</p></body>'; },
    printGo: async o => { S.calls.push(['printGo', o]); return window.__PGO ? window.__PGO(o) : { ok: true }; },
    printClose: async () => { S.calls.push(['printClose']); },
    notePrint: async () => { S.calls.push(['notePrint']); return { ok: true }; },
    allPrint: async (ids, o) => { S.calls.push(['allPrint', ids, o]); return window.__PRINT ? window.__PRINT(ids, o) : { ok: true, skipped: 0 }; },
    allTrash: async id => { S.calls.push(['allTrash', id]); return true; },
    trashRestore: async id => { S.calls.push(['trashRestore', id]); return true; },
    searchShow: async id => { S.calls.push(['searchShow', id]); return true; },
    settingsAction: async (n, a) => { S.calls.push(['settingsAction', n, a]); return window.__SA ? window.__SA(n, a) : { ok: true }; },
    prefs: async p => { S.calls.push(['prefs', JSON.parse(JSON.stringify(p))]); return p; },
    themeSet: async id => { S.calls.push(['themeSet', id]); return id; },
    themeApplyAll: async id => { S.calls.push(['themeApplyAll', id]); return id; },
    paletteSet: async id => { S.calls.push(['paletteSet', id]); return id; },
    paletteSave: async p => { S.calls.push(['paletteSave', JSON.parse(JSON.stringify(p))]); return { ok: true, id: p.id || 'my-test' }; },
    paletteDelete: async id => { S.calls.push(['paletteDelete', id]); return { ok: true }; },
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
    ollamaLoaded: async () => (S.loaded === undefined ? [] : S.loaded),
    ollamaStart: async () => { S.calls.push(['start']); await new Promise(r => setTimeout(r, 50)); S.ol.running = true; return { ok: true }; },
    ollamaPull: async (name) => {
      S.calls.push(['pull', name]);
      for (const p of [10, 55, 100]) { await new Promise(r => setTimeout(r, 60)); emit('ollama', { type: 'pull', name, state: 'progress', status: 'pulling', pct: p }); }
      if (S.pullFail) { emit('ollama', { type: 'pull', name, state: 'error', error: 'disk full' }); return { ok: false, error: 'disk full' }; }
      S.ol.models.push({ name, size: 1.3e9 }); emit('ollama', { type: 'pull', name, state: 'done' }); return { ok: true };
    },
    accessGet: async () => Object.assign({ size: 100, contrast: false, read: false, motion: false, focus: false, big: false, sr: false }, window.__ACCESS || {}),
    accessSet: async p => { S.calls.push(['accessSet', p]); window.__ACCESS = Object.assign(window.__ACCESS || {}, p); L.acc.forEach(f => f(Object.assign({ size: 100, contrast: false, read: false, motion: false, focus: false, big: false, sr: false }, window.__ACCESS))); return window.__ACCESS; },
    quietGet: async () => Object.assign({ mode: 'off', delay: 10 }, window.__QUIET || {}),
    quietSet: async p => { S.calls.push(['quietSet', p]); window.__QUIET = Object.assign({ mode: 'off', delay: 10 }, window.__QUIET || {}, p); (L.quiet || []).forEach(f => f(window.__QUIET)); const set = S.set || (S.set = { shortcuts: true, suggestDates: true, keysFailed: [], keysSaved: {} }); set.quiet = window.__QUIET; return window.__QUIET; },
    onQuiet: cb => (L.quiet || (L.quiet = [])).push(cb),
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
    aiEdit: async ({ id, mode, text, to }) => {
      S.calls.push(['edit', mode, text]); S.lastTo = to;
      if (S.editMode === 'error') { emit('ai', { id, type: 'error', error: 'Ollama is not running' }); return true; }
      const out = (S.editMap && S.editMap[text]) || S.editOut || 'Hello world, this is a test.'; const parts = out.match(/\S+\s*/g);
      S.stop = false;
      for (const p of parts) { await new Promise(r => setTimeout(r, S.editDelay || 40)); if (S.stop) { emit('ai', { id, type: 'done', stopped: true }); return true; } emit('ai', { id, type: 'chunk', text: p }); }
      emit('ai', { id, type: 'done', text: out }); return true;
    },
    aiEditStop: async () => { S.stop = true; },
    openSettings: async s => { S.calls.push(['openSettings', s]); },
    update: async p => { S.calls.push(['update', p]); S.lastUpdate = p; },
    info: async () => ({ groups: [], theme: 'classic', snap: true, hideTaskbar: false, startup: false, packaged: true, trashCount: 0 }),
    allList: async () => S.all ? JSON.parse(JSON.stringify(S.all)) : ({ emoji: '☀️', greeting: 'Good morning', notes: [{ id: 'n1', title: 'Shopping', text: 'milk, eggs', color: '#FFF2A8', group: null, updated: Date.now(), open: true }], groups: [], trash: [], prefs: {} }),
    chatLoad: async () => chatView(),
    chatSave: async p => { const c = chatCur(); c.messages = (p && p.messages) || []; c.noteId = (p && p.noteId) || null; if (!c.custom) { const u = c.messages.find(m => m.role === 'user'); c.title = u ? u.content.slice(0, 48) : 'New chat'; } c.updated = Date.now(); S.calls.push(['chatSave', c.messages.length]); },
    chatList: async q => ({ history: S.chatHistory !== false, items: (S.chats || []).filter(c => c.messages.length && (!q || (c.title + ' ' + c.messages.map(m => m.content).join(' ')).toLowerCase().includes(String(q).toLowerCase()))).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updated - a.updated).map(c => ({ id: c.id, title: c.title, pinned: !!c.pinned, updated: c.updated, current: c.id === S.chatCur, count: c.messages.length })) }),
    chatSelect: async id => { if ((S.chats || []).some(c => c.id === id)) S.chatCur = id; return chatView(); },
    chatNew: async () => { const c = chatCur(); if (c.messages.length) { const n = { id: 'c' + (S.chats.length + 1), title: 'New chat', messages: [], updated: Date.now() }; S.chats.push(n); S.chatCur = n.id; } return chatView(); },
    chatRename: async (id, t) => { const c = S.chats.find(x => x.id === id); if (!c) return false; if (String(t).trim()) { c.title = String(t).trim(); c.custom = true; } S.calls.push(['chatRename', id, t]); return true; },
    chatPin: async (id, on) => { const c = S.chats.find(x => x.id === id); if (c) c.pinned = !!on; return !!c; },
    chatDelete: async id => { S.chats = S.chats.filter(c => c.id !== id); if (S.chatCur === id) S.chatCur = null; S.calls.push(['chatDelete', id]); return chatView(); },
    chatDeleteAll: async () => { S.chats = []; S.chatCur = null; S.calls.push(['chatDeleteAll']); return chatView(); },
    chatToNote: async id => { S.calls.push(['chatToNote', id]); return true; },
    chatNotes: async () => [],
    aiRun: async () => ({ ok: true, text: 'ok' }),
    settingsGet: async () => { const base = { lowMemory: true, lowMemoryActive: true, aiKeep: '5m', version: '1.10.0', packaged: true, prefs: {}, quiet: { mode: 'off', delay: 10 }, theme: 'classic', trashCount: 0, backupCount: 0, dataPath: 'C:/x', snapDistance: 20, trashDays: 30, groups: [], shortcuts: true, defaultSize: 'm' }; const set = S.set || (S.set = { shortcuts: true, suggestDates: true, keysFailed: [], keysSaved: {} }); return { ...base, ...set, keys: window.StickyKeys ? window.StickyKeys.merge(set.keysSaved) : {} }; },
    settingsSet: async p => { S.calls.push(['settingsSet', JSON.parse(JSON.stringify(p))]); const set = S.set || (S.set = { shortcuts: true, suggestDates: true, keysFailed: [], keysSaved: {} }); if (p.keys) set.keysSaved = window.StickyKeys.merge(p.keys); Object.keys(p).forEach(k => { if (k !== 'keys') set[k] = p[k]; }); return over.settingsGet(); },
    openAll: async () => { S.calls.push(['openAll']); },
    onSnapHint: cb => { L.snapHint = cb; }, snapHintAnswer: async o => { S.calls.push(['snapHintAnswer', o]); return true; },
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
