'use strict';
// The languages in the Translate menu, and a small detector that works out which one a text is written in.
// It looks at the alphabet first (Greek, Cyrillic, Arabic, Japanese, Chinese); for Latin letters it counts common words.
// When it cannot tell, it says so (null) instead of guessing, and the menu shows "Auto-detected" without a language.
(function () {
  const LANGS = [
    { code: 'en', name: 'English', native: 'English' }, { code: 'el', name: 'Greek', native: 'Ελληνικά' },
    { code: 'es', name: 'Spanish', native: 'Español' }, { code: 'fr', name: 'French', native: 'Français' },
    { code: 'de', name: 'German', native: 'Deutsch' }, { code: 'it', name: 'Italian', native: 'Italiano' },
    { code: 'pt', name: 'Portuguese', native: 'Português' }, { code: 'nl', name: 'Dutch', native: 'Nederlands' },
    { code: 'tr', name: 'Turkish', native: 'Türkçe' }, { code: 'ru', name: 'Russian', native: 'Русский' },
    { code: 'ar', name: 'Arabic', native: 'العربية' }, { code: 'zh', name: 'Chinese', native: '中文' },
    { code: 'ja', name: 'Japanese', native: '日本語' }
  ];
  const byCode = c => LANGS.find(l => l.code === c) || null;
  const SCRIPTS = {
    el: /[Ͱ-Ͽἀ-῿]/g, ru: /[Ѐ-ӿ]/g, ar: /[؀-ۿݐ-ݿ]/g,
    zh: /[一-鿿㐀-䶿]/g, ja: /[぀-ヿ一-鿿]/g, latin: /[A-Za-zÀ-ɏ]/g
  };
  const count = (t, re) => (String(t).match(re) || []).length;
  const NONSPACE = t => (String(t).match(/[^\s\d\p{P}\p{S}]/gu) || []).length;
  const STOP = {
    en: 'the and is are was to of in it you that for with this have not be on at as but they we my your will can from do what',
    es: 'el la los las de que y en un una es por con para no se su al lo como más pero esto está son muy también hay',
    fr: 'le la les des et est un une que pour dans qui pas ne sur au avec ce se vous nous mais sont être très aussi',
    de: 'der die das und ist nicht ein eine zu mit für auf den dem von ich sie wir aber auch sind wird noch sehr',
    it: 'il lo la gli le di che e è un una per con non sono come più ma questo anche della del nel alla molto',
    pt: 'o a os as de que e é um uma para com não se do da em no na por mais mas isso também são muito você',
    nl: 'de het een en is van dat niet op te voor met zijn ik je we ze maar ook er dit wordt naar heel',
    tr: 'bir ve bu için ile de da çok ne mi ben sen biz var yok değil gibi daha kadar ama olarak şu'
  };
  const SETS = {}; Object.keys(STOP).forEach(k => { SETS[k] = new Set(STOP[k].split(' ')); });
  const HINTS = { tr: /[ğışİ]/g, es: /[ñ¿¡]/g, de: /[ßäöü]/g, fr: /[çœàâêèéëîïôûù]/g, pt: /[ãõç]/g };
  // -> { code, name, native } or null when it is not clear
  function detect(text) {
    const t = String(text || '').slice(0, 4000), total = NONSPACE(t);
    if (total < 3) return null;
    const el = count(t, SCRIPTS.el), ru = count(t, SCRIPTS.ru), ar = count(t, SCRIPTS.ar), kana = count(t, /[぀-ヿ]/g), han = count(t, SCRIPTS.zh), lat = count(t, SCRIPTS.latin);
    const top = Math.max(el, ru, ar, kana + han, lat);
    if (!top) return null;
    if (el === top) return byCode('el');
    if (ru === top) return byCode('ru');
    if (ar === top) return byCode('ar');
    if (kana + han === top) return byCode(kana > 0 ? 'ja' : 'zh');
    // Latin letters: count common words of each language (and a little for letters only that language uses)
    const words = t.toLowerCase().match(/[a-zà-ÿğışİœ]+/g) || [];
    if (words.length < 2) return null;
    const score = {};
    Object.keys(SETS).forEach(k => { let s = 0; for (const w of words) if (SETS[k].has(w)) s++; s += Math.min(3, count(t.toLowerCase(), HINTS[k] || /$^/g) * 0.5); score[k] = s; });
    const order = Object.keys(score).sort((a, b) => score[b] - score[a]), a = order[0], b = order[1];
    if (score[a] < 2 || score[a] - score[b] < 1) return null;
    return byCode(a);
  }
  // how much of the text is in the alphabet that language uses (0..1); Latin languages cannot be told apart this way, so they give 1
  function scriptShare(text, code) {
    const re = SCRIPTS[code]; if (!re) return 1;
    const all = NONSPACE(text); return all ? Math.min(1, count(text, re) / all) : 0;
  }
  const api = { LANGS, byCode, detect, scriptShare };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.StickyLangs = api;
})();
