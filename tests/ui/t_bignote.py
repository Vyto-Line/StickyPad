import os, sys, json, time
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..')) + '/'
STUB = open(os.path.join(HERE, 'stub.js')).read(); fails = []
PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
def ok(c, m):
    print(('PASS ' if c else 'FAIL ') + m)
    if not c: fails.append(m)
def page(b, blocks, w=330, h=420):
    pg = b.new_page(viewport={'width': w, 'height': h}); pg.errs = []
    pg.on('pageerror', lambda e: pg.errs.append(str(e)))
    pg.add_init_script('window.__BLOCKS=' + json.dumps(blocks) + ';' + STUB); pg.goto('file://' + ROOT + 'note.html'); pg.wait_for_timeout(400); return pg
html = lambda pg: pg.evaluate("document.querySelector('#ed').innerHTML")
saved = lambda pg: pg.evaluate('JSON.stringify(__S.lastUpdate && __S.lastUpdate.blocks)')
MIX = [{'t': 'text', 'v': 'hello world\nsecond line'}, {'t': 'check', 'v': 'milk', 'done': False}, {'t': 'check', 'v': 'eggs', 'done': True}, {'t': 'img', 'id': 'a.png', 'src': PNG}, {'t': 'text', 'v': 'tail'}]
with sync_playwright() as p:
    b = p.chromium.launch()
    def wipe(name, setup, key='Delete'):
        pg = page(b, MIX); setup(pg); pg.keyboard.press('Control+a'); pg.keyboard.press(key); pg.wait_for_timeout(450)
        ok(pg.evaluate("document.querySelector('#ed').querySelectorAll('.todo,img').length") == 0 and not pg.evaluate("document.querySelector('#ed').textContent.trim()"), name + ': everything is gone')
        ok(saved(pg) == '[]', name + ': saved as empty (%s)' % saved(pg)); ok(not pg.errs, name + ': no errors %s' % pg.errs)
        pg.keyboard.type('new'); pg.wait_for_timeout(300); ok('new' in pg.evaluate("document.querySelector('#ed').textContent"), name + ': can type afterwards')
        return pg
    wipe('caret in text', lambda pg: pg.click('#ed'))
    wipe('caret in checklist item', lambda pg: pg.click('.todo .tx'))
    wipe('picture selected', lambda pg: pg.click('#ed img'))
    wipe('focus outside the editor', lambda pg: pg.click('header .dragfill'))
    wipe('Backspace', lambda pg: pg.click('#ed'), 'Backspace')
    pg = wipe('Delete then undo', lambda pg: pg.click('#ed'))
    for _ in range(3):
        if pg.evaluate("document.querySelectorAll('#ed .todo').length") == 2: break
        pg.keyboard.press('Control+z'); pg.wait_for_timeout(300)
    ok(pg.evaluate("document.querySelectorAll('#ed .todo').length") == 2 and 'hello' in pg.evaluate("document.querySelector('#ed').textContent"), 'undo brings everything back')
    # typing over a select-all replaces everything
    pg = page(b, MIX); pg.click('#ed'); pg.keyboard.press('Control+a'); pg.keyboard.type('X'); pg.wait_for_timeout(400)
    ok(html(pg) == 'X', 'typing over select-all leaves only the new text: %r' % html(pg)[:80])
    # cut
    pg = page(b, MIX); pg.click('#ed'); pg.keyboard.press('Control+a'); pg.keyboard.press('Control+x'); pg.wait_for_timeout(400)
    ok(pg.evaluate("document.querySelectorAll('#ed .todo,#ed img').length") == 0, 'Ctrl+X also clears everything')
    # partial selection still behaves normally
    pg = page(b, [{'t': 'text', 'v': 'hello world'}]); pg.click('#ed'); pg.keyboard.press('Control+End'); pg.keyboard.press('Shift+Control+ArrowLeft'); pg.keyboard.press('Delete'); pg.wait_for_timeout(300)
    ok(pg.evaluate("document.querySelector('#ed').textContent") == 'hello ', 'partial delete is untouched')
    # damaged checklist item: no crash, words kept
    pg = page(b, [{'t': 'check', 'v': 'a', 'done': False}, {'t': 'text', 'v': 'END'}]); pg.click('#ed')
    pg.evaluate("document.querySelector('.todo .tx').remove()"); pg.keyboard.press('Control+End'); pg.keyboard.type('z'); pg.wait_for_timeout(500)
    ok(not pg.errs and 'END' in saved(pg), 'damaged checklist item is repaired, note still saves (%s)' % pg.errs[:1])
    # big notes
    big = [{'t': 'text', 'v': ('Lorem ipsum dolor sit amet γειά σου κόσμε\n' * 5000)}, {'t': 'text', 'v': 'THE-END'}]
    pg = page(b, big); pg.click('#ed'); pg.keyboard.press('Control+End'); t = time.time(); pg.keyboard.type('abcdefghij'); dt = time.time() - t
    pg.wait_for_timeout(800); ok(dt < 6, '200 KB note: 10 keys in %.1fs' % dt); ok('THE-END' in saved(pg) and 'abcdefghij' in saved(pg), '200 KB note saves its last lines'); ok(not pg.errs, 'no errors on a 200 KB note')
    todos = [{'t': 'check', 'v': 'item %d' % i, 'done': i % 3 == 0} for i in range(4000)] + [{'t': 'text', 'v': 'END'}]
    pg = page(b, todos); pg.click('#ed'); pg.keyboard.press('Control+End'); pg.keyboard.type('ab'); pg.keyboard.press('Control+a'); pg.keyboard.press('Delete'); pg.wait_for_timeout(700)
    ok(not pg.errs and saved(pg) == '[]', '4000 checklist items: select-all-delete works (%s)' % pg.errs[:1])
    # undo memory is capped
    pg = page(b, [{'t': 'text', 'v': 'x' * 3000000}]); pg.click('#ed'); pg.keyboard.press('Control+End')
    for i in range(12): pg.keyboard.type('a'); pg.wait_for_timeout(450)
    ok(pg.evaluate('undoChars') <= 20e6 + 3.1e6 and pg.evaluate('undoS.length') >= 1, 'undo history is capped by size (%d chars, %d steps)' % (pg.evaluate('undoChars'), pg.evaluate('undoS.length')))
    b.close()
print('FAILS:', fails); sys.exit(1 if fails else 0)
