const L = require('../langs.js'), A = require('../ai.js'), assert = require('assert');
const d = s => { const r = L.detect(s); return r && r.code; };
assert.strictEqual(L.LANGS.length, 13);
assert.deepStrictEqual(L.LANGS.map(l => l.code), ['en', 'el', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'tr', 'ru', 'ar', 'zh', 'ja']);
assert.strictEqual(d('Καλημέρα, τι κάνεις σήμερα;'), 'el');
assert.strictEqual(d('Remember to send the file to the team and call you'), 'en');
assert.strictEqual(d('Recuerda enviar el archivo a los chicos para que lo vean'), 'es');
assert.strictEqual(d('Bonjour, je suis très content de vous voir et nous sommes là'), 'fr');
assert.strictEqual(d('Ich habe das nicht gemacht, aber das ist auch gut'), 'de');
assert.strictEqual(d('Привет, как дела'), 'ru');
assert.strictEqual(d('مرحبا كيف حالك اليوم'), 'ar');
assert.strictEqual(d('こんにちは世界'), 'ja');
assert.strictEqual(d('今天天气很好我们去公园'), 'zh');
assert.strictEqual(d('Bu bir deneme ve çok güzel'), 'tr');
assert.strictEqual(d('ok'), null); assert.strictEqual(d(''), null); assert.strictEqual(d('Buy milk'), null); assert.strictEqual(d('12345 678'), null);
assert.strictEqual(d('Buy milk και ψωμί και αυγά σήμερα'), 'el', 'mostly Greek text');
// the translate checks for the new languages
assert.strictEqual(A.translationProblem('Please call the doctor tomorrow', 'Por favor llama al médico mañana', 'Spanish'), '');
assert.strictEqual(A.translationProblem('Please call the doctor tomorrow', 'Please call the doctor tomorrow', 'Spanish'), 'same language');
assert.strictEqual(A.translationProblem('Please call the doctor tomorrow', 'Пожалуйста, позвоните врачу завтра', 'Russian'), '');
assert.strictEqual(A.translationProblem('Please call the doctor tomorrow', 'Por favor llama al médico', 'Russian'), 'same language');
assert.strictEqual(A.translationProblem('Please call the doctor tomorrow', '明天请给医生打电话', 'Chinese'), '');
assert.strictEqual(A.translationProblem('Please call the doctor tomorrow', 'Please call', 'Japanese'), 'same language');
assert.ok(/into Spanish/.test(A.translateSystem('Hello', 'Spanish')) && !/Greek/.test(A.translateSystem('Hello', 'Spanish')));
// chat language: follow the user's latest message, not the notes
const U = c => ({ role: 'user', content: c }), AS = c => ({ role: 'assistant', content: c });
assert.strictEqual(A.chatLanguage([U('Καλημέρα, τι κάνεις σήμερα;'), AS('Καλά'), U('What did I write about the dentist and the team?')]).code, 'en', 'English after Greek');
assert.strictEqual(A.chatLanguage([U('What did I write about the dentist and the team?'), AS('x'), U('Τι έγραψα για τον οδοντίατρο σήμερα;')]).code, 'el');
assert.strictEqual(A.chatLanguage([U('Please plan the day for the team and for me'), AS('x'), U('ok')]).code, 'en', 'a vague last message uses the one before');
assert.strictEqual(A.chatLanguage([U('Καλημέρα, τι κάνεις σήμερα;'), AS('x'), U('Make a note with a few paragraphs and a checklist about the greek goverment')]).code, 'en', 'a Greek topic in an English sentence stays English');
assert.strictEqual(A.chatLanguage([U('Καλημέρα, τι κάνεις σήμερα;'), AS('x'), U('hola, como estas')]), null, 'unsure Latin text never falls back to Greek');
assert.strictEqual(A.chatLanguage([U('ok')]), null); assert.strictEqual(A.chatLanguage([]), null);
assert.ok(/writing in English\. Answer in English/.test(A.chatLanguageRule(L.byCode('en'))) && /Greek/.test(A.chatLanguageRule(L.byCode('el'))) && /latest message/.test(A.chatLanguageRule(null)));
assert.ok(/Answer in English/.test(A.chatLanguageTail(L.byCode('en'))) && A.chatLanguageTail(null) === '');
assert.ok(/- \[ \] item/.test(A.SYS_CHAT) && /Checklist:/.test(A.SYS_CHAT), 'the chat is told how to write a checklist');
assert.ok(/LATEST message/.test(A.SYS_CHAT) && !/If the user writes in Greek, answer in natural, correct Greek\. You are/.test(A.SYS_CHAT));
(async () => {
  const nd = txt => ({ ok: true, status: 200, body: { getReader() { let x = false; return { read: async () => x ? { done: true } : (x = true, { value: new TextEncoder().encode(JSON.stringify({ message: { content: txt } }) + '\n{"done":true}\n') }) }; } } });
  const cfg = { provider: 'ollama', model: 'm', url: 'http://x' };
  let sys = '', shots = 0;
  const f = async (u, o) => { const b = JSON.parse(o.body); sys = b.messages[0].content; shots = b.messages.length; return nd('Recuerda llamar al médico mañana por la mañana'); };
  const out = await A.editStream(cfg, 'translate', 'Remember to call the doctor tomorrow morning', () => {}, null, f, { to: 'es' });
  assert.strictEqual(out.trim(), 'Recuerda llamar al médico mañana por la mañana'); assert.ok(/into Spanish/.test(sys)); assert.strictEqual(shots, 2, 'no examples for other languages');
  // Greek text can go to any language, English text to Greek keeps the tuned examples
  await A.editStream(cfg, 'translate', 'Θυμήσου να καλέσεις τον γιατρό αύριο', () => {}, null, f, { to: 'es' }); assert.ok(/into Spanish/.test(sys));
  const g = async (u, o) => { const b = JSON.parse(o.body); shots = b.messages.length; sys = b.messages[0].content; return nd('Θυμήσου να καλέσεις τον γιατρό αύριο το πρωί'); };
  await A.editStream(cfg, 'translate', 'Remember to call the doctor tomorrow morning', () => {}, null, g, { to: 'el' }); assert.ok(/into Greek/.test(sys)); assert.strictEqual(shots, 8);
  // unchanged answer is refused for a new language, nothing is written
  let w = ''; const same = async () => nd('Remember to call the doctor tomorrow morning');
  await assert.rejects(A.editStream(cfg, 'translate', 'Remember to call the doctor tomorrow morning', t => { w += t; }, null, same, { to: 'fr' }), /wrong language/); assert.strictEqual(w, '');
  await assert.rejects(A.editStream(cfg, 'translate', 'Hello there my friend', () => {}, null, f, { to: 'xx' }), /Unknown language/);
  // no language chosen: the old Greek <-> English behaviour
  const h = async (u, o) => { sys = JSON.parse(o.body).messages[0].content; return nd('Remember to call the doctor tomorrow morning'); };
  await A.editStream(cfg, 'translate', 'Θυμήσου να καλέσεις τον γιατρό αύριο το πρωί', () => {}, null, h); assert.ok(/into English/.test(sys));
  console.log('langs ok');
})().catch(e => { console.error(e); process.exit(1); });
