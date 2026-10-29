from playwright.sync_api import sync_playwright
import os, sys
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ROOT='file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/'
INIT=STUB+";window.api.onRolled=cb=>{window.__rolled=cb};window.api.onArmDbl=cb=>{window.__arm=cb};window.__rolls=[];window.api.roll=async v=>{window.__rolls.push(v);return v};"
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    pg=b.new_page(viewport={'width':360,'height':320}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script(INIT); pg.goto(ROOT+'note.html'); pg.wait_for_timeout(400)
    box=pg.locator('.dragfill').bounding_box(); x=box['x']+box['width']/2; y=box['y']+box['height']/2
    pg.mouse.click(x,y); pg.wait_for_timeout(50)
    ok(pg.evaluate('__rolls.length')==0,'a click on the title bar alone does nothing')
    ok(pg.evaluate("getComputedStyle(document.querySelector('header')).getPropertyValue('-webkit-app-region')")=='drag','the title bar is a drag area as usual')
    pg.evaluate('__arm()'); pg.wait_for_timeout(50)
    ok(pg.evaluate("document.body.classList.contains('dblarm')"),'after the first click the app says "get ready"')
    ok(pg.evaluate("getComputedStyle(document.querySelector('header')).getPropertyValue('-webkit-app-region')")=='no-drag','the bar stops being a drag area for a moment, so the second click is seen')
    pg.mouse.click(x,y); pg.wait_for_timeout(100)
    ok(pg.evaluate('__rolls')==[True],'the second click rolls the note up')
    ok(not pg.evaluate("document.body.classList.contains('dblarm')"),'and it is not armed any more')
    # a press on a button during the armed moment does not roll
    pg.evaluate('__arm()'); pg.wait_for_timeout(30)
    pg.click('#pin'); pg.wait_for_timeout(50)
    ok(pg.evaluate('__rolls')==[True],'clicking a button while armed does not roll')
    # not clicked again: it goes back to a drag area by itself
    pg.wait_for_timeout(600)
    ok(not pg.evaluate("document.body.classList.contains('dblarm')"),'after half a second it is a drag area again')
    ok(pg.evaluate("getComputedStyle(document.querySelector('header')).getPropertyValue('-webkit-app-region')")=='drag','so dragging works again')
    ok(not errs,'no page errors: %s'%errs)
    b.close()
print('FAILED' if fails else 'ALL PASSED'); sys.exit(1 if fails else 0)
