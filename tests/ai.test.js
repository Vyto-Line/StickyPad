const A=require('../ai.js'),assert=require('assert');
const stream=ch=>({ok:true,status:200,body:{getReader(){let i=0;return{read:async()=>i<ch.length?{value:new TextEncoder().encode(ch[i++]),done:false}:{done:true}}}}});
(async()=>{
 let body; const f=async(u,o)=>{body=JSON.parse(o.body);return stream(['{"message":{"content":"Hel"}}\n','{"message":{"content":"lo."}}\n{"done":true}\n'])};
 const got=[];const out=await A.editStream({provider:'ollama',model:'m',url:'http://x'},'fix','helo',t=>got.push(t),null,f);
 assert.strictEqual(out,'Hello.');assert.deepStrictEqual(got,['Hel','lo.']);
 assert.strictEqual(body.keep_alive,'5m');assert.strictEqual(body.options.temperature,0.2);assert(body.options.num_predict>=200);assert(/Fix spelling/.test(body.messages[0].content));
 const f2=async()=>stream(['{"message":{"content":"```\\nok\\n```"}}\n']);
 assert.strictEqual(await A.editStream({provider:'ollama',model:'m'},'polish','x',()=>{},null,f2),'ok');
 await assert.rejects(A.editStream({provider:'ollama',model:'m'},'fix','  ',()=>{},null,f2),/no text/);
 await assert.rejects(A.editStream({provider:'ollama',model:'m'},'zzz','x',()=>{},null,f2),/Unknown/);
 await assert.rejects(A.editStream({provider:'off'},'fix','x',()=>{}),/off/);
 let wb;assert(await A.warmup({provider:'ollama',model:'m'},async(u,o)=>{wb=[u,JSON.parse(o.body)];return{ok:true}}));assert.strictEqual(wb[0],'http://localhost:11434/api/generate');assert.strictEqual(wb[1].keep_alive,'5m');
 assert(!(await A.warmup({provider:'claude',model:'m'})));assert(!(await A.warmup({provider:'ollama',model:''})));
 // callModel predict
 let cb;await A.summarize({provider:'ollama',model:'m'},'hello world',async(u,o)=>{cb=JSON.parse(o.body);return{ok:true,json:async()=>({message:{content:'• hi'}})}});assert.strictEqual(cb.options.num_predict,320);assert.strictEqual(cb.keep_alive,'5m');
 console.log('ai tests ok');
})().catch(e=>{console.error(e);process.exit(1)});

// ---- memory: how long the model stays loaded ----
(async () => {
  const assert = require('assert'), A = require('../ai');
  assert.strictEqual(A.keepOf({}), '5m'); assert.strictEqual(A.keepOf({ keepAlive: '30m' }), '30m'); assert.strictEqual(A.keepOf({ keepAlive: '0' }), 0); assert.strictEqual(A.keepOf({ keepAlive: 'junk' }), '5m');
  let sent = [];
  const fake = async (url, init) => { sent.push([url, JSON.parse(init.body)]); return { ok: true, status: 200, json: async () => ({ message: { content: 'ok' } }) }; };
  const cfg = { provider: 'ollama', model: 'm', url: 'http://localhost:11434' };
  await A.callModel({ ...cfg, keepAlive: '0' }, 's', 'u', {}, fake); assert.strictEqual(sent[0][1].keep_alive, 0, 'unload right away');
  await A.callModel(cfg, 's', 'u', {}, fake); assert.strictEqual(sent[1][1].keep_alive, '5m', 'default is 5 minutes (it used to be 30)');
  sent = []; assert.strictEqual(await A.warmup({ ...cfg, keepAlive: '0' }, fake), false); assert.strictEqual(sent.length, 0, 'no preloading when the model should unload at once');
  await A.warmup({ ...cfg, keepAlive: '30m' }, fake); assert.strictEqual(sent[0][1].keep_alive, '30m');
  console.log('ai keepalive ok');
})().catch(e => { console.error(e); process.exit(1); });

// ---- automatic title ----
(async () => {
  const assert = require('assert'), A = require('../ai');
  assert.strictEqual(A.cleanTitle('"Λίστα για το σούπερ μάρκετ."'), 'Λίστα για το σούπερ μάρκετ');
  assert.strictEqual(A.cleanTitle('Title: Weekend trip plan\nHere is why…'), 'Weekend trip plan');
  assert.strictEqual(A.cleanTitle('<think>hmm</think>**Budget 2026**'), 'Budget 2026');
  let sent;
  const fake = async (u, o) => { sent = JSON.parse(o.body); return { ok: true, status: 200, json: async () => ({ message: { content: '"Ψώνια εβδομάδας"' } }) }; };
  const t = await A.suggestTitle({ provider: 'ollama', model: 'm', url: 'http://x' }, 'γάλα ψωμί αυγά τυρί', fake);
  assert.strictEqual(t, 'Ψώνια εβδομάδας'); assert.ok(/Greek/.test(sent.messages[0].content) && sent.options.num_predict <= 60);
  await assert.rejects(A.suggestTitle({ provider: 'ollama', model: 'm' }, '  ', fake), /nothing to title/);
  console.log('ai title ok');
})().catch(e => { console.error(e); process.exit(1); });
