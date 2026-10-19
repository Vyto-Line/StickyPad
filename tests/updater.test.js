const { createUpdater, friendly } = require('../updater.js'), assert = require('assert'), { EventEmitter } = require('events');
(async () => {
  const mk = (checkImpl) => { const au = new EventEmitter(); au.checkForUpdates = async () => checkImpl(au); au.quitAndInstall = (...a) => { au.quit = a; }; return au; };
  // found, downloaded
  let ready = null, events = [];
  let au = mk(a => { a.emit('checking-for-update'); a.emit('update-available', { version: '1.12.0' }); a.emit('download-progress', { percent: 42.4 }); a.emit('update-downloaded', { version: '1.12.0' }); });
  let u = createUpdater({ autoUpdater: au, send: m => events.push(m.state), onReady: v => { ready = v; } });
  assert.strictEqual(u.get().state, 'idle'); assert(au.autoDownload && au.autoInstallOnAppQuit && au.allowPrerelease);
  let r = await u.check(); assert.strictEqual(r.state, 'ready'); assert.strictEqual(r.version, '1.12.0'); assert.strictEqual(ready, '1.12.0');
  assert.deepStrictEqual(events.filter((x, i) => events.indexOf(x) === i), ['checking', 'downloading', 'ready']);
  u.install(); assert.deepStrictEqual(au.quit, [true, true]);
  assert.strictEqual((await u.check()).state, 'ready', 'a downloaded update is not checked again');
  // nothing new
  au = mk(a => { a.emit('checking-for-update'); a.emit('update-not-available', {}); }); u = createUpdater({ autoUpdater: au });
  r = await u.check(); assert.strictEqual(r.state, 'none'); assert(r.checkedAt > 0); u.install(); assert(!au.quit, 'install does nothing unless an update is ready');
  // errors: thrown and emitted
  u = createUpdater({ autoUpdater: mk(() => { throw new Error('getaddrinfo ENOTFOUND github.com'); }) }); r = await u.check();
  assert.strictEqual(r.state, 'error'); assert(/internet/.test(r.error));
  u = createUpdater({ autoUpdater: mk(a => a.emit('error', new Error('Cannot find latest.yml in the latest release'))) }); r = await u.check(); assert(/No downloadable update/.test(r.error));
  assert(/limiting/.test(friendly(new Error('HTTP 403 rate limit exceeded')))); assert(/failed: boom/.test(friendly(new Error('boom\nstack'))));
  // can retry after an error
  let n = 0; au = mk(a => { n++; if (n === 1) throw new Error('ETIMEDOUT'); a.emit('update-not-available'); }); u = createUpdater({ autoUpdater: au });
  assert.strictEqual((await u.check()).state, 'error'); assert.strictEqual((await u.check()).state, 'none');
  // unsupported (running from source)
  u = createUpdater({ autoUpdater: null }); r = await u.check(); assert.strictEqual(r.state, 'unsupported'); assert(/installed app/.test(r.error));
  u = createUpdater({ autoUpdater: mk(() => {}), supported: false }); assert.strictEqual(u.get().state, 'unsupported');
  // schedule respects the switch
  let calls = 0, cb = null; au = mk(() => { calls++; }); u = createUpdater({ autoUpdater: au });
  let on = true; const stop = u.schedule({ enabled: () => on, delayMs: 1, everyMs: 1e9, timers: { setTimeout: (f) => { cb = f; return 0; }, setInterval: () => 0 } });
  cb(); await new Promise(r => setImmediate(r)); assert.strictEqual(calls, 1); on = false; cb(); await new Promise(r => setImmediate(r)); assert.strictEqual(calls, 1, 'switched off: no check'); stop();
  console.log('updater ok');
})().catch(e => { console.error(e); process.exit(1); });
