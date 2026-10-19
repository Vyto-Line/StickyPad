// Small helper that asks a language model to summarise a note or fix its grammar.
// It talks either to Ollama (a free model running on your own PC) or to the Claude API.
// Pure Node code (no Electron), so it can be tested on its own.

const SYS_SUMMARY =
  'You summarise sticky notes. Reply in the same language as the note (English or Greek). ' +
  'Write at most 3 short bullet lines, each starting with "• ". Do not add information that is not in the note. ' +
  'If the note is very short, reply with one short sentence. Reply with the summary only. ' +
  'Cover the whole note, including the last lines: do not stop at the beginning.';

const SYS_GRAMMAR =
  'You are a careful proofreader for English and Greek. You receive a JSON array of strings taken from a note. ' +
  'Return ONLY a JSON object of the form {"items": [...]} containing exactly the same number of strings, in the same order. ' +
  'In each string fix spelling, grammar, punctuation and capitalisation. Keep the language (do not translate), the meaning, ' +
  'the tone, names, numbers, emojis and line breaks. Greek text must keep its accents (τόνοι). Do not rewrite the style, ' +
  'and do not add or remove content. If a string needs no change, return it exactly as it is. No explanations.';

const SYS_CHECKLIST =
  'You turn a messy sticky note into a clean checklist. Return ONLY a JSON object {"items":[{"text":"...","done":false}]}. ' +
  'Keep every task, idea or thing to remember from the note, one per item, as a short line in the SAME language as the note ' +
  '(English or Greek). Merge duplicates, drop filler words, keep names, numbers, dates and times. Do not invent tasks. ' +
  'Lines marked [x] in the input are already done: use "done":true for them. If the first line is just a title, do not make it an item. ' +
  'Cover the WHOLE input, including its last lines.';

const SYS_CHAT =
  'If the user writes in Greek, answer in natural, correct Greek. You are the assistant inside StickyPad, a sticky-notes app. Be concise and friendly. Answer in the language the user writes in ' +
  '(English or Greek). Use short paragraphs and simple lists. Do not use tables.';

// ---------- language help: Greek gets its own, much more specific instructions ----------
const letters = t => (String(t).match(/[A-Za-z\u0370-\u03FF\u1F00-\u1FFF]/g) || []).length;
const greekLetters = t => (String(t).match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) || []).length;
function greekShare(t) { const l = letters(t); return l ? greekLetters(t) / l : 0; }
const isGreek = t => greekShare(t) >= 0.3;

const GREEK_RULES =
  'GREEK RULES. The text is Greek (modern Greek, monotonic system). Always answer in Greek, never translate to English and never write Greek in Latin letters. ' +
  'Put the stress mark (τόνος) on every word that needs one, including text typed with no accents at all (e.g. "θελω" → "θέλω", "γαλα" → "γάλα"); ' +
  'one-syllable words normally have none (except ή "or", πώς/πού/πότε/ποιος as questions, and the pronouns/particles where it separates meaning). ' +
  'Use the final ς, ί/ϊ/ΐ correctly, and the Greek question mark ";" for questions. Fix the usual spelling traps: ι/η/υ/ει/οι/υι sounds, ο/ω, αι/ε, ' +
  'double consonants, ό,τι vs ότι, πως vs πώς, μη vs μην, the final ν in την/στην/δεν/μην/αυτόν before a vowel or κ π τ ξ ψ μπ ντ γκ τσ τζ, ' +
  'and agreement of gender, number and case. Keep proper names, English words, numbers, dates and emojis exactly as they are.';
const withLang = (sys, sample) => isGreek(sample) ? sys + ' ' + GREEK_RULES : sys;

const GREEK_GRAMMAR_EXAMPLE =
  ' Example for Greek. Input: ["Θελο να παω στο σουπερ μαρκετ και να αγορασω γαλα.","ο γιατρος ειπε οτι πρεπει να παρω τα χαπια μου"] ' +
  'Output: {"items":["Θέλω να πάω στο σούπερ μάρκετ και να αγοράσω γάλα.","Ο γιατρός είπε ότι πρέπει να πάρω τα χάπια μου."]}';

const DEFAULT_CLAUDE_MODEL = 'claude-haiku-5-5';
const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const MAX_CHARS = 12000;   // longest piece the live edit accepts at once
const MAX_TOTAL = 400000, CHUNK = 3500, PIECE = 1200, BATCH = 3000;   // long notes are processed in chunks

const KEEP_ALIVE = '30m';   // keeps the model in memory between requests, so the next answer starts instantly
const ollamaOpts = (temperature, predict, chars = 0) => ({ temperature, num_ctx: ctxFor(chars, predict), ...(predict ? { num_predict: predict } : {}) });

// Splits text into pieces of at most `max` characters, on line breaks first and then sentence ends, so joining the pieces gives back the exact text.
function splitPieces(str, max) {
  const out = []; let cur = '';
  const push = p => { if (cur && cur.length + p.length > max) { out.push(cur); cur = ''; } cur += p; };
  for (const line of String(str).split(/(?<=\n)/)) {
    if (line.length <= max) { push(line); continue; }
    for (const sent of line.split(/(?<=[.!?;·…]\s)/)) {
      if (sent.length <= max) { push(sent); continue; }
      for (let i = 0; i < sent.length; i += max) push(sent.slice(i, i + max));
    }
  }
  if (cur) out.push(cur);
  return out;
}
const lead = t => (t.match(/^\s*/) || [''])[0], trail = t => (t.match(/\s*$/) || [''])[0];
// Greek takes about one token per 1.6 characters, English one per 4: leave enough room that long notes are never cut off.
const ctxFor = (chars, predict = 0) => Math.min(16384, Math.max(4096, Math.ceil(chars / 1.6) + predict + 512));

// some reasoning models put their thinking in <think> tags: never show it
const stripThink = t => String(t).replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^\s+/, '');

const fail = msg => { const e = new Error(msg); e.friendly = true; return e; };

function httpMessage(provider, status, data, cfg) {
  if (provider === 'ollama') {
    const m = (data && data.error) || `HTTP ${status}`;
    if (/not found/i.test(m)) return `The model "${cfg.model}" is not installed on this PC yet. Open the AI tab (or Settings > AI), pick it in the list and press Download.`;
    return 'Ollama said: ' + m;
  }
  if (status === 401 || status === 403) return 'The API key was rejected. Check it in the AI tab.';
  if (status === 429) return 'Too many requests right now. Wait a moment and try again.';
  return 'Claude said: ' + ((data && data.error && data.error.message) || `HTTP ${status}`);
}

async function post(url, headers, body, fetchImpl, timeoutMs) {
  let res;
  try {
    res = await fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) throw fail('The AI took too long to answer. Try a shorter note or a smaller model.');
    throw fail('__unreachable__');
  }
  let data = null; try { data = await res.json(); } catch { /* not json */ }
  return { res, data };
}

async function callModel(cfg, system, user, { json = false, predict = 0 } = {}, fetchImpl = fetch) {
  const provider = cfg.provider;
  if (provider === 'ollama') {
    const base = String(cfg.url || DEFAULT_OLLAMA_URL).trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(base)) throw fail('The Ollama address must start with http:// (for example http://localhost:11434).');
    if (!cfg.model) throw fail('Enter the name of an Ollama model first (for example llama3.2).');
    let r;
    try { r = await post(base + '/api/chat', { 'content-type': 'application/json' },
      { model: cfg.model, stream: false, keep_alive: KEEP_ALIVE, ...(json ? { format: 'json' } : {}), options: ollamaOpts(0.2, predict, system.length + user.length),
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }, fetchImpl, 120000); }
    catch (e) { if (e.message === '__unreachable__') throw fail(`Could not reach Ollama at ${base}. Is it running?`); throw e; }
    if (!r.res.ok) {
      const m = (r.data && r.data.error) || `HTTP ${r.res.status}`;
      if (/not found/i.test(m)) throw fail(httpMessage('ollama', r.res.status, r.data, cfg));
      throw fail('Ollama said: ' + m);
    }
    const out = r.data && r.data.message && r.data.message.content;
    if (!out || !stripThink(out).trim()) throw fail('Ollama returned an empty answer.');
    return stripThink(out);
  }
  if (provider === 'claude') {
    if (!cfg.key) throw fail('Add your Anthropic API key in the AI tab first.');
    let r;
    try { r = await post('https://api.anthropic.com/v1/messages',
      { 'content-type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01' },
      { model: cfg.model || DEFAULT_CLAUDE_MODEL, max_tokens: 2000, system, messages: [{ role: 'user', content: user }] }, fetchImpl, 60000); }
    catch (e) { if (e.message === '__unreachable__') throw fail('Could not reach the Claude API. Check your internet connection.'); throw e; }
    if (!r.res.ok) {
      if (r.res.status === 401 || r.res.status === 403) throw fail('The API key was rejected. Check it in the AI tab.');
      if (r.res.status === 429) throw fail('Too many requests right now. Wait a moment and try again.');
      throw fail('Claude said: ' + ((r.data && r.data.error && r.data.error.message) || `HTTP ${r.res.status}`));
    }
    const out = r.data && Array.isArray(r.data.content) ? r.data.content.filter(b => b.type === 'text').map(b => b.text).join('') : '';
    if (!out) throw fail('Claude returned an empty answer.');
    return out;
  }
  throw fail('The AI helper is off. Turn it on in the AI tab.');
}

// Accepts {"items":[...]} or a bare array, with or without code fences or chatter around it.
function parseItems(text, n) {
  let t = String(text).replace(/```(?:json)?/gi, '').trim(), val = null;
  const tries = [[t.indexOf('{'), t.lastIndexOf('}')], [t.indexOf('['), t.lastIndexOf(']')]];
  for (const [a, b] of tries) {
    if (a >= 0 && b > a) { try { val = JSON.parse(t.slice(a, b + 1)); break; } catch { /* try next */ } }
  }
  const arr = Array.isArray(val) ? val : (val && Array.isArray(val.items) ? val.items : null);
  if (!arr || arr.length !== n || !arr.every(x => typeof x === 'string')) throw fail('The AI answered in a format I could not use. Try again.');
  return arr;
}

async function summarize(cfg, text, fetchImpl = fetch) {
  text = String(text || '').trim();
  if (!text) throw fail('There is nothing to summarise yet.');
  if (text.length > MAX_TOTAL) throw fail('This note is too long to summarise.');
  const sys = withLang(SYS_SUMMARY, text) + (isGreek(text) ? ' Write the summary in Greek.' : '');
  if (text.length <= CHUNK) return (await callModel(cfg, sys, text, { predict: 320 }, fetchImpl)).trim();
  // long note: summarise each part, then summarise the summaries, so the end of the note counts as much as the start
  const parts = splitPieces(text, CHUNK), notes = [];
  for (const p of parts) notes.push((await callModel(cfg, sys, p, { predict: 220 }, fetchImpl)).trim());
  return (await callModel(cfg, sys + ' The input is a list of partial summaries of one long note, in order. Merge them into one short summary of the whole note.', notes.join('\n'), { predict: 320 }, fetchImpl)).trim();
}

async function fixGrammar(cfg, items, fetchImpl = fetch) {
  if (!Array.isArray(items) || !items.length || !items.every(x => typeof x === 'string')) throw fail('There is no text to check yet.');
  if (items.join('').length > MAX_TOTAL) throw fail('This note is too long to check.');
  // cut every item into small pieces (a whole note is often one big piece of text), check them in batches, then put them back together exactly
  const pieces = [];   // {i: item index, text}
  items.forEach((it, i) => { if (!it.trim()) pieces.push({ i, text: it, skip: true }); else splitPieces(it, PIECE).forEach(t => pieces.push({ i, text: t, skip: !t.trim() })); });
  const todo = pieces.filter(p => !p.skip), res = new Map();
  for (let a = 0; a < todo.length;) {
    const batch = []; let chars = 0;
    while (a < todo.length && batch.length < 20 && (!batch.length || chars + todo[a].text.length <= BATCH)) { chars += todo[a].text.length; batch.push(todo[a++]); }
    const sample = batch.map(p => p.text).join(' ');
    const sys = withLang(SYS_GRAMMAR, sample) + (isGreek(sample) ? GREEK_GRAMMAR_EXAMPLE : '');
    const payload = JSON.stringify(batch.map(p => p.text.trim()));
    const predict = Math.min(3000, Math.round(payload.length * (isGreek(sample) ? 0.9 : 0.5)) + 120);
    let out = null;
    for (let tries = 0; tries < 2 && !out; tries++) {
      const raw = await callModel(cfg, sys, payload, { json: true, predict }, fetchImpl);   // connection problems stop everything
      try { out = parseItems(raw, batch.length); } catch { /* unusable answer: retry once, then keep this part as it was */ }
    }
    batch.forEach((p, k) => {
      const orig = p.text.trim(), got = out ? out[k] : orig;
      const bad = !out || got.length > orig.length * 2 + 40 || !got.trim() || (isGreek(orig) && greekShare(got) < 0.3);   // wildly different, empty, or translated: keep the original
      res.set(p, bad ? p.text : lead(p.text) + got.trim() + trail(p.text));
    });
  }
  const outItems = items.map(() => '');
  pieces.forEach(p => { outItems[p.i] += p.skip ? p.text : res.get(p); });
  return outItems;
}

// Accepts {"items":[...]} with strings or {text,done} objects, or a bare array.
function parseChecklist(text) {
  let t = String(text).replace(/```(?:json)?/gi, '').trim(), val = null;
  for (const [a, b] of [[t.indexOf('{'), t.lastIndexOf('}')], [t.indexOf('['), t.lastIndexOf(']')]]) {
    if (a >= 0 && b > a) { try { val = JSON.parse(t.slice(a, b + 1)); break; } catch { /* try next */ } }
  }
  const arr = Array.isArray(val) ? val : (val && Array.isArray(val.items) ? val.items : null);
  if (!arr) throw fail('The AI answered in a format I could not use. Try again.');
  const out = [];
  for (const it of arr) {
    const txt = typeof it === 'string' ? it : (it && typeof it.text === 'string' ? it.text : '');
    const clean = txt.replace(/^\s*(?:[-*•]|\[[ xX]?\]|\d+[.)])\s*/, '').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (clean) out.push({ text: clean, done: !!(it && typeof it === 'object' && it.done) });
  }
  if (!out.length) throw fail('The AI did not find anything to put on a checklist.');
  return out.slice(0, 60);
}
async function toChecklist(cfg, text, fetchImpl = fetch) {
  text = String(text || '').trim();
  if (!text) throw fail('There is nothing to turn into a checklist yet.');
  if (text.length > MAX_TOTAL) throw fail('This note is too long to convert.');
  const sys = withLang(SYS_CHECKLIST, text);
  if (text.length <= CHUNK) return parseChecklist(await callModel(cfg, sys, text, { json: true, predict: 900 }, fetchImpl));
  const all = [], seen = new Set();
  for (const p of splitPieces(text, CHUNK)) {
    let got = []; try { got = parseChecklist(await callModel(cfg, sys, p, { json: true, predict: 900 }, fetchImpl)); } catch (e) { if (!e.friendly) throw e; }
    for (const it of got) { const k = it.text.toLowerCase(); if (!seen.has(k)) { seen.add(k); all.push(it); } }
  }
  if (!all.length) throw fail('The AI did not find anything to put on a checklist.');
  return all.slice(0, 300);
}

// Streaming chat. Calls onChunk(text) as the answer arrives and returns the full answer.
async function chatStream(cfg, system, messages, onChunk, signal, fetchImpl = fetch, opts = {}) {
  const ctl = new AbortController(), link = () => ctl.abort();
  if (signal) { if (signal.aborted) ctl.abort(); else signal.addEventListener('abort', link, { once: true }); }
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctl.abort(); }, 300000);
  try {
    let url, headers, body;
    if (cfg.provider === 'ollama') {
      const base = String(cfg.url || DEFAULT_OLLAMA_URL).trim().replace(/\/+$/, '');
      if (!/^https?:\/\//i.test(base)) throw fail('The Ollama address must start with http:// (for example http://localhost:11434).');
      if (!cfg.model) throw fail('Enter the name of an Ollama model first (for example llama3.2).');
      url = base + '/api/chat'; headers = { 'content-type': 'application/json' };
      body = { model: cfg.model, stream: true, keep_alive: KEEP_ALIVE, options: ollamaOpts(opts.temperature == null ? 0.5 : opts.temperature, opts.predict, system.length + messages.reduce((a, m) => a + m.content.length, 0)), messages: [{ role: 'system', content: system }, ...messages] };
    } else if (cfg.provider === 'claude') {
      if (!cfg.key) throw fail('Add your Anthropic API key in the AI tab first.');
      url = 'https://api.anthropic.com/v1/messages';
      headers = { 'content-type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01' };
      body = { model: cfg.model || DEFAULT_CLAUDE_MODEL, max_tokens: opts.predict || 2000, stream: true, ...(opts.temperature == null ? {} : { temperature: opts.temperature }), system, messages };
    } else throw fail('The AI helper is off. Turn it on in the AI tab.');

    let res;
    try { res = await fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctl.signal }); }
    catch (e) {
      if (signal && signal.aborted) throw e;
      if (timedOut) throw fail('The AI took too long to answer.');
      throw fail(cfg.provider === 'ollama' ? `Could not reach Ollama at ${String(cfg.url || DEFAULT_OLLAMA_URL).replace(/\/+$/, '')}. Is it running?` : 'Could not reach the Claude API. Check your internet connection.');
    }
    if (!res.ok) { let d = null; try { d = await res.json(); } catch { /* not json */ } throw fail(httpMessage(cfg.provider, res.status, d, cfg)); }

    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = '', full = '';
    const add = t => { if (t) { full += t; onChunk(t); } };
    const line = raw => {
      raw = raw.trim(); if (!raw) return;
      if (cfg.provider === 'claude') { if (!raw.startsWith('data:')) return; raw = raw.slice(5).trim(); }
      let o; try { o = JSON.parse(raw); } catch { return; }
      if (cfg.provider === 'ollama') {
        if (o.error) throw fail('Ollama said: ' + o.error);
        add(o.message && o.message.content);
      } else {
        if (o.type === 'error') throw fail('Claude said: ' + ((o.error && o.error.message) || 'unknown error'));
        if (o.type === 'content_block_delta' && o.delta && o.delta.type === 'text_delta') add(o.delta.text);
      }
    };
    try {
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); line(l); }
      }
      if (buf.trim()) line(buf);
    } catch (e) {
      if (signal && signal.aborted) throw e;
      if (timedOut) throw fail('The AI took too long to answer.');
      if (e && e.friendly) throw e;
      throw fail('The connection to the AI was interrupted.');
    }
    return full;
  } finally { clearTimeout(timer); if (signal) signal.removeEventListener('abort', link); }
}

// ---- live edit: the answer streams straight into the note ----
const EDIT_MODES = {
  fix: 'Fix spelling, grammar, punctuation and capitalisation only. Do not change wording or style.',
  polish: 'Improve clarity and flow while keeping the meaning, the tone and roughly the same length.',
  shorten: 'Make it shorter and tighter. Keep every key fact, name, number and date.',
  friendly: 'Rewrite it in a warmer, friendlier tone. Keep the meaning and the facts.',
  translate: 'Translate the text.',   // (the real instruction depends on the language of the text: see editSystem)
  continue: 'Continue the text naturally with one or two more sentences. Output ONLY the new continuation, not the original text.'
};
const translateTarget = text => isGreek(text) ? 'English' : 'Greek';   // Greek text goes to English, anything else goes to Greek
function translateSystem(text) {
  const to = translateTarget(text);
  return 'You translate text inside a sticky note into ' + to + '. Keep the meaning, the tone, names, numbers, dates, URLs and line breaks. ' +
    (to === 'Greek' ? 'Write natural modern Greek in the monotonic system, with correct accents. ' + GREEK_RULES + ' ' : 'Write natural, plain English. ') +
    'Output ONLY the translation: no quotes, no code fences, no introduction, no explanation, no notes.';
}
const editSystem = (mode, text = '') => mode === 'translate' ? translateSystem(text) : 'You edit text inside a sticky note. ' + (EDIT_MODES[mode] || EDIT_MODES.fix) + (isGreek(text) ? ' ' + GREEK_RULES : '') +
  ' Reply in the same language as the text (English or Greek; keep Greek accents). Keep line breaks. ' +
  'Output ONLY the resulting text: no quotes, no code fences, no introduction, no explanation.';
function cleanEdit(t) {
  t = stripThink(t).replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');
  return t;
}
async function editStream(cfg, mode, text, onChunk, signal, fetchImpl = fetch) {
  text = String(text || '');
  if (!text.trim() && mode !== 'continue') throw fail('There is no text to edit yet.');
  if (!EDIT_MODES[mode]) throw fail('Unknown edit.');
  if (text.length > MAX_CHARS) throw fail('That text is too long to edit in one go. Select a smaller part.');
  const predict = Math.min(3000, mode === 'translate' ? Math.round(text.length * 1.2) + 200 : Math.round(text.length / 2) + 200);   // Greek takes many more tokens per character
  const full = await chatStream(cfg, editSystem(mode, text), [{ role: 'user', content: text }], onChunk, signal, fetchImpl, { temperature: 0.2, predict });
  const out = cleanEdit(full);
  if (!out.trim()) throw fail('The AI returned nothing.');
  return out;
}

// Loads the Ollama model into memory in the background so the first real request is fast.
async function warmup(cfg, fetchImpl = fetch) {
  if (cfg.provider !== 'ollama' || !cfg.model) return false;
  const base = String(cfg.url || DEFAULT_OLLAMA_URL).trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(base)) return false;
  try { const r = await fetchImpl(base + '/api/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: cfg.model, keep_alive: KEEP_ALIVE }), signal: AbortSignal.timeout(60000) }); return r.ok; }
  catch { return false; }
}

async function ping(cfg, fetchImpl = fetch) {
  const r = await callModel(cfg, 'Reply with the single word: ok', 'ping', { predict: 8 }, fetchImpl);
  return r.trim().slice(0, 40);
}

module.exports = { translateTarget, splitPieces, isGreek, greekShare, ctxFor, GREEK_RULES, editStream, editSystem, EDIT_MODES, warmup, summarize, fixGrammar, toChecklist, parseChecklist, chatStream, SYS_CHAT, ping, parseItems, callModel, DEFAULT_CLAUDE_MODEL, DEFAULT_OLLAMA_URL };
