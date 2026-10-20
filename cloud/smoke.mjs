// Checks a deployed StickyPad sync server from your PC. It makes a TEST account (random id), saves one encrypted note,
// reads it back, tries a conflict and a wrong login, then deletes the note. Your real notes are never touched.
//   node smoke.mjs https://stickypad-sync.YOURNAME.workers.dev  YOUR-REGISTRATION-CODE  "any test passphrase"
import { createRequire } from 'node:module';
const { deriveKeys, encryptNote, decryptNote, newSalt, randomId } = createRequire(import.meta.url)('../synccrypto.js');
const [base, reg, pass] = process.argv.slice(2);
if (!base || !reg || !pass) { console.log('Usage: node smoke.mjs <server address> <registration code> "<test passphrase>"'); process.exit(2); }
let bad = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) bad++; };
const api = async (method, p, { body, token, acct, code } = {}) => {
  const h = { 'content-type': 'application/json' }; if (token) h.authorization = 'Bearer ' + token; if (acct) h['x-account'] = acct; if (code) h['x-reg-code'] = code;
  const r = await fetch(base.replace(/\/$/, '') + p, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch {} return { status: r.status, body: j };
};
const t0 = Date.now();
const acct = randomId(), salt = newSalt(), id = randomId(), { key, token } = await deriveKeys(pass, salt);
let r = await api('POST', '/v1/register', { body: { id: acct, salt, token }, code: 'definitely-wrong' }); ok(r.status === 403, 'registration with a wrong code is refused');
r = await api('POST', '/v1/register', { body: { id: acct, salt, token }, code: reg }); ok(r.status === 200, 'test account created (' + r.status + ')');
if (r.status !== 200) { console.log(r.body); process.exit(1); }
r = await api('GET', '/v1/salt/' + acct); ok(r.body && r.body.salt === salt, 'a second PC can fetch the salt');
const secret = { title: 'Smoke test', blocks: [{ t: 'text', v: 'Καλημέρα from the test' }] };
const blob = await encryptNote(key, acct, id, secret);
r = await api('PUT', '/v1/notes/' + id, { acct, token, body: { base: 0, blob } }); ok(r.status === 200 && r.body.version === 1, 'encrypted note saved (' + r.status + ')');
r = await api('PUT', '/v1/notes/' + id, { acct, token, body: { base: 0, blob } }); ok(r.status === 409, 'saving over a newer copy is refused (conflict)');
const wrong = (await deriveKeys('wrong passphrase', salt)).token;
r = await api('GET', '/v1/changes?since=0', { acct, token: wrong }); ok(r.status === 401, 'a wrong passphrase cannot log in');
r = await api('GET', '/v1/changes?since=0', { acct, token }); ok(r.status === 200 && r.body.notes.length === 1, 'the note comes back in the changes');
const back = r.body.notes[0], k2 = (await deriveKeys(pass, (await api('GET', '/v1/salt/' + acct)).body.salt)).key;
let same = false; try { same = JSON.stringify(await decryptNote(k2, acct, id, back.blob)) === JSON.stringify(secret); } catch {}
ok(same, 'decrypted on "another PC" with only the passphrase: same text');
ok(!JSON.stringify(back).includes('Smoke test') && !JSON.stringify(back).includes('Καλημέρα'), 'the server copy contains no readable text');
r = await api('PUT', '/v1/notes/' + id, { acct, token, body: { base: 1, deleted: true } }); ok(r.status === 200, 'note deleted');
console.log((bad ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED') + '  (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
console.log('Test account id (can be ignored): ' + acct);
process.exit(bad ? 1 : 0);
