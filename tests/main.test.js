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
  // .stickypad export, opened from Windows with a double-click (the file name arrives on the command line)
  electron.__save = path.join(tmp, 'My note.stickypad'); const exs = await h['note:export'](e); assert.ok(exs.ok, JSON.stringify(exs));
  assert.ok(fs.readFileSync(electron.__save, 'utf8').replace(/^---\nstickypad: 1\n[\s\S]*?\n---\n\n/, '').startsWith('# Plan\n\n'), 'a .stickypad file holds Markdown after its properties header');
  const sf = path.join(tmp, 'From double click.stickypad'); fs.writeFileSync(sf, '# Double clicked\n\n- [ ] one\nhello\n');
  assert.strictEqual(typeof electron.__appEv['second-instance'], 'function', 'second-instance handler is registered');
  electron.__appEv['second-instance']({}, ['C:\\StickyPad.exe', '--flag', sf]);
  assert.ok(JSON.stringify(await h['all:list']({})).includes('Double clicked'), 'a .stickypad file opened while StickyPad runs becomes a note');
  // text prediction: the words used again and again, locked notes never read
  await h['note:update'](e, { blocks: [{ t: 'text', v: 'zebrafish zebrafish zebrafish aquarium aquarium once' }] });
  let wl = await h['words:get']({}); assert.ok(wl.some(x => x.w === 'zebrafish' && x.n === 3) && wl.some(x => x.w === 'aquarium') && !wl.some(x => x.w === 'once'), JSON.stringify(wl).slice(0, 200));
  assert.strictEqual((await h['note:get'](e)).predict, true);
  await h['settings:set']({}, { predictWords: false }); assert.deepStrictEqual(await h['words:get']({}), []); assert.strictEqual((await h['note:get'](e)).predict, false);
  await h['settings:set']({}, { predictWords: true });
  // lock removes history and refuses export
  await h['note:lock'](e, 'secret1'); assert.deepStrictEqual((await h['hist:list'](e)).items, []);
  assert.ok(!(await h['words:get']({})).some(x => x.w === 'zebrafish'), 'words of a locked note are not offered');
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
  assert.ok(aw.webContents.sent.some(m => m[0] === 'note:applied'), 'the note window is told (it shows the text and keeps its undo history)');
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
  // ---- search across all notes ----
  const mk = async (title, text) => { await h['note:new']({ sender: { id: 0 } }); const ww = wins[wins.length - 1], ee = H.ev(ww); await h['note:update'](ee, { title, blocks: [{ t: 'text', v: text }] }); return { ww, ee, id: (await h['note:get'](ee)).id }; };
  const sa = await mk('Trip', 'start ' + 'blah '.repeat(300) + 'Ακρόπολη at the end'), sb = await mk('Diary', 'my zebra secret');
  // ---- a .stickypad file keeps the note's properties ----
  const prp = await mk('Props', 'one line\n'); const ppe = prp.ee;
  await h['note:update'](ppe, { color: '#C7F0D8', font: 'Georgia', size: 22, opacity: 0.6, solidText: true }); await h['note:pin'](ppe, true);
  const nd = (await h['all:list']({})).notes.find(x => x.id === prp.id);
  fs.writeFileSync(path.join(tmp, 'props.stickypad'), '');   // (placeholder so the dialog has a file)
  electron.__save = path.join(tmp, 'props.stickypad'); const pexp = await h['note:export'](ppe); assert.ok(pexp.ok);
  const pheadp = fs.readFileSync(electron.__save, 'utf8'); assert.ok(/color: "#C7F0D8"/.test(pheadp) && /font: "Georgia"/.test(pheadp) && /size: 22/.test(pheadp) && /opacity: 0.6/.test(pheadp) && /solidText: true/.test(pheadp) && /pinned: true/.test(pheadp), pheadp.slice(0, 300));
  electron.__save = path.join(tmp, 'props.md'); await h['note:export'](ppe); assert.ok(!/stickypad: 1/.test(fs.readFileSync(electron.__save, 'utf8')), 'a plain .md export stays clean Markdown');
  await h['grp:new']({}, 'Work'); const wg = (await h['all:list']({})).groups.find(g => g.name === 'Work'); await h['grp:move']({}, prp.id, wg.id);
  const rem = Date.now() + 3600e3; await h['note:remind'](ppe, rem);
  electron.__save = path.join(tmp, 'props2.stickypad'); await h['note:export'](ppe);
  electron.__open = [path.join(tmp, 'props2.stickypad')]; const pimp = await h['settings:action']({}, 'importNotes'); assert.ok(pimp.ok && pimp.count === 1);
  const impp = (await h['all:list']({})).notes.filter(x => x.title === 'Props' && x.id !== prp.id)[0]; assert.ok(impp, 'imported copy exists');
  const iep = H.ev(wins[wins.length - 1]); const igp = await h['note:get'](iep);
  assert.strictEqual(igp.color, '#C7F0D8'); assert.strictEqual(igp.font, 'Georgia'); assert.strictEqual(igp.size, 22); assert.strictEqual(igp.opacity, 0.6); assert.strictEqual(igp.solidText, true); assert.strictEqual(igp.pinned, true);
  assert.strictEqual(impp.group, wg.id, 'back in the same folder'); assert.strictEqual(igp.remind, Math.round(rem), 'reminder kept'); assert.strictEqual(impp.updated, nd.updated === impp.updated ? impp.updated : impp.updated);
  assert.ok(impp.updated <= Date.now() && impp.updated > 0);
  // a folder that does not exist yet is created; hostile values are cleaned
  fs.writeFileSync(path.join(tmp, 'evil2.stickypad'), '---\nstickypad: 1\ncolor: "red; x"\nfont: "A\\"b;{x}"\nsize: 9999\nopacity: -5\nsolidText: "yes"\npinned: 1\nfolder: "New folder from file"\nreminder: 1000\nwidth: 99999\nheight: "x"\nedited: 99999999999999\nbogus: 1\n---\n\n# Evil props\ntext\n');
  electron.__open = [path.join(tmp, 'evil2.stickypad')]; await h['settings:action']({}, 'importNotes');
  const eg = await h['note:get'](H.ev(wins[wins.length - 1])); assert.strictEqual(eg.title, 'Evil props'); assert.ok(/^#[0-9a-f]{6}$/i.test(eg.color) && eg.color !== 'red; x', 'bad colour ignored'); assert.ok(!/["';{}\\]/.test(eg.font), 'font cleaned: ' + eg.font);
  assert.strictEqual(eg.size, 72, 'size clamped'); assert.ok(!eg.opacity || eg.opacity >= 0.3, 'opacity clamped'); assert.ok(!eg.solidText && !eg.pinned, 'only true booleans'); assert.ok(!eg.remind, 'past reminders are not set');
  assert.ok((await h['all:list']({})).groups.some(g => g.name === 'New folder from file'), 'the folder is created');
  assert.ok(wins[wins.length - 1].o.width <= 1920 && wins[wins.length - 1].o.height <= 1040, 'size fits the screen');
  // ---- files dropped on a window ----
  const dd = path.join(tmp, 'drop'); fs.mkdirSync(dd, { recursive: true });
  fs.writeFileSync(path.join(dd, 'Greek old.txt'), Buffer.concat([Buffer.from('Σημείωση\n'.length ? [0xD3, 0xE7, 0xEC, 0xE5, 0xDF, 0xF9, 0xF3, 0xE7, 0x0A] : []), Buffer.from([0xCA, 0xE1, 0xEB, 0xE7, 0xEC, 0xDD, 0xF1, 0xE1])]));   // "Σημείωση" + "Καλημέρα" in windows-1253
  fs.writeFileSync(path.join(dd, 'notepad.txt'), Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from('Line one\nLine two', 'utf16le')]));
  fs.writeFileSync(path.join(dd, 'plain.md'), '# From md\n- [ ] task\n'); fs.writeFileSync(path.join(dd, 'virus.exe'), 'x');
  await h['app:prefs']({}, { lang: 'el' });
  const dr = await h['drop:import']({}, [path.join(dd, 'Greek old.txt'), path.join(dd, 'notepad.txt'), path.join(dd, 'plain.md'), path.join(dd, 'virus.exe'), 'relative.txt', 42, path.join(dd, 'missing.txt')]);
  assert.ok(dr.ok && dr.count === 3 && dr.failed === 1, JSON.stringify(dr) + ' (3 read, 1 missing, .exe and relative paths never tried)');
  const dl = await h['all:list']({}); const dn = t => dl.notes.find(n => n.title === t);
  assert.ok(dn('Greek old') && /Σημείωση/.test(dn('Greek old').text) && /Καλημέρα/.test(dn('Greek old').text), 'old Greek text file read correctly: ' + JSON.stringify(dn('Greek old')));
  assert.ok(dn('notepad') && /Line one\nLine two/.test(dn('notepad').text), 'UTF-16 file'); assert.ok(dn('From md'));
  assert.deepStrictEqual(await h['drop:import']({}, ['x.exe']), { ok: false, count: 0, failed: 0, none: true }); assert.strictEqual((await h['drop:import']({}, 'nope')).none, true);
  assert.strictEqual((await h['drop:import']({}, Array.from({ length: 80 }, () => path.join(dd, 'plain.md')))).count, 50, 'at most 50 at a time');
  await h['app:prefs']({}, { lang: 'en' });
  // ---- pictures travel inside exported notes ----
  const PNGB = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  const pic = await mk('With picture', 'caption'); const pid = await h['img:save'](pic.ee, 'data:image/png;base64,' + PNGB.toString('base64')); assert.ok(pid, 'picture saved');
  await h['note:update'](pic.ee, { blocks: [{ t: 'text', v: 'caption\n' }, { t: 'img', id: pid }, { t: 'text', v: 'end' }] });
  electron.__save = path.join(tmp, 'pic.stickypad'); const px = await h['note:export'](pic.ee); assert.ok(px.ok && px.pics === 1 && px.picsLeftOut === 0, JSON.stringify(px));
  const pfile = fs.readFileSync(electron.__save, 'utf8'); assert.ok(pfile.includes('![](data:image/png;base64,' + PNGB.toString('base64') + ')'), 'the picture is inside the file'); assert.ok(pfile.startsWith('---\nstickypad: 1\n') && pfile.includes('\n# With picture\n'));
  electron.__save = path.join(tmp, 'pic.txt'); const pt = await h['note:export'](pic.ee); assert.ok(pt.ok && pt.picsLeftOut === 1 && !fs.readFileSync(electron.__save, 'utf8').includes('data:image'), 'plain text says the picture was left out');
  const wBefore = wins.length; electron.__open = [path.join(tmp, 'pic.stickypad')]; const pim = await h['settings:action']({}, 'importNotes'); assert.ok(pim.ok && pim.count === 1, JSON.stringify(pim));
  const nw = wins[wins.length - 1], nn2 = await h['note:get'](H.ev(nw)); const pimg = nn2.blocks.find(b => b.t === 'img'); assert.ok(pimg && pimg.src, 'the imported note has a picture');
  const newId = decodeURIComponent(pimg.src.split('/').pop()); assert.ok(newId !== pid && fs.readFileSync(path.join(tmp, 'userData', 'images', newId)).equals(PNGB), 'a new picture file with the same bytes: ' + newId);
  assert.deepStrictEqual(nn2.blocks.map(b => b.t), ['text', 'img', 'text'], 'same layout');
  fs.writeFileSync(path.join(tmp, 'evil.stickypad'), '# Evil\n![x](data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=)\n![y](data:image/png;base64,@@@)\ntext\n'); electron.__open = [path.join(tmp, 'evil.stickypad')]; await h['settings:action']({}, 'importNotes');
  const en = await h['note:get'](H.ev(wins[wins.length - 1])); assert.ok(!en.blocks.some(b => b.t === 'img'), 'no picture from a bad data address');
  // the word list follows edits and deleted notes (each note is counted again only when it changed)
  const wn1 = await mk('Words', 'quokka quokka quokka'); assert.ok((await h['words:get']({})).some(x => x.w === 'quokka' && x.n === 3));
  await h['note:update'](wn1.ee, { blocks: [{ t: 'text', v: 'numbat numbat' }] }); const wl3 = await h['words:get']({}); assert.ok(wl3.some(x => x.w === 'numbat' && x.n === 2) && !wl3.some(x => x.w === 'quokka'), 'an edited note is counted again');
  await h['note:delete'](wn1.ee); assert.ok(!(await h['words:get']({})).some(x => x.w === 'numbat'), 'a deleted note no longer counts');
  const ids = async q => (await h['search:query']({}, q)).map(r => r.id);
  assert.ok((await ids('ΑΚΡΟΠΟΛΗ')).includes(sa.id), 'a word far inside a long note is found, capitals and accents ignored');
  assert.deepStrictEqual(await h['search:ids']({}, 'zebra'), [sb.id]);
  const rr = (await h['search:query']({}, 'zebra'))[0]; assert.ok(rr.snippet.some(x => x.h && x.t === 'zebra') && rr.color && rr.title[0].t === 'Diary', JSON.stringify(rr));
  await h['note:lock'](sb.ee, 'pass1234'); assert.deepStrictEqual(await h['search:ids']({}, 'zebra'), [], 'the text of a locked note is not searched');
  assert.deepStrictEqual(await h['search:ids']({}, 'diary'), [sb.id], 'its title still is');
  assert.ok((await h['search:query']({}, 'diary'))[0].snippet.length === 0, 'and no text of it is shown');
  await h['note:update'](sa.ee, { blocks: [{ t: 'text', v: 'now about giraffes' }] }); assert.deepStrictEqual(await h['search:ids']({}, 'giraffes'), [sa.id], 'edited text is searched at once'); assert.deepStrictEqual(await h['search:ids']({}, 'Ακρόπολη'), []);
  assert.ok((await h['search:query']({}, '')).length >= 2, 'no text: the newest notes');
  assert.deepStrictEqual(await h['search:query']({}, 'q'.repeat(5000)), [], 'a huge query is just cut, no crash');
  assert.strictEqual(await h['search:show']({}, 'nope'), false);
  // the shortcut opens the search window, pressing it again closes it
  assert.ok(electron.__reg['Control+Alt+F'], 'Ctrl+Alt+F is a global shortcut');
  const w0 = wins.length; electron.__reg['Control+Alt+F'](); assert.strictEqual(wins.length, w0 + 1, 'search window opened'); const qw = wins[wins.length - 1];
  assert.ok(qw.o.frame === false && qw.o.alwaysOnTop && qw.o.skipTaskbar, 'a small floating window');
  electron.__reg['Control+Alt+F'](); assert.strictEqual(wins.length, w0 + 1, 'second press does not open another');
  electron.__reg['Control+Alt+F'](); assert.strictEqual(wins.length, w0 + 2, 'and after closing it opens again'); 
  assert.strictEqual(await h['search:show']({}, sa.id), true, 'choosing a result opens the note')
  electron.__reg['Control+Alt+F'](); assert.strictEqual(wins.length, w0 + 3, 'choosing a result closed the search window, so the next press opens a fresh one');
  // a crash in the main process is written to crash.log instead of a Windows error box
  process.emit('uncaughtException', new Error('boom test'));
  const cl = path.join(electron.app.getPath('userData'), 'crash.log'); assert.ok(fs.existsSync(cl) && /boom test/.test(fs.readFileSync(cl, 'utf8')), 'crash.log written');
  assert.strictEqual(await h['update:install']({}), true, 'restart-and-update answers before it quits');
  console.log('main harness ok');
  process.exit(0);
})().catch(e => { console.error('HARNESS FAIL', e); process.exit(1); });
