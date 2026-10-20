// Two PCs and one (test) server: uploads, downloads, conflicts, deletes, restores, locked notes, offline.
const assert = require('assert'), fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
const S = require('../sync');

const fakeD1 = require('./d1fake');

(async () => {
  const { handle } = await import(pathToFileURL(path.join(__dirname, '..', 'cloud', 'worker.js')).href);
  const env = { DB: fakeD1(), REG_CODE: 'reg-code-12345' };
  const URL0 = 'https://sync.test';
  let online = true, beforePut = null;
  const net = async (url, init) => {
    if (!online) throw new Error('offline');
    if (init && init.method === 'PUT' && beforePut) { const f = beforePut; beforePut = null; await f(); }
    return handle(new Request(url, init), env);
  };
  let copies = 0;
  function pc() {
    const notes = new Map(), trash = [], st = {};
    const io = { fetch: net, state: st, saveState() {}, protect: s => 'P' + s, unprotect: s => s.slice(1), iterations: 1000, changed() { io.changedCalls = (io.changedCalls || 0) + 1; },
      notes: {
        list: () => [...notes].map(([id, x]) => ({ id, payload: x.payload, skip: !!x.skip })),
        get: id => { const x = notes.get(id); return x ? { payload: x.payload, skip: !!x.skip } : null; },
        put: (id, p) => { const o = notes.get(id); notes.set(id, { payload: { ...p }, skip: o && o.skip }); },
        addCopy: p => { notes.set('copyid' + String(++copies).padStart(4, '0'), { payload: { ...p } }); },
        remove: id => { trash.push(notes.get(id)); notes.delete(id); },
        exists: id => notes.has(id) } };
    const eng = S.create(io);
    return { notes, trash, st, io, eng,
      add: (id, title, text, updated = Date.now()) => notes.set(id, { payload: { title, blocks: [{ t: 'text', v: text }], color: '#FFF2A8', font: 'Segoe UI', size: 16, folder: '', updated } }),
      edit: (id, text, updated = Date.now()) => { const x = notes.get(id); x.payload = { ...x.payload, blocks: [{ t: 'text', v: text }], updated }; },
      text: id => notes.has(id) ? notes.get(id).payload.blocks.map(b => b.v).join('') : null };
  }
  const A = pc(), B = pc();

  // ---- joining the account ----
  await assert.rejects(A.eng.start({ mode: 'new', server: 'http://evil.example', reg: 'x', pass: 'long passphrase' }), /https/);
  await assert.rejects(A.eng.start({ mode: 'new', server: URL0, reg: 'x', pass: 'short' }), /8 characters/);
  await assert.rejects(A.eng.start({ mode: 'new', server: URL0, reg: 'wrong-code', pass: 'long passphrase' }), /registration code/);
  assert.strictEqual(A.eng.status().on, false);
  await A.eng.start({ mode: 'new', server: URL0, reg: 'reg-code-12345', pass: 'correct horse battery' });
  assert.ok(A.eng.status().on && A.st.keyEnc.startsWith('P') && !JSON.stringify(A.st).includes('correct horse'), 'the passphrase is never stored; the key is protected');
  const acct = A.st.acct;
  await assert.rejects(B.eng.start({ mode: 'join', server: URL0, acct, pass: 'wrong passphrase!' }), /passphrase/);
  await assert.rejects(B.eng.start({ mode: 'join', server: URL0, acct: 'nosuchaccount1', pass: 'correct horse battery' }), /No account/);
  await assert.rejects(B.eng.start({ mode: 'join', server: URL0, acct: 'bad id', pass: 'correct horse battery' }), /account id/);
  await B.eng.start({ mode: 'join', server: URL0, acct, pass: 'correct horse battery' });

  // ---- first upload and download ----
  A.add('note0001', 'Plan', 'first note'); A.add('note0002', 'Shopping', 'milk'); A.add('lockedn1', 'Secret', 'never sync me'); A.notes.get('lockedn1').skip = true;
  let r = await A.eng.run(); assert.deepStrictEqual([r.ok, r.pushed], [true, 2], JSON.stringify(r));
  r = await B.eng.run(); assert.deepStrictEqual([r.ok, r.pulled, r.pushed], [true, 2, 0], JSON.stringify(r));
  assert.strictEqual(B.text('note0001'), 'first note'); assert.ok(!B.notes.has('lockedn1'), 'a skipped (locked) note is never uploaded');
  assert.ok(B.io.changedCalls >= 1, 'the app is told to refresh');
  r = await A.eng.run(); assert.deepStrictEqual([r.pulled, r.pushed, r.conflicts], [0, 0, 0], 'nothing to do the second time: no loops');
  r = await B.eng.run(); assert.deepStrictEqual([r.pulled, r.pushed], [0, 0]);

  // ---- an edit travels ----
  A.edit('note0001', 'first note, edited on A'); await A.eng.run(); r = await B.eng.run();
  assert.strictEqual(B.text('note0001'), 'first note, edited on A'); assert.strictEqual(r.pushed, 0, 'a downloaded note is not uploaded back');
  r = await A.eng.run(); assert.strictEqual(r.pulled, 0);

  // ---- both PCs edit the same note: nothing is lost ----
  const t0 = Date.now();
  A.edit('note0002', 'milk and eggs (A)', t0 + 1000); B.edit('note0002', 'milk and bread (B)', t0 + 5000);
  await A.eng.run(); r = await B.eng.run();
  assert.strictEqual(r.conflicts, 1, JSON.stringify(r)); assert.strictEqual(B.text('note0002'), 'milk and bread (B)', 'the newer edit keeps the note');
  const bCopy = [...B.notes].find(([id, x]) => /conflict copy/.test(x.payload.title)); assert.ok(bCopy && bCopy[1].payload.blocks[0].v === 'milk and eggs (A)', 'the older edit survives as a conflict copy');
  await B.eng.run(); await A.eng.run(); await B.eng.run();
  assert.strictEqual(A.text('note0002'), 'milk and bread (B)'); assert.strictEqual(A.notes.size - 1, B.notes.size - 0 - 0, 'both PCs end with the same notes (A also holds the locked one)');
  assert.ok([...A.notes].some(([, x]) => /conflict copy/.test(x.payload.title)), 'the copy reaches A as well');
  assert.ok(A.eng.status().conflicts >= 1 || B.eng.status().conflicts >= 1);
  // the older edit wins nothing when it comes second: a local edit that is NEWER keeps the note
  const t1 = Date.now() + 100000;
  A.edit('note0001', 'A newer', t1 + 5000); B.edit('note0001', 'B older', t1);
  await B.eng.run(); await A.eng.run(); assert.strictEqual(A.text('note0001'), 'A newer', 'newer local edit stays'); await B.eng.run(); assert.strictEqual(B.text('note0001'), 'A newer');
  assert.ok([...B.notes].some(([, x]) => x.payload.title.includes('conflict copy') && x.payload.blocks[0].v === 'B older'), 'the older text is kept as a copy');

  // ---- a save that races with another PC (the server refuses it, the engine reads again and retries) ----
  await A.eng.run(); await B.eng.run();
  B.edit('note0002', 'race B', Date.now() + 200000);
  beforePut = async () => { A.edit('note0002', 'race A', Date.now() + 100000); const s = A.eng; await s.run(); };
  r = await B.eng.run(); assert.ok(r.ok && r.pushed >= 1 && r.conflicts >= 1, 'the refused save is retried in the same run: ' + JSON.stringify(r));
  await A.eng.run(); await B.eng.run(); await A.eng.run();
  const all = x => [...x.notes.values()].map(n => n.payload.blocks.map(b => b.v).join('')).join('|');
  assert.ok(all(A).includes('race A') && all(A).includes('race B') && all(B).includes('race A') && all(B).includes('race B'), 'both edits survive on both PCs: ' + all(A));

  // ---- deleting and restoring ----
  const keep = A.notes.get('note0002'); A.notes.delete('note0002');
  r = await A.eng.run(); assert.strictEqual(r.deleted, 1, JSON.stringify(r));
  r = await B.eng.run(); assert.strictEqual(r.removed, 1); assert.ok(!B.notes.has('note0002') && B.trash.length === 1, 'moved to the trash on the other PC');
  A.notes.set('note0002', keep);   // restored from the trash on A
  await A.eng.run(); r = await B.eng.run(); assert.ok(B.notes.has('note0002'), 'a restored note comes back everywhere');
  // a note edited on B while A deleted it is not thrown away
  B.edit('note0002', 'kept on B', Date.now() + 300000); const k2 = A.notes.get('note0002'); A.notes.delete('note0002'); await A.eng.run();
  r = await B.eng.run(); assert.ok(B.notes.has('note0002') && B.text('note0002') === 'kept on B', 'a note edited elsewhere survives a delete'); await A.eng.run(); assert.strictEqual(A.text('note0002'), 'kept on B');

  // ---- notes that must not change ----
  const frozen = B.text('note0001'); B.notes.get('note0001').skip = true;   // locked (or has pictures) on B
  A.edit('note0001', 'changed on A while B has it locked', Date.now() + 500000); await A.eng.run(); r = await B.eng.run();
  assert.strictEqual(B.text('note0001'), frozen, 'a locked note on this PC is never overwritten by a download'); B.notes.get('note0001').skip = false;
  B.add('lockedn2', 'Locked B', 'x'); B.notes.get('lockedn2').skip = true; await B.eng.run();
  assert.ok(![...A.notes.keys()].includes('lockedn2'));

  // ---- offline and errors ----
  online = false; A.edit('note0001', 'offline edit', Date.now() + 400000); r = await A.eng.run(); assert.strictEqual(r.ok, false); assert.match(r.error, /Offline/); assert.ok(A.eng.status().error);
  online = true; r = await A.eng.run(); assert.ok(r.ok && r.pushed === 1, 'the edit is uploaded when the connection is back'); assert.strictEqual(A.eng.status().error, '');
  await B.eng.run(); assert.strictEqual(B.text('note0001'), 'offline edit');
  // restart: the saved key is loaded again
  const A2 = S.create(A.io); assert.strictEqual(await A2.resume(), true); r = await A2.run(); assert.ok(r.ok && r.pushed === 0 && r.pulled === 0);
  // stop keeps the notes
  A.eng.stop(); assert.strictEqual(A.eng.status().on, false); assert.ok(A.notes.size >= 3, 'stopping sync keeps the notes on this PC'); assert.strictEqual(A.st.keyEnc, '');
  r = await A.eng.run(); assert.strictEqual(r.ok, false);
  console.log('sync ok');
})().catch(e => { console.error(e); process.exit(1); });
