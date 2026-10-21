"""Measures the windows (in the same test browser the UI tests use): opening a note, typing, Home with many notes, scrolling, page memory.
Run:  python tools/measure_ui.py        (numbers are in milliseconds on this machine; a Windows PC is slower)"""
import os, json, time
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')) + '/'
STUB = open(ROOT + 'tests/ui/stub.js', encoding='utf-8').read()
WORDS = 'alpha beta gamma delta omega sticky note remember meeting groceries budget project'.split()
def lines(n): return '\n'.join(' '.join(WORDS[(i * 7 + j * 3) % len(WORDS)] for j in range(8)) for i in range(n))
frames = "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))"
def heap(pg):
    c = pg.context.new_cdp_session(pg); c.send('Performance.enable')
    return {m['name']: m['value'] for m in c.send('Performance.getMetrics')['metrics']}['JSHeapUsedSize'] / 1048576
def page(b, f, init, w=900, h=700, after=''):
    pg = b.new_page(viewport={'width': w, 'height': h}); pg.add_init_script(init + ';' + STUB + ';' + after)
    t = time.time(); pg.goto('file://' + ROOT + f); return pg, t
out = []
with sync_playwright() as p:
    b = p.chromium.launch()
    # a note: opening, then 15 key presses at the end
    for label, n in (('note, 20 lines', 20), ('note, 3,000 lines (120 KB)', 3000), ('note, 51,200 lines (3.7 MB)', 51200)):
        pg, t0 = page(b, 'note.html', 'window.__BLOCKS=' + json.dumps([{'t': 'text', 'v': lines(n)}]))
        for _ in range(100):
            if pg.evaluate("document.querySelector('#ed').textContent.length") > 0: break
            pg.wait_for_timeout(20)
        pg.evaluate(frames); opened = (time.time() - t0) * 1000
        pg.click('#ed'); pg.keyboard.press('Control+End'); pg.wait_for_timeout(300); ts = []
        for i in range(15):
            t = time.time(); pg.keyboard.type('a'); pg.evaluate(frames); ts.append((time.time() - t) * 1000)
        ts.sort(); out.append((label, 'open %.0f ms' % opened, 'typing: median %.0f ms, worst %.0f ms (two frames = 33 ms is the floor)' % (ts[7], ts[-1]), 'page heap %.0f MB' % heap(pg)))
        pg.close()
    # Home with many notes
    for count in (10, 1000, 10000):
        notes = [{'id': 'n%d' % i, 'title': 'Note %d' % i, 'text': lines(3)[:240], 'color': '#FFF2A8', 'group': None, 'updated': 1700000000000 - i, 'open': False, 'images': 0, 'pinned': False, 'locked': False, 'font': 'Segoe UI'} for i in range(count)]
        init = 'window.__ALL=' + json.dumps({'emoji': '☀️', 'greeting': 'Hello', 'notes': notes, 'groups': [], 'trash': [], 'prefs': {}})
        pg, t0 = page(b, 'all.html', init, after='window.__S.all=window.__ALL')
        for _ in range(300):
            if pg.evaluate("document.querySelectorAll('.card').length") > 0: break
            pg.wait_for_timeout(20)
        pg.evaluate(frames); shown = (time.time() - t0) * 1000
        cards = pg.evaluate("document.querySelectorAll('.card').length")
        t = time.time(); pg.mouse.wheel(0, 4000); pg.evaluate(frames); sc = (time.time() - t) * 1000
        out.append(('Home, %s notes' % format(count, ','), 'cards drawn: %d, ready after %.0f ms' % (cards, shown), 'one scroll %.0f ms' % sc, 'page heap %.0f MB' % heap(pg)))
        pg.close()
    b.close()
for r in out: print(' | '.join(r))
