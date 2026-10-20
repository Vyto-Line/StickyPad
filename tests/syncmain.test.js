// The app side of sync: Settings actions, the note adapter (what is uploaded, what is skipped), downloads, deletes, and no passphrase on disk.
process.env.SP_SAFE = '1';
const assert = require('assert'), fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
const H = require('./fake-electron'), fakeD1 = require('./d1fake'), S = require('../sync'), SC = require('../synccrypto');
(async () => {
  const { handlers: h, electron, tmp, wins } = H;
  const { handle } = await import(pathToFileURL(path.join(__dirname, '..', 'cloud', 'worker.js')).href);
  const env = { DB: fakeD1(), REG_CODE: 'reg-code-12345' };
  global.fetch = (url, init) => handle(new Request(url, init), env);
  const act = (n, a) => h['settings:action']({}, n, a);
  await h['note:new']({ sender: { id: 0 } }); const w = wins[wins.length - 1], e = H.ev(w);
  await h['note:update'](e, { title: 'Plan', blocks: [{ t: 'text', v: 'first text' }, { t: 'check', v: 'milk', done: true }] });
  const id1 = (await h['note:get'](e)).id;
  // a second note with a picture and a third that is locked: neither is uploaded
  await h['note:new']({ sender: { id: 0 } }); const w2 = wins[wins.length - 1], e2 = H.ev(w2);
  await h['note:update'](e2, { title: 'Pic', blocks: [{ t: 'text', v: 'has a picture' }, { t: 'img', id: 'abcdef12.webp' }] });
  await h['note:new']({ sender: { id: 0 } }); const w3 = wins[wins.length - 1], e3 = H.ev(w3);
  await h['note:update'](e3, { title: 'Secret', blocks: [{ t: 'text', v: 'locked text' }] }); await h['note:lock'](e3, 'secret1');

  assert.strictEqual((await h['settings:get']({})).sync.on, false, 'off by default');
  let r = await act('syncStart', { mode: 'new', server: 'https://sync.test', reg: 'wrong', pass: 'correct horse battery' }); assert.ok(!r.ok && /registration code/.test(r.error), JSON.stringify(r));
  r = await act('syncStart', { mode: 'new', server: 'https://sync.test', reg: 'reg-code-12345', pass: 'correct horse battery' }); assert.ok(r.ok, JSON.stringify(r));
  assert.ok(r.info.sync.on && r.info.sync.count === 1, 'only the plain note is uploaded: ' + JSON.stringify(r.info.sync));
  const stFile = path.join(electron.app.getPath('userData'), 'sync.json'), raw = fs.readFileSync(stFile, 'utf8');
  assert.ok(!raw.includes('correct horse') && /keyEnc/.test(raw), 'the passphrase is never written to disk');
  const acct = r.info.sync.acct;

  // a second PC joins and sees the note, text only
  const pcB = (() => { const notes = new Map(), st = {}; const io = { fetch: global.fetch, state: st, saveState() {}, protect: s => s, unprotect: s => s,
    notes: { list: () => [...notes].map(([id, x]) => ({ id, payload: x, skip: false })), get: id => notes.has(id) ? { payload: notes.get(id), skip: false } : null, exists: id => notes.has(id), put: (id, p) => notes.set(id, { ...p }), addCopy: p => notes.set('copyxxxx01', { ...p }), remove: id => notes.delete(id) } };
    return { notes, eng: S.create(io) }; })();
  await pcB.eng.start({ mode: 'join', server: 'https://sync.test', acct, pass: 'correct horse battery' });
  let rb = await pcB.eng.run(); assert.ok(rb.ok && rb.pulled === 1, JSON.stringify(rb));
  assert.deepStrictEqual(pcB.notes.get(id1).blocks, [{ t: 'text', v: 'first text' }, { t: 'check', v: 'milk', done: true }]); assert.strictEqual(pcB.notes.size, 1);

  // B edits, the app downloads it
  const pl = pcB.notes.get(id1); pcB.notes.set(id1, { ...pl, blocks: [{ t: 'text', v: 'edited on B' }], updated: Date.now() + 1000 }); await pcB.eng.run();
  r = await act('syncNow'); assert.ok(r.ok, JSON.stringify(r));
  const n1 = await h['note:get'](e); assert.deepStrictEqual(n1.blocks, [{ t: 'text', v: 'edited on B' }], 'the edit arrived in the real note');
  assert.ok(w.webContents.sent.some(m => m[0] === 'note:reload'), 'the open note window is told to reload');
  // B adds a note: it shows up in the app
  pcB.notes.set('bnote0001', { title: 'From B', blocks: [{ t: 'text', v: 'new on B' }], color: '#B9E4FF', font: 'Segoe UI', size: 18, folder: 'Trips', updated: Date.now() }); await pcB.eng.run();
  r = await act('syncNow'); assert.ok(r.ok);
  const list = JSON.stringify(await h['all:list']({})); assert.ok(list.includes('From B') && list.includes('Trips'), 'a note made on the other PC and its folder appear');
  // deleting here deletes there
  await h['note:delete'](e); r = await act('syncNow'); assert.ok(r.ok); await pcB.eng.run(); assert.ok(!pcB.notes.has(id1), 'deleted here -> gone there');
  // the app's own copy never contains pictures or the locked text on the server
  const ch = await (await handle(new Request('https://sync.test/v1/changes?since=0', { headers: { authorization: 'Bearer ' + (await SC.deriveKeys('correct horse battery', (await (await handle(new Request('https://sync.test/v1/salt/' + acct), env)).json()).salt)).token, 'x-account': acct } }), env)).json();
  assert.ok(!JSON.stringify(ch).includes('locked text') && !JSON.stringify(ch).includes('has a picture'), 'locked and picture notes never reach the server');
  // stop: notes stay
  r = await act('syncStop'); assert.ok(r.ok && !r.info.sync.on); assert.ok(JSON.stringify(await h['all:list']({})).includes('From B'), 'stopping keeps the notes');
  assert.ok(!/keyEnc":"[^"]/.test(fs.readFileSync(stFile, 'utf8')), 'the saved key is removed');
  console.log('sync in the app ok'); process.exit(0);
})().catch(e => { console.error('SYNC MAIN FAIL', e); process.exit(1); });
