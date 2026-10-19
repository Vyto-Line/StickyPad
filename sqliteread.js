'use strict';
// A tiny read-only SQLite reader, just enough to read the tables of Windows Sticky Notes (plum.sqlite) without any extra program.
// It understands the file format (tables, text, numbers, long values) and the -wal file next to it.
function varint(b, o) {   // -> [value, bytesUsed]
  let v = 0n;
  for (let i = 0; i < 9; i++) {
    const c = b[o + i]; if (c === undefined) throw new Error('truncated');
    if (i === 8) { v = (v << 8n) | BigInt(c); return [Number(v), 9]; }
    v = (v << 7n) | BigInt(c & 0x7f); if (!(c & 0x80)) return [Number(v), i + 1];
  }
  return [0, 1];
}
function open(buf, wal) {
  if (!buf || buf.length < 100 || buf.toString('latin1', 0, 15) !== 'SQLite format 3') throw new Error('Not a SQLite file.');
  let ps = buf.readUInt16BE(16); if (ps === 1) ps = 65536;
  const reserved = buf[20], enc = buf.readUInt32BE(56), U = ps - reserved;
  const over = new Map();
  if (wal && wal.length >= 32) {      // newest committed copies of pages that are still waiting in the -wal file
    const magic = wal.readUInt32BE(0);
    if (magic === 0x377f0682 || magic === 0x377f0683) {
      const wps = wal.readUInt32BE(8) || 65536, s1 = wal.readUInt32BE(16), s2 = wal.readUInt32BE(20);
      let pending = [];
      for (let o = 32; o + 24 + wps <= wal.length; o += 24 + wps) {
        if (wal.readUInt32BE(o + 8) !== s1 || wal.readUInt32BE(o + 12) !== s2) break;
        pending.push([wal.readUInt32BE(o), o + 24]);
        if (wal.readUInt32BE(o + 4) !== 0) { pending.forEach(([pg, po]) => over.set(pg, wal.subarray(po, po + wps))); pending = []; }   // a commit
      }
    }
  }
  const page = n => { if (over.has(n)) return over.get(n); const s = (n - 1) * ps; if (s < 0 || s + ps > buf.length) throw new Error('bad page'); return buf.subarray(s, s + ps); };
  const text = b => (enc === 2 ? b.toString('utf16le') : enc === 3 ? Buffer.from(b).swap16().toString('utf16le') : b.toString('utf8'));

  function record(p) {
    const [hl, n0] = varint(p, 0); const types = []; let o = n0;
    while (o < hl) { const [t, n] = varint(p, o); types.push(t); o += n; }
    const vals = []; o = hl;
    for (const t of types) {
      if (t === 0) vals.push(null);
      else if (t >= 1 && t <= 6) { const len = [0, 1, 2, 3, 4, 6, 8][t]; let v = 0n; for (let i = 0; i < len; i++) v = (v << 8n) | BigInt(p[o + i]); if (p[o] & 0x80) v -= 1n << BigInt(len * 8); vals.push(Number(v)); o += len; }
      else if (t === 7) { vals.push(p.readDoubleBE(o)); o += 8; }
      else if (t === 8) vals.push(0); else if (t === 9) vals.push(1);
      else if (t >= 12) { const len = t % 2 === 0 ? (t - 12) / 2 : (t - 13) / 2, sl = p.subarray(o, o + len); vals.push(t % 2 === 0 ? Buffer.from(sl) : text(sl)); o += len; }
      else vals.push(null);
    }
    return vals;
  }
  function cellPayload(pg, o) {   // the whole stored value of a cell, joining overflow pages
    const [P, a] = varint(pg, o); const [rowid, b] = varint(pg, o + a); o += a + b;
    const X = U - 35, M = Math.floor(((U - 12) * 32) / 255) - 23;
    if (P <= X) return { rowid, payload: pg.subarray(o, o + P) };
    const K = M + ((P - M) % (U - 4)), local = K <= X ? K : M;
    const parts = [pg.subarray(o, o + local)]; let next = pg.readUInt32BE(o + local), left = P - local, guard = 0;
    while (next && left > 0 && guard++ < 100000) { const op = page(next); const take = Math.min(left, U - 4); parts.push(op.subarray(4, 4 + take)); left -= take; next = op.readUInt32BE(0); }
    return { rowid, payload: Buffer.concat(parts) };
  }
  function walk(root, fn, depth = 0) {
    if (depth > 40) throw new Error('bad tree');
    const pg = page(root), h = root === 1 ? 100 : 0, type = pg[h], cells = pg.readUInt16BE(h + 3);
    if (type === 0x0d) { for (let i = 0; i < cells; i++) { const c = cellPayload(pg, pg.readUInt16BE(h + 8 + i * 2)); fn(c.rowid, record(c.payload)); } }
    else if (type === 0x05) {
      for (let i = 0; i < cells; i++) walk(pg.readUInt32BE(pg.readUInt16BE(h + 12 + i * 2)), fn, depth + 1);
      walk(pg.readUInt32BE(h + 8), fn, depth + 1);
    } else throw new Error('unexpected page');
  }
  const columnsOf = sql => {
    const m = /\(([\s\S]*)\)/.exec(sql || ''); if (!m) return [];
    const parts = []; let d = 0, cur = '';
    for (const ch of m[1]) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { parts.push(cur); cur = ''; } else cur += ch; }
    parts.push(cur);
    return parts.map(s => s.trim()).filter(s => s && !/^(primary|unique|foreign|check|constraint)\b/i.test(s)).map(s => {
      const nm = /^(?:"([^"]+)"|\[([^\]]+)\]|`([^`]+)`|(\S+))/.exec(s); return { name: nm[1] || nm[2] || nm[3] || nm[4], rowid: /integer\s+primary\s+key/i.test(s) };
    });
  };
  const schema = [];
  walk(1, (rowid, v) => { if (v[0] === 'table') schema.push({ name: v[1], root: v[3], cols: columnsOf(v[4]) }); });
  return {
    tables: () => schema.map(t => t.name),
    rows(name) {
      const t = schema.find(x => x.name.toLowerCase() === String(name).toLowerCase()); if (!t) return [];
      const out = [];
      walk(t.root, (rowid, v) => { const o = {}; t.cols.forEach((c, i) => { o[c.name] = c.rowid && v[i] == null ? rowid : (v[i] === undefined ? null : v[i]); }); out.push(o); });
      return out;
    }
  };
}
module.exports = { open };
