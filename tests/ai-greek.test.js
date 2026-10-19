const A=require('../ai.js'),assert=require('assert');
const cfg={provider:'ollama',model:'m',url:'http://x'};
// mock model: grammar -> upper-cases "tpyo"→"typo" in each string; records requests
function mock(handler){const reqs=[];const f=async(u,o)=>{const b=JSON.parse(o.body);reqs.push(b);const out=await handler(b);return{ok:true,json:async()=>({message:{content:out}})}};f.reqs=reqs;return f}
(async()=>{
 assert(A.isGreek('Καλημέρα κόσμε')&&!A.isGreek('hello world')&&A.isGreek('Θέλω to buy γάλα'));
 assert(A.ctxFor(100)===4096&&A.ctxFor(20000)===12500+512&&A.ctxFor(1e6)===16384);
 // splitPieces reconstructs exactly
 const big=('Πρώτη γραμμή με κείμενο.\n'+'x'.repeat(3000)+'\nΤελευταία γραμμή! Και άλλη; Ναι… ').repeat(3);
 const ps=A.splitPieces(big,1200);assert.strictEqual(ps.join(''),big);assert(ps.every(p=>p.length<=1200));
 // Greek grammar: rules + example in system prompt, content round trip
 let f=mock(b=>JSON.stringify({items:JSON.parse(b.messages[1].content).map(s=>s.replace('θελο','θέλω'))}));
 let out=await A.fixGrammar(cfg,['  θελο γαλα\n','Hello world'],f);
 assert.strictEqual(out[0],'  θέλω γαλα\n');assert.strictEqual(out[1],'Hello world');
 assert(/GREEK RULES/.test(f.reqs[0].messages[0].content)&&/σούπερ μάρκετ/.test(f.reqs[0].messages[0].content),'greek rules+example');
 // big note: one huge text node, last line must survive and be processed
 const lines=[];for(let i=0;i<400;i++)lines.push('γραμμή '+i+' θελο');const note=lines.join('\n')+'\nΤΕΛΕΥΤΑΙΑ θελο';
 f=mock(b=>JSON.stringify({items:JSON.parse(b.messages[1].content).map(s=>s.replace(/θελο/g,'θέλω'))}));
 out=await A.fixGrammar(cfg,[note],f);
 assert(out[0].endsWith('ΤΕΛΕΥΤΑΙΑ θέλω'),'last line processed');assert(!/θελο/.test(out[0]));assert.strictEqual(out[0].split('\n').length,401);
 assert(f.reqs.length>=3,'chunked into several requests: '+f.reqs.length);assert(f.reqs.every(r=>r.options.num_ctx>=4096));
 // translation guard: model answers in English -> original kept
 f=mock(b=>JSON.stringify({items:JSON.parse(b.messages[1].content).map(()=>'I want milk')}));
 out=await A.fixGrammar(cfg,['θελο γαλα'],f);assert.strictEqual(out[0],'θελο γαλα');
 // unusable answers: retried once, then original kept; connection errors still surface
 let n=0;f=mock(b=>{n++;return 'blah'});out=await A.fixGrammar(cfg,['abc'],f);assert.strictEqual(out[0],'abc');assert.strictEqual(n,2);
 await assert.rejects(A.fixGrammar(cfg,['abc'],async()=>{throw new Error('down')}),/reach Ollama/);
 // summarize long: map-reduce touches the end
 const long=Array.from({length:30},(_,i)=>'Παράγραφος '+i+' '+'λέξη '.repeat(150)).join('\n')+'\nΤΕΛΟΣ-ΣΗΜΑΝΤΙΚΟ';
 f=mock(b=>'• σύνοψη');await A.summarize(cfg,long,f);
 assert(f.reqs.length>3);assert(f.reqs.some(r=>r.messages[1].content.includes('ΤΕΛΟΣ-ΣΗΜΑΝΤΙΚΟ')),'end of note summarised');
 assert(/Write the summary in Greek/.test(f.reqs[0].messages[0].content));assert(/partial summaries/.test(f.reqs.at(-1).messages[0].content));
 // checklist long: merged + deduped
 f=mock(b=>JSON.stringify({items:[{text:'Κοινό',done:false},{text:'Μοναδικό '+b.messages[1].content.length,done:false}]}));
 const cl=await A.toChecklist(cfg,long,f);assert(cl.filter(x=>x.text==='Κοινό').length===1&&cl.length>2);
 // edit system Greek
 assert(/GREEK RULES/.test(A.editSystem('fix','Καλημέρα'))&&!/GREEK RULES/.test(A.editSystem('fix','hello')));
 // short english unchanged path
 f=mock(b=>'• hi');assert.strictEqual(await A.summarize(cfg,'short note here',f),'• hi');assert.strictEqual(f.reqs.length,1);
 console.log('ai2 ok');
})().catch(e=>{console.error(e);process.exit(1)});

// ---- translate (Greek <-> English) ----
(async () => {
  const assert = require('assert'), A = require('../ai');
  assert.strictEqual(A.translateTarget('Καλημέρα, τι κάνεις σήμερα;'), 'English');
  assert.strictEqual(A.translateTarget('Good morning, how are you?'), 'Greek');
  assert.strictEqual(A.translateTarget('Buy milk και ψωμί και αυγά σήμερα'), 'English', 'mostly Greek text goes to English');
  const toEn = A.editSystem('translate', 'Καλημέρα κόσμε, πώς είσαι;'), toEl = A.editSystem('translate', 'Please send the report by Friday.');
  assert.ok(/into English/.test(toEn) && !/monotonic/.test(toEn), 'Greek -> English prompt');
  assert.ok(/into Greek/.test(toEl) && /monotonic/.test(toEl) && /accent/i.test(toEl), 'English -> Greek prompt carries the Greek rules');
  assert.ok(/ONLY the translation/.test(toEl));
  assert.ok(A.EDIT_MODES.translate, 'translate is a known edit mode');
  let sent = null;
  const fake = async (url, init) => { sent = JSON.parse(init.body); const enc = new TextEncoder(); return { ok: true, status: 200, body: new ReadableStream({ start(c) { c.enqueue(enc.encode(JSON.stringify({ message: { content: 'Καλημέρα' }, done: true }) + '\n')); c.close(); } }) }; };
  const out = await A.editStream({ provider: 'ollama', model: 'm', url: 'http://localhost:11434' }, 'translate', 'Good morning', () => {}, undefined, fake);
  assert.strictEqual(out, 'Καλημέρα');
  assert.ok(/into Greek/.test(sent.messages[0].content), 'system prompt sent to the model');
  assert.ok(sent.options.num_predict >= 200, 'room for Greek output');
  // the not-installed message now tells people where to click
  const missing = async () => ({ ok: false, status: 404, json: async () => ({ error: "model 'gemma3:4b' not found" }) });
  await assert.rejects(() => A.callModel({ provider: 'ollama', model: 'gemma3:4b', url: 'http://localhost:11434' }, 's', 'u', {}, missing), e => e.friendly && /not installed/.test(e.message) && /gemma3:4b/.test(e.message) && /Download/.test(e.message));
  console.log('translate ok');
})().catch(e => { console.error(e); process.exit(1); });
