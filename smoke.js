// A real-Electron smoke test: starts StickyPad's main.js in a throw-away data folder, waits, and prints what really happened
// (Electron/Chromium versions, command-line switches, windows and whether they are visible, shortcuts, logs).
// Run:  npx electron smoke.js        (used by .github/workflows/smoke.yml; it needs a real display, so not for the cloud sandbox)
const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path'), fs = require('fs'), os = require('os');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-smoke-'));
app.setPath('userData', tmp);
require(path.join(__dirname, 'main.js'));
const read = f => { try { return fs.readFileSync(path.join(tmp, f), 'utf8').trim().split('\n').slice(-20); } catch { return null; } };
setTimeout(() => {
  const rep = {
    electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node, packaged: app.isPackaged,
    switches: Object.fromEntries(['disable-features', 'js-flags', 'no-pings'].map(k => [k, app.commandLine.hasSwitch(k) ? app.commandLine.getSwitchValue(k) : null])),
    windows: BrowserWindow.getAllWindows().map(w => ({ title: w.getTitle(), visible: w.isVisible(), size: w.getSize(), alwaysOnTop: w.isAlwaysOnTop() })),
    shortcuts: Object.fromEntries(['Control+Alt+N', 'Control+Alt+Q', 'Control+Alt+C', 'Control+Alt+S', 'Control+Alt+V', 'Control+Alt+F'].map(k => [k, globalShortcut.isRegistered(k)])),
    perfLog: read('perf.log'), crashLog: read('crash.log')
  };
  console.log('SMOKE-REPORT ' + JSON.stringify(rep, null, 1));
  app.exit(0);
}, 12000);
