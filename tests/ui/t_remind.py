from playwright.sync_api import sync_playwright
import os, time
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':330,'height':420}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.add_init_script(STUB)
    pg.goto('file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/note.html'); pg.wait_for_timeout(300)
    pg.click('#cfg'); pg.click('[data-tab=note]')
    ok(not pg.is_visible('#remClear'),'no Clear button before a reminder is set')
    box0=pg.evaluate("(()=>{const r=document.getElementById('remAt').getBoundingClientRect();return [r.x,r.width]})()")
    pg.click('.rq[data-q=h1]'); pg.wait_for_timeout(200)
    box1=pg.evaluate("(()=>{const r=document.getElementById('remAt').getBoundingClientRect();return [r.x,r.width]})()")
    ok(box0==box1,'time field stays put when a reminder is set %s %s'%(box0,box1))
    calls=pg.evaluate('window.__S.calls.filter(c=>c[0]=="remind")'); ok(len(calls)==1 and calls[0][1]>time.time()*1000+3000000,'1 hour reminder sent')
    ok('Reminder:' in pg.inner_text('#remMsg'),'message shows the time (%s)'%pg.inner_text('#remMsg'))
    ok(pg.is_visible('#remClear'),'Clear button appears'); ok(pg.evaluate("document.body.classList.contains('hasRemind')"),'bell dot class set')
    pg.click('#remClear'); pg.wait_for_timeout(200)
    ok(pg.evaluate('window.__S.calls.filter(c=>c[0]=="remind").pop()[1]')==0,'Clear sends 0'); ok(not pg.evaluate("document.body.classList.contains('hasRemind')"),'dot gone')
    pg.fill('#remAt','2001-01-01T10:00'); pg.dispatch_event('#remAt','change'); pg.wait_for_timeout(100)
    ok('future' in pg.inner_text('#remMsg'),'past time is rejected')
    ok(not errs,'no errors %s'%errs); b.close()
import sys; sys.exit(1 if fails else 0)
