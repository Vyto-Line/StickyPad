#!/usr/bin/env python3
"""Convert StickyPad's notes.json to a small SQLite database (and back).

A single stickypad.db file is easy to read from other programs, an Android app, a phone sync tool, a spreadsheet or the sqlite3 shell.
Python 3.8+, no extra packages.

    python stickypad_db.py export  [DATA_DIR] [DB_FILE]     notes.json (+ images/)  ->  stickypad.db
    python stickypad_db.py import  [DB_FILE]  [DATA_DIR]    stickypad.db            ->  notes.json (+ images/)

DATA_DIR defaults to %APPDATA%\\StickyPad on Windows (or ~/.config/StickyPad elsewhere); DB_FILE defaults to ./stickypad.db.
Import never overwrites an existing notes.json: the old one is first copied to notes.json.bak.

Tables
  meta(key, value)                       schema_version, exported_at, app_settings (JSON)
  groups(id, name, position)             folders
  notes(id, title, text, color, font, size, pinned, rolled, group_id, x, y, width, height,
        updated, deleted_at, locked, lock_json, data_json)
                                         deleted_at IS NOT NULL  ->  the note is in the trash
                                         text is "" for locked notes; data_json is the full original record (lossless round trip)
  blocks(note_id, pos, kind, text, done, image_id)     kind = text | check | img
  images(id, mime, data)                 picture files as BLOBs
"""
import json, os, sqlite3, sys, time, shutil, mimetypes

SCHEMA_VERSION = 1
DDL = """
PRAGMA journal_mode=DELETE;
CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE groups(id TEXT PRIMARY KEY, name TEXT NOT NULL, position INTEGER NOT NULL);
CREATE TABLE notes(
  id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', text TEXT NOT NULL DEFAULT '',
  color TEXT, font TEXT, size INTEGER, pinned INTEGER NOT NULL DEFAULT 0, rolled INTEGER NOT NULL DEFAULT 0,
  group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
  x INTEGER, y INTEGER, width INTEGER, height INTEGER,
  updated INTEGER, deleted_at INTEGER, locked INTEGER NOT NULL DEFAULT 0, lock_json TEXT, data_json TEXT NOT NULL);
CREATE TABLE blocks(note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE, pos INTEGER NOT NULL, kind TEXT NOT NULL,
  text TEXT, done INTEGER, image_id TEXT, PRIMARY KEY(note_id, pos));
CREATE TABLE images(id TEXT PRIMARY KEY, mime TEXT, data BLOB NOT NULL);
CREATE INDEX notes_updated ON notes(updated);
CREATE INDEX notes_group ON notes(group_id);
"""

def default_dir():
    if os.name == 'nt': return os.path.join(os.environ.get('APPDATA', ''), 'StickyPad')
    return os.path.join(os.path.expanduser('~'), '.config', 'StickyPad')

def _i(v):
    try: return int(v)
    except (TypeError, ValueError): return None

def export_db(data_dir, db_file):
    src = os.path.join(data_dir, 'notes.json')
    with open(src, encoding='utf-8') as f: d = json.load(f)
    notes, trash = d.get('notes', {}) or {}, d.get('trash', []) or []
    groups = d.get('groups', []) or []
    if os.path.exists(db_file): os.remove(db_file)
    con = sqlite3.connect(db_file); con.executescript(DDL)
    con.executemany('INSERT INTO groups VALUES(?,?,?)', [(g['id'], g.get('name', ''), k) for k, g in enumerate(groups)])
    gids = {g['id'] for g in groups}
    used_images = set()
    def put(n, deleted_at):
        b = n.get('bounds') or {}; lock = n.get('lock')
        con.execute('INSERT INTO notes VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', (
            n['id'], n.get('title', ''), '' if lock else n.get('text', ''), n.get('color'), n.get('font'), _i(n.get('size')),
            int(bool(n.get('pinned'))), int(bool(n.get('rolled'))), n.get('group') if n.get('group') in gids else None,
            _i(b.get('x')), _i(b.get('y')), _i(b.get('width')), _i(b.get('height')),
            _i(n.get('updated')), deleted_at, int(bool(lock)), json.dumps(lock) if lock else None, json.dumps(n, ensure_ascii=False)))
        for pos, bl in enumerate(n.get('blocks') or []):
            k = bl.get('t')
            con.execute('INSERT INTO blocks VALUES(?,?,?,?,?,?)', (n['id'], pos, {'check': 'check', 'img': 'img'}.get(k, 'text'),
                        bl.get('v'), int(bool(bl.get('done'))) if k == 'check' else None, bl.get('id') if k == 'img' else None))
            if k == 'img' and bl.get('id'): used_images.add(bl['id'])
        if lock: used_images.update(lock.get('imgs') or [])
    for n in notes.values(): put(n, None)
    for t in trash: put(t, _i(t.get('deletedAt')) or int(time.time() * 1000))
    img_dir = os.path.join(data_dir, 'images'); nimg = 0
    if os.path.isdir(img_dir):
        for name in sorted(os.listdir(img_dir)):
            p = os.path.join(img_dir, name)
            if os.path.isfile(p) and (name in used_images or not used_images):
                with open(p, 'rb') as f: con.execute('INSERT INTO images VALUES(?,?,?)', (name, mimetypes.guess_type(name)[0] or 'application/octet-stream', f.read())); nimg += 1
    con.executemany('INSERT INTO meta VALUES(?,?)', [('schema_version', str(SCHEMA_VERSION)), ('exported_at', str(int(time.time() * 1000))),
                    ('app_settings', json.dumps(d.get('settings', {}), ensure_ascii=False))])
    con.commit(); con.close()
    return len(notes), len(trash), nimg

def import_db(db_file, data_dir):
    con = sqlite3.connect(db_file)
    ver = con.execute("SELECT value FROM meta WHERE key='schema_version'").fetchone()
    if not ver or int(ver[0]) > SCHEMA_VERSION: raise SystemExit('This database was made by a newer version of the tool.')
    os.makedirs(data_dir, exist_ok=True)
    dst = os.path.join(data_dir, 'notes.json')
    if os.path.exists(dst): shutil.copyfile(dst, dst + '.bak')
    groups = [{'id': i, 'name': n} for i, n in con.execute('SELECT id, name FROM groups ORDER BY position')]
    notes, trash = {}, []
    for nid, data_json, deleted_at in con.execute('SELECT id, data_json, deleted_at FROM notes ORDER BY updated'):
        n = json.loads(data_json)
        # the relational columns are the source of truth for the fields other programs are likely to have edited
        row = con.execute('SELECT title, color, font, size, pinned, rolled, group_id, locked FROM notes WHERE id=?', (nid,)).fetchone()
        n.update(title=row[0], color=row[1], font=row[2], size=row[3], pinned=bool(row[4]), rolled=bool(row[5]), group=row[6])
        if not row[7]:
            bl = []
            for kind, text, done, img in con.execute('SELECT kind, text, done, image_id FROM blocks WHERE note_id=? ORDER BY pos', (nid,)):
                bl.append({'t': 'img', 'id': img} if kind == 'img' else {'t': 'check', 'v': text or '', 'done': bool(done)} if kind == 'check' else {'t': 'text', 'v': text or ''})
            n['blocks'] = bl
            n['text'] = '\n'.join(('☑ ' if b.get('done') else '☐ ') + b['v'] if b['t'] == 'check' else b['v'] for b in bl if b['t'] != 'img' and b.get('v'))
        if deleted_at is None: notes[nid] = n
        else: n['deletedAt'] = deleted_at; trash.append(n)
    settings = json.loads((con.execute("SELECT value FROM meta WHERE key='app_settings'").fetchone() or ['{}'])[0])
    out = {'version': 2, 'notes': notes, 'trash': trash, 'groups': groups, 'settings': settings}
    tmp = dst + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f: json.dump(out, f, ensure_ascii=False, indent=2)
    os.replace(tmp, dst)
    img_dir = os.path.join(data_dir, 'images'); os.makedirs(img_dir, exist_ok=True); nimg = 0
    for name, data in con.execute('SELECT id, data FROM images'):
        if os.path.basename(name) != name: continue   # never write outside the images folder
        p = os.path.join(img_dir, name)
        if not os.path.exists(p):
            with open(p, 'wb') as f: f.write(data)
            nimg += 1
    return len(notes), len(trash), nimg

def main(argv):
    if len(argv) < 2 or argv[1] not in ('export', 'import'): print(__doc__); return 2
    a = argv[2:]
    if argv[1] == 'export':
        r = export_db(a[0] if a else default_dir(), a[1] if len(a) > 1 else 'stickypad.db'); print('Exported %d notes, %d in trash, %d pictures.' % r)
    else:
        r = import_db(a[0] if a else 'stickypad.db', a[1] if len(a) > 1 else default_dir()); print('Imported %d notes, %d in trash, %d new pictures.' % r)
    return 0

if __name__ == '__main__': sys.exit(main(sys.argv))
