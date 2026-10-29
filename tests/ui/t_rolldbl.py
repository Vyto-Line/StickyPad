from playwright.sync_api import sync_playwright
import os, sys
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ROOT='file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/'
INIT=STUB+";window.api.onRolled=cb=>{window.__rolled=cb};"
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    pg=b.new_page(viewport={'width':360,'height':320}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script(INIT); pg.goto(ROOT+'note.html'); pg.wait_for_timeout(400)
    ok(not pg.evaluate("document.body.classList.contains('rolled')"),'a new note starts rolled down')
    pg.evaluate("__rolled(true)"); pg.wait_for_timeout(100)
    ok(pg.evaluate("document.body.classList.contains('rolled')"),'a double-click on the title bar (reported by the app) rolls the page up')
    ok(pg.get_attribute('#roll','title')=='Roll down','the roll button now offers to roll down')
    pg.evaluate("__rolled(false)"); pg.wait_for_timeout(100)
    ok(not pg.evaluate("document.body.classList.contains('rolled')"),'and the next one rolls it down')
    ok(pg.get_attribute('#roll','title')=='Roll up','the button offers to roll up again')
    ok(not errs,'no page errors: %s'%errs)
    b.close()
print('FAILED' if fails else 'ALL PASSED'); sys.exit(1 if fails else 0)
