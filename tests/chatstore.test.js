const C = require('../chatstore.js'), assert = require('assert');
const U = t => ({ role: 'user', content: t }), A = t => ({ role: 'assistant', content: t });
// old one-chat file moves into the new format
let S = C.load({ messages: [U('Help me plan my day'), A('Sure'), U('more')], noteId: 'n1' });
assert.strictEqual(S.chats.length, 1); assert.strictEqual(C.cur(S).title, 'Help me plan my day'); assert.strictEqual(C.cur(S).noteId, 'n1'); assert.strictEqual(C.cur(S).messages.length, 3);
assert.strictEqual(C.list(S).length, 1);
// nothing / junk / empty old chat -> one empty chat that is not listed
for (const raw of [null, undefined, 5, {}, { messages: [] }, { chats: 'x' }, { chats: [null, 3, {}] }]) { const s = C.load(raw); assert.ok(C.cur(s)); assert.strictEqual(C.list(s).length, 0, JSON.stringify(raw)); }
// saving names the chat after the first question; a rename sticks
S = C.load(null); C.saveCurrent(S, { messages: [U('  What is\n a VPN?  '), A('A tunnel.')], noteId: null }, 1000);
assert.strictEqual(C.cur(S).title, 'What is a VPN?'); assert.strictEqual(C.cur(S).updated, 1000);
C.saveCurrent(S, { messages: [U('  What is\n a VPN?  '), A('A tunnel.')] }, 2000); assert.strictEqual(C.cur(S).updated, 1000, 'unchanged chat keeps its date');
const id1 = S.current; assert.ok(C.rename(S, id1, ' My VPN chat ')); C.saveCurrent(S, { messages: [U('What is a VPN?'), A('x'), U('and?')] }, 3000);
assert.strictEqual(C.cur(S).title, 'My VPN chat'); C.rename(S, id1, ''); assert.strictEqual(C.cur(S).title, 'What is a VPN?');
assert.strictEqual(C.titleFrom([U('x'.repeat(100))]).length, 48);
// new chat: the old one stays, an empty current chat is reused
const n1 = C.startNew(S); assert.notStrictEqual(n1.id, id1); assert.strictEqual(C.startNew(S).id, n1.id, 'no pile of empty chats');
assert.strictEqual(C.list(S).length, 1, 'empty chat is not in the list');
C.saveCurrent(S, { messages: [U('Trip ideas'), A('Lisbon')] }, 5000);
assert.deepStrictEqual(C.list(S).map(c => c.title), ['Trip ideas', 'What is a VPN?']);
C.pin(S, id1, true); assert.deepStrictEqual(C.list(S).map(c => c.title), ['What is a VPN?', 'Trip ideas'], 'pinned first');
assert.deepStrictEqual(C.list(S, 'lisbon').map(c => c.title), ['Trip ideas'], 'search finds words inside the chat');
assert.deepStrictEqual(C.list(S, 'vpn').map(c => c.title), ['What is a VPN?']); assert.strictEqual(C.list(S, 'zzz').length, 0);
// switching
assert.strictEqual(C.select(S, id1).id, id1); assert.strictEqual(S.current, id1); assert.strictEqual(C.select(S, 'nope').id, id1);
// delete: the current one goes -> the newest other one opens; last one -> a fresh empty chat
const trip = S.chats.find(c => c.title === 'Trip ideas').id;
assert.ok(C.remove(S, id1)); assert.strictEqual(S.current, trip); assert.ok(!C.remove(S, 'nope'));
assert.ok(C.remove(S, trip)); assert.strictEqual(C.list(S).length, 0); assert.strictEqual(C.cur(S).messages.length, 0);
// file round trip, with the old format fields for the current chat
S = C.load(null); C.saveCurrent(S, { messages: [U('a'), A('b')], noteId: 'n9' }, 1); C.startNew(S); C.saveCurrent(S, { messages: [U('c'), A('d')] }, 2);
const f = JSON.parse(JSON.stringify(C.toFile(S))); assert.strictEqual(f.version, 2); assert.strictEqual(f.messages[0].content, 'c'); assert.strictEqual(f.chats.length, 2);
const S2 = C.load(f); assert.strictEqual(S2.chats.length, 2); assert.strictEqual(S2.current, S.current);
// delete all removes every message
C.removeAll(S); assert.strictEqual(S.chats.length, 1); assert.strictEqual(JSON.stringify(C.toFile(S)).includes('"content"'), false);
// limits: 100 chats, pinned ones survive, the one you are in survives
S = C.load(null); for (let i = 0; i < 105; i++) { C.startNew(S); C.saveCurrent(S, { messages: [U('q' + i)] }, 100 + i); }
assert.ok(S.chats.length <= C.MAX_CHATS); assert.ok(C.list(S).some(c => c.title === 'q104')); assert.ok(!C.list(S).some(c => c.title === 'q0'));
// messages: first must be the user, 100 kept, 8000 characters each
assert.strictEqual(C.cleanChat([A('x'), U('y')]).length, 1); assert.strictEqual(C.cleanChat(Array.from({ length: 150 }, (_, i) => U('m' + i))).length, 100);
assert.ok(/^You: hi\n\nAI: yo$/.test(C.transcript({ messages: [U('hi'), A('yo')] })));
console.log('chatstore ok');
