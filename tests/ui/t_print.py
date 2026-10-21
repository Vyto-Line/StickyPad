from playwright.sync_api import sync_playwright
import os, sys
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':330,'height':420}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.add_init_script(STUB)
    pg.goto('file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/note.html'); pg.wait_for_timeout(300)
    pg.fill('#topic','Shopping'); pg.locator('#ed').click(); pg.keyboard.type('hello'); pg.wait_for_timeout(200)
    pg.keyboard.press('Control+p'); pg.wait_for_timeout(300)
    ok(sum(1 for c in pg.evaluate('__S.calls') if c[0]=='notePrint')==1,'Ctrl+P prints the note')
    pg.click('#cfg'); pg.evaluate("document.querySelector('#rowOut').open=true"); pg.click('#printBtn'); pg.wait_for_timeout(300)
    ok(sum(1 for c in pg.evaluate('__S.calls') if c[0]=='notePrint')==2,'the Print button prints the note')
    ok(not errs,'no errors %s'%errs); b.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
