import os, sys, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..')) + '/'
STUB = open(os.path.join(HERE, 'stub.js')).read(); fails = []
def ok(c, m):
    print(('PASS ' if c else 'FAIL ') + m)
    if not c: fails.append(m)
def page(b, blocks, w=420, h=420):
    pg = b.new_page(viewport={'width': w, 'height': h}); pg.errs = []
    pg.on('pageerror', lambda e: pg.errs.append(str(e)))
    pg.add_init_script('window.__BLOCKS=' + json.dumps(blocks) + ';' + STUB); pg.goto('file://' + ROOT + 'note.html'); pg.wait_for_timeout(700); return pg
with sync_playwright() as p:
    b = p.chromium.launch()
    # a short note has no scroll bar
    pg = page(b, [{'t': 'text', 'v': 'hello'}]); ok(pg.evaluate("document.querySelector('#sb').hidden"), 'a short note shows no scroll bar')
    # a long one does
    text = '\n'.join('line %d with some words in it' % i for i in range(60000))
    pg = page(b, [{'t': 'text', 'v': text}])
    ok(not pg.evaluate("document.querySelector('#sb').hidden"), 'a long note shows the scroll bar')
    r = pg.evaluate("(() => { const s = document.querySelector('#sb').getBoundingClientRect(), t = document.querySelector('#sbt').getBoundingClientRect(); return {sl: s.left, sr: s.right, sw: s.width, tl: t.left, tr: t.right, tt: t.top, th: t.height, iw: innerWidth}; })()")
    ok(r['iw'] - r['sr'] >= 12, 'the grab area is %d px clear of the window edge (the resize border)' % (r['iw'] - r['sr']))
    ok(r['sw'] >= 16, 'the grab area is %d px wide' % r['sw'])
    ok(pg.evaluate("getComputedStyle(document.querySelector('#sbt')).cursor") in ('auto', 'default') and pg.evaluate("getComputedStyle(document.querySelector('#sb')).cursor") == 'default', 'the pointer is an arrow over it, not a text cursor')
    ok(pg.evaluate("document.elementFromPoint(%f, %f).id" % ((r['tl'] + r['tr']) / 2, r['tt'] + r['th'] / 2)) == 'sbt', 'the thumb is what is under the pointer')
    ok(r['th'] >= 36, 'the thumb is at least 36 px tall (%d)' % r['th'])
    # drag the thumb down half way
    x = (r['tl'] + r['tr']) / 2; y = r['tt'] + r['th'] / 2
    pg.click('#ed'); pg.keyboard.press('Control+Home')
    pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x, y + 100, steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
    st = pg.evaluate("ed.scrollTop"); ok(st > 1000, 'dragging the thumb scrolls the note (scrollTop %d)' % st)
    t2 = pg.evaluate("document.querySelector('#sbt').getBoundingClientRect().top"); ok(t2 > r['tt'] + 50, 'the thumb follows the pointer (%d -> %d)' % (r['tt'], t2))
    # drag all the way to the bottom
    t = pg.evaluate("document.querySelector('#sbt').getBoundingClientRect()"); y = t['top'] + t['height'] / 2
    pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x, y + 1000, steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
    ok(pg.evaluate("ed.scrollHeight - ed.clientHeight - ed.scrollTop") < 5, 'dragging to the end reaches the end of the note')
    # clicking the empty track pages
    tb = pg.evaluate("document.querySelector('#sbt').getBoundingClientRect().top"); a = pg.evaluate("ed.scrollTop"); pg.mouse.click(x, tb - 60); pg.wait_for_timeout(200)
    ok(pg.evaluate("ed.scrollTop") < a - 100, 'a click above the thumb scrolls up one page')
    # wheel over the bar scrolls too
    pg.evaluate("ed.scrollTop = 0"); pg.wait_for_timeout(100); a = 0; pg.mouse.move(x, 200); pg.mouse.wheel(0, 300); pg.wait_for_timeout(200)
    ok(pg.evaluate("ed.scrollTop") > a + 100, 'the mouse wheel over the bar scrolls the note')
    # the caret stays where it was
    pg.click('#ed'); pg.keyboard.press('Control+Home'); pg.keyboard.type('Z'); pg.wait_for_timeout(200)
    pg.mouse.move(x, 100); pg.mouse.down(); pg.mouse.up(); pg.keyboard.type('Y'); pg.wait_for_timeout(300)
    ok(pg.evaluate("ed.textContent.startsWith('ZY')"), 'using the bar does not take the caret away from the text')
    ok(not pg.errs, 'no errors %s' % pg.errs[:1])
    b.close()
print('FAILS:', fails); sys.exit(1 if fails else 0)
