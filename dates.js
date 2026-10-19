'use strict';
// Finds dates and times written in a note ("tomorrow at 5pm", "αύριο στις 17:30", "15/11 10:00", "σε 2 ώρες")
// so StickyPad can offer a reminder. Greek and English, accents and capitals do not matter. No Electron needed.
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.StickyDates = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  // lower case, no accents, final sigma = sigma; same length as the input so positions still fit
  function fold(s) {
    s = String(s || ''); let o = '';
    for (let i = 0; i < s.length; i++) { let c = s[i].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); if (c === 'ς') c = 'σ'; o += c.length === 1 ? c : s[i].toLowerCase(); }
    return o;
  }
  const B = '(?<![\\p{L}\\p{N}])', E = '(?![\\p{L}\\p{N}])';
  const MONTH = {};
  ['ιανουαριου ιανουαριοσ ιανουαριε ιαν', 'φεβρουαριου φεβρουαριοσ φεβ', 'μαρτιου μαρτιοσ μαρ', 'απριλιου απριλιοσ απρ', 'μαιου μαιοσ', 'ιουνιου ιουνιοσ ιουν', 'ιουλιου ιουλιοσ ιουλ', 'αυγουστου αυγουστοσ αυγ', 'σεπτεμβριου σεπτεμβριοσ σεπ σεπτ', 'οκτωβριου οκτωβριοσ οκτ', 'νοεμβριου νοεμβριοσ νοε νοεμ', 'δεκεμβριου δεκεμβριοσ δεκ']
    .forEach((l, i) => l.split(' ').forEach(w => { MONTH[w] = i + 1; }));
  ['january jan', 'february feb', 'march mar', 'april apr', 'may', 'june jun', 'july jul', 'august aug', 'september sep sept', 'october oct', 'november nov', 'december dec']
    .forEach((l, i) => l.split(' ').forEach(w => { MONTH[w] = i + 1; }));
  const MW = Object.keys(MONTH).sort((a, b) => b.length - a.length).join('|');
  const WD = { δευτερα: 1, δευτ: 1, monday: 1, mon: 1, τριτη: 2, τρι: 2, tuesday: 2, tue: 2, tues: 2, τεταρτη: 3, τετ: 3, wednesday: 3, wed: 3, πεμπτη: 4, πεμ: 4, thursday: 4, thu: 4, thur: 4, thurs: 4, παρασκευη: 5, παρ: 5, friday: 5, fri: 5, σαββατο: 6, σαβ: 6, saturday: 6, sat: 6, κυριακη: 0, κυρ: 0, sunday: 0, sun: 0 };
  const WDW = Object.keys(WD).sort((a, b) => b.length - a.length).join('|');

  const day0 = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const validYMD = (y, m, d) => { const t = new Date(y, m - 1, d); return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d; };
  const year4 = y => (y < 100 ? 2000 + y : y);

  function parse(text, nowMs) {
    const raw = String(text || ''), t = fold(raw), now = new Date(nowMs == null ? Date.now() : nowMs), today = day0(now);
    const blocked = [], days = [], times = [], out = [];
    const free = (s, e) => !blocked.some(b => s < b[1] && e > b[0]);
    const take = (s, e) => blocked.push([s, e]);
    const each = (re, fn) => { re.lastIndex = 0; let m; while ((m = re.exec(t))) { if (m[0].length === 0) { re.lastIndex++; continue; } fn(m, m.index, m.index + m[0].length); } };

    // in 2 hours / σε 30 λεπτα
    each(new RegExp(B + '(?:σε|in|after|μετα απο)\\s+(\\d{1,3})\\s*(λεπτα|λεπτο|λ|min|mins|minutes?|ωρες|ωρα|ωρων|hours?|hrs?|h|μερες|μερα|ημερες|ημερα|days?|d|εβδομαδες|εβδομαδα|weeks?|w)' + E, 'giu'), (m, s, e) => {
      if (!free(s, e)) return; const n = +m[1], u = m[2]; let ms;
      if (/^(λ|min)/.test(u)) ms = n * 6e4; else if (/^(ωρ|hour|hr|h$)/.test(u)) ms = n * 36e5; else if (/^(μερ|ημερ|day|d$)/.test(u)) ms = n * 864e5; else ms = n * 7 * 864e5;
      if (n < 1) return; take(s, e); out.push({ start: s, end: e, at: now.getTime() + ms, rel: true });
    });
    // 2026-11-15
    each(/(?<![\d])(\d{4})-(\d{1,2})-(\d{1,2})(?![\d])/g, (m, s, e) => { if (!free(s, e)) return; const y = +m[1], mo = +m[2], d = +m[3]; if (validYMD(y, mo, d)) { take(s, e); days.push({ start: s, end: e, date: new Date(y, mo - 1, d) }); } });
    // 15/11, 15/11/2026, 15-11-26, 15.11.2026 (a dot needs the year, so "3.5" stays a number)
    each(/(?<![\d.\/-])(\d{1,2})([\/.-])(\d{1,2})(?:\2(\d{2,4}))?(?![\d]|[\/.-]\d)/g, (m, s, e) => {
      if (!free(s, e)) return; const d = +m[1], mo = +m[3]; if (m[2] === '.' && !m[4]) return; if (mo < 1 || mo > 12 || d < 1) return;
      let y = m[4] ? year4(+m[4]) : today.getFullYear(); if (!validYMD(y, mo, d)) return;
      let dt = new Date(y, mo - 1, d); if (!m[4] && dt < today) dt = new Date(y + 1, mo - 1, d);
      take(s, e); days.push({ start: s, end: e, date: dt });
    });
    // 15 Νοεμβρίου (2026), 15th of November
    each(new RegExp(B + '(\\d{1,2})\\s*(?:η|st|nd|rd|th)?\\s+(?:του\\s+|of\\s+)?(' + MW + ')\\.?(?:\\s+(\\d{4}))?' + E, 'giu'), (m, s, e) => {
      if (!free(s, e)) return; const d = +m[1], mo = MONTH[m[2]]; let y = m[3] ? +m[3] : today.getFullYear(); if (!validYMD(y, mo, d)) return;
      let dt = new Date(y, mo - 1, d); if (!m[3] && dt < today) dt = new Date(y + 1, mo - 1, d); take(s, e); days.push({ start: s, end: e, date: dt });
    });
    // November 15, Nov 15th 2026
    each(new RegExp(B + '(' + MW + ')\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?' + E, 'giu'), (m, s, e) => {
      if (!free(s, e)) return; const d = +m[2], mo = MONTH[m[1]]; let y = m[3] ? +m[3] : today.getFullYear(); if (!validYMD(y, mo, d)) return;
      let dt = new Date(y, mo - 1, d); if (!m[3] && dt < today) dt = new Date(y + 1, mo - 1, d); take(s, e); days.push({ start: s, end: e, date: dt });
    });
    // today / tomorrow / weekday
    each(new RegExp(B + '(σημερα|today|tonight|αυριο|tomorrow|μεθαυριο|(?:day after tomorrow)|(?:(?:την\\s+)?(?:επομενη|next)\\s+)?(' + WDW + '))\\.?' + E, 'giu'), (m, s, e) => {
      if (!free(s, e)) return; const w = m[1]; let rec;
      if (/^(σημερα|today|tonight)/.test(w)) rec = { date: today, today: true };
      else if (/^(αυριο|tomorrow)$/.test(w)) rec = { date: addDays(today, 1) };
      else if (/^(μεθαυριο|day after)/.test(w)) rec = { date: addDays(today, 2) };
      else { const wd = WD[m[2]]; if (wd == null) return; rec = { wd, next: /(επομενη|next)/.test(w) }; }
      take(s, e); days.push({ start: s, end: e, ...rec });
    });
    // times: 17:30, 5pm, στις 5, at 5, 5 μ.μ.
    each(new RegExp(B + '(?:(στις|στην|στη|at|@|ωρα|around)\\s*)?(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm|π\\.?\\s?μ\\.?|μ\\.?\\s?μ\\.?)?' + E, 'giu'), (m, s, e) => {
      let ts = s; const prep = m[1], mm = m[3] == null ? null : +m[3]; let h = +m[2]; const ap = m[4] ? m[4].replace(/[.\s]/g, '') : '';
      if (!free(ts, e)) return;
      const colon = /^\s*\d{1,2}:\d{2}/.test(m[0].replace(/^(?:στις|στην|στη|at|@|ωρα|around)\s*/, ''));
      if (!(prep || colon || ap)) return;
      if (mm != null && (mm > 59 || (!colon && !ap && !prep))) return;
      if (ap) { if (h < 1 || h > 12) return; const pm = /^(pm|μμ)$/.test(ap); h = (h % 12) + (pm ? 12 : 0); }
      else if (h > 23) return;
      take(ts, e); times.push({ start: ts, end: e, h, min: mm || 0 });
    });

    // put a day and a time next to each other together
    const FILL = /^[\s,;\-–—]*(?:και|ωρα|at|@|the|στις|στην|στη|γυρω)?[\s,;\-–—]*$/;
    const usedT = new Set();
    const setTime = (d, h, min) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, min, 0, 0);
    const resolveDay = (dr, h, min, hasTime) => {
      let d;
      if (dr.wd != null) {
        d = addDays(today, ((dr.wd - today.getDay() + 7) % 7)); if (dr.next && d.getTime() === today.getTime()) d = addDays(d, 7);
        let at = setTime(d, h, min); if (at.getTime() <= now.getTime()) at = setTime(addDays(d, 7), h, min); return at;
      }
      return setTime(dr.date, h, min);
    };
    days.sort((a, b) => a.start - b.start).forEach(dr => {
      let tm = null;
      for (const tk of times) {
        if (usedT.has(tk)) continue;
        const gap = tk.start >= dr.end ? t.slice(dr.end, tk.start) : tk.end <= dr.start ? t.slice(tk.end, dr.start) : null;
        if (gap != null && gap.length <= 14 && FILL.test(gap)) { tm = tk; break; }
      }
      if (tm) usedT.add(tm);
      const at = resolveDay(dr, tm ? tm.h : 9, tm ? tm.min : 0, !!tm);
      out.push({ start: Math.min(dr.start, tm ? tm.start : dr.start), end: Math.max(dr.end, tm ? tm.end : dr.end), at: at.getTime(), time: !!tm });
    });
    times.forEach(tk => {
      if (usedT.has(tk)) return;
      let at = setTime(today, tk.h, tk.min); if (at.getTime() <= now.getTime()) at = setTime(addDays(today, 1), tk.h, tk.min);
      out.push({ start: tk.start, end: tk.end, at: at.getTime(), time: true });
    });
    return out.filter(o => o.at > now.getTime() + 60000 && o.at < now.getTime() + 800 * 864e5).sort((a, b) => a.start - b.start)
      .map(o => ({ start: o.start, end: o.end, text: raw.slice(o.start, o.end), at: o.at }));
  }
  // The first date in the text that is still to come (what a reminder should be about).
  const first = (text, nowMs) => parse(text, nowMs)[0] || null;
  return { parse, first, fold };
});
