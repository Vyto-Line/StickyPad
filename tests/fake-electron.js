// Loads main.js against a fake "electron" so the IPC handlers can be exercised without a real app.
const Module = require('module'), path = require('path'), fs = require('fs'), os = require('os');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-main-'));
const handlers = {}; let wid = 0; const wins = [];
const noop = new Proxy(function () {}, { get: (t, k) => k === 'then' ? undefined : noop, apply: () => noop, construct: () => noop });
class FakeWin {
  constructor(o) { this.o = o; this.id = ++wid; this._b = { x: 0, y: 0, width: 300, height: 320 }; this.webContents = { id: wid, sent: [], send: (...a) => this.webContents.sent.push(a), focus() {}, on() {}, setWindowOpenHandler() {} }; wins.push(this); }
  getBounds() { return this._b; } isDestroyed() { return false; } isMinimized() { return false; }
  once() {} on() {} loadFile() {} show() {} focus() {} close() {} restore() {} flashFrame() {} setAlwaysOnTop() {} setMinimumSize() {} setMaximumSize() {} setBounds() {} setPosition() {} setSkipTaskbar() {} getPosition() { return [0, 0]; } getSize() { return [300, 320]; }
}
const dialogCalls = [];
const electron = {
  app: { getPath: n => path.join(tmp, n), requestSingleInstanceLock: () => true, whenReady: () => new Promise(() => {}), on() {}, quit() {}, exit() {}, relaunch() {}, isPackaged: false, getVersion: () => '9.9.9', setLoginItemSettings() {}, getLoginItemSettings: () => ({}), setAppUserModelId() {}, getName: () => 'x' },
  BrowserWindow: FakeWin, ipcMain: { handle: (n, f) => { handlers[n] = f; }, on() {} },
  Tray: noop, Menu: noop, nativeImage: { createFromPath: () => ({ isEmpty: () => true, resize: () => noop }) , createEmpty: () => noop },
  screen: { getPrimaryDisplay: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }), getAllDisplays: () => [], getDisplayMatching: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }) },
  globalShortcut: { register() {}, unregisterAll() {} }, clipboard: noop, safeStorage: { isEncryptionAvailable: () => false }, shell: { openPath: p => { dialogCalls.push(['open', p]); } },
  dialog: { showSaveDialog: async o => { dialogCalls.push(['save', o]); return { canceled: false, filePath: electron.__save }; }, showOpenDialogSync: o => { dialogCalls.push(['open', o]); return electron.__open; }, showMessageBox: async () => ({ response: 1 }), showMessageBoxSync: () => 0 },
  Notification: class { static isSupported() { return true; } constructor(o) { electron.__notes.push(o); } on() {} show() {} }, __notes: [],
};
const orig = Module._load;
Module._load = function (req, ...r) { if (req === 'electron') return electron; if (req === 'electron-updater') return { autoUpdater: noop }; return orig.call(this, req, ...r); };
const ROOT = path.join(__dirname, '..'); process.argv[1] = path.join(ROOT, 'main.js');
require(path.join(ROOT, 'main.js'));
module.exports = { handlers, electron, tmp, wins, dialogCalls, ev: win => ({ sender: win.webContents }) };
