from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(HERE,'out'); os.makedirs(OUT,exist_ok=True)
STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m); 
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(f,w=330,h=420):
        pg=b.new_page(viewport={'width':w,'height':h}); pg.errs=[]
        pg.on('pageerror',lambda e:pg.errs.append(str(e))); pg.add_init_script(STUB); pg.goto('file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/'+f); pg.wait_for_timeout(300); return pg
    pg=page('note.html'); ed=pg.locator('#ed'); ed.click(); pg.keyboard.press('End'); pg.keyboard.type(' more'); pg.wait_for_timeout(500)
    ok('more' in ed.inner_text(),'typing works'); pg.keyboard.press('Control+z'); pg.wait_for_timeout(100)
    pg.click('#chk'); pg.keyboard.type('item one'); pg.wait_for_timeout(300); ok(pg.locator('.todo').count()==1,'checklist item added')
    pg.keyboard.press('Control+Shift+C'); pg.keyboard.press('Backspace'); pg.keyboard.type('x')
    pg.click('#cfg') if pg.is_hidden('#panel') else None; pg.wait_for_timeout(80)
    for r in ['rowRem','rowFolder','rowLock','rowHist','rowOut']: pg.click('#%s > summary'%r); pg.wait_for_timeout(60); ok(pg.evaluate("[...document.querySelectorAll('#panel details.prow:not(.free)[open]')].map(d=>d.id)")==[r],'only %s is open'%r)
    ok(not pg.errs,'note: no errors %s'%pg.errs)
    h=pg.evaluate("document.querySelector('header').offsetHeight"); ok(h<=34,'header compact (%dpx)'%h)
    # panel fits in 330x420 note without horizontal overflow
    ok(pg.evaluate("document.querySelector('#panel').scrollWidth<=document.querySelector('#panel').clientWidth+1"),'panel has no horizontal overflow')
    pg.screenshot(path=os.path.join(OUT,'note_compact.png'))
    for f,w,h in [('all.html',420,600),('chat.html',380,600),('splash.html',400,300)]:
        pg=page(f,w,h); ok(not pg.errs,f+': no errors %s'%pg.errs)
    b.close()
print(fails)
