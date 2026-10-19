'use strict';
// Looks for a newer StickyPad on GitHub Releases and installs it. A thin wrapper around electron-updater, written so it can be
// tested with a fake updater (no Electron needed). States: idle, checking, downloading, ready, none, error, unsupported.

function friendly(err) {
  const m = String((err && err.message) || err || '');
  if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ERR_INTERNET|ERR_NETWORK|net::|getaddrinfo/i.test(m)) return 'Could not reach GitHub. Check your internet connection.';
  if (/404|Cannot find latest|No published versions|latest\.yml/i.test(m)) return 'No downloadable update was found on GitHub yet.';
  if (/403|rate limit/i.test(m)) return 'GitHub is limiting requests right now. Try again later.';
  return 'The update check failed: ' + m.split('\n')[0].slice(0, 160);
}

function createUpdater({ autoUpdater, send = () => {}, onReady = () => {}, supported = true }) {
  const state = { state: supported && autoUpdater ? 'idle' : 'unsupported', version: null, pct: null, error: '', checkedAt: 0 };
  const set = patch => { Object.assign(state, patch); try { send({ ...state }); } catch { /* window closed */ } };
  const get = () => ({ ...state });

  if (!supported || !autoUpdater) {
    return {
      get, install() {}, schedule() { return () => {}; },
      async check() { set({ state: 'unsupported', error: 'Updates work in the installed app, not when running from source.' }); return get(); }
    };
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;   // if you pick "Later", it installs when you quit
  autoUpdater.allowPrerelease = true;        // releases marked "pre-release" count too
  autoUpdater.on('checking-for-update', () => set({ state: 'checking', error: '', pct: null }));
  autoUpdater.on('update-available', info => set({ state: 'downloading', version: info && info.version, pct: 0 }));
  autoUpdater.on('update-not-available', () => set({ state: 'none', version: null, pct: null, checkedAt: Date.now() }));
  autoUpdater.on('download-progress', p => set({ state: 'downloading', pct: Math.round((p && p.percent) || 0) }));
  autoUpdater.on('update-downloaded', info => { set({ state: 'ready', version: (info && info.version) || state.version, pct: 100, checkedAt: Date.now() }); onReady(state.version); });
  autoUpdater.on('error', err => set({ state: 'error', error: friendly(err), pct: null, checkedAt: Date.now() }));

  async function check() {
    if (state.state === 'checking' || state.state === 'downloading' || state.state === 'ready') return get();
    set({ state: 'checking', error: '' });
    try { await autoUpdater.checkForUpdates(); }
    catch (e) { set({ state: 'error', error: friendly(e), checkedAt: Date.now() }); }
    return get();
  }
  const install = () => { if (state.state === 'ready') autoUpdater.quitAndInstall(true, true); };

  // checks shortly after start-up and then every few hours (the app can stay open in the tray for days)
  function schedule({ enabled = () => true, delayMs = 15000, everyMs = 6 * 3600 * 1000, timers = { setTimeout, setInterval } } = {}) {
    const run = () => { if (enabled()) check(); };
    const t1 = timers.setTimeout(run, delayMs), t2 = timers.setInterval(run, everyMs);
    return () => { clearTimeout(t1); clearInterval(t2); };
  }
  return { get, check, install, schedule };
}

module.exports = { createUpdater, friendly };
