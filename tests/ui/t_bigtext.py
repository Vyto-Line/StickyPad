import os, sys, json, time, random
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..')) + '/'
STUB = open(os.path.join(HERE, 'stub.js')).read(); fails = []
def ok(c, m):
    print(('PASS ' if c else 'FAIL ') + m)
    if not c: fails.append(m)
random.seed(3); W = ['alpha', 'beta', 'gamma', 'delta', 'omega', 'sticky', 'note', 'καλημέρα', 'Ωραία']
def make(n): return '\n'.join(' '.join(random.choice(W) for _ in range(random.randint(0, 11))) for _ in range(n))   # includes empty lines
def page(b, blocks):
    pg = b.new_page(viewport={'width': 330, 'height': 420}); pg.errs = []
    pg.on('pageerror', lambda e: pg.errs.append(str(e)))
    pg.add_init_script('window.__BLOCKS=' + json.dumps(blocks) + ';' + STUB); pg.goto('file://' + ROOT + 'note.html'); pg.wait_for_timeout(500); return pg
saved = lambda pg: pg.evaluate("__S.lastUpdate && __S.lastUpdate.blocks")
frames = lambda pg: pg.evaluate("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))")
with sync_playwright() as p:
    b = p.chromium.launch()
    # a normal note is untouched
    small = make(500); pg = page(b, [{'t': 'text', 'v': small}])
    ok(pg.evaluate("innerWidth - ed.getBoundingClientRect().right") >= 12, 'ordinary notes keep the scroll bar away from the edge too')
    ok(pg.evaluate("document.querySelectorAll('#ed .chunk').length") == 0, 'a normal note is one piece, as before')
    # a medium note (100,000 letters) is cut into short blocks too: one block of that size took 130 ms for every key
    pg = page(b, [{'t': 'text', 'v': make(14000)[:100000]}]); ok(pg.evaluate("document.querySelectorAll('#ed .chunk').length") > 20, 'a 100,000-letter note is shown in short blocks')
    ok(pg.evaluate("ed.spellcheck") is True, '... and still gets spell-check')
    # a huge one is cut into short blocks and still saves exactly the same text
    text = make(40000); expect = text.count('alpha'); ln = len(text)
    pg = page(b, [{'t': 'text', 'v': text}, {'t': 'check', 'v': 'after', 'done': False}])
    nch = pg.evaluate("document.querySelectorAll('#ed .chunk').length"); ok(nch > 100, 'a huge note is shown in many short blocks (%d)' % nch)
    pg.click('#ed'); pg.keyboard.press('Control+End'); pg.keyboard.press('Control+Home'); pg.keyboard.type('Q'); pg.wait_for_timeout(500)
    bl = saved(pg); ok(bl and bl[0]['t'] == 'text' and bl[0]['v'] == 'Q' + text and bl[1]['t'] == 'check' and bl[1]['v'] == 'after', 'the saved text is exactly the original plus the typed letter (%d vs %d chars)' % (len(bl[0]['v']) if bl else -1, ln + 1))
    lay = pg.evaluate("() => { const b = note.blocks; const t0 = performance.now(); render(b); ed.getBoundingClientRect(); ed.scrollHeight; return performance.now() - t0; }")
    ok(lay < 250, 'drawing the huge note takes %d ms (it was about 500)' % lay)
    ok(pg.evaluate("innerWidth - ed.getBoundingClientRect().right") >= 12, 'the scroll bar is 12+ px inside the window edge (the window resize border no longer covers it)')
    # reading the note back out is fast, and the kept copy never goes stale
    sr = pg.evaluate("() => { const t0 = performance.now(); memoBlocks = null; serializeNow(); return performance.now() - t0; }")
    ok(sr < 150, 'reading the huge note back out takes %d ms (it was about 880 for 3.7 MB)' % sr)
    ok(pg.evaluate("() => { serialize(); ed.firstChild.firstChild.nodeValue = 'EDITED' + ed.firstChild.firstChild.nodeValue; return serialize()[0].v.startsWith('EDITED'); }"), 'the kept copy is dropped as soon as the text changes')
    ok(pg.evaluate("ed.spellcheck") is False, 'spell-check is off for a huge note')
    ok(page(b, [{'t': 'text', 'v': small}]).evaluate("ed.spellcheck") is True, 'spell-check stays on for ordinary notes')
    # typing stays quick
    pg.keyboard.press('Control+End'); ts = []
    for _ in range(3):
        t = time.time(); pg.keyboard.type('xy', delay=0); frames(pg); ts.append((time.time() - t) * 1000)
    ok(min(ts) < 200, 'typing in a 1.8 MB note stays quick: %s ms for 2 letters' % [round(x) for x in ts])
    # Find counts every match and walks through them
    pg.keyboard.press('Control+Home'); pg.keyboard.press('Control+f'); pg.fill('#findIn', 'alpha')
    for _ in range(300):
        if pg.inner_text('#findCnt'): break
        pg.wait_for_timeout(50)
    c = pg.inner_text('#findCnt'); want = '{:,}'.format(expect)
    ok(c.endswith('/ ' + want), 'Find counts all of them, not 5000+: %s (expected %s)' % (c, want))
    pg.keyboard.press('Enter'); pg.keyboard.press('Enter'); ok(pg.inner_text('#findCnt').startswith('3 /'), 'Enter walks through the matches: %s' % pg.inner_text('#findCnt'))
    pg.keyboard.press('Shift+Enter'); pg.keyboard.press('Shift+Enter'); pg.keyboard.press('Shift+Enter'); ok(pg.inner_text('#findCnt').startswith('{:,} /'.format(expect)), 'and backwards past the start wraps to the last: %s' % pg.inner_text('#findCnt'))
    ok(pg.evaluate("CSS.highlights.get('find') && CSS.highlights.get('find').size") <= 3001, 'only the matches near the current one are painted')
    pg.wait_for_timeout(200); vis = pg.evaluate("() => { const r = rangeOf(finds[findAt]).getBoundingClientRect(), b = ed.getBoundingClientRect(); return r.top >= b.top - 2 && r.bottom <= b.bottom + 2 && r.height > 0; }")
    ok(vis, 'the last match is scrolled into view even though it was far away')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(200); vis = pg.evaluate("() => { const r = rangeOf(finds[findAt]).getBoundingClientRect(), b = ed.getBoundingClientRect(); return r.top >= b.top - 2 && r.bottom <= b.bottom + 2 && r.height > 0 && ed.scrollTop < 400; }")
    ok(vis, 'and the first match is scrolled to again')
    pg.fill('#findIn', 'ΚΑΛΗΜΕΡΑ'); pg.wait_for_timeout(1500); ok(pg.inner_text('#findCnt').endswith('/ ' + '{:,}'.format(text.count('καλημέρα'))), 'capitals and accents are ignored: %s' % pg.inner_text('#findCnt'))
    ok(not pg.errs, 'no errors %s' % pg.errs)
    # scrolling to the end by dragging the bar / keys reaches the real end
    pg.evaluate("ed.scrollTop = ed.scrollHeight"); pg.wait_for_timeout(300); pg.evaluate("ed.scrollTop = ed.scrollHeight"); pg.wait_for_timeout(300)
    ok(pg.evaluate("ed.scrollTop + ed.clientHeight >= ed.scrollHeight - 3") and pg.evaluate("ed.scrollTop") > 100000, 'the scroll bar reaches the end of the note (%d px)' % pg.evaluate("ed.scrollTop"))
    # select all + delete still empties the whole note
    pg.keyboard.press('Escape'); pg.click('#ed'); pg.keyboard.press('Control+a'); pg.keyboard.press('Delete'); pg.wait_for_timeout(500)
    ok(saved(pg) == [], 'select all, Delete: the huge note is cleared (%s)' % str(saved(pg))[:60])
    ok(not pg.errs, 'no errors %s' % pg.errs)
    # a text with a trailing line break and blank lines is kept
    odd = ('x\n' * 120000) + '\n\nend'
    pg = page(b, [{'t': 'text', 'v': odd}]); pg.click('#ed'); pg.keyboard.press('Control+End'); pg.keyboard.type('!'); pg.wait_for_timeout(500)
    bl = saved(pg); ok(bl and bl[0]['v'] == odd + '!', 'blank lines and the end of the text are kept exactly (%s)' % (repr(bl[0]['v'][-14:]) + ' len %d vs %d' % (len(bl[0]['v']), len(odd) + 1) if bl else bl))
    b.close()
print('FAILS:', fails); sys.exit(1 if fails else 0)
