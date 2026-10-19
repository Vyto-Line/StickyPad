'use strict';
// The "What's new" window: lists the changes since the version you had before. Text is built with textContent (never innerHTML),
// so nothing in the changelog can run as code.
(function () {
  const $ = s => document.querySelector(s);
  // **bold**, *italic* and `code` inside one line of text
  function rich(el, text) {
    const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    String(text).split(re).forEach(part => {
      if (!part) return;
      let n;
      if (/^\*\*[^*]+\*\*$/.test(part)) { n = document.createElement('b'); n.textContent = part.slice(2, -2); }
      else if (/^`[^`]+`$/.test(part)) { n = document.createElement('code'); n.textContent = part.slice(1, -1); }
      else if (/^\*[^*]+\*$/.test(part)) { n = document.createElement('i'); n.textContent = part.slice(1, -1); }
      else n = document.createTextNode(part);
      el.appendChild(n);
    });
  }
  function draw(d) {
    const list = $('#list'); list.textContent = '';
    $('#sub').textContent = d && d.version ? 'You are now on version ' + d.version : '';
    $('#off').checked = !!(d && d.off);
    if (!d || !d.sections || !d.sections.length) { const e = document.createElement('p'); e.className = 'empty'; e.textContent = 'Nothing to show.'; list.appendChild(e); return; }
    d.sections.forEach((s, i) => {
      const sec = document.createElement('section');
      const h = document.createElement('h2'); h.textContent = 'Version ' + s.version;
      if (i === 0) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = 'Latest'; h.appendChild(t); }
      sec.appendChild(h);
      let ul = null;
      s.blocks.forEach(b => {
        if (b.t === 'li') { if (!ul) { ul = document.createElement('ul'); sec.appendChild(ul); } const li = document.createElement('li'); rich(li, b.v); ul.appendChild(li); return; }
        ul = null;
        const e = document.createElement(b.t === 'h' ? 'h3' : 'p'); if (b.t === 'p') e.className = 'pp'; rich(e, b.v); sec.appendChild(e);
      });
      list.appendChild(sec);
    });
  }
  $('#ok').onclick = () => window.api.whatsNewClose({ off: $('#off').checked });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#ok').click(); });
  window.api.whatsNewGet().then(draw).catch(() => draw(null));
  $('#ok').focus();
})();
