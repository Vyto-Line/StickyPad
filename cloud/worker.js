// StickyPad sync server (Cloudflare Worker + D1). It stores encrypted notes and never sees their content.
//   POST /v1/register          { id, salt, token }  + header X-Reg-Code      -> creates an account (only people with your code can)
//   GET  /v1/salt/:id                                                        -> { salt }  (public; a new PC needs it to derive its keys)
//   GET  /v1/changes?since=N   Authorization: Bearer <token>                 -> notes changed after N
//   PUT  /v1/notes/:id         { base, blob, deleted }  + Authorization      -> save; 409 when someone saved first (nothing is overwritten)
const MAX_BLOB = 300000;     // bytes of one encrypted note
const MAX_NOTES = 5000;      // per account
const PAGE = 200;
const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const sha256hex = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };   // constant time

async function auth(req, env, acct) {
  const m = /^Bearer (\S{20,200})$/.exec(req.headers.get('authorization') || '');
  if (!m || !ID_RE.test(acct)) return false;
  const row = await env.DB.prepare('SELECT token_hash FROM accounts WHERE id = ?').bind(acct).first();
  return !!row && same(row.token_hash, await sha256hex(m[1]));
}
const body = async req => { try { const t = await req.text(); return t.length > MAX_BLOB + 2000 ? null : JSON.parse(t); } catch { return null; } };
const pub = r => ({ id: r.id, version: r.version, seq: r.seq, updated: r.updated, deleted: !!r.deleted, blob: r.deleted ? null : r.blob });

export async function handle(req, env) {
  const url = new URL(req.url), p = url.pathname, method = req.method;

  if (method === 'POST' && p === '/v1/register') {
    if (!env.REG_CODE || !same(req.headers.get('x-reg-code') || '', env.REG_CODE)) return json({ error: 'wrong registration code' }, 403);
    const b = await body(req);
    if (!b || !ID_RE.test(b.id || '') || typeof b.salt !== 'string' || b.salt.length < 16 || b.salt.length > 64 || typeof b.token !== 'string' || b.token.length < 20 || b.token.length > 200) return json({ error: 'bad request' }, 400);
    try { await env.DB.prepare('INSERT INTO accounts (id, salt, token_hash, seq, created) VALUES (?, ?, ?, 0, ?)').bind(b.id, b.salt, await sha256hex(b.token), Date.now()).run(); }
    catch { return json({ error: 'account exists' }, 409); }
    return json({ ok: true });
  }

  let m = method === 'GET' && /^\/v1\/salt\/([\w-]+)$/.exec(p);
  if (m) {
    if (!ID_RE.test(m[1])) return json({ error: 'not found' }, 404);
    const row = await env.DB.prepare('SELECT salt FROM accounts WHERE id = ?').bind(m[1]).first();
    return row ? json({ salt: row.salt }) : json({ error: 'not found' }, 404);
  }

  const acct = req.headers.get('x-account') || '';
  if (method === 'GET' && p === '/v1/changes') {
    if (!(await auth(req, env, acct))) return json({ error: 'not allowed' }, 401);
    const since = Math.max(0, parseInt(url.searchParams.get('since'), 10) || 0);
    const rows = (await env.DB.prepare('SELECT id, version, seq, updated, deleted, blob FROM notes WHERE acct = ? AND seq > ? ORDER BY seq LIMIT ?').bind(acct, since, PAGE + 1).all()).results;
    const a = await env.DB.prepare('SELECT seq FROM accounts WHERE id = ?').bind(acct).first();
    return json({ seq: a.seq, more: rows.length > PAGE, notes: rows.slice(0, PAGE).map(pub) });
  }

  m = method === 'PUT' && /^\/v1\/notes\/([\w-]+)$/.exec(p);
  if (m) {
    const id = m[1];
    if (!(await auth(req, env, acct))) return json({ error: 'not allowed' }, 401);
    if (!ID_RE.test(id)) return json({ error: 'bad id' }, 400);
    const b = await body(req);
    if (!b || !Number.isInteger(b.base) || b.base < 0) return json({ error: 'bad request' }, 400);
    const del = b.deleted ? 1 : 0;
    if (!del && (typeof b.blob !== 'string' || !b.blob.startsWith('v1.') || b.blob.length > MAX_BLOB)) return json({ error: 'note too big or bad' }, 413);
    const cur = await env.DB.prepare('SELECT id, version, seq, updated, deleted, blob FROM notes WHERE acct = ? AND id = ?').bind(acct, id).first();
    if ((cur ? cur.version : 0) !== b.base) return json({ error: 'conflict', current: cur ? pub(cur) : null }, 409);
    if (!cur) {
      const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM notes WHERE acct = ?').bind(acct).first();
      if (n.n >= MAX_NOTES) return json({ error: 'too many notes' }, 413);
    }
    const now = Date.now(), version = b.base + 1, blob = del ? null : b.blob;
    const bump = env.DB.prepare('UPDATE accounts SET seq = seq + 1 WHERE id = ?').bind(acct);
    const seqOf = '(SELECT seq FROM accounts WHERE id = ?)';
    let res;
    try {
      res = await env.DB.batch([bump, cur
        ? env.DB.prepare(`UPDATE notes SET version = ?, seq = ${seqOf}, updated = ?, deleted = ?, blob = ? WHERE acct = ? AND id = ? AND version = ?`).bind(version, acct, now, del, blob, acct, id, b.base)
        : env.DB.prepare(`INSERT INTO notes (acct, id, version, seq, updated, deleted, blob) VALUES (?, ?, ?, ${seqOf}, ?, ?, ?)`).bind(acct, id, version, acct, now, del, blob)]);
    } catch { res = null; }
    if (!res || res[1].meta.changes !== 1) {   // another save got in between: nothing was written
      const now2 = await env.DB.prepare('SELECT id, version, seq, updated, deleted, blob FROM notes WHERE acct = ? AND id = ?').bind(acct, id).first();
      return json({ error: 'conflict', current: now2 ? pub(now2) : null }, 409);
    }
    const out = await env.DB.prepare('SELECT seq FROM notes WHERE acct = ? AND id = ?').bind(acct, id).first();
    return json({ ok: true, version, seq: out.seq });
  }
  return json({ error: 'not found' }, 404);
}

export default { async fetch(req, env) { try { return await handle(req, env); } catch { return json({ error: 'server error' }, 500); } } };
