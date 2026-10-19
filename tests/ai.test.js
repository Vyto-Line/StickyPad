const A=require('../ai.js'),assert=require('assert');
const stream=ch=>({ok:true,status:200,body:{getReader(){let i=0;return{read:async()=>i<ch.length?{value:new TextEncoder().encode(ch[i++]),done:false}:{done:true}}}}});
(async()=>{
 let body; const f=async(u,o)=>{body=JSON.parse(o.body);return stream(['{"message":{"content":"Hel"}}\n','{"message":{"content":"lo."}}\n{"done":true}\n'])};
 const got=[];const out=await A.editStream({provider:'ollama',model:'m',url:'http://x'},'fix','helo',t=>got.push(t),null,f);
 assert.strictEqual(out,'Hello.');assert.deepStrictEqual(got,['Hel','lo.']);
 assert.strictEqual(body.keep_alive,'30m');assert.strictEqual(body.options.temperature,0.2);assert(body.options.num_predict>=200);assert(/Fix spelling/.test(body.messages[0].content));
 const f2=async()=>stream(['{"message":{"content":"```\\nok\\n```"}}\n']);
 assert.strictEqual(await A.editStream({provider:'ollama',model:'m'},'polish','x',()=>{},null,f2),'ok');
 await assert.rejects(A.editStream({provider:'ollama',model:'m'},'fix','  ',()=>{},null,f2),/no text/);
 await assert.rejects(A.editStream({provider:'ollama',model:'m'},'zzz','x',()=>{},null,f2),/Unknown/);
 await assert.rejects(A.editStream({provider:'off'},'fix','x',()=>{}),/off/);
 let wb;assert(await A.warmup({provider:'ollama',model:'m'},async(u,o)=>{wb=[u,JSON.parse(o.body)];return{ok:true}}));assert.strictEqual(wb[0],'http://localhost:11434/api/generate');assert.strictEqual(wb[1].keep_alive,'30m');
 assert(!(await A.warmup({provider:'claude',model:'m'})));assert(!(await A.warmup({provider:'ollama',model:''})));
 // callModel predict
 let cb;await A.summarize({provider:'ollama',model:'m'},'hello world',async(u,o)=>{cb=JSON.parse(o.body);return{ok:true,json:async()=>({message:{content:'• hi'}})}});assert.strictEqual(cb.options.num_predict,320);assert.strictEqual(cb.keep_alive,'30m');
 console.log('ai tests ok');
})().catch(e=>{console.error(e);process.exit(1)});
