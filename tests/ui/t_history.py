from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':330,'height':420}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.add_init_script(STUB)
    pg.goto('file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/note.html'); pg.wait_for_timeout(300)
    pg.click('#cfg'); pg.click('[data-tab=note]'); pg.click('#histBtn'); pg.wait_for_timeout(200)
    ok(pg.locator('.hrow').count()==2,'two copies listed')
    ok('old first line' in pg.inner_text('.hrow >> nth=0') and '12 words' in pg.inner_text('.hrow >> nth=0'),'row shows words and preview')
    ok('1 pic' in pg.inner_text('.hrow >> nth=1'),'row shows picture count')
    pg.click('.hrow >> nth=0 >> button'); ok(pg.inner_text('.hrow >> nth=0 >> button')=='Sure?','first click asks to confirm')
    ok(len(pg.evaluate('window.__S.calls.filter(c=>c[0]=="histRestore")'))==0,'nothing restored yet')
    pg.click('.hrow >> nth=0 >> button'); pg.wait_for_timeout(300)
    ok(len(pg.evaluate('window.__S.calls.filter(c=>c[0]=="histRestore")'))==1,'second click restores')
    ok('RESTORED' in pg.inner_text('#ed'),'note shows the restored text'); ok(not pg.is_visible('#histBox'),'list closes')
    ok(not errs,'no errors %s'%errs); b.close()
import sys; sys.exit(1 if fails else 0)
