const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, globalShortcut, clipboard, safeStorage, shell, dialog, Notification, net, nativeTheme } = require('electron');
const NT = nativeTheme || { shouldUseDarkColors: false, themeSource: 'system', on() {} };   // light/dark of Windows (and of our own windows)
const ai = require('./ai');
const ollama = require('./ollama');
const datadir = require('./datadir');
const updaterLib = require('./updater');
const backup = require('./backup');
const reminders = require('./reminders');
const history = require('./history');
const convert = require('./convert');
const THEMES = require('./themes');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const launchcfg = require('./launchcfg');
const KEYS = require('./keys');
const links = require('./links');
const notesearch = require('./notesearch');
const importers = require('./importers');
const placement = require('./placement');
const changelog = require('./changelog');

// A second launch must stop immediately (otherwise it would open duplicate notes).
// Right after an update the installer starts the new copy while the old one may still be closing: wait for it (up to 15 s)
// instead of giving up, or the app would vanish after "Restart to update". Any other second launch stops at once.
function takeLock() {
  if (app.requestSingleInstanceLock()) return true;
  if (!process.argv.includes('--updated')) return false;
  const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  for (let i = 0; i < 60; i++) { sleep(250); if (app.requestSingleInstanceLock()) return true; }
  return false;
}
if (!takeLock()) process.exit(0);
let quitting = false, remTimer = null;
// Anything that goes wrong in the main process is written to crash.log (Windows would show a "JavaScript error" box otherwise);
// while the app is closing for an update it is only logged.
function crashLog(kind, err) {
  try {
    const f = path.join(app.getPath('userData'), 'crash.log');
    let old = ''; try { old = fs.readFileSync(f, 'utf8').slice(-6000); } catch {}
    fs.writeFileSync(f, old + new Date().toISOString() + '  v' + app.getVersion() + '  ' + kind + '  ' + String((err && (err.stack || err.message)) || err).slice(0, 1500) + '\n');
  } catch {}
}
process.on('uncaughtException', err => { crashLog('uncaughtException' + (quitting ? ' (closing)' : ''), err); });
process.on('unhandledRejection', err => { crashLog('unhandledRejection', err); });
app.setAppUserModelId('com.stickypad.app');   // Windows shows this app as "StickyPad" on notifications (matches build.appId)

// Memory-saving start-up options (they must be set before the app is ready). See Settings > General > Low memory mode.
const LAUNCH = launchcfg.read(app.getPath('userData'));
const GPU_OK = !LAUNCH.lowMemory;   // a see-through background with solid text needs a see-through window, which only draws reliably with the GPU on (Low memory mode off)
{
  const plan = launchcfg.plan(LAUNCH);
  if (plan.disableGpu) app.disableHardwareAcceleration();
  plan.switches.forEach(([k, v]) => { if (v === undefined) app.commandLine.appendSwitch(k); else app.commandLine.appendSwitch(k, v); });
}

const DAY = 864e5, MAX_BLOCKS = 50000, MAX_TEXT = 5000000;   // generous limits: a long note must never lose its last lines
const MIN_W = 260, MIN_H = 180, ROLL_H = 40, SNAP = 10, GAP = 4;
const IMG_ID = /^[a-z0-9]{6,40}\.(png|jpe?g|webp|gif)$/;
let file, saveTimer, allTimer, firstRun = false, DATA = null, dirty = false, lastMtime = 0;
const dataDir = () => DATA || app.getPath('userData');
const DEFAULT_SETTINGS = {
  hideTaskbar: true, snap: true, launch: 'notes', splash: true, name: '', lang: 'en', theme: 'classic',
  snapDistance: 10, defaultSize: 16, trashDays: 30, shortcuts: true, keys: {}, chatHistory: true, autoBackup: true, lastBackup: 0, autoUpdate: true, whatsNew: true, seenVersion: '',
  ai: { provider: 'off', model: '', url: 'http://localhost:11434', keyEnc: '', keepAlive: '5m' }
};
let notes = {}, trash = [], groups = [], settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
let allWin = null, settingsWin = null, tray = null, splashWin = null, whatsWin = null, whatsFrom = null, whatsMax = 3, memKey = null, chatWin = null, chatState = null;
const chatJobs = new Map();
const wins = new Map();       // noteId -> BrowserWindow
const byContents = new Map(); // webContents.id -> noteId
const sessions = new Map();   // noteId -> { key } while a locked note is unlocked
const preload = path.join(__dirname, 'preload.js');
const iconPath = path.join(__dirname, 'icon.png');
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const newNote = (over = {}) => ({
  id: rid(), updated: Date.now(), title: '', group: null, rolled: false, text: '', blocks: [],
  color: THEMES.palette(settings.theme, uiDark())[0], font: THEMES.byId(settings.theme).font, size: settings.defaultSize || 16, pinned: false, bounds: { width: 300, height: 320 }, ...over
});

/* ---------- note content helpers ---------- */
const blocksOf = n => Array.isArray(n.blocks) ? n.blocks : (n.text ? [{ t: 'text', v: String(n.text) }] : []);
const imgIds = n => (n.lock && !sessions.has(n.id)) ? (n.lock.imgs || []) : blocksOf(n).filter(b => b.t === 'img').map(b => b.id);
const hasContent = n => !!n.lock || String(n.title || '').trim() !== '' || String(n.text || '').trim() !== '' || imgIds(n).length > 0;
const textOf = bs => bs.map(b => b.t === 'text' ? b.v : b.t === 'check' ? (b.done ? '☑ ' : '☐ ') + b.v : '').filter(s => s !== '').join('\n').slice(0, MAX_TEXT);
function sanitizeBlocks(arr) {
  const out = [];
  for (const b of (Array.isArray(arr) ? arr : []).slice(0, MAX_BLOCKS)) {
    if (!b) continue;
    if (b.t === 'text' && typeof b.v === 'string' && b.v !== '') out.push({ t: 'text', v: b.v.slice(0, MAX_TEXT) });
    else if (b.t === 'check' && typeof b.v === 'string' && b.v.trim() !== '') out.push({ t: 'check', v: b.v.slice(0, 20000), done: !!b.done });   // empty items are dropped
    else if (b.t === 'img' && typeof b.id === 'string' && IMG_ID.test(b.id)) out.push({ t: 'img', id: b.id });
  }
  return out;
}

/* ---------- locking (AES-256-GCM, key from password via scrypt) ---------- */
const deriveKey = (pw, saltB64) => crypto.scryptSync(String(pw), Buffer.from(saltB64, 'base64'), 32);
function encryptBlob(obj, key, salt) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return { salt, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') };
}
function decryptBlob(b, key) {
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(b.iv, 'base64'));
    d.setAuthTag(Buffer.from(b.tag, 'base64'));
    return JSON.parse(Buffer.concat([d.update(Buffer.from(b.data, 'base64')), d.final()]).toString('utf8'));
  } catch { return null; }
}
// The form of a note that is written to disk: locked notes never contain their content in plain text.
function packNote(n) {
  if (!n.lock) return n;
  const s = sessions.get(n.id);
  if (!s) return { ...n, blocks: [], text: '' };
  const bs = blocksOf(n);
  const blob = { ...encryptBlob({ blocks: bs }, s.key, n.lock.salt), imgs: bs.filter(b => b.t === 'img').map(b => b.id) };
  return { ...n, blocks: [], text: '', lock: blob };
}
function relock(n) {
  if (n && n.lock && sessions.has(n.id)) { n.lock = packNote(n).lock; sessions.delete(n.id); n.blocks = []; n.text = ''; save(); }
}

/* ---------- picture files (kept outside notes.json so it stays small) ---------- */
const imgDir = () => path.join(dataDir(), 'images');
// Pictures are shown straight from their files: nothing big is read into memory, sent between processes or kept as text.
function readImg(id) {
  if (!IMG_ID.test(id)) return null;
  const f = path.join(imgDir(), id);
  return fs.existsSync(f) ? pathToFileURL(f).href : null;
}
const imgBase = () => pathToFileURL(imgDir() + path.sep).href;
const dropImages = n => imgIds(n).forEach(id => { if (IMG_ID.test(id)) try { fs.unlinkSync(path.join(imgDir(), id)); } catch {} });
function sweepImages() {   // delete picture files no note or trash item uses any more
  const used = new Set();
  Object.values(notes).concat(trash).forEach(n => imgIds(n).forEach(i => used.add(i)));
  try { history.pictureIds(dataDir()).forEach(i => used.add(i)); } catch {}   // older copies of a note may still show these pictures
  try { for (const f of fs.readdirSync(imgDir())) if (!used.has(f)) try { fs.unlinkSync(path.join(imgDir(), f)); } catch {} } catch {}
}

/* ---------- storage ---------- */
function serialize() {
  const ns = {}; for (const k of Object.keys(notes)) ns[k] = packNote(notes[k]);
  return JSON.stringify({ version: 2, notes: ns, trash: trash.map(packNote), groups, settings });   // compact: a big note is not padded with indentation
}
function load() {
  firstRun = !fs.existsSync(file);
  try {
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (d && d.version === 2) {
      notes = d.notes || {}; trash = d.trash || []; groups = Array.isArray(d.groups) ? d.groups : [];
      const ds = d.settings || {};
      settings = { ...DEFAULT_SETTINGS, ...ds, ai: { ...DEFAULT_SETTINGS.ai, ...(ds.ai || {}) } };
    } else { notes = d || {}; trash = []; }
  } catch { notes = {}; trash = []; }
  trash = trash.filter(t => t && Date.now() - t.deletedAt < settings.trashDays * DAY);
  // Clean out empty checklist items that older versions saved (they used to show up as stray tick boxes).
  Object.values(notes).concat(trash).forEach(n => {
    if (!n.lock && Array.isArray(n.blocks)) { n.blocks = sanitizeBlocks(n.blocks); n.text = textOf(n.blocks); }
  });
  // Empty notes are never kept between launches (notes with a topic, text, pictures or a lock always are).
  Object.keys(notes).forEach(k => { if (!hasContent(notes[k])) delete notes[k]; });
  const gids = new Set(groups.map(g => g.id));
  Object.values(notes).concat(trash).forEach(n => { if (n.group && !gids.has(n.group)) n.group = null; });
}
const flush = () => {
  clearTimeout(saveTimer); if (!file) return;
  try {
    const m = datadir.mtimeOf(file);
    // another PC (or program) changed the file since we last read or wrote it: keep its version in /conflicts before we replace it
    if (lastMtime && m && m !== lastMtime) { try { datadir.keepConflict(dataDir(), fs.readFileSync(file, 'utf8')); } catch {} }
    datadir.writeAtomic(file, serialize()); lastMtime = datadir.mtimeOf(file); dirty = false;
  } catch {}
};
function save() { dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(flush, 300); pingAll(); }

// Picks up changes made by another device through a synced data folder (OneDrive, Dropbox, Syncthing...).
function reloadFromDisk() {
  const mine = settings;                 // settings stay per-PC (shortcuts, AI key, startup...)
  load(); settings = mine;
  wins.forEach((w, id) => {
    if (w.isDestroyed()) return;
    if (notes[id]) w.webContents.send('note:reload'); else w.close();
  });
  pingAll(); refreshTray();
}
function watchData() {
  fs.watchFile(file, { interval: 3000 }, () => {
    const m = datadir.mtimeOf(file);
    if (!m || m === lastMtime || dirty) return;   // our own write, or we have unsaved changes (those win; the other version is kept in /conflicts)
    lastMtime = m; reloadFromDisk();
  });
}

/* ---------- snapping and tidying ---------- */
function pick(cur, cands) {
  const S = settings.snapDistance || SNAP;
  let best = cur, d = S + 1;
  for (const c of cands) { const k = Math.abs(c - cur); if (k < d) { d = k; best = c; } }
  return d <= S ? best : cur;
}
// Called once, after you let go of a note. Snaps to screen edges and to notes that are already close by.
function snapPos(w, nb) {
  const wa = screen.getDisplayMatching(nb).workArea, NEAR = 40;
  const xc = [wa.x, wa.x + wa.width - nb.width], yc = [wa.y, wa.y + wa.height - nb.height];
  for (const o of wins.values()) {
    if (o === w || o.isDestroyed() || !o.isVisible()) continue;
    const b = o.getBounds();
    const nearY = nb.y < b.y + b.height + NEAR && nb.y + nb.height > b.y - NEAR;
    const nearX = nb.x < b.x + b.width + NEAR && nb.x + nb.width > b.x - NEAR;
    if (nearY) xc.push(b.x + b.width + GAP, b.x - nb.width - GAP, b.x, b.x + b.width - nb.width);
    if (nearX) yc.push(b.y + b.height + GAP, b.y - nb.height - GAP, b.y, b.y + b.height - nb.height);
  }
  return { x: pick(nb.x, xc), y: pick(nb.y, yc) };
}
function tidy() {   // lay open notes out in rows, folder by folder
  const wa = screen.getPrimaryDisplay().workArea, gap = 8;
  const rank = n => { const i = groups.findIndex(g => g.id === n.group); return i < 0 ? 9999 : i; };
  const list = Object.values(notes).filter(n => { const w = wins.get(n.id); return w && !w.isDestroyed(); })
    .sort((a, b) => rank(a) - rank(b) || (a.id < b.id ? -1 : 1));
  let x = wa.x + gap, y = wa.y + gap, rowH = 0, prev;
  for (const n of list) {
    const w = wins.get(n.id), b = w.getBounds();
    if (prev !== undefined && (n.group || null) !== prev) { x = wa.x + gap; y += rowH + gap; rowH = 0; }
    if (x > wa.x + gap && x + b.width > wa.x + wa.width - gap) { x = wa.x + gap; y += rowH + gap; rowH = 0; }
    w.setBounds({ x, y, width: b.width, height: b.height });
    x += b.width + gap; rowH = Math.max(rowH, b.height); prev = n.group || null;
    if (w.isMinimized()) w.restore();
  }
}

/* ---------- windows ---------- */
const panelGrow = new Map();   // noteId -> the size it had before the settings panel made it wider
const relocated = new Set();   // notes shown somewhere else for now because their screen is not connected
const displayList = () => screen.getAllDisplays().map(d => ({ id: d.id, bounds: d.bounds, workArea: d.workArea }));
// A screen was plugged in or out: bring stranded notes to the main screen, and send them back when their screen returns.
function onScreensChanged() {
  const ds = displayList(), prim = screen.getPrimaryDisplay().id;
  wins.forEach((w, id) => {
    const n = notes[id]; if (!n || w.isDestroyed()) return;
    if (relocated.has(id)) {
      const back = placement.comeHome(n.home, n.bounds, ds);
      if (back) { relocated.delete(id); w.setBounds({ ...back, height: n.rolled ? ROLL_H : back.height }); }
      return;
    }
    const r = placement.place(w.getBounds(), n.home, ds, prim);
    if (r.moved) { relocated.add(id); w.setBounds(r.bounds); }
  });
}
function openNote(n) {
  const solid = GPU_OK && !!n.solidText;   // only notes that ask for it get a see-through window (the rest stay as safe as before)
  const existing = wins.get(n.id);
  if (existing && !existing.isDestroyed()) { existing.show(); return existing; }
  let b = { ...n.bounds }; if (n.rolled) b.height = ROLL_H;
  if (Number.isFinite(b.x) && Number.isFinite(b.y)) {   // a screen that is gone (or a note off screen) brings the note to a screen you can see
    const pl = placement.place(b, n.home, displayList(), screen.getPrimaryDisplay().id);
    if (pl.moved) { b = pl.bounds; relocated.add(n.id); } else relocated.delete(n.id);
  }
  const w = new BrowserWindow({
    ...b, minWidth: MIN_W, minHeight: n.rolled ? ROLL_H : MIN_H, frame: false, show: false, icon: iconPath,
    maximizable: false, fullscreenable: false, skipTaskbar: !!settings.hideTaskbar, backgroundColor: solid ? '#00000000' : n.color, transparent: solid,
    webPreferences: { preload, contextIsolation: true, nodeIntegration: false }
  });
  if (n.rolled) w.setMaximumSize(10000, ROLL_H);
  if (!solid && Number.isFinite(n.opacity) && n.opacity < 1) { try { w.setOpacity(Math.min(1, Math.max(0.3, n.opacity))); } catch {} }   // whole note fades
  seeThrough.set(n.id, solid);
  wins.set(n.id, w); byContents.set(w.webContents.id, n.id);
  if (n.pinned) w.setAlwaysOnTop(true, 'screen-saver');
  w.loadFile('note.html', { query: { id: n.id } });
  w.once('ready-to-show', () => { w.show(); pingAll(); });
  const keep = (byHand) => {
    const m = notes[n.id]; if (!m || w.isDestroyed()) return;
    const ds = displayList();
    if (byHand === true) { relocated.delete(n.id); panelGrow.delete(n.id); }
    else if (panelGrow.has(n.id)) return;   // wider only because the settings panel is open: the real size is kept
    else if (relocated.has(n.id) || (m.home && !ds.some(d => d.id === m.home.id))) { relocated.add(n.id); return; }   // its screen is gone: where it sits now is temporary, so the real place is kept
    const nb = w.getBounds(), d = placement.displayOf(nb, ds);
    m.bounds = m.rolled ? { ...m.bounds, x: nb.x, y: nb.y, width: nb.width } : nb;   // a rolled-up note remembers its full height
    if (d) m.home = { id: d.id, bounds: d.bounds };                                     // and which screen it was on
    save();
  };
  w.on('move', () => keep()); w.on('resize', () => keep());
  w.on('resized', () => keep(true));
  w.on('moved', () => {   // fires once when you release the note, so nothing tugs at it while you drag
    keep(true);
    if (!settings.snap || w.isDestroyed()) return;
    const nb = w.getBounds(), p = snapPos(w, nb);
    if (p.x !== nb.x || p.y !== nb.y) w.setPosition(p.x, p.y);
  });
  w.on('focus', () => { if (!w.isDestroyed()) w.webContents.focus(); });
  const cid = w.webContents.id;
  w.on('closed', () => { panelGrow.delete(n.id); wins.delete(n.id); byContents.delete(cid); if (!reopening.has(n.id)) relock(notes[n.id]); pingAll(); });
  return w;
}

const seeThrough = new Map(), reopening = new Set();   // noteId -> its window is a see-through one; ids being reopened
function reopenNote(id) {
  const w = wins.get(id), n = notes[id]; if (!w || !n || w.isDestroyed()) return;
  reopening.add(id);
  try { w.destroy(); } catch {}
  reopening.delete(id); openNote(n);
}
function makeNote(near, over) {
  const k = Object.keys(notes).length % 8;
  const b = near && !near.isDestroyed() ? near.getBounds() : { x: 80 + k * 28, y: 80 + k * 28, width: 300, height: 320 };
  const n = newNote({ bounds: { x: near ? b.x + 32 : b.x, y: near ? b.y + 32 : b.y, width: b.width, height: b.height }, ...(over || {}) });
  notes[n.id] = n; openNote(n); save(); return n;
}

function showAll() {   // brings every note to the front, reopening any that were closed
  Object.values(notes).forEach(n => {
    const w = wins.get(n.id);
    if (w && !w.isDestroyed()) { if (w.isMinimized()) w.restore(); w.show(); } else openNote(n);
  });
  if (!Object.keys(notes).length) makeNote(null);
}

function utilWindow(ref, title, htmlFile, w, h, query) {
  if (ref && !ref.isDestroyed()) { ref.show(); ref.focus(); ref.webContents.focus(); return ref; }
  const win = new BrowserWindow({
    width: w, height: h, minWidth: 320, minHeight: 300, title, autoHideMenuBar: true, icon: iconPath, show: false,
    webPreferences: { preload, contextIsolation: true, nodeIntegration: false }
  });
  win.setMenu(null); win.loadFile(htmlFile, query ? { query } : undefined);
  win.once('ready-to-show', () => { win.show(); win.focus(); win.webContents.focus(); });
  win.on('focus', () => { if (!win.isDestroyed()) win.webContents.focus(); });   // makes sure text boxes receive typing
  return win;
}
/* One "Home" window holds All notes, Trash, the AI chat and Settings, switched from a sidebar (home.js). It is one window that loads one page at a time. */
const HOME_PAGES = { notes: 'all.html', trash: 'all.html', chat: 'chat.html', settings: 'settings.html' };
let homeWin = null, homePage = '';
function syncHome() {   // allWin / chatWin / settingsWin point at the Home window only while their page is the one showing
  const ok = !!homeWin && !homeWin.isDestroyed();
  allWin = ok && homePage === 'all.html' ? homeWin : null;
  chatWin = ok && homePage === 'chat.html' ? homeWin : null;
  settingsWin = ok && homePage === 'settings.html' ? homeWin : null;
}
function openHome(section, arg) {
  if (!HOME_PAGES[section]) section = 'notes';
  const file = HOME_PAGES[section];
  const query = section === 'trash' ? { tab: 'trash' } : section === 'settings' && arg ? { section: String(arg) } : section === 'chat' && arg ? { note: String(arg) } : undefined;
  if (homeWin && !homeWin.isDestroyed()) {
    homeWin.show(); homeWin.focus();
    if (homePage === file) {   // already showing that page: just tell it what to show
      const wc = homeWin.webContents;
      if (file === 'all.html') wc.send('all:tab', section); else if (section === 'chat' && arg) wc.send('chat:attach', arg); else if (section === 'settings' && arg) wc.send('settings:section', arg);
      wc.focus(); return;
    }
    if (homePage === 'chat.html') { chatJobs.forEach(a => a.abort()); chatJobs.clear(); }
    homePage = file; syncHome(); homeWin.loadFile(file, query ? { query } : undefined); return;
  }
  homePage = file;
  homeWin = utilWindow(null, 'StickyPad', file, 980, 680, query);
  homeWin.setMinimumSize(800, 520);
  syncHome();
  homeWin.on('closed', () => { chatJobs.forEach(a => a.abort()); chatJobs.clear(); homeWin = null; homePage = ''; syncHome(); });
}
function openAll(tab) { openHome(tab === 'trash' ? 'trash' : 'notes'); }
const openTrash = () => openAll('trash');
const pingAll = () => {
  clearTimeout(allTimer);
  allTimer = setTimeout(() => { if (allWin && !allWin.isDestroyed()) allWin.webContents.send('all:changed'); }, 150);
};
const pingTrash = () => { pingAll(); refreshTray(); };

/* ---------- greeting, preferences and the startup splash ---------- */
function greetingParts() {
  const h = new Date().getHours(), el = settings.lang === 'el';
  let g, e;
  if (h >= 5 && h < 12) { g = el ? 'Καλημέρα' : 'Good morning'; e = '☀️'; }
  else if (h >= 12 && h < 17) { g = el ? 'Καλό απόγευμα' : 'Good afternoon'; e = '🌤️'; }
  else if (h >= 17 && h < 22) { g = el ? 'Καλησπέρα' : 'Good evening'; e = '🌆'; }
  else { g = el ? 'Καληνύχτα' : 'Good night'; e = '🌙'; }
  const n = String(settings.name || '').trim();
  return { text: n ? `${g}, ${n}` : g, emoji: e };
}
const prefs = () => ({ name: settings.name, lang: settings.lang, launch: settings.launch, splash: settings.splash });
function setPrefs(p) {
  if (p) {
    if (typeof p.name === 'string') settings.name = p.name.trim().slice(0, 30);
    if (p.lang === 'en' || p.lang === 'el') settings.lang = p.lang;
    if (['notes', 'all', 'both'].includes(p.launch)) settings.launch = p.launch;
    if (typeof p.splash === 'boolean') settings.splash = p.splash;
    save(); refreshTray();
  }
  return prefs();
}
function showSplash() {
  return new Promise(resolve => {
    let done = false;
    const finish = () => { if (done) return; done = true; try { if (splashWin && !splashWin.isDestroyed()) splashWin.close(); } catch {} splashWin = null; resolve(); };
    try {
      const g = greetingParts();
      splashWin = new BrowserWindow({
        // Not transparent: transparent windows do not draw on many PCs when the GPU is off (Low memory mode, the default),
        // and then the splash never showed. A plain window with a dark card that fills it works everywhere.
        width: 340, height: 220, frame: false, transparent: false, backgroundColor: '#161b29', resizable: false, movable: false, alwaysOnTop: true,
        skipTaskbar: true, show: false, hasShadow: true, focusable: false, icon: iconPath,
        webPreferences: { contextIsolation: true, nodeIntegration: false }
      });
      splashWin.setMenu(null);
      splashWin.loadFile('splash.html', { query: { g: g.text, e: g.emoji } });
      // The 2.7 s of animation are counted from the moment the window is really shown (on a slow start, loading can take
      // seconds and used to eat the whole time, so the splash flashed and vanished). A stuck splash can never block the app:
      // 4 s if it never appears (the app must not wait for nothing), 5 s at most once it is on screen.
      splashWin.once('ready-to-show', () => { if (done) return; splashWin.showInactive(); setTimeout(finish, 2700); setTimeout(finish, 5000); });
      splashWin.on('closed', finish);
      splashWin.webContents.on('did-fail-load', () => finish());
      splashWin.webContents.on('render-process-gone', () => finish());
      setTimeout(() => { if (!splashWin || splashWin.isDestroyed() || !splashWin.isVisible()) finish(); }, 4000);
    } catch { finish(); }
  });
}
/* ---------- "What's new": shown once on the first start after an update ---------- */
function whatsNewData(from) {
  let md = ''; try { md = fs.readFileSync(path.join(__dirname, 'CHANGELOG.md'), 'utf8'); } catch {}
  return { version: app.getVersion(), sections: changelog.since(changelog.parse(md), from || null, app.getVersion(), from ? 12 : whatsMax), off: settings.whatsNew === false };
}
function openWhatsNew(from, max) {
  whatsFrom = from || null; whatsMax = max || 3;
  whatsWin = utilWindow(whatsWin, "What's new in StickyPad", 'whatsnew.html', 540, 620);
  whatsWin.setMinimumSize(380, 360);
  whatsWin.on('closed', () => { whatsWin = null; });
}
function maybeWhatsNew() {
  const cur = app.getVersion(), seen = String(settings.seenVersion || '');
  if (seen === cur) return;
  settings.seenVersion = cur; save();
  if (firstRun || settings.whatsNew === false) return;                 // a brand-new install has nothing to compare with
  if (seen && changelog.cmp(cur, seen) <= 0) return;                   // went back to an older version: nothing new
  setTimeout(() => { try { openWhatsNew(seen || null, 6); } catch {} }, 900);
}
function openStartup() {
  const mode = settings.launch, any = Object.keys(notes).length > 0;
  // opened one after another (not all in the same instant) so start-up stays smooth and memory does not spike
  if (mode !== 'all' || !any) Object.values(notes).forEach((n, i) => setTimeout(() => { if (notes[n.id]) openNote(n); }, i * 60));
  if (mode === 'all' || mode === 'both') openAll();
}

/* ---------- settings ---------- */
function setHide(v) {
  settings.hideTaskbar = !!v;
  wins.forEach(w => { if (!w.isDestroyed()) w.setSkipTaskbar(settings.hideTaskbar); });
  save(); refreshTray(); return settings.hideTaskbar;
}
function setSnap(v) { settings.snap = !!v; save(); refreshTray(); return settings.snap; }
const startupOn = () => app.isPackaged && app.getLoginItemSettings().openAtLogin;
function setStartup(v) {
  if (!app.isPackaged) return false;
  app.setLoginItemSettings({ openAtLogin: !!v }); refreshTray(); return startupOn();
}

/* ---------- tray ---------- */
function buildMenu() {
  const launch = (label, v) => ({ label, type: 'radio', checked: settings.launch === v, click: () => setPrefs({ launch: v }) });
  return Menu.buildFromTemplate([
    { label: 'All notes…  (Ctrl+Alt+A)', click: () => openAll() },
    { label: 'Settings…  (Ctrl+Alt+S)', click: () => openSettings() },
    { label: 'AI chat…  (Ctrl+Alt+C)', click: () => openChat() },
    { label: 'New note  (Ctrl+Alt+N)', click: () => makeNote(null) },
    { label: 'Show all notes', click: showAll },
    { label: 'Tidy up notes', click: tidy },
    { label: `Trash (${trash.length})`, click: () => openAll('trash') },
    { type: 'separator' },
    { label: 'When StickyPad starts', submenu: [launch('Open my notes', 'notes'), launch('Open the All notes window', 'all'), launch('Open both', 'both')] },
    { label: 'Startup animation', type: 'checkbox', checked: !!settings.splash, click: i => setPrefs({ splash: i.checked }) },
    { label: 'Hide from taskbar', type: 'checkbox', checked: !!settings.hideTaskbar, click: i => setHide(i.checked) },
    { label: 'Snap notes to edges and each other', type: 'checkbox', checked: !!settings.snap, click: i => setSnap(i.checked) },
    { label: 'Start with Windows', type: 'checkbox', checked: startupOn(), enabled: app.isPackaged, click: i => setStartup(i.checked) },
    { type: 'separator' },
    { label: 'Quit StickyPad', click: () => app.quit() }
  ]);
}
function refreshTray() { if (tray) tray.setContextMenu(buildMenu()); }
function createTray() {
  try {
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'tray.png')));
    tray.setToolTip('StickyPad'); tray.on('click', () => openAll()); refreshTray();
  } catch { tray = null; }
}

/* ---------- IPC: notes ---------- */
const idOf = e => byContents.get(e.sender.id);
const winOf = e => wins.get(idOf(e));
const canEditBody = n => !n.lock || sessions.has(n.id);

ipcMain.handle('note:get', e => {
  const n = notes[idOf(e)]; if (!n) return null;
  const { lock, ...rest } = n;
  const bs = canEditBody(n) ? blocksOf(n).map(b => b.t === 'img' ? { t: 'img', id: b.id, src: readImg(b.id) } : b).filter(b => b.t !== 'img' || b.src) : [];
  return { ...rest, solidOk: GPU_OK, blocks: bs, locked: !!lock, unlocked: sessions.has(n.id), imgBase: imgBase(), keys: curKeys(), suggestDates: settings.suggestDates !== false };
});

/* ---------- export and import (Markdown / plain text files) ---------- */
const noteBlocks = n => blocksOf(n);
const isOpen = n => !n.lock || sessions.has(n.id);
ipcMain.handle('note:export', async e => {
  const n = notes[idOf(e)]; if (!n) return { ok: false };
  if (!isOpen(n)) return { ok: false, error: 'Unlock the note first.' };
  const w = winOf(e);
  const r = await dialog.showSaveDialog(w && !w.isDestroyed() ? w : undefined, {
    title: 'Export this note', defaultPath: path.join(app.getPath('documents'), convert.slug(n.title) + '.md'),
    filters: [{ name: 'Markdown', extensions: ['md'] }, { name: 'Plain text', extensions: ['txt'] }]
  });
  if (r.canceled || !r.filePath) return { ok: false, cancelled: true };
  const txt = /\.txt$/i.test(r.filePath) ? convert.toText(n.title, noteBlocks(n)) : convert.toMarkdown(n.title, noteBlocks(n));
  fs.writeFileSync(r.filePath, txt, 'utf8');
  return { ok: true, file: r.filePath, pics: noteBlocks(n).filter(b => b.t === 'img').length };
});
function exportAll(parent) {
  const r = dialog.showOpenDialogSync(parent || undefined, { title: 'Choose a folder for the exported notes', properties: ['openDirectory', 'createDirectory'], defaultPath: app.getPath('documents') });
  if (!r || !r[0]) return { ok: false, cancelled: true };
  const root = path.join(r[0], 'StickyPad notes ' + new Date().toISOString().slice(0, 10));
  fs.mkdirSync(root, { recursive: true });
  const gname = id => (groups.find(g => g.id === id) || {}).name || '';
  const open = Object.values(notes).filter(isOpen), skipped = Object.keys(notes).length - open.length;
  const byDir = new Map();
  open.forEach(n => { const d = n.group && gname(n.group) ? convert.slug(gname(n.group), 'Folder') : ''; if (!byDir.has(d)) byDir.set(d, []); byDir.get(d).push(n); });
  byDir.forEach((list, d) => {
    const dir = path.join(root, d); fs.mkdirSync(dir, { recursive: true });
    const names = convert.uniqueNames(list.map(n => n.title || textOf(noteBlocks(n)).split('\n').find(x => x.trim()) || ''), '.md');
    list.forEach((n, i) => fs.writeFileSync(path.join(dir, names[i]), convert.toMarkdown(n.title, noteBlocks(n)), 'utf8'));
  });
  shell.openPath(root);
  return { ok: true, count: open.length, skipped, dir: root };
}
function importNotes(parent) {
  const r = dialog.showOpenDialogSync(parent || undefined, { title: 'Choose Markdown or text files to import', properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Markdown and text', extensions: ['md', 'markdown', 'txt'] }], defaultPath: app.getPath('documents') });
  if (!r || !r.length) return { ok: false, cancelled: true };
  let count = 0, failed = 0;
  r.forEach((f, i) => {
    try {
      if (fs.statSync(f).size > MAX_TEXT) { failed++; return; }
      const c = convert.fromMarkdown(fs.readFileSync(f, 'utf8'), f);
      const blocks = sanitizeBlocks(c.blocks);
      const k = (Object.keys(notes).length + i) % 8;
      const n = newNote({ title: c.title, blocks, text: textOf(blocks), bounds: { x: 80 + k * 28, y: 80 + k * 28, width: 300, height: 320 } });
      notes[n.id] = n; count++;
      if (count <= 5) openNote(n);   // a big import does not flood the screen: the rest are in All notes
    } catch { failed++; }
  });
  save(); return { ok: count > 0, count, failed };
}

// Notes from other apps: Google Keep (Takeout .json files or a folder) and Windows Sticky Notes (plum.sqlite).
function groupByName(name) {
  name = String(name || '').trim().slice(0, 40); if (!name) return null;
  const g = groups.find(x => x.name.toLowerCase() === name.toLowerCase()); if (g) return g.id;
  const ng = { id: rid(), name, collapsed: false }; groups.push(ng); return ng.id;
}
function jsonFilesIn(p, out = [], depth = 0) {
  let st; try { st = fs.statSync(p); } catch { return out; }
  if (st.isFile()) { if (/\.json$/i.test(p)) out.push(p); }
  else if (st.isDirectory() && depth < 4) { for (const f of fs.readdirSync(p)) if (out.length < 20000) jsonFilesIn(path.join(p, f), out, depth + 1); }
  return out;
}
function addImported(list) {
  let count = 0;
  list.forEach((c, i) => {
    const blocks = sanitizeBlocks(c.blocks); if (!blocks.length && !c.title) return;
    const k = (Object.keys(notes).length + i) % 8;
    const n = newNote({ title: String(c.title || '').slice(0, 60), blocks, text: textOf(blocks), color: c.color || undefined, group: groupByName(c.folder),
      bounds: { x: 80 + k * 28, y: 80 + k * 28, width: 300, height: 320 } });
    if (c.updated) n.updated = c.updated;
    notes[n.id] = n; count++;
    if (count <= 5) openNote(n);   // a big import does not flood the screen: the rest are in All notes
  });
  save(); return count;
}
function importOther(parent, kind) {
  try {
    if (kind === 'keep') {
      const r = dialog.showOpenDialogSync(parent || undefined, { title: 'Choose your Google Keep files (the .json files, or the Keep folder from Google Takeout)', properties: ['openFile', 'openDirectory', 'multiSelections'],
        filters: [{ name: 'Google Keep notes (.json)', extensions: ['json'] }], defaultPath: app.getPath('downloads') });
      if (!r || !r.length) return { ok: false, cancelled: true };
      const files = r.flatMap(p => jsonFilesIn(p)); const list = []; let failed = 0, skipped = 0;
      for (const f of files) {
        try { if (fs.statSync(f).size > MAX_TEXT) { failed++; continue; } const c = importers.fromKeep(fs.readFileSync(f, 'utf8')); if (!c) continue; if (c.skipped) { skipped++; continue; } list.push(c); } catch { failed++; }
      }
      if (!list.length) return { ok: false, error: files.length ? 'No Google Keep notes were found in those files.' : 'No .json files were found there.', skipped };
      return { ok: true, count: addImported(list), failed, skipped };
    }
    if (kind === 'sticky') {
      const def = path.join(process.env.LOCALAPPDATA || '', 'Packages', 'Microsoft.MicrosoftStickyNotes_8wekyb3d8bbwe', 'LocalState', 'plum.sqlite');
      let f = fs.existsSync(def) ? def : null;
      if (!f) {
        const r = dialog.showOpenDialogSync(parent || undefined, { title: 'Choose plum.sqlite (Windows Sticky Notes keeps it in %LocalAppData%\\Packages\\Microsoft.MicrosoftStickyNotes_8wekyb3d8bbwe\\LocalState)',
          properties: ['openFile'], filters: [{ name: 'Sticky Notes database', extensions: ['sqlite'] }], defaultPath: process.env.LOCALAPPDATA || app.getPath('home') });
        if (!r || !r[0]) return { ok: false, cancelled: true };
        f = r[0];
      }
      const wal = fs.existsSync(f + '-wal') ? fs.readFileSync(f + '-wal') : null;
      const list = importers.fromStickyNotes(fs.readFileSync(f), wal);
      if (!list.length) return { ok: false, error: 'No notes were found in Windows Sticky Notes.' };
      return { ok: true, count: addImported(list), failed: 0, skipped: 0 };
    }
    return { ok: false, error: 'Unknown app.' };
  } catch (err) { return { ok: false, error: 'Could not read that file: ' + (err && err.message ? err.message : err) }; }
}

/* ---------- version history (older copies of a note) ---------- */
const histT = new Map();   // noteId -> time of the newest kept copy
function keepHistory(n, prev, next) {
  if (n.lock) return;       // a locked note never leaves plain-text copies behind
  try {
    const now = Date.now();
    if (!histT.has(n.id)) histT.set(n.id, history.lastTime(dataDir(), n.id));
    if (history.shouldKeep(prev, next, histT.get(n.id), now) && history.add(dataDir(), n.id, { title: n.title, blocks: prev }, now)) histT.set(n.id, now);
  } catch {}
}
function dropHistory(id) { histT.delete(id); try { history.remove(dataDir(), id); } catch {} }
function sweepHistory() {
  try { history.ids(dataDir()).forEach(id => { if (!notes[id] && !trash.some(t => t.id === id)) dropHistory(id); }); } catch {}
}
ipcMain.handle('hist:list', e => {
  const n = notes[idOf(e)]; if (!n) return { locked: false, items: [] };
  if (n.lock) return { locked: true, items: [] };
  return { locked: false, items: history.list(dataDir(), n.id) };
});
ipcMain.handle('hist:restore', (e, t) => {
  const n = notes[idOf(e)]; if (!n || n.lock || !canEditBody(n)) return false;
  const v = history.get(dataDir(), n.id, t); if (!v) return false;
  const now = Date.now();
  try { if (history.add(dataDir(), n.id, { title: n.title, blocks: blocksOf(n) }, now)) histT.set(n.id, now); } catch {}   // today's version stays available too
  n.blocks = sanitizeBlocks(v.blocks).filter(b => b.t !== 'img' || fs.existsSync(path.join(imgDir(), b.id)));
  n.text = textOf(n.blocks); n.updated = now; save(); return true;
});

ipcMain.handle('note:update', (e, p) => {
  const n = notes[idOf(e)]; if (!n || !p) return;
  if (Array.isArray(p.blocks) && canEditBody(n)) { const next = sanitizeBlocks(p.blocks); keepHistory(n, blocksOf(n), next); n.blocks = next; n.text = textOf(n.blocks); }
  if (typeof p.title === 'string') n.title = p.title.slice(0, 60);
  if (typeof p.color === 'string' && /^#[0-9a-f]{6}$/i.test(p.color)) n.color = p.color;
  if (typeof p.font === 'string') n.font = p.font.replace(/["'\\;{}]/g, '').slice(0, 60) || 'Segoe UI';
  if (Number.isFinite(p.size)) n.size = Math.min(72, Math.max(8, Math.round(p.size)));
  if (Number.isFinite(p.opacity)) n.opacity = Math.min(1, Math.max(0.3, Math.round(p.opacity * 100) / 100));   // see-through notes: 100% (solid) down to 30%, so a note never disappears
  if (typeof p.solidText === 'boolean') n.solidText = p.solidText;
  if (Number.isFinite(p.opacity) || typeof p.solidText === 'boolean') {
    const w = winOf(e), solid = GPU_OK && !!n.solidText;
    if (w && !w.isDestroyed()) {
      // text stays solid: the page paints a see-through background itself; otherwise the whole window fades
      try { w.setOpacity(solid ? 1 : (Number.isFinite(n.opacity) ? n.opacity : 1)); } catch {}
      if (seeThrough.get(n.id) !== solid) setTimeout(() => reopenNote(n.id), 60);   // a window cannot change between see-through and normal: open it again once
    }
  }
  n.updated = Date.now();
  save();
});

ipcMain.handle('img:save', (e, dataUrl) => {
  const m = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
  if (!m || m[2].length > 14e6) return null;
  const id = rid() + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
  try { fs.mkdirSync(imgDir(), { recursive: true }); fs.writeFileSync(path.join(imgDir(), id), Buffer.from(m[2], 'base64')); return id; }
  catch { return null; }
});

ipcMain.handle('note:pin', (e, v) => {
  const n = notes[idOf(e)], w = winOf(e); if (!n || !w) return false;
  n.pinned = !!v; w.setAlwaysOnTop(n.pinned, 'screen-saver'); save(); return n.pinned;
});

ipcMain.handle('note:roll', (e, v) => {
  const n = notes[idOf(e)], w = winOf(e); if (!n || !w) return false;
  const b = w.getBounds(); n.rolled = !!v;
  if (n.rolled) {
    n.bounds = { ...n.bounds, x: b.x, y: b.y, width: b.width, height: b.height };
    w.setMinimumSize(MIN_W, ROLL_H); w.setMaximumSize(10000, ROLL_H); w.setBounds({ ...b, height: ROLL_H });
  } else {
    w.setMaximumSize(0, 0); w.setMinimumSize(MIN_W, MIN_H); w.setBounds({ ...b, height: Math.max(MIN_H, n.bounds.height || 320) });
  }
  save(); return n.rolled;
});

ipcMain.handle('note:lock', (e, pw) => {
  const n = notes[idOf(e)]; if (!n || n.lock || typeof pw !== 'string' || pw.length < 4) return false;
  const salt = crypto.randomBytes(16).toString('base64'), key = deriveKey(pw, salt), imgs = imgIds(n);
  n.lock = { ...encryptBlob({ blocks: blocksOf(n) }, key, salt), imgs };
  n.blocks = []; n.text = ''; sessions.delete(n.id); dropHistory(n.id); save(); return true;
});
ipcMain.handle('note:unlock', (e, pw) => {
  const n = notes[idOf(e)]; if (!n || !n.lock) return false;
  const p = decryptBlob(n.lock, deriveKey(pw, n.lock.salt)); if (!p) return false;
  n.blocks = sanitizeBlocks(p.blocks); n.text = textOf(n.blocks); sessions.set(n.id, { key: deriveKey(pw, n.lock.salt) });
  pingAll(); return true;
});
ipcMain.handle('note:relock', e => { relock(notes[idOf(e)]); pingAll(); });
ipcMain.handle('note:removeLock', (e, pw) => {
  const n = notes[idOf(e)]; if (!n || !n.lock) return false;
  const p = decryptBlob(n.lock, deriveKey(pw, n.lock.salt)); if (!p) return false;
  n.blocks = sanitizeBlocks(p.blocks); n.text = textOf(n.blocks); delete n.lock; sessions.delete(n.id); save(); return true;
});

ipcMain.handle('note:new', e => { makeNote(winOf(e)); });
ipcMain.handle('note:close', e => {
  const id = idOf(e), w = winOf(e), n = notes[id];
  if (n && !hasContent(n)) { delete notes[id]; save(); }   // closing an empty note throws it away
  if (w) w.close();
});
function deleteNote(id) {
  const n = notes[id]; if (!n) return;
  if (hasContent(n)) trash.unshift({ ...packNote(n), deletedAt: Date.now() }); else dropImages(n);
  delete notes[id]; sessions.delete(id);
  const w = wins.get(id);
  if (!Object.keys(notes).length && !tray) { const nn = newNote(); notes[nn.id] = nn; openNote(nn); }
  save(); pingTrash(); if (w && !w.isDestroyed()) w.close();
}
ipcMain.handle('note:delete', e => { const id = idOf(e); if (id) deleteNote(id); });
/* ---------- IPC: folders ---------- */
ipcMain.handle('grp:new', (e, name) => {
  name = String(name || '').trim().slice(0, 40); if (!name) return null;
  const g = { id: rid(), name, collapsed: false }; groups.push(g); save(); return g.id;
});
ipcMain.handle('grp:update', (e, id, p) => {
  const g = groups.find(x => x.id === id); if (!g || !p) return;
  if (typeof p.name === 'string' && p.name.trim()) g.name = p.name.trim().slice(0, 40);
  if (typeof p.collapsed === 'boolean') g.collapsed = p.collapsed;
  save(); refreshTray();
});
ipcMain.handle('grp:delete', (e, id) => {
  groups = groups.filter(g => g.id !== id);
  Object.values(notes).concat(trash).forEach(n => { if (n.group === id) n.group = null; });
  save();
});
ipcMain.handle('grp:move', (e, noteId, gid) => {
  const n = notes[noteId]; if (!n) return;
  n.group = groups.some(g => g.id === gid) ? gid : null; save();
});

/* ---------- IPC: overview window ---------- */
ipcMain.handle('all:open', (e, tab) => openAll(tab === 'trash' ? 'trash' : undefined));
ipcMain.handle('all:new', () => { makeNote(null); });
ipcMain.handle('all:tidy', () => tidy());
const trashList = () => trash.map(t => ({
  id: t.id, title: t.title || '', locked: !!t.lock, text: t.lock ? '' : String(t.text || '').slice(0, 300),
  images: imgIds(t).length, color: t.color, font: t.font, deletedAt: t.deletedAt
}));
ipcMain.handle('all:list', () => {
  const g = greetingParts();
  return {
    groups, greeting: g.text, emoji: g.emoji, prefs: prefs(), trash: trashList(),
    notes: Object.values(notes).map(n => {
      const w = wins.get(n.id);
      return { id: n.id, title: n.title || '', text: n.lock ? '' : String(n.text || '').slice(0, 240), images: n.lock ? 0 : imgIds(n).length,
               color: n.color, font: n.font, pinned: !!n.pinned, locked: !!n.lock, rolled: !!n.rolled, group: n.group || null,
               open: !!(w && !w.isDestroyed()), updated: n.updated || 0 };
    }).sort((a, b) => b.updated - a.updated)
  };
});
ipcMain.handle('all:context', (e, id) => {
  const n = notes[id]; if (!n) return;
  const move = gid => { n.group = gid; save(); };
  Menu.buildFromTemplate([
    { label: 'Open note', click: () => { const w = openNote(n); if (w.isMinimized()) w.restore(); w.show(); w.focus(); } },
    { label: 'Copy text', enabled: !n.lock && String(n.text || '').trim() !== '', click: () => clipboard.writeText(String(n.text || '')) },
    { label: 'Move to folder', submenu: [
      { label: 'No folder', type: 'radio', checked: !n.group, click: () => move(null) },
      ...(groups.length ? [{ type: 'separator' }] : []),
      ...groups.map(g => ({ label: g.name, type: 'radio', checked: n.group === g.id, click: () => move(g.id) }))
    ] },
    { type: 'separator' },
    { label: 'Move to trash', click: () => deleteNote(id) }
  ]).popup({ window: BrowserWindow.fromWebContents(e.sender) });
});
ipcMain.handle('all:show', (e, id) => {
  const n = notes[id]; if (!n) return;
  const w = openNote(n); if (w.isMinimized()) w.restore(); w.show(); w.focus();
});
ipcMain.handle('all:openGroup', (e, gid) => {
  Object.values(notes).filter(n => (n.group || null) === (gid || null)).forEach(n => { const w = openNote(n); w.show(); });
});

/* ---------- IPC: trash ---------- */
ipcMain.handle('trash:open', () => openAll('trash'));
ipcMain.handle('trash:list', () => trashList());
ipcMain.handle('trash:restore', (e, id) => {
  const k = trash.findIndex(t => t.id === id); if (k < 0) return;
  const [t] = trash.splice(k, 1); delete t.deletedAt;
  if (!groups.some(g => g.id === t.group)) t.group = null;
  notes[t.id] = t; openNote(t); save(); pingTrash();
});
ipcMain.handle('trash:purge', (e, id) => { const t = trash.find(x => x.id === id); if (t) { dropImages(t); dropHistory(t.id); } trash = trash.filter(x => x.id !== id); save(); pingTrash(); });
ipcMain.handle('trash:empty', () => { trash.forEach(dropImages); trash.forEach(t => dropHistory(t.id)); trash = []; save(); pingTrash(); });

/* ---------- IPC: app settings ---------- */
ipcMain.handle('app:info', () => ({
  packaged: app.isPackaged, startup: startupOn(), trash: trash.length,
  hideTaskbar: !!settings.hideTaskbar, snap: !!settings.snap, groups, theme: settings.theme
}));
ipcMain.handle('app:prefs', (e, p) => setPrefs(p));
ipcMain.handle('app:startup', (e, v) => setStartup(v));
ipcMain.handle('app:hideTaskbar', (e, v) => setHide(v));
ipcMain.handle('app:snap', (e, v) => setSnap(v));

/* ---------- AI helper (summarise / fix grammar) ---------- */
function setKey(k) {
  if (safeStorage.isEncryptionAvailable()) { settings.ai.keyEnc = safeStorage.encryptString(k).toString('base64'); memKey = null; }
  else { memKey = k; settings.ai.keyEnc = ''; }   // no secure storage: keep it only until the app closes
}
function getKey() {
  if (memKey) return memKey;
  if (settings.ai.keyEnc && safeStorage.isEncryptionAvailable()) { try { return safeStorage.decryptString(Buffer.from(settings.ai.keyEnc, 'base64')); } catch {} }
  return '';
}
const aiCfg = () => ({ provider: settings.ai.provider, model: settings.ai.model, url: settings.ai.url, key: getKey(), keepAlive: settings.ai.keepAlive || '5m' });
ipcMain.handle('ai:get', () => ({ provider: settings.ai.provider, model: settings.ai.model, url: settings.ai.url, hasKey: !!getKey(),
  secure: safeStorage.isEncryptionAvailable(), defaultModel: ai.DEFAULT_CLAUDE_MODEL }));
ipcMain.handle('ai:set', (e, p) => {
  if (!p) return false;
  if (['off', 'ollama', 'claude'].includes(p.provider)) settings.ai.provider = p.provider;
  if (typeof p.model === 'string') settings.ai.model = p.model.trim().slice(0, 80);
  if (typeof p.url === 'string' && p.url.trim()) settings.ai.url = p.url.trim().slice(0, 200);
  if (typeof p.key === 'string' && p.key.trim()) setKey(p.key.trim());
  if (p.clearKey) { settings.ai.keyEnc = ''; memKey = null; }
  save(); return true;   // (the model is loaded into memory only when you actually use the AI, see ai:warmup)
});
ipcMain.handle('app:openLink', (e, url) => { if (!links.safe(url)) return false; shell.openExternal(String(url)); return true; });
// right-click on a link in a note: open it or copy the address
// The settings panel is open/closed in a note: a narrow note gets wider so the panel fits beside the text, and goes back afterwards.
ipcMain.handle('note:panel', (e, open) => {
  const id = idOf(e), w = wins.get(id); if (!w || w.isDestroyed() || !notes[id]) return false;
  const cur = w.getBounds();
  if (open) {
    if (notes[id].rolled) return false;
    if (!panelGrow.has(id)) {
      const wa = screen.getDisplayMatching(cur).workArea, g = placement.growForPanel(cur, wa);
      if (g.grown) { panelGrow.set(id, { x: cur.x, width: cur.width }); w.setMinimumSize(MIN_W, MIN_H); w.setBounds(g.bounds); }
    }
    return w.getBounds().width >= placement.DOCK_MIN;
  }
  const was = panelGrow.get(id);
  if (was) { panelGrow.delete(id); w.setBounds({ ...w.getBounds(), x: was.x, width: was.width }); }
  return false;
});
ipcMain.handle('app:linkMenu', (e, url) => {
  if (!links.safe(url)) return false;
  const mail = /^mailto:/i.test(url), plain = String(url).replace(/^mailto:/i, '');
  Menu.buildFromTemplate([
    { label: mail ? 'Write an e-mail' : 'Open link', click: () => shell.openExternal(String(url)) },
    { label: mail ? 'Copy e-mail address' : 'Copy link', click: () => clipboard.writeText(plain) }
  ]).popup({ window: BrowserWindow.fromWebContents(e.sender) || undefined });
  return true;
});
ipcMain.handle('ai:run', async (e, task, payload) => {
  try {
    const cfg = aiCfg();
    if (task === 'summarize') return { ok: true, text: await ai.summarize(cfg, String((payload && payload.text) || '')) };
    if (task === 'grammar') return { ok: true, items: await ai.fixGrammar(cfg, payload && payload.items) };
    if (task === 'checklist') return { ok: true, items: await ai.toChecklist(cfg, String((payload && payload.text) || '')) };
    if (task === 'title') return { ok: true, text: await ai.suggestTitle(cfg, String((payload && payload.text) || '')) };
    if (task === 'ping') return { ok: true, text: await ai.ping(cfg) };
    return { ok: false, error: 'Unknown task.' };
  } catch (err) {
    return { ok: false, error: err && err.friendly ? err.message : 'Something went wrong: ' + (err && err.message ? err.message : err) };
  }
});

/* ---------- live edit: the answer streams straight into the note ---------- */
const editJobs = new Map();
ipcMain.handle('ai:edit', async (e, p) => {
  const id = String((p && p.id) || ''), sender = e.sender;
  const send = m => { if (!sender.isDestroyed()) sender.send('ai:event', { id, ...m }); };
  const ac = new AbortController(); editJobs.set(id, ac);
  try {
    const full = await ai.editStream(aiCfg(), String((p && p.mode) || 'fix'), String((p && p.text) || ''), t => send({ type: 'chunk', text: t }), ac.signal);
    send({ type: 'done', text: full });
  } catch (err) {
    if (ac.signal.aborted) send({ type: 'done', stopped: true });
    else send({ type: 'error', error: err && err.friendly ? err.message : 'Something went wrong: ' + (err && err.message ? err.message : err) });
  } finally { editJobs.delete(id); }
  return true;
});
ipcMain.handle('ai:editStop', (e, id) => { const a = editJobs.get(String(id)); if (a) a.abort(); });

/* ---------- Ollama: installed models, downloads and installing Ollama itself ---------- */
const olJobs = new Map();   // 'pull:<name>' or 'install' -> AbortController
const olSend = m => BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('ollama:event', m); });
const olUrl = u => { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : (settings.ai.url || ollama.DEFAULT_URL); };
const isLocalUrl = u => { try { const h = new URL(u).hostname; return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1'; } catch { return false; } };
ipcMain.handle('ollama:status', async (e, url) => {
  const u = olUrl(url), st = await ollama.status(u), local = isLocalUrl(u);
  return { running: st.running, installed: !!ollama.findOllama() || st.running, canInstall: process.platform === 'win32' && local, local,
    models: st.models, recommended: ollama.RECOMMENDED,
    pulling: [...olJobs.keys()].filter(k => k.startsWith('pull:')).map(k => k.slice(5)), installing: olJobs.has('install') };
});
ipcMain.handle('ollama:start', async (e, url) => {
  const u = olUrl(url);
  if ((await ollama.status(u)).running) return { ok: true };
  if (!isLocalUrl(u)) return { ok: false, error: 'That Ollama address is not on this PC, so I cannot start it.' };
  if (!ollama.startOllama()) return { ok: false, error: 'Ollama does not seem to be installed.' };
  return (await ollama.waitUntilRunning(u, 20, 1000)) ? { ok: true } : { ok: false, error: 'Ollama did not start. Try opening it from the Start menu.' };
});
ipcMain.handle('ollama:pull', async (e, name, url) => {
  name = String(name || '');
  if (!ollama.validName(name)) return { ok: false, error: 'That model name is not valid.' };
  const key = 'pull:' + name; if (olJobs.has(key)) return { ok: true };
  const u = olUrl(url);
  const ac = new AbortController(); olJobs.set(key, ac);
  try {
    if (!(await ollama.status(u)).running) {
      olSend({ type: 'pull', name, state: 'progress', status: 'Starting Ollama…', pct: null });
      if (!isLocalUrl(u) || !ollama.startOllama() || !(await ollama.waitUntilRunning(u, 20, 1000))) throw new Error('Ollama is not running. Start it (or install it) first.');
    }
    await ollama.pull(u, name, p => olSend({ type: 'pull', name, state: 'progress', status: p.status, pct: p.pct }), ac.signal);
    olSend({ type: 'pull', name, state: 'done' });
    return { ok: true };
  } catch (err) {
    if (ac.signal.aborted) { olSend({ type: 'pull', name, state: 'cancelled' }); return { ok: false, cancelled: true }; }
    const msg = err && err.message ? err.message : 'The download failed.';
    olSend({ type: 'pull', name, state: 'error', error: msg }); return { ok: false, error: msg };
  } finally { olJobs.delete(key); }
});
ipcMain.handle('ollama:delete', async (e, name, url) => {
  name = String(name || '');
  if (!ollama.validName(name)) return { ok: false, error: 'That model name is not valid.' };
  if (olJobs.has('pull:' + name)) return { ok: false, error: 'It is still downloading. Cancel the download first.' };
  try { await ollama.remove(olUrl(url), name); return { ok: true }; }
  catch (err) { return { ok: false, error: err && err.message ? err.message : 'Could not delete the model.' }; }
});
ipcMain.handle('ollama:cancel', (e, what) => { const a = olJobs.get(String(what)); if (a) a.abort(); });
ipcMain.handle('ollama:install', async (e, url) => {
  if (process.platform !== 'win32') return { ok: false, error: 'Automatic install only works on Windows. Get Ollama from ollama.com.' };
  if (olJobs.has('install')) return { ok: true };
  const u = olUrl(url);
  if (!isLocalUrl(u)) return { ok: false, error: 'That address is not on this PC. Install Ollama on the other computer.' };
  const ac = new AbortController(); olJobs.set('install', ac);
  const dest = path.join(app.getPath('temp'), 'OllamaSetup.exe');
  const step = (status, pct) => olSend({ type: 'install', state: 'progress', status, pct: pct == null ? null : pct });
  try {
    if (!ollama.findOllama() && !(await ollama.status(u)).running) {
      step('Downloading Ollama…', 0);
      await ollama.downloadInstaller(dest, p => step('Downloading Ollama…', p.pct), ac.signal);
      step('Installing Ollama… (accept the Windows prompt if it appears)', null);
      await ollama.runInstaller(dest);
    }
    step('Starting Ollama…', null);
    if (!(await ollama.status(u)).running) ollama.startOllama();
    if (!(await ollama.waitUntilRunning(u, 40, 1000))) throw new Error('Ollama is installed but did not start. Open it from the Start menu, then press Refresh.');
    olSend({ type: 'install', state: 'done' });
    return { ok: true };
  } catch (err) {
    if (ac.signal.aborted) { olSend({ type: 'install', state: 'cancelled' }); return { ok: false, cancelled: true }; }
    const msg = err && err.message ? err.message : 'The install failed.';
    olSend({ type: 'install', state: 'error', error: msg }); return { ok: false, error: msg };
  } finally { olJobs.delete('install'); try { fs.unlinkSync(dest); } catch {} }
});
ipcMain.handle('ai:warmup', () => ai.warmup(aiCfg()));

/* ---------- themes: one theme colours the whole app, in a light and a dark version ---------- */
const modeOf = () => (['light', 'dark'].includes(settings.mode) ? settings.mode : 'system');
function uiDark() { return !!NT.shouldUseDarkColors; }   // follows settings.mode through nativeTheme.themeSource
function applyMode() { try { NT.themeSource = modeOf(); } catch {} }
function uiTheme() {
  const dark = uiDark(), id = THEMES.byId(settings.theme).id;
  return { id, dark, mode: modeOf(), follow: settings.notesFollowMode !== false, vars: THEMES.vars(id, dark), palette: THEMES.palette(id, dark) };
}
// Tells every window about the theme. When light/dark changed, notes in theme colours follow (custom colours never change).
function themeChanged() {
  const t = uiTheme();
  if (t.follow && typeof settings.lastDark === 'boolean' && settings.lastDark !== t.dark) {
    Object.values(notes).forEach(n => { n.color = THEMES.followMode(n.color, t.id, t.dark); });
    wins.forEach((w, nid) => { const n = notes[nid]; if (n && !w.isDestroyed()) w.webContents.send('note:style', { color: n.color, font: n.font }); });
  }
  if (settings.lastDark !== t.dark) { settings.lastDark = t.dark; save(); }   // the first time it only remembers: existing notes are left alone
  BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('ui:theme', t); });
  return t;
}
ipcMain.handle('ui:theme', () => uiTheme());
ipcMain.handle('theme:set', (e, id) => { settings.theme = THEMES.byId(id).id; save(); themeChanged(); return settings.theme; });
ipcMain.handle('theme:applyAll', (e, id) => {
  const th = THEMES.byId(id); settings.theme = th.id; let k = 0;
  Object.values(notes).forEach(n => { n.color = THEMES.mapColor(n.color, th.id, k++, uiDark()); n.font = th.font; });   // keeps "the pink one" pink-ish in the new theme
  wins.forEach((w, nid) => { const n = notes[nid]; if (n && !w.isDestroyed()) w.webContents.send('note:style', { color: n.color, font: n.font }); });
  save(); themeChanged(); return th.id;
});

/* ---------- AI chat sidebar ---------- */
const chatFile = () => path.join(dataDir(), 'chat.json');
function loadChat() {
  if (chatState) return chatState;
  if (!settings.chatHistory) { chatState = { messages: [], noteId: null }; return chatState; }
  try { chatState = JSON.parse(fs.readFileSync(chatFile(), 'utf8')); } catch { chatState = null; }
  if (!chatState || !Array.isArray(chatState.messages)) chatState = { messages: [], noteId: null };
  return chatState;
}
const saveChat = () => { if (!settings.chatHistory) return; try { fs.writeFileSync(chatFile(), JSON.stringify(chatState)); } catch {} };
function clearChat() { chatState = { messages: [], noteId: null }; try { fs.unlinkSync(chatFile()); } catch {} }
function cleanChat(messages, keep) {
  const out = (Array.isArray(messages) ? messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content !== '')
    .map(m => ({ role: m.role, content: m.content.slice(0, 8000) })).slice(-keep);
  while (out.length && out[0].role !== 'user') out.shift();   // models expect the conversation to start with the user
  return out;
}
// A long note goes in whole (up to ~40,000 characters); beyond that the start and the END are kept, never just the start.
function chatContext(text) {
  text = String(text || ''); const MAX = 40000;
  return text.length <= MAX ? text : text.slice(0, MAX * 0.4) + '\n[… middle of the note left out …]\n' + text.slice(-MAX * 0.6);
}
// noteId '*' = "all my notes": the notes that best fit the question are given to the AI
function chatSystem(noteId, question, sources) {
  let sys = ai.SYS_CHAT;
  if (noteId === '*') {
    const open = Object.values(notes).filter(x => !x.lock);
    const r = notesearch.build(open, question || '');
    if (sources) { sources.length = 0; r.used.forEach(u => sources.push(u.title)); }
    sys += '\n\nThe user lets you read their sticky notes (' + r.count + ' notes, locked ones excluded). ' +
      (r.matched ? 'These are the notes that best fit their question. Answer from them and say which note you used. If the answer is not in them, say so; do not guess.' : 'No note clearly matches the question; these are the newest notes. If the answer is not in them, say so; do not guess.') +
      (r.context ? '\n---\n' + r.context + '\n---' : '\n(There are no notes yet.)') + (r.titles.length ? '\nAll note titles: ' + r.titles.join(' | ') : '');
    return sys;
  }
  const n = notes[noteId];
  if (n && !n.lock) sys += `\n\nThe user attached this sticky note as context.\nTitle: ${n.title || '(none)'}\n---\n${chatContext(n.text)}\n---`;
  return sys;
}
function openChat(noteId) {
  ai.warmup(aiCfg());   // the chat is about to be used: load the local model now
  openHome('chat', noteId);
}
ipcMain.handle('chat:open', (e, noteId) => openChat(typeof noteId === 'string' ? noteId : undefined));
ipcMain.handle('chat:close', () => { openHome('notes'); });
ipcMain.handle('home:go', (e, section, arg) => { if (section === 'chat') return openChat(typeof arg === 'string' ? arg : undefined); openHome(String(section), typeof arg === 'string' ? arg : undefined); });
ipcMain.handle('chat:load', () => {
  const c = loadChat();
  return { messages: cleanChat(c.messages, 100), noteId: notes[c.noteId] && !notes[c.noteId].lock ? c.noteId : null,
           provider: settings.ai.provider, model: settings.ai.model || (settings.ai.provider === 'claude' ? ai.DEFAULT_CLAUDE_MODEL : '') };
});
ipcMain.handle('chat:save', (e, p) => { const c = loadChat(); c.messages = cleanChat(p && p.messages, 100); c.noteId = p && typeof p.noteId === 'string' ? p.noteId : null; saveChat(); });
ipcMain.handle('chat:notes', () => Object.values(notes).filter(n => !n.lock && String(n.text || '').trim())
  .sort((a, b) => (b.updated || 0) - (a.updated || 0)).map(n => ({ id: n.id, title: n.title || String(n.text).split('\n')[0].slice(0, 40) || 'Note' })));
ipcMain.handle('chat:saveAsNote', (e, text) => {
  const t = String(text || '').slice(0, 100000); if (!t.trim()) return false;
  makeNote(null, { title: 'From AI chat', blocks: [{ t: 'text', v: t }], text: t }); return true;
});
ipcMain.handle('chat:stop', (e, id) => { const a = chatJobs.get(id); if (a) a.abort(); });
ipcMain.handle('chat:send', async (e, p) => {
  const id = String((p && p.id) || ''), sender = e.sender;
  const send = m => { if (!sender.isDestroyed()) sender.send('chat:event', { id, ...m }); };
  const ac = new AbortController(); chatJobs.set(id, ac);
  try {
    const msgs = cleanChat(p && p.messages, 20), lastUser = [...msgs].reverse().find(m => m.role === 'user'), src = [];
    const sys = chatSystem(p && p.noteId, lastUser ? lastUser.content : '', src);
    if (src.length) send({ type: 'sources', titles: src });
    const full = await ai.chatStream(aiCfg(), sys, msgs, t => send({ type: 'chunk', text: t }), ac.signal);
    send({ type: 'done', text: full });
  } catch (err) {
    if (ac.signal.aborted) send({ type: 'done', stopped: true });
    else send({ type: 'error', error: err && err.friendly ? err.message : 'Something went wrong: ' + (err && err.message ? err.message : err) });
  } finally { chatJobs.delete(id); }
  return true;
});

/* ---------- updates: look at GitHub Releases and install a newer version ---------- */
let updater = null;
function initUpdater() {
  let au = null;
  if (app.isPackaged) { try { au = require('electron-updater').autoUpdater; } catch { /* module missing: updates stay off */ } }
  updater = updaterLib.createUpdater({
    autoUpdater: au, supported: app.isPackaged, repo: { owner: 'Vyto-Line', repo: 'StickyPad' },
    fetchImpl: (u, o) => (net && net.fetch ? net.fetch(u, o) : fetch(u, o)), log: updateLog,
    send: m => BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('update:event', m); }),
    onReady: () => {}   // no Windows pop-up or notification: open notes show a small "Restart to update" message (updbar.js), and it installs when you quit anyway
  });
  updater.schedule({ enabled: () => settings.autoUpdate !== false });
}
// A small text file that records what the update check did, so a failure can be understood afterwards (Settings > About > Open update log).
const updateLogFile = () => path.join(app.getPath('userData'), 'update.log');
function updateLog(line) {
  try {
    const f = updateLogFile(); let old = '';
    try { old = fs.readFileSync(f, 'utf8'); } catch {}
    if (old.length > 150000) old = old.slice(-100000);
    const head = old ? '' : `StickyPad ${app.getVersion()} on ${process.platform} ${process.arch}\n`;
    fs.writeFileSync(f, old + head + new Date().toISOString() + '  v' + app.getVersion() + '  ' + line + '\n');
  } catch {}
}
ipcMain.handle('update:check', () => updater ? updater.check() : null);
ipcMain.handle('update:download', () => updater ? updater.download() : null);
ipcMain.handle('whatsnew:get', () => whatsNewData(whatsFrom));
ipcMain.handle('whatsnew:close', (e, o) => {
  if (o && typeof o.off === 'boolean') { settings.whatsNew = !o.off; save(); }
  if (whatsWin && !whatsWin.isDestroyed()) whatsWin.close();
});
ipcMain.handle('update:state', () => updater ? updater.get() : null);
ipcMain.handle('update:install', () => {
  flush(); quitting = true;
  // let the answer go back to the window first, then close everything and hand over to the installer
  setTimeout(() => {
    try { if (updater) updater.install(); } catch (err) { crashLog('install', err); quitting = false; }
  }, 50);
  setTimeout(() => { quitting = false; }, 15000);   // still running after 15 s means the install did not start: behave normally again
  return true;
});

/* ---------- reminders ---------- */
const shownNotes = new Set();   // keeps notification objects alive until they are clicked or closed
function focusNote(id) {
  const n = notes[id]; if (!n) return;
  const w = openNote(n); if (!w || w.isDestroyed()) return;
  if (w.isMinimized()) w.restore();
  w.show(); w.focus();
}
function fireReminder(id) {
  const n = notes[id]; if (!n) return;
  n.remind = 0; save();
  const w = wins.get(id); if (w && !w.isDestroyed()) { w.webContents.send('note:reload'); w.flashFrame(true); }
  const title = String(n.title || '').trim() || 'StickyPad reminder';
  const text = reminders.body(n.text, !!n.lock && !sessions.has(id));
  try {
    if (Notification.isSupported()) {
      const nt = new Notification({ title, body: text, silent: false });
      shownNotes.add(nt);
      nt.on('click', () => { focusNote(id); shownNotes.delete(nt); });
      nt.on('close', () => shownNotes.delete(nt));
      nt.show();
      return;
    }
  } catch {}
  focusNote(id);   // no system notifications available: bring the note itself to the front
}
function checkReminders() { reminders.due(notes, Date.now()).forEach(fireReminder); }
ipcMain.handle('note:remind', (e, ts) => {
  const n = notes[idOf(e)]; if (!n) return 0;
  const t = Math.round(Number(ts));
  n.remind = Number.isFinite(t) && t > Date.now() - 864e5 * 365 ? Math.max(0, t) : 0;
  save(); return n.remind;
});

/* ---------- global shortcuts ---------- */
function unregisterShortcuts() { try { globalShortcut.unregisterAll(); } catch {} }
let keysFailed = [];   // shortcuts Windows would not give us (another program already uses them)
const curKeys = () => KEYS.merge(settings.keys);
function registerShortcuts() {
  unregisterShortcuts(); keysFailed = [];
  const k = curKeys();
  const reg = (id, fn) => { let ok = false; try { ok = globalShortcut.register(KEYS.toElectron(k[id]), fn); } catch {} if (!ok) keysFailed.push(id); };
  reg('g_new', () => makeNote(null));
  reg('g_all', () => openAll());
  reg('g_chat', () => openChat());
  reg('g_settings', () => openSettings());
  reg('g_clip', () => newFromClipboard());
}
// A new note holding whatever text you last copied.
function newFromClipboard() {
  let text = ''; try { text = clipboard.readText() || ''; } catch {}
  if (!text.trim()) { try { new Notification({ title: 'StickyPad', body: 'There is no text on the clipboard to make a note from.' }).show(); } catch {} return null; }
  if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT);
  const c = convert.fromMarkdown(text, ''), blocks = sanitizeBlocks(c.blocks);
  const n = makeNote(null, { title: c.title, blocks, text: textOf(blocks) });
  return n;
}
function setKeys(p) {
  const want = {};
  for (const id of Object.keys(KEYS.DEFAULTS)) { const a = KEYS.norm(p && p[id]); if (a && !KEYS.problem(id, a)) want[id] = a; }
  const merged = KEYS.merge(want);   // two actions with the same keys: the later one keeps its default
  settings.keys = Object.fromEntries(Object.keys(merged).filter(id => merged[id] !== KEYS.DEFAULTS[id]).map(id => [id, merged[id]]));   // only what differs is stored
  if (settings.shortcuts) registerShortcuts();
  wins.forEach(w => { if (!w.isDestroyed()) w.webContents.send('keys:changed', curKeys()); });
  save();
}

/* ---------- backups and trash retention ---------- */
function doBackup() { flush(); const dir = backup.makeBackup(dataDir(), 7, new Date(), app.getPath('userData')); settings.lastBackup = Date.now(); save(); return dir; }
function purgeTrash() {
  const keep = [], drop = [];
  trash.forEach(t => (Date.now() - t.deletedAt < settings.trashDays * DAY ? keep : drop).push(t));
  drop.forEach(dropImages); drop.forEach(t => dropHistory(t.id)); trash = keep;
}

/* ---------- the Settings window ---------- */
function openSettings(section) { openHome('settings', typeof section === 'string' ? section : undefined); }
// How much memory StickyPad uses right now (private memory per process, like Task Manager's "Memory" column), in MB.
function memoryUse() {
  const mb = k => Math.round(k / 1024), out = { total: 0, main: 0, notes: 0, gpu: 0, other: 0, processes: 0, windows: BrowserWindow.getAllWindows().length };
  for (const m of app.getAppMetrics()) {
    const k = (m.memory && (m.memory.privateBytes || m.memory.workingSetSize)) || 0, t = String(m.type);
    out.processes++; out.total += k;
    if (t === 'Browser') out.main += k; else if (t === 'Tab') out.notes += k; else if (t === 'GPU') out.gpu += k; else out.other += k;
  }
  for (const k of ['total', 'main', 'notes', 'gpu', 'other']) out[k] = mb(out[k]);
  return out;
}
function allSettings() {
  return {
    version: app.getVersion(), packaged: app.isPackaged, startup: startupOn(), dataPath: dataDir(), dataCustom: dataDir() !== app.getPath('userData'),
    hideTaskbar: !!settings.hideTaskbar, snap: !!settings.snap, snapDistance: settings.snapDistance, defaultSize: settings.defaultSize,
    trashDays: settings.trashDays, trashCount: trash.length, shortcuts: !!settings.shortcuts, suggestDates: settings.suggestDates !== false, keys: curKeys(), keysFailed: settings.shortcuts ? keysFailed : [], chatHistory: !!settings.chatHistory,
    autoBackup: !!settings.autoBackup, lastBackup: settings.lastBackup || 0, backupCount: backup.list(app.getPath('userData')).length,
    autoUpdate: settings.autoUpdate !== false, whatsNew: settings.whatsNew !== false, update: updater ? updater.get() : null,
    theme: settings.theme, mode: modeOf(), notesFollowMode: settings.notesFollowMode !== false, uiDark: uiDark(), prefs: prefs(), groups, notesCount: Object.keys(notes).length,
    lowMemory: launchcfg.read(app.getPath('userData')).lowMemory, lowMemoryActive: LAUNCH.lowMemory, aiKeep: settings.ai.keepAlive || '5m'
  };
}
const clampInt = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(v))));
ipcMain.handle('settings:open', (e, section) => openSettings(typeof section === 'string' ? section : undefined));
ipcMain.handle('settings:get', () => allSettings());
ipcMain.handle('settings:set', (e, p) => {
  if (p) {
    if ('hideTaskbar' in p) setHide(p.hideTaskbar);
    if ('snap' in p) setSnap(p.snap);
    if ('startup' in p) setStartup(p.startup);
    if (Number.isFinite(p.snapDistance)) settings.snapDistance = clampInt(p.snapDistance, 4, 40);
    if (Number.isFinite(p.defaultSize)) settings.defaultSize = clampInt(p.defaultSize, 10, 48);
    if ([7, 14, 30, 60, 90].includes(p.trashDays)) { settings.trashDays = p.trashDays; purgeTrash(); pingTrash(); }
    if (p.keys && typeof p.keys === 'object') setKeys(p.keys);
    if ('shortcuts' in p) { settings.shortcuts = !!p.shortcuts; if (settings.shortcuts) registerShortcuts(); else unregisterShortcuts(); }
    if ('chatHistory' in p) { settings.chatHistory = !!p.chatHistory; if (!settings.chatHistory) clearChat(); }
    if ('suggestDates' in p) settings.suggestDates = !!p.suggestDates;
    if ('autoBackup' in p) settings.autoBackup = !!p.autoBackup;
    if ('autoUpdate' in p) settings.autoUpdate = !!p.autoUpdate;
    if ('whatsNew' in p) settings.whatsNew = !!p.whatsNew;
    if ('lowMemory' in p) { try { launchcfg.write(app.getPath('userData'), { lowMemory: !!p.lowMemory }); } catch {} }   // used at the next start
    if (typeof p.aiKeep === 'string' && ['0', '5m', '30m'].includes(p.aiKeep)) settings.ai.keepAlive = p.aiKeep;
    let themeTouched = false;
    if (typeof p.theme === 'string') { settings.theme = THEMES.byId(p.theme).id; themeTouched = true; }
    if (['light', 'dark', 'system'].includes(p.mode)) { settings.mode = p.mode; applyMode(); themeTouched = true; }
    if ('notesFollowMode' in p) settings.notesFollowMode = !!p.notesFollowMode;
    if (themeTouched) themeChanged();
    if (p.prefs) setPrefs(p.prefs);
    save(); refreshTray();
  }
  return allSettings();
});
ipcMain.handle('settings:action', (e, name, arg) => {
  try {
    if (name === 'backupNow') { doBackup(); return { ok: true, info: allSettings() }; }
    if (name === 'exportAll') return exportAll(settingsWin);
    if (name === 'importNotes') return importNotes(settingsWin);
    if (name === 'importOther') return importOther(settingsWin, arg);
    if (name === 'memory') return { ok: true, ...memoryUse() };
    if (name === 'restartApp') { flush(); app.relaunch(); setTimeout(() => app.exit(0), 200); return { ok: true }; }
    if (name === 'openUpdateLog') {
      const f = updateLogFile(); if (!fs.existsSync(f)) fs.writeFileSync(f, 'No update check has run yet. Press "Check now" in Settings > About, then open this file again.\n');
      shell.openPath(f); return { ok: true };
    }
    if (name === 'openReleases') { shell.openExternal('https://github.com/Vyto-Line/StickyPad/releases'); return { ok: true }; }
    if (name === 'openData') { shell.openPath(dataDir()); return { ok: true }; }
    if (name === 'chooseDataFolder' || name === 'resetDataFolder') {
      const def = app.getPath('userData'); let target = def;
      if (name === 'chooseDataFolder') {
        const r = dialog.showOpenDialogSync(settingsWin || undefined, { title: 'Choose where StickyPad keeps your notes', properties: ['openDirectory', 'createDirectory'], defaultPath: dataDir() });
        if (!r || !r[0]) return { ok: false, cancelled: true };
        target = r[0];
      }
      if (path.resolve(target) === path.resolve(dataDir())) return { ok: false, error: 'That is already the data folder.' };
      const has = fs.existsSync(path.join(target, 'notes.json'));
      const c = dialog.showMessageBoxSync(settingsWin || undefined, { type: 'question', buttons: ['Continue', 'Cancel'], defaultId: 0, cancelId: 1, title: 'Move StickyPad data',
        message: has ? 'There are already notes in that folder.' : 'Move your notes to that folder?',
        detail: (has ? 'StickyPad will use the notes that are there. Your current notes stay where they are (nothing is deleted).' : 'Your notes and pictures are copied there. The old copy is kept as a backup.') + '\n\nStickyPad restarts afterwards.' });
      if (c !== 0) return { ok: false, cancelled: true };
      flush(); datadir.setLocation(def, dataDir(), target);
      app.relaunch(); setTimeout(() => app.exit(0), 200);
      return { ok: true, restarting: true };
    }
    if (name === 'openWhatsNew') { openWhatsNew(null); return { ok: true }; }
    if (name === 'openBackups') { const d = path.join(app.getPath('userData'), 'backups'); fs.mkdirSync(d, { recursive: true }); shell.openPath(d); return { ok: true }; }
    if (name === 'clearChat') { clearChat(); return { ok: true }; }
    if (name === 'emptyTrash') { trash.forEach(dropImages); trash.forEach(t => dropHistory(t.id)); trash = []; save(); pingTrash(); return { ok: true, info: allSettings() }; }
  } catch (err) { return { ok: false, error: String(err && err.message || err) }; }
  return { ok: false, error: 'Unknown action.' };
});

/* ---------- lifecycle ---------- */
app.on('second-instance', () => { if (quitting) return; if (settings.launch === 'all') openAll(); else showAll(); });
app.whenReady().then(async () => {
  DATA = datadir.resolve(app.getPath('userData'));
  file = path.join(DATA, 'notes.json');
  load(); sweepHistory(); sweepImages(); lastMtime = datadir.mtimeOf(file); watchData();
  applyMode(); try { NT.on('updated', () => themeChanged()); } catch {}
  if (typeof settings.lastDark !== 'boolean') settings.lastDark = uiDark();   // first start with themes: remember, do not repaint existing notes
  if (settings.autoBackup && !firstRun && !backup.sameDay(settings.lastBackup)) { try { doBackup(); } catch {} }   // one safety copy a day
  createTray();
  ['display-added', 'display-removed', 'display-metrics-changed'].forEach(ev => screen.on(ev, () => setTimeout(onScreensChanged, 400)));
  // Only the very first launch (or a missing tray) creates a blank note; otherwise closed empty notes stay gone.
  if (!Object.keys(notes).length && (firstRun || !tray)) { const n = newNote(); notes[n.id] = n; }
  if (settings.shortcuts) registerShortcuts();
  if (settings.splash) await showSplash();
  openStartup();
  maybeWhatsNew();
  save();
  initUpdater();
  checkReminders(); remTimer = setInterval(checkReminders, 15000);   // also fires reminders that came due while the app was closed
});
// With a tray icon the app keeps running when every note window is closed; reopen them from the tray.
app.on('window-all-closed', () => { flush(); if (!tray) app.quit(); });
app.on('before-quit', () => {   // leave nothing behind that could keep the process alive or throw while Windows replaces the files
  quitting = true; flush();
  try { clearInterval(remTimer); } catch {}
  try { if (file) fs.unwatchFile(file); } catch {}
  try { globalShortcut.unregisterAll(); } catch {}
  try { if (tray && !tray.isDestroyed()) tray.destroy(); } catch {}
  tray = null;
});
app.on('will-quit', () => globalShortcut.unregisterAll());
