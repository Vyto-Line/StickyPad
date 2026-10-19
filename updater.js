'use strict';
// Looks for a newer StickyPad on GitHub Releases and installs it. A thin wrapper around electron-updater, written so it can be
// tested with a fake updater (no Electron needed). States: idle, checking, available (found, waiting for you to press Download),
// downloading, ready (waiting for you to press Restart), none, error, unsupported.

function friendly(err) {
  const m = String((err && err.message) || err || '');
  if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ERR_INTERNET|ERR_NETWORK|net::|getaddrinfo/i.test(m)) return 'Could not reach GitHub. Check your internet connection.';
  if (/NO_RELEASE_WITH_INSTALLER/.test(m)) return 'No release with an installer was found on GitHub yet. If you just published one, wait a few minutes for the files to finish uploading and try again.';
  if (/404|Cannot find latest|No published versions|latest\.yml/i.test(m)) return 'No downloadable update was found on GitHub yet. If you just published a release, its files may still be uploading: try again in a few minutes. (' + m.split('\n')[0].replace(/\s+/g, ' ').slice(0, 140) + ')';
  if (/403|rate limit/i.test(m)) return 'GitHub is limiting requests right now. Try again later.';
  return 'The update check failed: ' + m.split('\n')[0].slice(0, 160);
}

// Asks GitHub which release to update from: the newest published one that really has its installer files (latest.yml) uploaded.
// (Asking the releases feed directly could pick an empty release, e.g. one created with a different tag, and then find nothing to download.)
async function findRelease({ owner, repo, fetchImpl, allowPrerelease = true }) {
  const res = await fetchImpl(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=20`, { headers: { accept: 'application/vnd.github+json', 'user-agent': 'StickyPad-updater' } });
  if (!res.ok) throw new Error(res.status === 403 || res.status === 429 ? 'GitHub rate limit (HTTP ' + res.status + ')' : 'GitHub answered HTTP ' + res.status);
  const list = await res.json();
  const ok = (Array.isArray(list) ? list : []).filter(r => r && !r.draft && (allowPrerelease || !r.prerelease)
    && (r.assets || []).some(a => a && a.name === 'latest.yml' && (!a.state || a.state === 'uploaded')));
  ok.sort((a, b) => Date.parse(b.published_at || b.created_at || 0) - Date.parse(a.published_at || a.created_at || 0));
  if (!ok.length) throw new Error('NO_RELEASE_WITH_INSTALLER');
  return { tag: ok[0].tag_name, url: `https://github.com/${owner}/${repo}/releases/download/${encodeURIComponent(ok[0].tag_name)}` };
}

function createUpdater({ autoUpdater, send = () => {}, onReady = () => {}, supported = true, repo = null, fetchImpl = null, log = () => {} }) {
  const say = (...a) => { try { log(a.join(' ')); } catch { /* logging must never break an update */ } };
  const state = { state: supported && autoUpdater ? 'idle' : 'unsupported', version: null, pct: null, error: '', checkedAt: 0 };
  const set = patch => { Object.assign(state, patch); try { send({ ...state }); } catch { /* window closed */ } };
  const get = () => ({ ...state });

  if (!supported || !autoUpdater) {
    return {
      get, install() {}, async download() { return get(); }, schedule() { return () => {}; },
      async check() { set({ state: 'unsupported', error: 'Updates work in the installed app, not when running from source.' }); return get(); }
    };
  }

  autoUpdater.autoDownload = false;          // you press Download yourself
  autoUpdater.autoInstallOnAppQuit = true;   // if you pick "Later", it installs when you quit
  autoUpdater.allowPrerelease = true;        // releases marked "pre-release" count too
  autoUpdater.on('checking-for-update', () => { say('checking'); set({ state: 'checking', error: '', pct: null }); });
  autoUpdater.on('update-available', info => { say('update available:', info && info.version); set({ state: 'available', version: info && info.version, pct: null }); });
  autoUpdater.on('update-not-available', () => { say('no newer version'); set({ state: 'none', version: null, pct: null, checkedAt: Date.now() }); });
  autoUpdater.on('download-progress', p => set({ state: 'downloading', pct: Math.round((p && p.percent) || 0) }));
  autoUpdater.on('update-downloaded', info => { say('downloaded:', info && info.version); set({ state: 'ready', version: (info && info.version) || state.version, pct: 100, checkedAt: Date.now() }); onReady(state.version); });
  autoUpdater.on('error', err => { say('ERROR:', String((err && (err.stack || err.message)) || err).slice(0, 1500)); set({ state: 'error', error: friendly(err), pct: null, checkedAt: Date.now() }); });

  async function check() {
    if (['checking', 'available', 'downloading', 'ready'].includes(state.state)) return get();
    set({ state: 'checking', error: '' });
    try {
      if (repo && fetchImpl && typeof autoUpdater.setFeedURL === 'function') {
        const rel = await findRelease({ owner: repo.owner, repo: repo.repo, fetchImpl });
        say('newest release with an installer:', rel.tag, '->', rel.url);
        autoUpdater.setFeedURL({ provider: 'generic', url: rel.url });
      }
      await autoUpdater.checkForUpdates();
    }
    catch (e) { say('ERROR:', String((e && (e.stack || e.message)) || e).slice(0, 1500)); set({ state: 'error', error: friendly(e), checkedAt: Date.now() }); }
    return get();
  }
  // Download button: only after an update was found
  async function download() {
    if (state.state !== 'available') return get();
    say('download started:', state.version);
    set({ state: 'downloading', pct: 0, error: '' });
    try { await autoUpdater.downloadUpdate(); }
    catch (e) { say('ERROR:', String((e && (e.stack || e.message)) || e).slice(0, 1500)); set({ state: 'error', error: friendly(e), pct: null, checkedAt: Date.now() }); }
    return get();
  }
  const install = () => { if (state.state === 'ready') autoUpdater.quitAndInstall(true, true); };

  // checks shortly after start-up and then every few hours (the app can stay open in the tray for days)
  function schedule({ enabled = () => true, delayMs = 15000, everyMs = 6 * 3600 * 1000, timers = { setTimeout, setInterval } } = {}) {
    const run = () => { if (enabled()) check(); };
    const t1 = timers.setTimeout(run, delayMs), t2 = timers.setInterval(run, everyMs);
    return () => { clearTimeout(t1); clearInterval(t2); };
  }
  return { get, check, download, install, schedule };
}

module.exports = { createUpdater, friendly, findRelease };
