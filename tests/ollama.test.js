const O = require('../ollama.js'); const assert = require('assert'); const { EventEmitter } = require('events'); const { Readable } = require('stream'); const fs = require('fs'); const os = require('os'); const path = require('path'); const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-'));
const stream = chunks => ({ ok: true, status: 200, body: { getReader() { let i = 0; return { read: async () => i < chunks.length ? { value: new TextEncoder().encode(chunks[i++]), done: false } : { done: true } }; } } });
(async () => {
  assert(O.validName('llama3.2:3b') && O.validName('library/x') && !O.validName('a b') && !O.validName('-x') && !O.validName('x;rm') && !O.validName(5));
  let s = await O.status('http://x', async () => ({ ok: true, json: async () => ({ models: [{ name: 'llama3.2:3b', size: 5 }] }) })); assert(s.running && s.models[0].name === 'llama3.2:3b');
  s = await O.status('http://x', async () => { throw new Error('no'); }); assert(!s.running && !s.models.length);
  const ev = []; await O.pull('http://x', 'llama3.2:3b', p => ev.push(p), null, async () => stream(['{"status":"pulling","total":100,"compl', 'eted":50}\n{"status":"success"}\n']));
  assert.deepStrictEqual(ev.map(e => e.pct), [50, null]); assert(ev[1].done);
  await assert.rejects(O.pull('http://x', 'bad name', null, null, async () => {}), /not valid/);
  await assert.rejects(O.pull('http://x', 'a', null, null, async () => stream(['{"error":"pull model manifest: file does not exist"}\n'])), /manifest/);
  await assert.rejects(O.pull('http://x', 'a', null, null, async () => stream(['{"status":"pulling"}\n'])), /before it finished/);
  await assert.rejects(O.pull('http://x', 'a', null, null, async () => { throw new Error('x'); }), /reach Ollama/);
  let seen; assert.strictEqual(await O.remove('http://x/', 'llama3.2:3b', async (u, o) => { seen = [u, o.method, JSON.parse(o.body)]; return { ok: true, status: 200 }; }), true);
  assert.deepStrictEqual(seen, ['http://x/api/delete', 'DELETE', { model: 'llama3.2:3b', name: 'llama3.2:3b' }]);
  await assert.rejects(O.remove('http://x', 'bad name', async () => {}), /not valid/);
  await assert.rejects(O.remove('http://x', 'a', async () => ({ ok: false, status: 404 })), /not installed/);
  await assert.rejects(O.remove('http://x', 'a', async () => ({ ok: false, status: 500, json: async () => ({ error: 'boom' }) })), /boom/);
  await assert.rejects(O.remove('http://x', 'a', async () => { throw new Error('x'); }), /reach Ollama/);
  const ac = new AbortController(); ac.abort(); await assert.rejects(O.pull('http://x', 'a', null, ac.signal, async () => { const e = new Error('ab'); e.name = 'AbortError'; throw e; }), /ab/);
  // installer
  const mk = (code, size, headers = {}) => (u, cb) => { const r = Readable.from([Buffer.alloc(size)]); r.statusCode = code; r.headers = { 'content-length': String(size), ...headers }; setImmediate(() => cb(r)); return new EventEmitter(); };
  const f = path.join(TMP, 'inst.exe'); const pr = []; await O.downloadInstaller(f, p => pr.push(p.pct), null, mk(200, 2 * 1024 * 1024)); assert(fs.statSync(f).size === 2 * 1024 * 1024 && pr.at(-1) === 100);
  await assert.rejects(O.downloadInstaller(path.join(TMP, 's.exe'), null, null, mk(200, 100)), /looks wrong/); assert(!fs.existsSync(path.join(TMP, 's.exe')));
  await assert.rejects(O.downloadInstaller(f, null, null, mk(404, 10)), /404/);
  await assert.rejects(O.downloadInstaller(f, null, null, mk(200, 10), 'https://evil.com/a.exe'), /unexpected/);
  await assert.rejects(O.downloadInstaller(f, null, null, mk(200, 10), 'http://ollama.com/a.exe'), /unexpected/);
  let n = 0; const redir = (u, cb) => { n++; return n === 1 ? mk(302, 1, { location: 'https://github.com/x/y.exe' })(u, cb) : mk(200, 2 * 1024 * 1024)(u, cb); };
  await O.downloadInstaller(f, null, null, redir); assert(n === 2);
  const bad = (u, cb) => mk(302, 1, { location: 'https://evil.com/x' })(u, cb); await assert.rejects(O.downloadInstaller(f, null, null, bad), /unexpected/);
  // run / find / start
  let args; const sp = (c, a) => { args = a; const e = new EventEmitter(); e.unref = () => {}; setImmediate(() => e.emit('exit', 0)); return e; };
  await O.runInstaller('x.exe', sp); assert.deepStrictEqual(args, ['/SILENT']);
  await assert.rejects(O.runInstaller('x', () => { const e = new EventEmitter(); setImmediate(() => e.emit('exit', 5)); return e; }), /code 5/);
  assert(O.findOllama({ LOCALAPPDATA: 'C:\\L' }, () => false) === null); assert(O.findOllama({ LOCALAPPDATA: 'C:\\L' }, p => /ollama app/.test(p)));
  assert(O.startOllama({ LOCALAPPDATA: 'C:\\L' }, sp, () => true) === true); assert(O.startOllama({}, sp, () => false) === false);
  let k = 0; assert(await O.waitUntilRunning('u', 5, 1, async () => ({ running: ++k >= 3 }))); assert(!(await O.waitUntilRunning('u', 2, 1, async () => ({ running: false }))));
  console.log('ollama.js: all tests passed');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
