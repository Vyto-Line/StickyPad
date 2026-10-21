import os, sys, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..')) + '/'
STUB = open(os.path.join(HERE, 'stub.js')).read(); OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True); fails = []
def ok(c, m):
    print(('PASS ' if c else 'FAIL ') + m)
    if not c: fails.append(m)
def page(b, f, init='', w=900, h=700, **kw):
    pg = b.new_page(viewport={'width': w, 'height': h}, **kw); pg.errs = []
    pg.on('pageerror', lambda e: pg.errs.append(str(e)))
    pg.add_init_script(STUB); pg.add_init_script(init); pg.goto('file://' + ROOT + f); pg.wait_for_timeout(500); return pg
cls = lambda pg: pg.evaluate("[...document.documentElement.classList].filter(c=>c.startsWith('a11y')).sort()")
css = lambda pg, sel, prop: pg.evaluate("getComputedStyle(document.querySelector('%s')).%s" % (sel, prop))
with sync_playwright() as p:
    b = p.chromium.launch()
    # defaults: only the focus outline is on
    pg = page(b, 'settings.html'); ok(cls(pg) == [], 'by default every option is off: %s' % cls(pg))
    # the settings tab
    pg.click('.hsub[data-cat=access]'); pg.wait_for_timeout(200)
    ok(pg.is_visible('#cat-access') and pg.locator('#cat-access .toggle').count() == 6 and pg.locator('[data-asz]').count() == 4, 'the Accessibility tab shows the sizes and six switches')
    ok(pg.eval_on_selector('[data-asz="100"]', 'e=>e.classList.contains("on")') and pg.locator('#cat-access .toggle:checked').count() == 0, 'every switch starts off')
    pg.click('[data-asz="130"]'); pg.wait_for_timeout(200)
    ok(pg.evaluate("__S.zoom") == 1.3, 'a size changes the zoom of this window (%s)' % pg.evaluate("__S.zoom"))
    ph = float(css(pg, '.apbar', 'height').replace('px', '')); pg.check('#aContrast'); pg.check('#aRead'); pg.check('#aMotion'); pg.check('#aBig'); pg.check('#aFocus'); pg.check('#aSr'); pg.uncheck('#aSr'); pg.wait_for_timeout(200)
    pb = float(css(pg, '.apbar', 'height').replace('px', '')); ok(ph == 32 and pb >= 46 and float(css(pg, '.api', 'width').replace('px', '')) >= 34, 'the preview shows bigger buttons: bar %d -> %d px' % (ph, pb))
    ok(cls(pg) == ['a11y-big', 'a11y-focus', 'a11y-hc', 'a11y-motion', 'a11y-read'], 'the switches set the classes: %s' % cls(pg))
    ok(css(pg, 'body', 'color') == 'rgb(0, 0, 0)', 'high contrast makes the text pure black (%s)' % css(pg, 'body', 'color'))
    ok(css(pg, '.aprev', 'letterSpacing') != 'normal', 'the preview shows the wider spacing')
    pg.screenshot(path=os.path.join(OUT, 'access_settings.png'))
    calls = pg.evaluate("__S.calls.filter(c=>c[0]=='accessSet').map(c=>c[1])")
    ok({'size': 130} in calls and {'contrast': True} in calls and {'motion': True} in calls and {'focus': True} in calls, 'every change is sent to the app: %s' % calls)
    ok(not pg.errs, 'no errors %s' % pg.errs[:1])
    # a change from another window arrives
    pg.evaluate("__S.fireAccess && __S.fireAccess({size:150})")
    # remembered options apply at once in every kind of window
    init = "window.__ACCESS={size:150,contrast:true,read:true,motion:true,focus:true,big:true,sr:true}"
    pn = page(b, 'note.html', init, w=420, h=420)
    ok(cls(pn) == ['a11y-big', 'a11y-focus', 'a11y-hc', 'a11y-motion', 'a11y-read'], 'a note gets the classes: %s' % cls(pn))
    ok(pn.evaluate("__S.zoom") == 1, 'a note is never zoomed (its text size is its own)')
    ok(float(css(pn, 'header', 'height').replace('px', '')) >= 46 and float(css(pn, '#allTop', 'width').replace('px', '')) >= 34, 'bigger buttons in a note: bar %s, button %s' % (css(pn, 'header', 'height'), css(pn, '#allTop', 'width')))
    ok(css(pn, '#ed', 'letterSpacing') != 'normal' and 'Verdana' in css(pn, '#ed', 'fontFamily'), 'easier-to-read notes: wide spacing and a clear font')
    ok(css(pn, '#ed', 'color') == 'rgb(0, 0, 0)', 'high contrast: note text is black')
    ok(css(pn, 'body', 'transitionDuration') in ('0s',) , 'reduced motion: no transitions (%s)' % css(pn, 'body', 'transitionDuration'))
    pn.screenshot(path=os.path.join(OUT, 'access_note.png'))
    pa = page(b, 'all.html', init); ok(pa.evaluate("__S.zoom") == 1.5, 'Home is zoomed to 150%')
    # screen reader line
    pa.evaluate("StickyAccess.announce('The AI answered. Hello')"); pa.wait_for_timeout(200)
    ok(pa.evaluate("document.querySelector('#a11yLive').textContent") == 'The AI answered. Hello' and pa.evaluate("document.querySelector('#a11yLive').getAttribute('aria-live')") == 'polite', 'announcements go to a polite live region')
    pq = page(b, 'all.html'); pq.evaluate("StickyAccess.announce('x')"); pq.wait_for_timeout(150)
    ok(pq.evaluate("!document.querySelector('#a11yLive')"), 'announcements are off by default')
    # reduce motion is only on when you switch it on (Windows' own setting does not turn it on behind your back)
    pm = b.new_page(viewport={'width': 600, 'height': 500}, reduced_motion='reduce'); pm.add_init_script(STUB); pm.goto('file://' + ROOT + 'settings.html'); pm.wait_for_timeout(400)
    ok('a11y-motion' not in cls(pm), 'reduce motion stays off until you switch it on')
    b.close()
print('FAILS:', fails); sys.exit(1 if fails else 0)
