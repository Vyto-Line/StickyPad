'use strict';
// The welcome tour: a few short steps for a brand-new install. Everything is built with textContent (never innerHTML).
(function () {
  const $ = s => document.querySelector(s);
  let keys = {}, name = '', at = 0, fresh = true, saveT = null, stopLook = null, look = { id: 'classic', mode: 'system' };
  const TH = window.StickyThemes, isDark = () => document.documentElement.dataset.ui === 'dark';
  const key = id => (keys[id] || '').replace(/\+/g, ' + ');
  // a sentence with {g_new}-style holes that become key caps
  function say(el, parts) {
    parts.forEach(p => {
      const para = document.createElement('p');
      String(p).split(/(\{[a-z_]+\}|\*\*[^*]+\*\*)/g).forEach(x => {
        if (!x) return;
        let n;
        if (/^\{[a-z_]+\}$/.test(x)) { n = document.createElement('kbd'); n.textContent = key(x.slice(1, -1)) || '…'; }
        else if (/^\*\*[^*]+\*\*$/.test(x)) { n = document.createElement('b'); n.textContent = x.slice(2, -2); }
        else n = document.createTextNode(x);
        para.appendChild(n);
      });
      el.appendChild(para);
    });
  }
  const STEPS = () => [
    { scene: 0, title: name ? 'Welcome, ' + name + '!' : 'Welcome to StickyPad', text: ['Colourful sticky notes that live on your desktop. **Everything stays on your PC.**', 'Press {g_new} anywhere in Windows to make a new note.'], name: true },
    { scene: -1, wide: true, title: 'Pick your look', text: ['The whole app changes as you click.'], look: true },
    { scene: -1, wide: true, title: 'Make it comfortable', text: ['Bigger text, stronger contrast, calmer screens. **Switch on anything that helps you:** it applies straight away.'], comfort: true },
    { scene: 5, title: 'Tidy your desk', text: ['Drag a note to the **left or right edge** of the screen and it fills that half. Drag it to the **top** and it fills the whole screen. **Drag it away and it goes back.**', 'Notes can also **hide their buttons while you are not using them**. Both are **off** until you switch them on: **Settings › Notes**.'], button: { label: 'Open Notes settings…', go: 'settings', section: 'notes' } },
    { scene: 1, title: 'Find anything', text: ['{g_all} opens **Home** with all your notes, folders and the trash.', '{g_find} searches inside **every note** (capitals and accents do not matter).', 'Drag a .stickypad, .md or .txt file onto any StickyPad window to add it as a note.'] },
    { scene: 3, title: 'An AI helper, if you want one', text: ['Ask questions about your notes, chat about one note, translate it (the language is detected for you) or let the AI edit it. It works with **free Ollama on your own PC** (nothing leaves it), or with Claude if you choose.', 'Your chats are kept in a list you can rename, pin or delete. The AI stays **off** until you set it up.'], button: { label: 'Set up the AI…', go: 'settings', section: 'ai' } },
    { scene: 4, title: 'Your notes are safe', text: ['A backup is made **automatically every day**. If something ever goes wrong: **Settings › Data & backup › Restore**.', '**Export** a note as a .stickypad file to move it to another PC, with its pictures and look.'], last: true }
  ];
  // the optional name: saved a moment after typing stops, and the title above follows it
  function saveName(v) { name = v.trim().slice(0, 30); clearTimeout(saveT); saveT = setTimeout(() => { try { window.api.prefs({ name }); } catch {} }, 350); }
  function nameField(ex) {
    const wrap = document.createElement('div'); wrap.className = 'field';
    const lab = document.createElement('label'); lab.htmlFor = 'nm'; lab.textContent = 'Call me';
    const inp = document.createElement('input'); inp.id = 'nm'; inp.type = 'text'; inp.maxLength = 30; inp.value = name; inp.autocomplete = 'off'; inp.spellcheck = false; inp.placeholder = 'your name (optional)';
    inp.oninput = () => { saveName(inp.value); $('#title').textContent = name ? 'Welcome, ' + name + '!' : 'Welcome to StickyPad'; };
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('#next').click(); } e.stopPropagation(); if (e.key === 'Escape') done(); };
    wrap.append(lab, inp);
    const h = document.createElement('div'); h.className = 'hint'; h.textContent = 'Optional · only used for greetings · stays on this PC';
    ex.append(wrap, h);
    return inp;
  }
  // the look picker: choosing changes the whole app straight away (everyone sees it, this window included)
  function lookPicker(ex) {
    const box = document.createElement('div'); box.className = 'themes';
    const paintSwatches = () => box.querySelectorAll('.th').forEach(b => {
      const c = TH.palette(b.dataset.id, isDark()); b.querySelectorAll('i').forEach((i, k) => { i.style.background = c[k]; });
      b.setAttribute('aria-pressed', b.dataset.id === look.id);
    });
    TH.THEMES.slice(0, 8).forEach(t => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'th'; b.dataset.id = t.id;
      const sw = document.createElement('div'); sw.className = 'sw'; for (let k = 0; k < 4; k++) sw.appendChild(document.createElement('i'));
      const nm = document.createElement('span'); nm.textContent = t.name; b.append(sw, nm);
      b.onclick = () => {
        look.id = t.id; paintSwatches();
        try { fresh ? window.api.themeApplyAll(t.id) : window.api.themeSet(t.id); } catch {}   // a first run recolours its one blank note; opening the tour again never touches your notes
      };
      box.appendChild(b);
    });
    const seg = document.createElement('div'); seg.className = 'seg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Light or dark');
    [['light', '☀ Light'], ['dark', '☾ Dark'], ['system', 'Match Windows']].forEach(([m, label]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.dataset.m = m;
      b.onclick = () => { look.mode = m; seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x.dataset.m === m)); try { window.api.settingsSet({ mode: m }); } catch {} };
      b.setAttribute('aria-pressed', m === look.mode); seg.appendChild(b);
    });
    const hint = document.createElement('div'); hint.className = 'hint'; hint.style.marginTop = '12px'; hint.textContent = 'Change it any time in Settings';
    ex.append(box, seg, hint); paintSwatches();
    window.addEventListener('sp-theme', paintSwatches); stopLook = () => window.removeEventListener('sp-theme', paintSwatches);   // light/dark changed: the swatches follow
    return box.querySelector('[aria-pressed=true]') || box.firstChild;
  }
  // comfort options for anyone who needs them: the same switches as Settings > Accessibility, applied straight away
  function comfortPicker(ex) {
    let a = Object.assign({ size: 100, contrast: false, read: false, motion: false }, window.StickyAccess ? StickyAccess.get() : {});
    const set = p => { Object.assign(a, p); try { window.api.accessSet(p); } catch {} paint(); };
    const seg = document.createElement('div'); seg.className = 'seg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Interface size');
    [100, 115, 130, 150].forEach(n => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = n + '%'; b.dataset.size = n; b.onclick = () => set({ size: n }); seg.appendChild(b);
    });
    const opts = document.createElement('div'); opts.className = 'opts';
    const rows = [['contrast', 'High contrast', 'Stronger text and borders'], ['read', 'Easier-to-read notes', 'Wider spacing and a clearer font'], ['motion', 'Reduce motion', 'No animations']].map(([k, label, sub]) => {
      const l = document.createElement('label'); l.className = 'opt';
      const c = document.createElement('input'); c.type = 'checkbox'; c.dataset.k = k; c.onchange = () => set({ [k]: c.checked });
      const t = document.createElement('span'); t.innerHTML = '<b></b><i></i>'; t.firstChild.textContent = label; t.lastChild.textContent = sub;
      l.append(c, t); opts.appendChild(l); return c;
    });
    const hint = document.createElement('div'); hint.className = 'hint'; hint.style.marginTop = '12px'; hint.textContent = 'More options in Settings › Accessibility, any time';
    function paint() {
      seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.size) === a.size));
      rows.forEach(c => { c.checked = !!a[c.dataset.k]; });
    }
    ex.append(seg, opts, hint); paint();
    try { window.api.accessGet().then(r => { if (r) { a = Object.assign(a, r); paint(); } }); } catch {}
    return seg.querySelector('[aria-pressed=true]') || seg.firstChild;
  }
  function draw() {
    const steps = STEPS(), s = steps[at];
    document.querySelectorAll('#scene .sc').forEach(v => v.classList.toggle('on', Number(v.dataset.s) === s.scene)); $('#scene').classList.toggle('none', s.scene < 0); $('#card').classList.toggle('wide', !!s.wide);   // showing a scene again restarts its animation
    const card = $('#card'); card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
    $('#title').textContent = s.title;
    const t = $('#text'); t.textContent = ''; say(t, s.text);
    const ex = $('#extra'); ex.textContent = ''; if (stopLook) { stopLook(); stopLook = null; }
    let focusEl = null;
    if (s.name) focusEl = nameField(ex);
    if (s.look) focusEl = lookPicker(ex);
    if (s.comfort) focusEl = comfortPicker(ex);
    if (s.button) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = s.button.label; b.onclick = () => { if (saveT) { clearTimeout(saveT); saveT = null; try { window.api.prefs({ name }); } catch {} } window.api.welcomeClose({ go: s.button.go, section: s.button.section }); }; ex.appendChild(b); }
    $('#back').hidden = at === 0; $('#skip').hidden = !!s.last;
    $('#next').textContent = s.last ? 'Start with a note' : 'Next';
    const dots = $('#dots'); dots.textContent = '';
    steps.forEach((x, i) => { const d = document.createElement('button'); d.type = 'button'; d.className = i === at ? 'on' : ''; d.setAttribute('role', 'tab'); d.setAttribute('aria-selected', i === at); d.setAttribute('aria-label', 'Step ' + (i + 1) + ' of ' + steps.length); d.onclick = () => move(i); dots.appendChild(d); });
    (focusEl || $('#next')).focus({ preventScroll: true });
  }
  const done = go => { if (saveT) { clearTimeout(saveT); saveT = null; try { window.api.prefs({ name }); } catch {} } window.api.welcomeClose(go ? { go } : {}); };
  // Moving between steps: the old content slides out the way you are going, the card eases to its new size, the new content slides in.
  // Quick clicks just change the target step (one swap happens, on the latest one). With Reduce motion on, it swaps at once.
  const still = () => document.documentElement.classList.contains('a11y-motion') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  let swapT = null, sizeT = null, dir = 0;
  function move(to) {
    const from = at; at = Math.max(0, Math.min(STEPS().length - 1, to)); if (at === from && !swapT) return;
    const card = $('#card');
    if (still()) { draw(); return; }
    if (swapT) { dir = at > from ? 1 : -1; return; }   // a swap is already on its way: it will show the latest step
    dir = at > from ? 1 : -1; card.style.setProperty('--dx', (-26 * dir) + 'px'); card.classList.add('out');
    swapT = setTimeout(() => {
      swapT = null; const h0 = card.offsetHeight;
      card.classList.remove('out'); card.style.setProperty('--dx', (26 * dir) + 'px'); card.style.setProperty('--dy', '0px');
      draw();
      const h1 = card.offsetHeight;
      if (h0 !== h1) {   // ease from the old height to the new one
        clearTimeout(sizeT); card.style.height = h0 + 'px'; card.classList.add('moving'); void card.offsetHeight; card.style.height = h1 + 'px';
        sizeT = setTimeout(() => { card.style.height = ''; card.classList.remove('moving'); }, 380);
      }
    }, 150);
  }
  $('#next').onclick = () => { if (at >= STEPS().length - 1 && !swapT) done('note'); else move(at + 1); };
  $('#back').onclick = () => { if (at > 0) move(at - 1); };
  $('#skip').onclick = () => done();
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') done();
    else if (e.key === 'ArrowRight' && !(e.target && e.target.tagName === 'INPUT')) $('#next').click();
    else if (e.key === 'ArrowLeft' && !(e.target && e.target.tagName === 'INPUT')) $('#back').click();
  });
  window.api.welcomeGet().then(d => { keys = (d && d.keys) || {}; name = (d && d.name) || ''; fresh = !d || d.fresh !== false; return window.api.uiTheme && window.api.uiTheme(); })
    .then(t => { if (t) look = { id: t.id || 'classic', mode: t.mode || 'system' }; }).catch(() => {}).then(draw);
})();
