const assert = require('assert'), fs = require('fs'), path = require('path');
const H = require('./fake-electron');
(async () => {
  const { handlers: h, electron, tmp, wins } = H;
  console.log('handlers:', ['note:remind', 'hist:list', 'hist:restore', 'note:export', 'settings:action', 'note:update'].every(k => typeof h[k] === 'function'));
  // a note
  await h['note:new']({ sender: { id: 0 } });
  const w = wins[wins.length - 1]; const e = H.ev(w);
  const n0 = await h['note:get'](e); assert.ok(n0 && n0.id, 'note exists'); 
  await h['note:update'](e, { title: 'Plan', blocks: [{ t: 'text', v: 'first version of the text, long enough ' + 'abc '.repeat(100) }, { t: 'check', v: 'milk', done: true }] });
  // big deletion triggers a history copy
  await h['note:update'](e, { blocks: [{ t: 'text', v: 'x' }] });
  const hl = await h['hist:list'](e); console.log('history items', hl.items.length); assert.ok(hl.items.length >= 1);
  // restore
  const r = await h['hist:restore'](e, hl.items[0].t); assert.strictEqual(r, true);
  const n1 = await h['note:get'](e); assert.ok(/first version/.test(n1.blocks[0].v)); assert.strictEqual(n1.blocks[1].v, 'milk');
  const hl2 = await h['hist:list'](e); assert.ok(hl2.items.length >= 2, 'today version kept after restore');
  // reminder
  const ts = Date.now() + 3600e3; assert.strictEqual(await h['note:remind'](e, ts), Math.round(ts));
  assert.strictEqual(await h['note:remind'](e, 'junk'), 0);
  // export
  electron.__save = path.join(tmp, 'out.md');
  const ex = await h['note:export'](e); assert.ok(ex.ok, JSON.stringify(ex));
  const md = fs.readFileSync(electron.__save, 'utf8'); console.log(JSON.stringify(md.slice(0, 40)), '...', JSON.stringify(md.slice(-12))); assert.ok(md.startsWith('# Plan\n\n') && md.includes('- [x] milk'));
  electron.__save = path.join(tmp, 'out.txt'); await h['note:export'](e); assert.ok(fs.readFileSync(electron.__save, 'utf8').includes('[x] milk'));
  // export all + import
  electron.__open = [tmp]; const ea = await h['settings:action']({}, 'exportAll'); assert.ok(ea.ok && ea.count >= 1, JSON.stringify(ea)); assert.ok(fs.existsSync(ea.dir) && fs.readdirSync(ea.dir).some(f => /Plan\.md$/.test(f)));
  const f1 = path.join(tmp, 'in1.md'); fs.writeFileSync(f1, '# Imported\n\n- [ ] one\n- [x] two\nsome text\n');
  electron.__open = [f1, path.join(tmp, 'missing.md')]; const im = await h['settings:action']({}, 'importNotes'); assert.ok(im.ok && im.count === 1 && im.failed === 1, JSON.stringify(im));
  const list = await h['all:list']({}); const imp = JSON.stringify(list).includes('Imported'); assert.ok(imp, 'imported note appears');
  // lock removes history and refuses export
  await h['note:lock'](e, 'secret1'); assert.deepStrictEqual((await h['hist:list'](e)).items, []);
  assert.ok(!fs.existsSync(path.join(tmp, 'userData', 'history', n0.id + '.json')), 'history file removed on lock');
  const ex2 = await h['note:export'](e); assert.strictEqual(ex2.ok, false);
  const ul = await h['settings:action']({}, 'openUpdateLog'); assert.ok(ul.ok && fs.existsSync(path.join(tmp, 'userData', 'update.log')), 'update log can be opened');
  const orl = await h['settings:action']({}, 'openReleases'); assert.ok(orl.ok && H.dialogCalls.some(c => c[0] === 'external' && /Vyto-Line\/StickyPad\/releases/.test(c[1])));
  // memory: the meter adds up private memory per process type; low memory mode is applied at start and can be switched
  const mem = await h['settings:action']({}, 'memory'); assert.ok(mem.ok && mem.total === 60 + 50 + 40 + 10 && mem.main === 60 && mem.notes === 90 && mem.gpu === 0 && mem.other === 10 && mem.processes === 5, JSON.stringify(mem));
  assert.strictEqual(electron.__nogpu, true, 'GPU process is off in low memory mode'); assert.ok(electron.__switches.some(s => s[0] === 'js-flags'));
  let st = await h['settings:get']({}); assert.strictEqual(st.lowMemory, true); assert.strictEqual(st.lowMemoryActive, true);
  st = await h['settings:set']({}, { lowMemory: false }); assert.strictEqual(st.lowMemory, false); assert.strictEqual(st.lowMemoryActive, true, 'the running session keeps what it started with');
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(tmp, 'userData', 'launch.json'), 'utf8')).lowMemory, false);
  st = await h['settings:set']({}, { aiKeep: '30m' }); assert.strictEqual(st.aiKeep, '30m'); st = await h['settings:set']({}, { aiKeep: 'forever' }); assert.strictEqual(st.aiKeep, '30m', 'unknown values are ignored');
  // pictures are given out as file addresses, not as big text
  const nn = await h['note:get'](e); assert.ok(/^file:\/\/\/.*\/images\/$/.test(nn.imgBase.replace(/\\/g, '/')), nn.imgBase);
  fs.mkdirSync(path.join(tmp, 'userData', 'images'), { recursive: true }); fs.writeFileSync(path.join(tmp, 'userData', 'images', 'aaaaaa.png'), Buffer.from([137, 80, 78, 71]));
  // ---- 1.14.1: shortcuts, clipboard note, links, title, ask-all-notes, import from other apps ----
  const KEYS = require('../keys');
  let st2 = await h['settings:set']({}, { keys: { g_new: 'ctrl+alt+q', g_all: 'Ctrl+Alt+Q', n_find: 'Ctrl+Z', g_chat: 'Ctrl+Alt+H' } });
  assert.strictEqual(st2.keys.g_new, 'Ctrl+Alt+Q'); assert.strictEqual(st2.keys.g_all, 'Ctrl+Alt+A', 'clashing keys keep the default'); assert.strictEqual(st2.keys.n_find, 'Ctrl+F', 'reserved keys are refused'); assert.strictEqual(st2.keys.g_chat, 'Ctrl+Alt+H');
  assert.ok(electron.__reg['Control+Alt+Q'] && electron.__reg['Control+Alt+H'] && !electron.__reg['Control+Alt+N'], 'global shortcuts re-registered with the new keys');
  assert.ok((await h['note:get'](e)).keys.g_new === 'Ctrl+Alt+Q', 'notes get the shortcuts too'); assert.ok(w.webContents.sent.some(m => m[0] === 'keys:changed' && m[1].g_new === 'Ctrl+Alt+Q'), 'open notes are told');
  electron.__failAccels.add('Control+Alt+V'); st2 = await h['settings:set']({}, { shortcuts: true, keys: {} }); assert.deepStrictEqual(st2.keysFailed, ['g_clip'], 'a shortcut Windows refuses is reported');
  electron.__failAccels.clear(); st2 = await h['settings:set']({}, { keys: {} }); assert.deepStrictEqual(st2.keys, KEYS.DEFAULTS); assert.deepStrictEqual(st2.keysFailed, []);
  // note from clipboard
  const before = JSON.stringify(await h['all:list']({})).length; const cnt0 = Object.keys(JSON.parse(JSON.stringify(await h['all:list']({})))).length;
  electron.__clip = '# Idea\n- [ ] call Nick\nsome words'; const wcount = wins.length; electron.__reg['Control+Alt+V']();
  assert.strictEqual(wins.length, wcount + 1, 'a window opened for the clipboard note'); const cw = wins[wins.length - 1]; const cn = await h['note:get'](H.ev(cw));
  assert.strictEqual(cn.title, 'Idea'); assert.ok(cn.blocks.some(b => b.t === 'check' && b.v === 'call Nick')); 
  electron.__clip = '   '; electron.__notes.length = 0; const wc2 = wins.length; electron.__reg['Control+Alt+V'](); assert.strictEqual(wins.length, wc2, 'empty clipboard: no note'); assert.ok(electron.__notes.length === 1, 'and it says so');
  // links: only safe addresses are opened
  H.dialogCalls.length = 0;
  assert.strictEqual(await h['app:openLink'](e, 'https://example.com/a'), true); assert.strictEqual(await h['app:openLink'](e, 'file:///c:/windows/system32/calc.exe'), false); assert.strictEqual(await h['app:openLink'](e, 'javascript:alert(1)'), false);
  assert.deepStrictEqual(H.dialogCalls.filter(c => c[0] === 'external').map(c => c[1]), ['https://example.com/a']);
  electron.__menus.length = 0;
  assert.strictEqual(await h['app:linkMenu'](e, 'https://example.com/x'), true); let tpl = electron.__menus.pop(); assert.deepStrictEqual(tpl.map(i => i.label), ['Open link', 'Copy link']);
  tpl[1].click(); assert.strictEqual(electron.__written, 'https://example.com/x'); tpl[0].click(); assert.ok(H.dialogCalls.some(c => c[0] === 'external' && c[1] === 'https://example.com/x'));
  await h['app:linkMenu'](e, 'mailto:a@b.io'); tpl = electron.__menus.pop(); assert.strictEqual(tpl[1].label, 'Copy e-mail address'); tpl[1].click(); assert.strictEqual(electron.__written, 'a@b.io', 'copies the address without mailto:');
  assert.strictEqual(await h['app:linkMenu'](e, 'file:///c:/x.exe'), false); assert.strictEqual(electron.__menus.length, 0, 'no menu for an unsafe address');
  // settings panel: a narrow note grows to the right, goes back afterwards, and the saved size never changes
  await h['note:new']({ sender: { id: 0 } }); const pw = wins[wins.length - 1], pe = H.ev(pw); pw._b = { x: 100, y: 50, width: 300, height: 320 };
  await h['note:update'](pe, { title: 'Panel note', blocks: [{ t: 'text', v: 'x' }] });
  assert.strictEqual(await h['note:panel'](pe, true), true, 'wide enough to dock'); assert.deepStrictEqual([pw._b.x, pw._b.width], [100, 630]);
  assert.strictEqual((await h['note:get'](pe)).bounds.width, 300, 'the saved width is still the real one');
  await h['note:panel'](pe, true); assert.strictEqual(pw._b.width, 630, 'opening twice does not grow twice');
  await h['note:panel'](pe, false); assert.deepStrictEqual([pw._b.x, pw._b.width], [100, 300]);
  pw._b = { x: 1700, y: 50, width: 300, height: 320 }; await h['note:panel'](pe, true); assert.deepStrictEqual([pw._b.x, pw._b.width], [1290, 630], 'no room on the right: it grows to the left');
  await h['note:panel'](pe, false); assert.deepStrictEqual([pw._b.x, pw._b.width], [1700, 300]);
  pw._b = { x: 10, y: 50, width: 700, height: 320 }; assert.strictEqual(await h['note:panel'](pe, true), true); assert.strictEqual(pw._b.width, 700, 'a wide note is left alone'); await h['note:panel'](pe, false); assert.strictEqual(pw._b.width, 700);
  // dates setting reaches the note; title needs the AI
  assert.strictEqual((await h['note:get'](e)).suggestDates, true); await h['settings:set']({}, { suggestDates: false }); assert.strictEqual((await h['note:get'](e)).suggestDates, false);
  const tr = await h['ai:run'](e, 'title', { text: 'hello' }); assert.strictEqual(tr.ok, false, 'AI is off by default');
  // ask all my notes: the question picks the notes, the chat window is told which ones
  const cw2 = wins[wins.length - 1]; cw2.webContents.sent.length = 0;
  await h['chat:send']({ sender: cw2.webContents }, { id: 'q1', noteId: '*', messages: [{ role: 'user', content: 'what did I write about Idea?' }] });
  const srcMsg = cw2.webContents.sent.find(m => m[0] === 'chat:event' && m[1].type === 'sources'); assert.ok(srcMsg && srcMsg[1].titles.includes('Idea'), JSON.stringify(cw2.webContents.sent.map(m => m[1])));
  // import from other apps
  const FX = path.join(__dirname, 'fixtures');
  electron.__open = [path.join(FX, 'keep')]; const ik = await h['settings:action']({}, 'importOther', 'keep');
  assert.ok(ik.ok && ik.count === 2 && ik.skipped === 1, JSON.stringify(ik));
  const listed = JSON.stringify(await h['all:list']({})); assert.ok(listed.includes('Ψώνια') && listed.includes('Σπίτι'), 'Keep note and its label (as a folder) are there');
  electron.__open = [path.join(FX, 'plum_copy.sqlite')]; const is = await h['settings:action']({}, 'importOther', 'sticky'); assert.ok(is.ok && is.count === 1, JSON.stringify(is));
  electron.__open = [path.join(FX, 'keep', 'other.json')]; const ib = await h['settings:action']({}, 'importOther', 'keep'); assert.strictEqual(ib.ok, false); assert.ok(/No Google Keep notes/.test(ib.error));
  electron.__open = [path.join(FX, 'keep', 'old.json')]; assert.strictEqual((await h['settings:action']({}, 'importOther', 'nope')).ok, false);
  electron.__open = undefined; assert.strictEqual((await h['settings:action']({}, 'importOther', 'keep')).cancelled, true);
  // themes: the whole app gets the theme's colours, light/dark follows Windows or the setting, theme-coloured notes follow it
  const NTf = electron.nativeTheme;
  let ut = await h['ui:theme']({}); assert.strictEqual(ut.dark, false); assert.ok(ut.vars['--bg'] && ut.vars['--accent']);
  await h['note:new']({ sender: { id: 0 } }); const tw = wins[wins.length - 1], te = H.ev(tw);
  await h['note:update'](te, { title: 'Theme note', blocks: [{ t: 'text', v: 'x' }] });
  const set1 = await h['settings:set']({}, { theme: 'purple' });
  assert.strictEqual(set1.theme, 'purple'); ut = await h['ui:theme']({}); assert.strictEqual(ut.id, 'purple'); assert.strictEqual(ut.vars['--accent'], '#7c3aed');
  const all = BW => BW.filter(w => w.webContents.sent.some(m => m[0] === 'ui:theme'));
  assert.ok(all(wins).length >= 1, 'windows were told about the new theme');
  await h['theme:applyAll']({}, 'purple'); const lightCol = (await h['note:get'](te)).color; assert.ok(require('../themes').palette('purple', false).includes(lightCol), lightCol);
  await h['settings:set']({}, { mode: 'dark' }); assert.strictEqual(NTf.themeSource, 'dark');
  ut = await h['ui:theme']({}); assert.strictEqual(ut.dark, true); assert.strictEqual(ut.vars['--accent'], '#b794f6');
  const darkCol = (await h['note:get'](te)).color; assert.ok(require('../themes').palette('purple', true).includes(darkCol), 'note followed to dark: ' + darkCol);
  assert.ok(tw.webContents.sent.some(m => m[0] === 'note:style' && m[1].color === darkCol), 'the note window was repainted');
  await h['settings:set']({}, { mode: 'light' }); assert.strictEqual((await h['note:get'](te)).color, lightCol, 'and back to the same light colour');
  await h['note:update'](te, { color: '#123456' }); await h['settings:set']({}, { mode: 'dark' }); assert.strictEqual((await h['note:get'](te)).color, '#123456', 'custom colours never change');
  await h['settings:set']({}, { notesFollowMode: false, mode: 'light' }); assert.strictEqual((await h['settings:get']({})).notesFollowMode, false);
  await h['settings:set']({}, { mode: 'system', notesFollowMode: true }); NTf.__sys = true; NTf.__cb && NTf.__cb(); assert.strictEqual((await h['ui:theme']({})).dark, true, 'follows Windows when set to Same as Windows');
  NTf.__sys = false; NTf.__cb && NTf.__cb();
  // chat: "Apply to note"
  await h['note:new']({ sender: { id: 0 } }); const aw = wins[wins.length - 1], ae = H.ev(aw); const aid = (await h['note:get'](ae)).id;
  await h['note:update'](ae, { title: 'Trip', blocks: [{ t: 'text', v: 'Book ferry. Take hat.' }, { t: 'img', id: 'abcdef12.png' }] });
  let ar = await h['chat:applyToNote']({}, { noteId: aid, text: '# Crete trip\nBook the ferry.\n- [ ] Hat\n- [x] Water', mode: 'replace' });
  assert.ok(ar.ok, JSON.stringify(ar)); let an = await h['note:get'](ae);
  assert.strictEqual(an.title, 'Trip', 'a title the note already has is kept'); assert.ok(an.blocks.some(b => b.t === 'check' && b.v === 'Hat' && !b.done) && an.blocks.some(b => b.t === 'check' && b.v === 'Water' && b.done), 'checklist items become checklist items');
  assert.ok(an.blocks[0].v.startsWith('Crete trip'), 'the heading stays in the text'); assert.ok(!JSON.stringify(an.blocks).includes('Book ferry. Take'), 'old text replaced');
  assert.ok((await h['hist:list'](ae)).items.some(i => /Book ferry\. Take hat/.test(i.preview || '')) || (await h['hist:list'](ae)).items.length >= 1, 'the old text is kept in Earlier versions');
  assert.ok(aw.webContents.sent.some(m => m[0] === 'note:reload'), 'the note window reloads');
  ar = await h['chat:applyToNote']({}, { noteId: aid, text: '```\nExtra line\n```', mode: 'append' }); assert.ok(ar.ok); an = await h['note:get'](ae);
  assert.ok(JSON.stringify(an.blocks).includes('Extra line') && !JSON.stringify(an.blocks).includes('```') && JSON.stringify(an.blocks).includes('Water'), 'append keeps the old content and removes a code fence');
  assert.deepStrictEqual((await h['chat:applyToNote']({}, { noteId: 'nope', text: 'x' })).ok, false, 'unknown note');
  assert.deepStrictEqual((await h['chat:applyToNote']({}, { noteId: aid, text: '   ' })).ok, false, 'empty answer');
  // see-through notes
  await h['note:update'](te, { opacity: 0.6 }); assert.strictEqual((await h['note:get'](te)).opacity, 0.6); assert.strictEqual(tw.opacity, 0.6, 'the window became see-through');
  await h['note:update'](te, { opacity: 0.05 }); assert.strictEqual((await h['note:get'](te)).opacity, 0.3, 'never fainter than 30%');
  await h['note:update'](te, { opacity: 5 }); assert.strictEqual((await h['note:get'](te)).opacity, 1, 'never above 100%');
  await h['note:update'](te, { opacity: 'x' }); assert.strictEqual((await h['note:get'](te)).opacity, 1, 'junk is ignored');
  // "What's new" after an update
  const wn = await h['whatsnew:get']({}); assert.strictEqual(wn.version, '9.9.9'); assert.ok(Array.isArray(wn.sections), 'sections list');
  assert.strictEqual((await h['settings:get']({})).whatsNew, true, 'on by default');
  await h['settings:set']({}, { whatsNew: false }); assert.strictEqual((await h['settings:get']({})).whatsNew, false);
  assert.strictEqual((await h['whatsnew:get']({})).off, true, 'the window shows the choice');
  await h['whatsnew:close']({}, { off: false }); assert.strictEqual((await h['settings:get']({})).whatsNew, true, 'the checkbox in the window changes the setting');
  const wo = await h['settings:action']({}, 'openWhatsNew'); assert.ok(wo && wo.ok, 'the button in Settings opens it: ' + JSON.stringify(wo));
  // a crash in the main process is written to crash.log instead of a Windows error box
  process.emit('uncaughtException', new Error('boom test'));
  const cl = path.join(electron.app.getPath('userData'), 'crash.log'); assert.ok(fs.existsSync(cl) && /boom test/.test(fs.readFileSync(cl, 'utf8')), 'crash.log written');
  assert.strictEqual(await h['update:install']({}), true, 'restart-and-update answers before it quits');
  console.log('main harness ok');
  process.exit(0);
})().catch(e => { console.error('HARNESS FAIL', e); process.exit(1); });
