// Handlers that had no test: locking, groups, trash, chat history, accessibility settings.
const assert = require('assert'), fs = require('fs'), path = require('path');
const H = require('./fake-electron');
(async () => {
  const { handlers: h, tmp, wins } = H;
  const mk = async text => {
    await h['note:new']({ sender: { id: 0 } });
    const w = wins[wins.length - 1], e = H.ev(w);
    await h['note:update'](e, { title: text, blocks: [{ t: 'text', v: text + ' body' }] });
    return { w, e, id: (await h['note:get'](e)).id };
  };
  const all = async () => h['all:list']({});

  // ---- locking: wrong password, unlock, relock, remove ----
  const a = await mk('Secret');
  assert.strictEqual(await h['note:lock'](a.e, 'abc'), false, 'password shorter than 4 is refused');
  assert.strictEqual(await h['note:lock'](a.e, 'longpass'), true);
  assert.strictEqual(await h['note:lock'](a.e, 'longpass'), false, 'already locked');
  let g = await h['note:get'](a.e); assert.ok(g.locked || g.lock || !g.blocks.length, 'locked note shows no content');
  assert.strictEqual(await h['note:unlock'](a.e, 'wrong'), false);
  assert.strictEqual(await h['note:unlock'](a.e, 'longpass'), true);
  g = await h['note:get'](a.e); assert.ok(JSON.stringify(g.blocks).includes('Secret body'), 'unlock brings the text back');
  await h['note:relock'](a.e); g = await h['note:get'](a.e); assert.ok(!JSON.stringify(g.blocks).includes('Secret body'), 'relock hides it again');
  assert.strictEqual(await h['note:removeLock'](a.e, 'wrong'), false);
  assert.strictEqual(await h['note:removeLock'](a.e, 'longpass'), true);
  g = await h['note:get'](a.e); assert.ok(JSON.stringify(g.blocks).includes('Secret body') && !g.locked, 'lock removed, text stays');
  assert.strictEqual(await h['note:removeLock'](a.e, 'longpass'), false, 'not locked any more');

  // ---- printing: refused while locked or empty (the print window itself needs the real app) ----
  const pr = await mk('Print me');
  await h['note:lock'](pr.e, 'longpass');
  assert.deepStrictEqual(await h['note:print'](pr.e), { ok: false, error: 'Unlock the note first.' });
  await h['note:removeLock'](pr.e, 'longpass');
  assert.deepStrictEqual(await h['all:print']({}, [], {}), { ok: false, skipped: 0, error: 'Choose at least one note.' }, 'nothing chosen');
  await h['note:lock'](pr.e, 'longpass');
  const pm = await h['all:print']({}, [pr.id, 'nope', pr.id], { newPage: true });
  assert.ok(pm.ok === false && pm.skipped === 1 && /Locked/.test(pm.error), 'a locked note is skipped, unknown ids ignored: ' + JSON.stringify(pm));
  await h['note:removeLock'](pr.e, 'longpass');

  // ---- Print options window: opened for one or several notes, remembers the choices ----
  const p1 = await mk('One'), p2 = await mk('Two');
  const before = wins.length;
  const r1 = await h['note:print'](p1.e); assert.ok(r1.ok && r1.dialog, 'a note opens the Print options window');
  const dlg = wins[wins.length - 1]; assert.strictEqual(wins.length, before + 1); assert.strictEqual(dlg.o.title, 'Print');
  let info = await h['print:info'](H.ev(dlg));
  assert.ok(info.count === 1 && !info.many && info.titles[0] === 'One', JSON.stringify(info));
  assert.deepStrictEqual(info.opts, { style: 'box', layout: 'actual', size: 'normal', title: true, pictures: true }, 'one note starts boxed, real size');
  const pv = await h['print:preview'](H.ev(dlg), { style: 'sticky', layout: 'cols2' }); assert.ok(pv.includes('<section') && pv.includes('background:#'), 'preview shows the chosen style');
  const go = await h['print:go'](H.ev(dlg), { style: 'plain', layout: 'bogus', size: 'large', title: false });   // (the fake window cannot print, but the choices are kept)
  assert.strictEqual(go.ok, false);
  await h['note:print'](p1.e); info = await h['print:info'](H.ev(wins[wins.length - 1]));
  assert.deepStrictEqual(info.opts, { style: 'plain', layout: 'flow', size: 'large', title: false, pictures: true }, 'choices are remembered; an unknown layout becomes the default');
  const r2 = await h['all:print']({}, [p1.id, p2.id, 'nope']); assert.ok(r2.ok && r2.count === 2, 'Home opens it for several notes');
  info = await h['print:info'](H.ev(wins[wins.length - 1]));
  assert.ok(info.many && info.count === 2 && info.opts.layout === 'flow' && info.opts.style === 'plain', 'several notes have their own remembered choices: ' + JSON.stringify(info.opts));
  assert.strictEqual((await h['print:info']({ sender: { id: 99999 } })).count, 0, 'a window without a job prints nothing');

  // ---- groups: new, rename, move, delete frees the notes ----
  assert.strictEqual(await h['grp:new']({}, '   '), null, 'empty name refused');
  const gid = await h['grp:new']({}, 'Work'); assert.ok(gid);
  await h['grp:update']({}, gid, { name: '  Office  ', collapsed: true });
  let L = await all(); const grp = (L.groups || []).find(x => x.id === gid);
  assert.ok(grp && grp.name === 'Office' && grp.collapsed === true, JSON.stringify(L.groups));
  await h['grp:update']({}, gid, { name: '   ' }); L = await all(); assert.strictEqual(L.groups.find(x => x.id === gid).name, 'Office', 'blank rename ignored');
  await h['grp:move']({}, a.id, gid); L = await all();
  assert.strictEqual(JSON.stringify(L).includes(gid), true);
  await h['grp:delete']({}, gid); L = await all();
  assert.ok(!(L.groups || []).some(x => x.id === gid), 'group removed');
  assert.ok(JSON.stringify(L.notes || L.list || L).includes('Secret'), 'its notes are kept');

  // ---- trash: delete, restore, purge, empty ----
  const b = await mk('Trash me'), c = await mk('Trash me too');
  await h['note:delete'](b.e); await h['note:delete'](c.e);
  L = await all(); assert.strictEqual((L.trash || []).length, 2, 'two notes in the trash');
  await h['trash:restore']({}, b.id); L = await all();
  assert.strictEqual(L.trash.length, 1); assert.ok(JSON.stringify(L).includes('Trash me'), 'restored note is back');
  await h['trash:restore']({}, 'nope'); assert.strictEqual((await all()).trash.length, 1, 'unknown id ignored');
  await h['trash:purge']({}, c.id); assert.strictEqual((await all()).trash.length, 0);
  const d = await mk('Another'); await h['note:delete'](d.e); assert.strictEqual((await all()).trash.length, 1);
  await h['trash:empty'](); assert.strictEqual((await all()).trash.length, 0, 'trash emptied');

  // ---- chat history: saved, cleaned and loaded ----
  let ch = await h['chat:load'](); assert.deepStrictEqual(ch.messages, []);
  await h['chat:save']({}, { messages: [{ role: 'user', content: 'hello' }, { role: 'assistant', content: 'hi' }, { role: 'bogus', content: 5 }], noteId: a.id });
  ch = await h['chat:load'](); assert.ok(ch.messages.length >= 2 && ch.messages[0].content === 'hello', JSON.stringify(ch.messages));
  assert.ok(ch.messages.every(m => m.role === 'user' || m.role === 'assistant'), 'bad roles dropped');
  assert.strictEqual(ch.noteId, a.id);
  await h['chat:save']({}, { messages: Array.from({ length: 150 }, (_, i) => ({ role: 'user', content: 'm' + i })) });
  assert.ok((await h['chat:load']()).messages.length <= 100, 'history is capped at 100 messages');
  assert.strictEqual((await h['chat:load']()).noteId, null);
  // ---- many chats: list, switch, rename, pin, delete ----
  const U = x => ({ role: 'user', content: x }), AI = x => ({ role: 'assistant', content: x });
  await h['chat:new']({}); await h['chat:save']({}, { messages: [U('Plan my day'), AI('ok')] });
  await h['chat:new']({}); await h['chat:save']({}, { messages: [U('Trip ideas'), AI('Lisbon')] });
  let lst = (await h['chat:list']({}, '')).items; assert.deepStrictEqual(lst.slice(0, 2).map(c => c.title), ['Trip ideas', 'Plan my day'], JSON.stringify(lst));
  assert.ok(lst.length >= 3 && lst[0].current, 'new chats keep the old ones; the newest is open');
  const plan = lst.find(c => c.title === 'Plan my day');
  let v = await h['chat:select']({}, plan.id); assert.strictEqual(v.messages[0].content, 'Plan my day'); assert.strictEqual(v.chatId, plan.id);
  assert.deepStrictEqual((await h['chat:list']({}, 'lisbon')).items.map(c => c.title), ['Trip ideas'], 'search looks inside chats');
  assert.strictEqual(await h['chat:rename']({}, plan.id, 'Morning'), true); assert.ok((await h['chat:list']({}, '')).items.some(c => c.title === 'Morning'));
  await h['chat:pin']({}, plan.id, true); assert.strictEqual((await h['chat:list']({}, '')).items[0].id, plan.id, 'pinned goes first');
  assert.strictEqual(await h['chat:toNote']({}, plan.id), true); assert.strictEqual(await h['chat:toNote']({}, 'nope'), false);
  assert.strictEqual(await h['chat:saveAsNote']({}, '# Greek politics\n\nChecklist:\n- read\n- write'), true, 'Save as note works (AI is off here, so the heading is the title)');
  assert.strictEqual(await h['chat:saveAsNote']({}, '   '), false);
  v = await h['chat:delete']({}, plan.id); assert.ok(!(await h['chat:list']({}, '')).items.some(c => c.id === plan.id) && v.chatId !== plan.id, 'deleting the open chat opens another');
  const cf = path.join(tmp, 'userData', 'chat.json'); const onDisk = () => fs.existsSync(cf) ? fs.readFileSync(cf, 'utf8') : '';
  if (fs.existsSync(cf)) assert.ok(onDisk().includes('Lisbon') && JSON.parse(onDisk()).version === 2, 'saved in the new format');
  // delete all really removes every message, in memory and on disk
  v = await h['chat:deleteAll']({}); assert.deepStrictEqual(v.messages, []); assert.strictEqual((await h['chat:list']({}, '')).items.length, 0); assert.ok(!onDisk().includes('Lisbon'), 'nothing left on disk');
  // history off: chats work but nothing is written; turning it off wipes what was there
  await h['chat:save']({}, { messages: [U('keep me'), AI('x')] }); assert.ok(onDisk().includes('keep me'));
  await h['settings:set']({}, { chatHistory: false }); assert.ok(!onDisk().includes('keep me'), 'switching history off deletes the file');
  await h['chat:new']({}); await h['chat:save']({}, { messages: [U('secret chat'), AI('x')] }); assert.ok(!onDisk().includes('secret chat'), 'history off: nothing written'); assert.strictEqual((await h['chat:list']({}, '')).history, false);
  await h['settings:set']({}, { chatHistory: true }); await h['chat:deleteAll']({});
  const cn = await h['chat:notes'](); assert.ok(Array.isArray(cn) && cn.some(x => x.id === a.id), 'chat can pick notes with text');

  // ---- accessibility settings: all off by default, saved and broadcast ----
  let ac = await h['access:get']();
  assert.ok(!ac.contrast && !ac.read && !ac.motion && !ac.focus && !ac.big && !ac.sr, 'everything off by default');
  ac = await h['access:set']({}, { contrast: true, size: 130, junk: 1, big: 'yes' });
  assert.ok(ac.contrast === true && ac.size === 130 && ac.big === true && !('junk' in ac));
  ac = await h['access:set']({}, { size: 125 }); assert.strictEqual(ac.size, 130, 'invalid size ignored');
  assert.ok(wins.some(w => w.webContents.sent.some(m => m[0] === 'access:changed')), 'open windows are told');
  assert.deepStrictEqual(await h['access:get'](), ac);
  // ---- actions in the search window (Ctrl+Alt+F) ----
  const C = require('../commands'), src = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  C.COMMANDS.forEach(c => assert.ok(src.includes("'" + c.id + "'"), 'main.js can run the action ' + c.id));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await h['access:set']({}, { size: 100, contrast: false });
  assert.strictEqual(await h['search:run']({}, 'access-contrast'), true); await wait(150);
  assert.strictEqual((await h['access:get']()).contrast, true, 'the action turns high contrast on');
  await h['search:run']({}, 'access-contrast'); await wait(150); assert.strictEqual((await h['access:get']()).contrast, false, 'and off again');
  await h['search:run']({}, 'access-bigger'); await wait(150); assert.strictEqual((await h['access:get']()).size, 115);
  await h['search:run']({}, 'access-smaller'); await wait(150); assert.strictEqual((await h['access:get']()).size, 100);
  await h['search:run']({}, 'access-smaller'); await wait(150); assert.strictEqual((await h['access:get']()).size, 100, 'cannot go below the smallest size');
  await h['access:set']({}, { big: true, sr: true }); await h['search:run']({}, 'access-reset'); await wait(150);
  const ar = await h['access:get'](); assert.ok(!ar.big && !ar.sr && ar.size === 100, 'reset turns everything off');
  // ---- hide the note's buttons when idle: off by default, saved, broadcast, bad values ignored ----
  let qt = await h['quiet:get'](); assert.deepStrictEqual(qt, { mode: 'off', delay: 10 }, 'off by default');
  qt = await h['quiet:set']({}, { mode: 'both', delay: 3, junk: 1 }); assert.deepStrictEqual(qt, { mode: 'both', delay: 3 });
  qt = await h['quiet:set']({}, { mode: 'sometimes', delay: 7 }); assert.deepStrictEqual(qt, { mode: 'both', delay: 3 }, 'invalid values are ignored');
  assert.ok(wins.some(w => w.webContents.sent.some(m => m[0] === 'quiet:changed')), 'open notes are told');
  await h['search:run']({}, 'quiet-toggle'); await wait(150); assert.strictEqual((await h['quiet:get']()).mode, 'off', 'the action switches it off');
  await h['search:run']({}, 'quiet-toggle'); await wait(150); assert.strictEqual((await h['quiet:get']()).mode, 'away', 'and on (mouse away) again');
  await h['quiet:set']({}, { mode: 'off' });

  await h['search:run']({}, 'log-perf'); await wait(150); assert.ok(fs.existsSync(path.join(tmp, 'userData', 'perf.log')), 'the log action opens the log');
  console.log('handlers ok');
})().catch(e => { console.error(e); process.exit(1); });
