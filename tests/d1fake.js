// A small stand-in for Cloudflare D1 (a real SQL database in memory): prepare().bind().first()/all()/run() and batch() (all or nothing).
const fs = require('fs'), path = require('path');
process.removeAllListeners('warning');
const { DatabaseSync } = require('node:sqlite');
module.exports = function fakeD1() {
  const db = new DatabaseSync(':memory:'); db.exec(fs.readFileSync(path.join(__dirname, '..', 'cloud', 'schema.sql'), 'utf8'));
  const stmt = (sql, args = []) => ({ bind: (...a) => stmt(sql, a), first: async () => db.prepare(sql).get(...args) || null, all: async () => ({ results: db.prepare(sql).all(...args) }), run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }) });
  return { prepare: sql => stmt(sql), batch: async list => { db.exec('BEGIN'); try { const out = []; for (const s of list) out.push(await s.run()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; } } };
};
