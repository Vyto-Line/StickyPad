'use strict';
// Many AI chats in one file (chat.json). Pure data code, no Electron, tested in Node.
// File format: { version: 2, current, chats: [{ id, title, custom, pinned, updated, noteId, messages }] }
// The current chat's messages and noteId are also kept at the top level, which is the old (one chat) format,
// so an older StickyPad that opens the file still finds the chat you were in.
const MAX_CHATS = 100, KEEP = 100;
const rid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function cleanChat(messages, keep = KEEP) {
  const out = (Array.isArray(messages) ? messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content !== '')
    .map(m => ({ role: m.role, content: m.content.slice(0, 8000) })).slice(-keep);
  while (out.length && out[0].role !== 'user') out.shift();   // models expect the conversation to start with the user
  return out;
}
// The title is the first thing you asked, on one line.
function titleFrom(messages) {
  const u = (messages || []).find(m => m.role === 'user'); if (!u) return 'New chat';
  const t = u.content.replace(/\s+/g, ' ').trim();
  return t ? (t.length > 48 ? t.slice(0, 47).trimEnd() + '…' : t) : 'New chat';
}
const blank = () => ({ id: rid(), title: 'New chat', custom: false, pinned: false, updated: Date.now(), noteId: null, messages: [] });
function cleanOne(c) {
  if (!c || typeof c !== 'object') return null;
  const messages = cleanChat(c.messages);
  const custom = !!c.custom && typeof c.title === 'string' && c.title.trim() !== '';
  return { id: typeof c.id === 'string' && c.id ? c.id : rid(), title: custom ? c.title.trim().slice(0, 80) : titleFrom(messages), custom, pinned: !!c.pinned,
    updated: Number.isFinite(c.updated) ? c.updated : 0, noteId: typeof c.noteId === 'string' ? c.noteId : null, messages };
}
// raw: whatever was read from the file (old one-chat format, new format, or nothing)
function load(raw) {
  let chats = [], current = null;
  if (raw && Array.isArray(raw.chats)) { chats = raw.chats.map(cleanOne).filter(Boolean); current = raw.current; }
  else if (raw && Array.isArray(raw.messages)) { const c = cleanOne({ messages: raw.messages, noteId: raw.noteId, updated: Date.now() }); if (c && c.messages.length) chats = [c]; if (chats[0]) current = chats[0].id; }
  const seen = new Set(); chats = chats.filter(c => !seen.has(c.id) && seen.add(c.id));
  const S = { chats, current: chats.some(c => c.id === current) ? current : null };
  cur(S); return S;
}
function cur(S) {
  let c = S.chats.find(x => x.id === S.current);
  if (!c) { c = S.chats.find(x => !x.messages.length) || null; if (!c) { c = blank(); S.chats.push(c); } S.current = c.id; }
  return c;
}
function prune(S) {
  while (S.chats.length > MAX_CHATS) {
    const old = S.chats.filter(c => !c.pinned && c.id !== S.current).sort((a, b) => a.updated - b.updated)[0];
    if (!old) break; S.chats.splice(S.chats.indexOf(old), 1);
  }
  // empty chats that are not the one you are in are just clutter
  S.chats = S.chats.filter(c => c.messages.length || c.id === S.current);
}
function saveCurrent(S, p, now = Date.now()) {
  const c = cur(S), messages = cleanChat(p && p.messages);
  const changed = JSON.stringify(messages) !== JSON.stringify(c.messages);
  c.messages = messages; c.noteId = p && typeof p.noteId === 'string' ? p.noteId : null;
  if (!c.custom) c.title = titleFrom(messages);
  if (changed) c.updated = now;
  prune(S); return c;
}
function select(S, id) { if (S.chats.some(c => c.id === id)) { S.current = id; prune(S); } return cur(S); }
function startNew(S) {
  const c = cur(S); if (!c.messages.length) { c.noteId = null; return c; }
  const n = blank(); S.chats.push(n); S.current = n.id; prune(S); return n;
}
function rename(S, id, title) {
  const c = S.chats.find(x => x.id === id); if (!c) return false;
  const t = String(title == null ? '' : title).replace(/\s+/g, ' ').trim().slice(0, 80);
  if (t) { c.title = t; c.custom = true; } else { c.custom = false; c.title = titleFrom(c.messages); }
  return true;
}
function pin(S, id, on) { const c = S.chats.find(x => x.id === id); if (!c) return false; c.pinned = !!on; return true; }
function remove(S, id) {
  const i = S.chats.findIndex(x => x.id === id); if (i < 0) return false;
  S.chats.splice(i, 1);
  if (S.current === id) { const next = S.chats.filter(c => c.messages.length).sort((a, b) => b.updated - a.updated)[0]; S.current = next ? next.id : null; }
  cur(S); return true;
}
function removeAll(S) { S.chats = []; S.current = null; cur(S); }
// the list on the left: pinned first, then newest first; q searches titles and the chat text
function list(S, q) {
  const needle = String(q || '').trim().toLowerCase();
  return S.chats.filter(c => c.messages.length)
    .filter(c => !needle || c.title.toLowerCase().includes(needle) || c.messages.some(m => m.content.toLowerCase().includes(needle)))
    .sort((a, b) => (b.pinned - a.pinned) || (b.updated - a.updated))
    .map(c => ({ id: c.id, title: c.title, pinned: c.pinned, updated: c.updated, current: c.id === S.current, count: c.messages.length }));
}
function transcript(c) { return (c ? c.messages : []).map(m => (m.role === 'user' ? 'You: ' : 'AI: ') + m.content).join('\n\n'); }
function toFile(S) {
  const c = cur(S);
  return { version: 2, current: S.current, chats: S.chats.filter(x => x.messages.length || x.id === S.current), messages: c.messages, noteId: c.noteId };
}
module.exports = { load, cur, saveCurrent, select, startNew, rename, pin, remove, removeAll, list, transcript, toFile, cleanChat, titleFrom, MAX_CHATS };
