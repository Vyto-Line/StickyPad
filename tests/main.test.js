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
  console.log('main harness ok');
  process.exit(0);
})().catch(e => { console.error('HARNESS FAIL', e); process.exit(1); });
