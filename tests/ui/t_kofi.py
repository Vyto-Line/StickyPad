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
    pg.evaluate("document.querySelector('[data-cat=about]').click()"); pg.click('#kofi'); pg.wait_for_timeout(200)
    ok(['openLink','https://ko-fi.com/vyto'] in pg.evaluate('__S.calls'),'the coffee button opens the Ko-fi page')
    ok(not errs,'no errors %s'%errs); b.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
