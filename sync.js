'use strict';
// StickyPad sync engine (test feature). Keeps notes in step with the sync server (see cloud/). Notes are encrypted before they leave the PC.
// It knows nothing about Electron: the app gives it a small "notes adapter" (io), so two PCs can be tested together.
//
//   io.fetch(url, init)            like fetch()
//   io.state                       a plain object that the app saves between runs (server, acct, salt, keyEnc, seq, notes, conflicts...)
//   io.saveState()
//   io.protect(text) / io.unprotect(text)    keeps the key safe on disk (Windows data protection in the app)
//   io.notes.list()                -> [{ id, payload, skip }]   every live note; skip = locked, empty or has pictures (never synced)
//   io.notes.get(id)               -> { payload, skip } | null
//   io.notes.put(id, payload)      create or overwrite a note with that id
//   io.notes.addCopy(payload)      add a new note (used for conflict copies)
//   io.notes.remove(id)            move a note to the trash
//   io.notes.exists(id)
//
// Rules: a note is uploaded when its content changed here; downloaded when it changed on the server and not here;
// when both changed the newer one keeps the note and the other becomes "(conflict copy)". Deleting moves to the trash on the other PC.
const crypto = require('crypto');
const SC = require('./synccrypto');

const hashOf = p => crypto.createHash('sha256').update(JSON.stringify([p.title || '', p.blocks || [], p.color || '', p.font || '', p.size || 0, p.folder || ''])).digest('hex');
const COPY = ' (conflict copy)';
class SyncError extends Error { constructor(msg, code) { super(msg); this.code = code; } }

function create(io) {
  const st = io.state;
  let keys = null, running = false, again = false;
  st.notes = st.notes || {}; st.seq = st.seq || 0; st.conflicts = st.conflicts || 0;

  const base = () => String(st.server || '').replace(/\/+$/, '');
  async function call(method, path, { body, auth = true, reg } = {}) {
    const h = { 'content-type': 'application/json' };
    if (auth) { if (!keys) throw new SyncError('Sync is locked. Turn it on again.', 'nokey'); h.authorization = 'Bearer ' + keys.token; h['x-account'] = st.acct; }
    if (reg) h['x-reg-code'] = reg;
    let r;
    try { r = await io.fetch(base() + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }); }
    catch { throw new SyncError('Offline or the server cannot be reached.', 'offline'); }
    let j = null; try { j = await r.json(); } catch {}
    return { status: r.status, body: j };
  }
  const bad = (r, what) => new SyncError(r.status === 401 ? 'Wrong passphrase, or this account does not exist on the server.' : what + ' (server said ' + r.status + (r.body && r.body.error ? ': ' + r.body.error : '') + ').', 'http' + r.status);

  async function useRaw(raw) { keys = await SC.fromRaw(raw); }
  const checkServer = s => {
    s = String(s || '').trim().replace(/\/+$/, '');
    if (!/^https:\/\/[^\s/]+(\/[^\s]*)?$/i.test(s) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(s)) throw new SyncError('The server address must start with https://', 'address');
    return s;
  };

  // mode 'new': make an account here. mode 'join': use the account of another PC.
  async function start(opts) {
    const before = { server: st.server, acct: st.acct };
    try { await startInner(opts); } catch (e) { st.server = before.server; st.acct = before.acct; keys = st.on ? keys : null; throw e; }
  }
  async function startInner({ mode, server, reg, pass, acct }) {
    if (!String(pass || '').length || String(pass).length < 8) throw new SyncError('Use a passphrase of at least 8 characters.', 'pass');
    st.server = checkServer(server);
    let salt, id;
    if (mode === 'join') {
      id = String(acct || '').trim(); if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) throw new SyncError('Enter the account id from your other PC.', 'acct');
      st.acct = id;
      const r = await call('GET', '/v1/salt/' + id, { auth: false });
      if (r.status === 404) throw new SyncError('No account with that id on this server.', 'noacct');
      if (r.status !== 200 || !r.body || !r.body.salt) throw bad(r, 'Could not reach the account');
      salt = r.body.salt;
    } else {
      id = SC.randomId(); salt = SC.newSalt(); st.acct = id;
    }
    const raw = await SC.deriveRaw(pass, salt, io.iterations);
    await useRaw(raw);
    if (mode === 'join') {
      const r = await call('GET', '/v1/changes?since=0');   // proves the passphrase is right
      if (r.status !== 200) throw bad(r, 'Could not log in');
    } else {
      const r = await call('POST', '/v1/register', { auth: false, reg: String(reg || ''), body: { id, salt, token: keys.token } });
      if (r.status === 403) throw new SyncError('Wrong registration code.', 'regcode');
      if (r.status !== 200) throw bad(r, 'Could not create the account');
    }
    Object.assign(st, { on: true, salt, keyEnc: io.protect(SC.b64(raw)), seq: 0, notes: {}, conflicts: 0, lastAt: 0, lastError: '' });
    io.saveState();
  }
  async function resume() {   // at app start: load the saved key
    keys = null;
    if (!st.on || !st.keyEnc) return false;
    try { await useRaw(SC.unb64(io.unprotect(st.keyEnc))); return true; } catch { st.lastError = 'Could not unlock the saved key. Turn sync on again.'; return false; }
  }
  function stop() {   // notes stay here; the copy on the server stays too
    keys = null; Object.assign(st, { on: false, keyEnc: '', seq: 0, notes: {}, lastError: '' }); io.saveState();
  }

  async function applyRemote(rn, stats) {
    const m = st.notes[rn.id];
    if (m && m.v >= rn.version) return;   // our own save (or an older one)
    const exists = io.notes.exists(rn.id), local = exists ? io.notes.get(rn.id) : null;
    if (local && local.skip) return;      // locked or has pictures here: never overwritten
    if (rn.deleted) {
      if (exists) {
        if (m && !m.del && hashOf(local.payload) === m.h) { io.notes.remove(rn.id); stats.removed++; st.notes[rn.id] = { v: rn.version, h: '', del: true }; }
        else st.notes[rn.id] = { v: rn.version, h: '', del: true };   // changed here since: keep it; it is uploaded again
      } else st.notes[rn.id] = { v: rn.version, h: '', del: true };
      return;
    }
    let payload;
    try { payload = await SC.decryptNote(keys.key, st.acct, rn.id, rn.blob); }
    catch { stats.errors++; return; }
    const ph = hashOf(payload);
    if (!exists) { io.notes.put(rn.id, payload); stats.pulled++; st.notes[rn.id] = { v: rn.version, h: ph, del: false }; return; }
    const lh = hashOf(local.payload), changedHere = !m || m.del || lh !== m.h;
    if (!changedHere || lh === ph) {
      if (lh !== ph) { io.notes.put(rn.id, payload); stats.pulled++; }
      st.notes[rn.id] = { v: rn.version, h: ph, del: false }; return;
    }
    // changed on both PCs: the newer one keeps the note, the other one becomes a copy
    st.conflicts++; stats.conflicts++;
    if ((payload.updated || 0) > (local.payload.updated || 0)) {
      io.notes.addCopy({ ...local.payload, title: ((local.payload.title || 'Untitled') + COPY).slice(0, 60) });
      io.notes.put(rn.id, payload); stats.pulled++;
      st.notes[rn.id] = { v: rn.version, h: ph, del: false };
    } else {
      io.notes.addCopy({ ...payload, title: ((payload.title || 'Untitled') + COPY).slice(0, 60) });
      st.notes[rn.id] = { v: rn.version, h: m && !m.del ? m.h : '', del: false };   // ours is newer: uploaded below on top of the server copy
    }
  }

  async function pull(stats) {
    let since = st.seq || 0;
    for (let i = 0; i < 100; i++) {
      const r = await call('GET', '/v1/changes?since=' + since);
      if (r.status !== 200) throw bad(r, 'Could not read the changes');
      for (const rn of r.body.notes) { await applyRemote(rn, stats); since = Math.max(since, rn.seq); }
      st.seq = since;
      if (!r.body.more) break;
    }
  }

  async function put(id, body, stats) {
    const r = await call('PUT', '/v1/notes/' + id, { body });
    if (r.status === 200) return r.body;
    if (r.status === 409) { stats.retry = true; return null; }
    if (r.status === 413) { stats.errors++; return null; }
    throw bad(r, 'Could not save a note');
  }
  async function push(stats) {
    for (const l of io.notes.list()) {
      if (l.skip) continue;
      const h = hashOf(l.payload), m = st.notes[l.id];
      if (m && !m.del && m.h === h) continue;
      const blob = await SC.encryptNote(keys.key, st.acct, l.id, l.payload);
      const o = await put(l.id, { base: m ? m.v : 0, blob }, stats);
      if (o) { st.notes[l.id] = { v: o.version, h, del: false }; stats.pushed++; }
    }
    for (const [id, m] of Object.entries(st.notes)) {   // notes deleted here (trash) are deleted on the server too
      if (m.del || io.notes.exists(id)) continue;
      const o = await put(id, { base: m.v, deleted: true }, stats);
      if (o) { st.notes[id] = { v: o.version, h: '', del: true }; stats.deleted++; }
    }
  }

  // one full round: first fetch what changed elsewhere, then upload what changed here
  async function run() {
    if (!st.on) return { ok: false, error: 'Sync is off.' };
    if (running) { again = true; return { ok: true, busy: true }; }
    running = true;
    const total = { pulled: 0, pushed: 0, deleted: 0, removed: 0, conflicts: 0, errors: 0 };
    try {
      for (let round = 0; round < 3; round++) {
        const stats = { ...total, retry: false };
        await pull(stats); await push(stats);
        Object.assign(total, { pulled: stats.pulled, pushed: stats.pushed, deleted: stats.deleted, removed: stats.removed, conflicts: stats.conflicts, errors: stats.errors });
        if (!stats.retry) break;   // another PC saved in between: read again and retry
      }
      st.lastAt = Date.now(); st.lastError = '';
      io.saveState(); if (total.pulled || total.removed || total.conflicts) { try { io.changed && io.changed(); } catch {} }
      return { ok: true, ...total };
    } catch (e) {
      st.lastError = e && e.message ? String(e.message) : 'Sync failed.'; io.saveState();
      return { ok: false, error: st.lastError, code: e && e.code };
    } finally { running = false; if (again) { again = false; } }
  }
  const status = () => ({
    on: !!st.on, server: st.server || '', acct: st.acct || '', lastAt: st.lastAt || 0, error: st.lastError || '', busy: running,
    count: Object.values(st.notes).filter(x => !x.del).length, conflicts: st.conflicts || 0, locked: !!st.on && !keys
  });
  return { start, resume, stop, run, status, hashOf, COPY };
}
module.exports = { create, hashOf, SyncError, COPY };
