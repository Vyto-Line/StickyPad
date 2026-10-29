from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ROOT='file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/'
INIT=STUB+";window.__ev=[];window.api.dragStart=async()=>{__ev.push('start')};window.api.dragEnd=async()=>{__ev.push('end')};window.api.roll=async v=>{__ev.push('roll'+v);return v};"
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    pg=b.new_page(viewport={'width':360,'height':320}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script(INIT); pg.goto(ROOT+'note.html'); pg.wait_for_timeout(400)
    ok(pg.evaluate("getComputedStyle(document.querySelector('header')).getPropertyValue('-webkit-app-region')")!='drag','the bar is a normal page area (the page sees its clicks)')
    box=pg.locator('.dragfill').bounding_box(); x=box['x']+box['width']/2; y=box['y']+box['height']/2
    pg.mouse.click(x,y); pg.wait_for_timeout(50)
    ok(pg.evaluate('__ev')==[],'one click does nothing')
    pg.mouse.dblclick(x,y); pg.wait_for_timeout(100)
    ok(pg.evaluate('__ev')==['rolltrue'],'double-click rolls up')
    pg.mouse.dblclick(x,y); pg.wait_for_timeout(100)
    ok(pg.evaluate('__ev')==['rolltrue','rollfalse'],'and down again')
    pg.evaluate('__ev.length=0')
    pg.mouse.move(x,y); pg.mouse.down(); pg.mouse.move(x+30,y+10); pg.mouse.move(x+60,y+20); pg.mouse.up(); pg.wait_for_timeout(100)
    ok(pg.evaluate('__ev')==['start','end'],'a drag starts and ends the move')
    pg.evaluate('__ev.length=0'); pg.click('#pin'); pg.wait_for_timeout(50)
    ok(pg.evaluate('__ev')==[],'buttons do not start a drag')
    ok(not errs,'no page errors '+str(errs))
    b.close()
raise SystemExit(1 if fails else 0)
