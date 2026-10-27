'use strict';
const assert = require('assert'), A = require('../ai');
const texts = {
  Spanish: 'El fin de semana pasado subimos al refugio de la montaña. El camino era empinado pero el tiempo fue perfecto y llegamos a la cima antes del mediodía. Almorzamos junto a un pequeño lago.',
  French: 'Le week-end dernier, nous sommes montés jusqu\'au refuge de la montagne. Le sentier était raide mais le temps était parfait, et nous avons atteint le sommet avant midi.',
  German: 'Letztes Wochenende sind wir zur Berghütte hinaufgewandert. Der Weg war steil, aber das Wetter war perfekt, und wir erreichten den Gipfel vor Mittag.',
  Russian: 'В прошлые выходные мы поднялись к горному приюту. Тропа была крутой, но погода стояла прекрасная, и мы дошли до вершины до полудня.'
};
(async () => {
  for (const [name, text] of Object.entries(texts)) {
    let sys = ''; const fake = async (u, o) => { sys = JSON.parse(o.body).messages[0].content; return { ok: true, status: 200, json: async () => ({ message: { content: '• ok' } }) }; };
    await A.summarize({ provider: 'ollama', model: 'm', url: 'http://x' }, text, fake);
    assert.ok(sys.includes('Write the summary in ' + name + '.'), name + ' summaries are told to stay in ' + name);
    assert.ok(!/English or Greek/.test(sys), 'the instructions no longer say only English or Greek');
  }
  assert.strictEqual(A.langLine('Letztes Wochenende wanderten wir zur Berghütte und das Wetter war schön', 'title'), ' Write the title in German.');
  assert.strictEqual(A.langLine('Το περασμένο Σαββατοκύριακο ανεβήκαμε στο βουνό', 'title'), '', 'Greek keeps its own rules');
  assert.strictEqual(A.langLine('x', 'title'), '', 'nothing is added when the language is unclear');
  console.log('summarylang ok');
})();
