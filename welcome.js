'use strict';
// The welcome tour: five short steps for a brand-new install. Everything is built with textContent (never innerHTML).
(function () {
  const $ = s => document.querySelector(s);
  let keys = {}, name = '', at = 0;
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
    { icon: '👋', title: name ? 'Welcome, ' + name + '!' : 'Welcome to StickyPad', text: ['Colourful sticky notes that live on your desktop. **Everything stays on your PC.**', 'Press {g_new} anywhere in Windows to make a new note.'] },
    { icon: '🔎', title: 'Find anything', text: ['{g_all} opens **Home** with all your notes, folders and the trash.', '{g_find} searches inside **every note** (capitals and accents do not matter).', 'Drag a .stickypad, .md or .txt file onto any StickyPad window to add it as a note.'] },
    { icon: '🎨', title: 'Make it yours', text: ['Press the **sliders button** on a note for colours, font, transparency, a reminder, a folder, or a password lock.', 'Type a word a few times and StickyPad offers to finish it: press **Tab**.'] },
    { icon: '✨', title: 'An AI helper, if you want one', text: ['Ask questions about your notes or let the AI edit a note. It works with **free Ollama on your own PC** (nothing leaves it), or with Claude if you choose.', 'It stays **off** until you set it up.'], button: { label: 'Set up the AI…', go: 'settings', section: 'ai' } },
    { icon: '🛟', title: 'Your notes are safe', text: ['A backup is made **automatically every day**. If something ever goes wrong: **Settings › Data & backup › Restore**.', '**Export** a note as a .stickypad file to move it to another PC, with its pictures and look.'], last: true }
  ];
  function draw() {
    const steps = STEPS(), s = steps[at];
    document.querySelectorAll('#scene .sc').forEach((v, i) => v.classList.toggle('on', i === at));   // showing a scene again restarts its animation
    const card = $('#card'); card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
    $('#title').textContent = s.title;
    const t = $('#text'); t.textContent = ''; say(t, s.text);
    const ex = $('#extra'); ex.textContent = '';
    if (s.button) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = s.button.label; b.onclick = () => window.api.welcomeClose({ go: s.button.go, section: s.button.section }); ex.appendChild(b); }
    $('#back').hidden = at === 0; $('#skip').hidden = !!s.last;
    $('#next').textContent = s.last ? 'Start with a note' : 'Next';
    const dots = $('#dots'); dots.textContent = '';
    steps.forEach((x, i) => { const d = document.createElement('button'); d.type = 'button'; d.className = i === at ? 'on' : ''; d.setAttribute('role', 'tab'); d.setAttribute('aria-selected', i === at); d.setAttribute('aria-label', 'Step ' + (i + 1) + ' of ' + steps.length); d.onclick = () => { at = i; draw(); }; dots.appendChild(d); });
    $('#next').focus();
  }
  const done = go => window.api.welcomeClose(go ? { go } : {});
  $('#next').onclick = () => { if (at >= STEPS().length - 1) done('note'); else { at++; draw(); } };
  $('#back').onclick = () => { if (at > 0) { at--; draw(); } };
  $('#skip').onclick = () => done();
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') done();
    else if (e.key === 'ArrowRight') $('#next').click();
    else if (e.key === 'ArrowLeft') $('#back').click();
  });
  window.api.welcomeGet().then(d => { keys = (d && d.keys) || {}; name = (d && d.name) || ''; draw(); }).catch(draw);
})();
