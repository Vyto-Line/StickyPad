#!/usr/bin/env node
'use strict';
// Compares Ollama models on StickyPad's own AI jobs in several languages, using the app's real prompts.
//   node tools/aibench.js                       tests every installed model
//   node tools/aibench.js qwen3:8b gemma4:e4b   tests only these
//   node tools/aibench.js --langs en,el,de      only these languages
// Writes aibench-report.md (a table, plus every answer so you can read them). Nothing is sent anywhere: it only talks to your local Ollama.
const fs = require('fs'), path = require('path');
const here = f => { try { return require('../' + f); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; return require('./' + f); } };   // works inside the repo (tools/) and next to ai.js and langs.js
const ai = here('ai'), LG = here('langs');
let URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

// one request (a note-making chat) and one paragraph to summarise, per language
const T = {
  en: { ask: 'Make a note with a few paragraphs and a checklist about planning a hiking trip.', text: 'Last weekend we walked up to the mountain hut. The path was steep but the weather was perfect, and we reached the top before noon. We had lunch next to a small lake and met two other families. On the way down it started to rain, so we hurried and arrived at the car completely wet. Next time we will take better jackets and start earlier.' },
  el: { ask: 'Φτιάξε μια σημείωση με λίγες παραγράφους και μια λίστα ελέγχου για τον προγραμματισμό μιας εκδρομής στο βουνό.', text: 'Το περασμένο Σαββατοκύριακο ανεβήκαμε στο καταφύγιο του βουνού. Το μονοπάτι ήταν απότομο αλλά ο καιρός ήταν τέλειος και φτάσαμε στην κορυφή πριν το μεσημέρι. Φάγαμε δίπλα σε μια μικρή λίμνη και γνωρίσαμε δύο άλλες οικογένειες. Στην κατάβαση άρχισε να βρέχει, οπότε βιαστήκαμε και φτάσαμε στο αυτοκίνητο βρεγμένοι. Την επόμενη φορά θα πάρουμε καλύτερα μπουφάν και θα ξεκινήσουμε νωρίτερα.' },
  es: { ask: 'Haz una nota con unos párrafos y una lista de comprobación sobre la planificación de una excursión a la montaña.', text: 'El fin de semana pasado subimos al refugio de la montaña. El camino era empinado pero el tiempo fue perfecto y llegamos a la cima antes del mediodía. Almorzamos junto a un pequeño lago y conocimos a otras dos familias. Al bajar empezó a llover, así que nos dimos prisa y llegamos al coche empapados. La próxima vez llevaremos mejores chaquetas y saldremos más temprano.' },
  fr: { ask: 'Fais une note avec quelques paragraphes et une liste de contrôle pour organiser une randonnée en montagne.', text: 'Le week-end dernier, nous sommes montés jusqu\'au refuge de la montagne. Le sentier était raide mais le temps était parfait, et nous avons atteint le sommet avant midi. Nous avons déjeuné près d\'un petit lac et rencontré deux autres familles. Pendant la descente il s\'est mis à pleuvoir, alors nous nous sommes dépêchés et nous sommes arrivés à la voiture complètement trempés. La prochaine fois nous prendrons de meilleures vestes et nous partirons plus tôt.' },
  de: { ask: 'Erstelle eine Notiz mit ein paar Absätzen und einer Checkliste zur Planung einer Bergwanderung.', text: 'Letztes Wochenende sind wir zur Berghütte hinaufgewandert. Der Weg war steil, aber das Wetter war perfekt, und wir erreichten den Gipfel vor Mittag. Wir aßen neben einem kleinen See und lernten zwei andere Familien kennen. Beim Abstieg begann es zu regnen, also beeilten wir uns und kamen völlig durchnässt am Auto an. Nächstes Mal nehmen wir bessere Jacken mit und starten früher.' },
  it: { ask: 'Crea una nota con alcuni paragrafi e una lista di controllo per organizzare un\'escursione in montagna.', text: 'Lo scorso fine settimana siamo saliti al rifugio in montagna. Il sentiero era ripido ma il tempo era perfetto e abbiamo raggiunto la cima prima di mezzogiorno. Abbiamo pranzato vicino a un piccolo lago e conosciuto altre due famiglie. Durante la discesa ha cominciato a piovere, così ci siamo affrettati e siamo arrivati all\'auto completamente bagnati. La prossima volta porteremo giacche migliori e partiremo prima.' },
  tr: { ask: 'Birkaç paragraf ve bir kontrol listesi içeren, dağ yürüyüşü planlama hakkında bir not hazırla.', text: 'Geçen hafta sonu dağ evine yürüyerek çıktık. Yol dikti ama hava mükemmeldi ve öğleden önce zirveye ulaştık. Küçük bir gölün yanında yemek yedik ve iki başka aileyle tanıştık. İnerken yağmur başladı, bu yüzden acele ettik ve arabaya sırılsıklam vardık. Bir dahaki sefere daha iyi montlar alacağız ve daha erken yola çıkacağız.' },
  ru: { ask: 'Сделай заметку из нескольких абзацев и списка дел о планировании горного похода.', text: 'В прошлые выходные мы поднялись к горному приюту. Тропа была крутой, но погода стояла прекрасная, и мы дошли до вершины до полудня. Мы пообедали у небольшого озера и познакомились с двумя другими семьями. Во время спуска начался дождь, поэтому мы поспешили и дошли до машины совершенно мокрыми. В следующий раз мы возьмём куртки получше и выйдем раньше.' }
};
const args = process.argv.slice(2), li = args.indexOf('--langs');
const langs = li >= 0 ? args.splice(li, 2)[1].split(',') : Object.keys(T);
const checkLines = t => (t.match(/^\s*(?:[-*•]\s*)?(?:\[[ xX]?\]|☐|☑|[-*•])\s+\S/gm) || []).length;

async function installed() { const r = await fetch(URL + '/api/tags'); return (await r.json()).models.map(m => m.name); }
async function run(model, lang) {
  const cfg = { provider: 'ollama', model, url: URL }, t = T[lang], out = { lang }, L = LG.byCode(lang);
  let t0 = Date.now();
  try {   // 1. a note-making chat, exactly as the app sends it
    const msgs = [{ role: 'user', content: t.ask }], d = ai.chatLanguage(msgs);
    const sys = ai.SYS_CHAT + '\n\n' + ai.chatLanguageRule(d); msgs[0] = { ...msgs[0], content: t.ask + ai.chatLanguageTail(d) };
    out.chat = (await ai.chatStream(cfg, sys, msgs, () => {}, null, undefined, { loopGuard: true })).trim();
  } catch (e) { out.chatErr = e.message; }
  out.chatSec = (Date.now() - t0) / 1000; t0 = Date.now();
  try { out.sum = (await ai.summarize(cfg, t.text)).trim(); } catch (e) { out.sumErr = e.message; }
  out.sumSec = (Date.now() - t0) / 1000;
  const same = s => { const d = LG.detect(s); return !!d && d.code === lang; };
  out.chatLang = !!out.chat && same(out.chat); out.chatList = out.chat ? checkLines(out.chat) : 0; out.chatLen = (out.chat || '').length;
  out.sumLang = !!out.sum && same(out.sum); out.sumShort = !!out.sum && out.sum.length < t.text.length * 0.8;
  return out;
}
async function findOllama() {   // say clearly what is wrong before running anything (the app's own error message hides the real reason)
  const tries = [URL, ...(process.env.OLLAMA_URL ? [] : ['http://localhost:11434', 'http://[::1]:11434'])], why = [];
  for (const u of tries) {
    try { const r = await fetch(u + '/api/tags', { signal: AbortSignal.timeout(5000) }); if (r.ok) { URL = u; return true; } why.push(u + ' answered ' + r.status); }
    catch (e) { why.push(u + ' -> ' + ((e.cause && (e.cause.code || e.cause.message)) || e.message)); }
  }
  console.log('Cannot reach Ollama:\n  ' + why.join('\n  ') + '\nIs Ollama running? (open StickyPad > Settings > AI and press "Start Ollama", or run: ollama serve)\nIf it runs on another address: set OLLAMA_URL=http://address:port first.');
  return false;
}
(async () => {
  if (!(await findOllama())) process.exit(1);
  let models = args.length ? args : await installed();
  models = models.filter(m => !/embed/i.test(m));
  if (!models.length) { console.log('No models found. Is Ollama running at ' + URL + ' ?'); process.exit(1); }
  const rep = ['# StickyPad AI language test', '', 'Languages: ' + langs.join(', ') + '. Automatic checks only measure the language, the list and the length: **read the answers below to judge the quality.**', ''];
  const rows = [], detail = [];
  for (const m of models) {
    let ok = 0, tot = 0, secs = 0;
    for (const l of langs) {
      process.stdout.write(m + ' ' + l + ' ... ');
      const r = await run(m, l); secs += r.chatSec + r.sumSec;
      const pts = [r.chatLang, r.chatList >= 3, r.chatLen > 250, r.sumLang, r.sumShort]; ok += pts.filter(Boolean).length; tot += pts.length;
      console.log(pts.map(p => p ? '✓' : '✗').join('') + (r.chatErr ? '   chat error: ' + r.chatErr : '') + (r.sumErr ? '   summary error: ' + r.sumErr : ''));
      detail.push('### ' + m + ' · ' + l, '', '**Chat answer** (' + r.chatSec.toFixed(0) + ' s, language ' + (r.chatLang ? 'ok' : 'WRONG') + ', checklist items ' + r.chatList + '):', '', '```', r.chat || r.chatErr || '(nothing)', '```', '', '**Summary** (' + r.sumSec.toFixed(0) + ' s, language ' + (r.sumLang ? 'ok' : 'WRONG') + '):', '', '```', r.sum || r.sumErr || '(nothing)', '```', '');
    }
    rows.push('| ' + m + ' | ' + Math.round(100 * ok / tot) + '% | ' + Math.round(secs / langs.length) + ' s |');
  }
  rep.push('| Model | Checks passed | Seconds per language |', '|---|---|---|', ...rows, '', '## Answers', '', ...detail);
  fs.writeFileSync(path.join(process.cwd(), 'aibench-report.md'), rep.join('\n'));
  console.log('\nWrote aibench-report.md');
})();
