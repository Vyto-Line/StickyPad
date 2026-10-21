// The AI log and the "empty answer" handling.
const assert = require('assert'), A = require('../ai');
const stream = ch => ({ ok: true, status: 200, body: { getReader() { let i = 0; return { read: async () => i < ch.length ? { value: new TextEncoder().encode(ch[i++]), done: false } : { done: true } }; } } });
const cfg = { provider: 'ollama', model: 'm', url: 'http://x' };
(async () => {
  const lines = []; A.setLogger(l => lines.push(l));
  // 1. a good answer is logged with sizes and timings, never the text
  let out = await A.chatStream(cfg, 'sys', [{ role: 'user', content: 'secret question' }], () => {}, null,
    async () => stream(['{"message":{"content":"Hi there"}}\n', '{"done":true,"done_reason":"stop","eval_count":3,"load_duration":2000000000}\n']));
  assert.strictEqual(out, 'Hi there');
  assert.ok(/^OK /.test(lines[0]) && /answer 8 chars/.test(lines[0]) && /model load 2\.0 s/.test(lines[0]), lines[0]);
  assert.ok(!lines.join('\n').includes('secret question') && !lines.join('\n').includes('Hi there'), 'no note or answer text in the log');
  // 2. an empty reply is asked again once, and the second answer is used
  lines.length = 0; let n = 0;
  out = await A.chatStream(cfg, 's', [{ role: 'user', content: 'q' }], () => {}, null, async () => ++n === 1 ? stream(['{"done":true}\n']) : stream(['{"message":{"content":"ok"}}\n{"done":true}\n']));
  assert.strictEqual(out, 'ok'); assert.strictEqual(n, 2);
  assert.ok(lines.some(l => /^EMPTY/.test(l) && /asking again/.test(l)) && lines.some(l => /^OK/.test(l)), lines.join('\n'));
  // 3. empty twice: a clear message that points to the log, and the log says so
  lines.length = 0; n = 0;
  await assert.rejects(A.chatStream(cfg, 's', [{ role: 'user', content: 'q' }], () => {}, null, async () => { n++; return stream(['{"done":true}\n']); }), /no answer.*AI log/s);
  assert.strictEqual(n, 2); assert.strictEqual(lines.filter(l => /^EMPTY/.test(l)).length, 2);
  // 4. only "thinking" is not an answer
  lines.length = 0;
  await assert.rejects(A.chatStream(cfg, 's', [{ role: 'user', content: 'q' }], () => {}, null, async () => stream(['{"message":{"content":"<think>hmm</think>"}}\n{"done":true}\n'])), /no answer/);
  assert.ok(lines.some(l => /only thinking/.test(l)));
  // 5. unreadable lines and a stream that stops without a finish signal are recorded
  lines.length = 0;
  out = await A.chatStream(cfg, 's', [{ role: 'user', content: 'q' }], () => {}, null, async () => stream(['garbage\n{"message":{"content":"part"}}\n']));
  assert.strictEqual(out, 'part'); assert.ok(/^WARNING/.test(lines[0]) && /WITHOUT a finish signal/.test(lines[0]) && /1 unreadable/.test(lines[0]), lines[0]);
  // 6. connection failure and HTTP error are logged
  lines.length = 0;
  await assert.rejects(A.chatStream(cfg, 's', [{ role: 'user', content: 'q' }], () => {}, null, async () => { throw new Error('ECONNREFUSED'); }), /Could not reach Ollama/);
  assert.ok(/^FAILED/.test(lines[0]) && /Could not reach Ollama/.test(lines[0]), lines[0]);
  lines.length = 0;
  await assert.rejects(A.callModel(cfg, 's', 'u', {}, async () => ({ ok: true, status: 200, json: async () => ({ message: { content: '' } }) })), /empty answer/);
  assert.ok(/^FAILED/.test(lines[0]) && /empty answer/.test(lines[0]), lines[0]);
  // 7. stopping is logged as stopped, not as a failure
  lines.length = 0; const ac = new AbortController();
  await assert.rejects(A.chatStream(cfg, 's', [{ role: 'user', content: 'q' }], () => {}, ac.signal, async () => { ac.abort(); throw Object.assign(new Error('x'), { name: 'AbortError' }); }));
  assert.ok(/^STOPPED/.test(lines[0]), lines[0]);
  // 8. a broken logger never breaks the AI
  A.setLogger(() => { throw new Error('disk full'); });
  assert.strictEqual(await A.chatStream(cfg, 's', [{ role: 'user', content: 'q' }], () => {}, null, async () => stream(['{"message":{"content":"fine"}}\n{"done":true}\n'])), 'fine');
  A.setLogger(null);
  console.log('ai log ok');
})().catch(e => { console.error(e); process.exit(1); });

// thinking is switched off for the reasoning families (Gemma 4 included)
(async () => {
  assert.deepStrictEqual(A.thinkOff('gemma4:e4b'), { think: false });
  assert.deepStrictEqual(A.thinkOff('library/gemma4:12b'), { think: false });
  assert.deepStrictEqual(A.thinkOff('qwen3:8b'), { think: false });
  assert.deepStrictEqual(A.thinkOff('gpt-oss:20b'), { think: 'low' });
  assert.deepStrictEqual(A.thinkOff('llama3.2:3b'), {});
  assert.deepStrictEqual(A.thinkOff('gemma3:4b'), {});
  // chat: an Ollama that rejects "think" is asked again without it
  let n = 0; const bodies = [];
  const f = async (u, o) => { n++; const b = JSON.parse(o.body); bodies.push(b);
    return 'think' in b ? { ok: false, status: 400, json: async () => ({ error: '"gemma4" does not support think' }) } : stream(['{"message":{"content":"yes"}}\n{"done":true}\n']); };
  assert.strictEqual(await A.chatStream({ provider: 'ollama', model: 'gemma4:e4b', url: 'http://x' }, 's', [{ role: 'user', content: 'q' }], () => {}, null, f), 'yes');
  assert.strictEqual(n, 2); assert.ok(!('think' in bodies[1]));
  console.log('ai think ok');
})().catch(e => { console.error(e); process.exit(1); });
