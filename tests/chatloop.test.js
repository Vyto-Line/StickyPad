// A model that repeats itself is stopped, and the repeat is cut away.
const assert = require('assert'), A = require('../ai');
const chunk = t => JSON.stringify({ message: { content: t } }) + '\n';
const stream = ch => ({ ok: true, status: 200, body: { getReader() { let i = 0; return { read: async () => i < ch.length ? { value: new TextEncoder().encode(ch[i++]), done: false } : { done: true } }; } } });
const cfg = { provider: 'ollama', model: 'm', url: 'http://x' };
const block = 'The government is:\n\n- One thing here\n- Another thing here\n\n';
assert.strictEqual(A.cutRepeat('Intro paragraph that is long enough.\n\n' + block + block + block), 'Intro paragraph that is long enough.\n\n' + block.trim(), 'cut at the first repeated paragraph');
assert.strictEqual(A.cutRepeat('Short.\n\nShort.\n\nShort.\n\n'), null, 'short paragraphs may repeat');
assert.strictEqual(A.cutRepeat('A first paragraph that is long enough.\n\nA second, different paragraph that is long.\n\nThe end.'), null);
const ln = 'This very same line is written again and again';
assert.strictEqual(A.cutRepeat('Start\n' + [ln, ln, ln, ln].join('\n')), 'Start\n' + ln + '\n' + ln, 'a line that appears three times is cut at the third');
assert.strictEqual(A.cutRepeat('One\n\nTwo\n\n'), null); assert.strictEqual(A.cutRepeat(''), null);
(async () => {
  let seenBody = null, sent = '';
  const text = 'Intro paragraph that is long enough.\n\n' + block + block + block + block;
  const parts = text.match(/[\s\S]{1,23}/g).map(chunk).concat(['{"done":true}\n']);
  const out = await A.chatStream(cfg, 's', [{ role: 'user', content: 'q' }], t => { sent += t; }, null, async (u, o) => { seenBody = JSON.parse(o.body); return stream(parts); }, { loopGuard: true });
  assert.strictEqual(out, 'Intro paragraph that is long enough.\n\n' + block.trim(), 'the answer stops at the repeat');
  assert.ok(sent.length < text.length, 'and the rest is not even sent on');
  assert.strictEqual(seenBody.options.repeat_penalty, 1.1, 'the chat asks Ollama to discourage repeats');
  // without the guard (summaries, edits) nothing changes
  seenBody = null;
  const plain = await A.chatStream(cfg, 's', [{ role: 'user', content: 'q' }], () => {}, null, async (u, o) => { seenBody = JSON.parse(o.body); return stream(parts); });
  assert.strictEqual(plain, text); assert.ok(!('repeat_penalty' in seenBody.options));
  console.log('chat loop ok');
})().catch(e => { console.error(e); process.exit(1); });
