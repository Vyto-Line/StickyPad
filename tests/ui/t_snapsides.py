from playwright.sync_api import sync_playwright
import os, sys
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':900,'height':700}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.add_init_script(STUB)
    pg.goto('file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/settings.html'); pg.wait_for_timeout(400)
    ok(pg.locator('#snapSides').count()==1 and not pg.is_checked('#snapSides'),'the switch exists and is off by default')
    pg.evaluate("document.querySelector('#snapSides').closest('.row').scrollIntoView()")
    pg.evaluate("document.querySelector('#snapSides').click()"); pg.wait_for_timeout(200)
    ok(any(c[0]=='settingsSet' and c[1].get('snapSides') is True for c in pg.evaluate('__S.calls')),'turning it on is saved')
    ok(pg.evaluate("document.querySelector('#snapSides').getAttribute('aria-labelledby')")is not None,'the switch is named for screen readers')
    ok(not errs,'no errors %s'%errs); b.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
