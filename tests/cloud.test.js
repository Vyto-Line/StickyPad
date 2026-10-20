// Tests the sync server logic (with a real SQL database standing in for Cloudflare D1) and the encryption.
const assert = require('assert'), fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
process.removeAllListeners('warning');
const { DatabaseSync } = require('node:sqlite');

// A small stand-in for D1: prepare().bind().first()/all()/run() and batch() (all or nothing).
function fakeD1() {
  const db = new DatabaseSync(':memory:'); db.exec(fs.readFileSync(path.join(__dirname, '..', 'cloud', 'schema.sql'), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) || null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
  });
  return { prepare: sql => stmt(sql), batch: async list => { db.exec('BEGIN'); try { const out = []; for (const s of list) out.push(await s.run()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; } } };
}

(async () => {
  const dir = pathToFileURL(path.join(__dirname, '..', 'cloud') + path.sep).href;
  const { handle } = await import(dir + 'worker.js');
  const C = await import(dir + 'crypto.js');
  const env = { DB: fakeD1(), REG_CODE: 'let-me-in-123' };
  const call = async (method, p, { body, token, acct, reg } = {}) => {
    const h = { 'content-type': 'application/json' }; if (token) h.authorization = 'Bearer ' + token; if (acct) h['x-account'] = acct; if (reg) h['x-reg-code'] = reg;
    const r = await handle(new Request('https://x.test' + p, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }), env);
    return { status: r.status, body: await r.json() };
  };

  // ---- encryption ----
  const salt = C.newSalt(), acct = C.randomId();
  const k1 = await C.deriveKeys('correct horse battery staple', salt, 1000), k1b = await C.deriveKeys('correct horse battery staple', salt, 1000), k2 = await C.deriveKeys('another passphrase', salt, 1000);
  assert.strictEqual(k1.token, k1b.token, 'same passphrase and salt -> same token (a second PC gets the same keys)');
  assert.notStrictEqual(k1.token, k2.token);
  const note = { title: 'Plan', blocks: [{ t: 'text', v: 'Καλημέρα' }, { t: 'check', v: 'milk', done: true }] };
  const blob = await C.encryptNote(k1.key, acct, 'note0001', note);
  assert.ok(blob.startsWith('v1.') && !blob.includes('Plan') && !Buffer.from(blob.slice(3), 'base64').toString('latin1').includes('Plan'), 'the blob does not contain the text');
  assert.deepStrictEqual(await C.decryptNote(k1b.key, acct, 'note0001', blob), note);
  await assert.rejects(C.decryptNote(k2.key, acct, 'note0001', blob), 'wrong passphrase cannot read it');
  await assert.rejects(C.decryptNote(k1.key, acct, 'note0002', blob), 'a blob moved to another note id is refused');
  const bad = blob.slice(0, -4) + (blob.endsWith('AAAA') ? 'BBBB' : 'AAAA'); await assert.rejects(C.decryptNote(k1.key, acct, 'note0001', bad), 'a changed blob is refused');

  // ---- accounts ----
  let r = await call('POST', '/v1/register', { body: { id: acct, salt, token: k1.token }, reg: 'wrong' }); assert.strictEqual(r.status, 403, 'needs the registration code');
  r = await call('POST', '/v1/register', { body: { id: acct, salt, token: k1.token } }); assert.strictEqual(r.status, 403);
  r = await call('POST', '/v1/register', { body: { id: acct, salt, token: k1.token }, reg: 'let-me-in-123' }); assert.strictEqual(r.status, 200, JSON.stringify(r));
  r = await call('POST', '/v1/register', { body: { id: acct, salt, token: k2.token }, reg: 'let-me-in-123' }); assert.strictEqual(r.status, 409, 'an account cannot be taken over');
  r = await call('POST', '/v1/register', { body: { id: 'x', salt: 's', token: 't' }, reg: 'let-me-in-123' }); assert.strictEqual(r.status, 400);
  r = await call('GET', '/v1/salt/' + acct); assert.deepStrictEqual(r.body, { salt });
  r = await call('GET', '/v1/salt/' + C.randomId()); assert.strictEqual(r.status, 404);
  const A = { acct, token: k1.token };
  r = await call('GET', '/v1/changes?since=0', { acct, token: k2.token }); assert.strictEqual(r.status, 401, 'wrong token');
  r = await call('GET', '/v1/changes?since=0', { acct }); assert.strictEqual(r.status, 401, 'no token');
  r = await call('GET', '/v1/changes?since=0', A); assert.deepStrictEqual(r.body, { seq: 0, more: false, notes: [] });

  // ---- saving, versions and conflicts ----
  r = await call('PUT', '/v1/notes/note0001', { ...A, body: { base: 0, blob } }); assert.deepStrictEqual([r.status, r.body.version, r.body.seq], [200, 1, 1]);
  r = await call('PUT', '/v1/notes/note0001', { ...A, body: { base: 0, blob } }); assert.strictEqual(r.status, 409, 'saving over a note you have not seen is refused'); assert.strictEqual(r.body.current.version, 1);
  const blob2 = await C.encryptNote(k1.key, acct, 'note0001', { ...note, title: 'Plan v2' });
  r = await call('PUT', '/v1/notes/note0001', { ...A, body: { base: 1, blob: blob2 } }); assert.deepStrictEqual([r.status, r.body.version, r.body.seq], [200, 2, 2]);
  r = await call('PUT', '/v1/notes/note0001', { ...A, body: { base: 1, blob } }); assert.strictEqual(r.status, 409, 'the second PC saved with an old version: refused, and it is told the newer copy');
  assert.strictEqual(r.body.current.blob, blob2, 'the newer copy is returned, so the app can keep both');
  r = await call('PUT', '/v1/notes/note0002', { ...A, body: { base: 0, blob: await C.encryptNote(k1.key, acct, 'note0002', { title: 'B' }) } }); assert.strictEqual(r.body.seq, 3);
  r = await call('GET', '/v1/changes?since=2', A); assert.deepStrictEqual(r.body.notes.map(n => n.id), ['note0002']); assert.strictEqual(r.body.seq, 3);
  r = await call('GET', '/v1/changes?since=0', A); assert.deepStrictEqual(r.body.notes.map(n => [n.id, n.version]), [['note0001', 2], ['note0002', 1]]);
  const got = r.body.notes.find(n => n.id === 'note0001'); assert.deepStrictEqual((await C.decryptNote(k1b.key, acct, 'note0001', got.blob)).title, 'Plan v2', 'a second PC reads it with the same passphrase');
  // deleting
  r = await call('PUT', '/v1/notes/note0002', { ...A, body: { base: 1, deleted: true } }); assert.strictEqual(r.status, 200);
  r = await call('GET', '/v1/changes?since=3', A); assert.deepStrictEqual(r.body.notes.map(n => [n.id, n.deleted, n.blob]), [['note0002', true, null]], 'a deletion reaches the other PC and holds no content');
  // limits and rubbish
  r = await call('PUT', '/v1/notes/note0003', { ...A, body: { base: 0, blob: 'v1.' + 'A'.repeat(310000) } }); assert.ok([413, 400].includes(r.status), 'a huge note is refused: ' + r.status);
  r = await call('PUT', '/v1/notes/note0003', { ...A, body: { base: 0, blob: 'plain text' } }); assert.strictEqual(r.status, 413, 'only encrypted notes are accepted');
  r = await call('PUT', '/v1/notes/note0003', { ...A, body: { base: 'x' } }); assert.strictEqual(r.status, 400);
  r = await call('PUT', '/v1/notes/..%2f..', { ...A, body: { base: 0, blob } }); assert.ok(r.status >= 400);
  r = await call('GET', '/v1/other', A); assert.strictEqual(r.status, 404);
  // one account cannot reach another's notes
  const salt2 = C.newSalt(), acct2 = C.randomId(), kk = await C.deriveKeys('second user', salt2, 1000);
  await call('POST', '/v1/register', { body: { id: acct2, salt: salt2, token: kk.token }, reg: 'let-me-in-123' });
  r = await call('GET', '/v1/changes?since=0', { acct: acct2, token: kk.token }); assert.deepStrictEqual(r.body.notes, [], 'the second account sees none of the first one\'s notes');
  r = await call('GET', '/v1/changes?since=0', { acct, token: kk.token }); assert.strictEqual(r.status, 401, 'its token does not open the first account');
  // paging
  for (let i = 0; i < 205; i++) await call('PUT', '/v1/notes/page' + String(i).padStart(4, '0'), { acct: acct2, token: kk.token, body: { base: 0, blob: await C.encryptNote(kk.key, acct2, 'page' + String(i).padStart(4, '0'), { i }) } });
  r = await call('GET', '/v1/changes?since=0', { acct: acct2, token: kk.token }); assert.ok(r.body.more && r.body.notes.length === 200);
  r = await call('GET', '/v1/changes?since=' + r.body.notes[199].seq, { acct: acct2, token: kk.token }); assert.ok(!r.body.more && r.body.notes.length === 5);
  console.log('cloud ok');
})().catch(e => { console.error(e); process.exit(1); });
