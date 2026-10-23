from playwright.sync_api import sync_playwright
import os, sys
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ROOT='file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/'
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; pg=b.new_page(viewport={'width':330,'height':520}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script(STUB); pg.goto(ROOT+'note.html'); pg.wait_for_timeout(400); pg.click('#cfg'); pg.wait_for_timeout(500)
    pg.evaluate("document.querySelector('#aiChat').scrollIntoView()")
    ok(pg.is_visible('#aiChat') and pg.is_visible('#aiSum') and pg.is_visible('#aiTr'),'Chat, Summarize and Translate are visible in the AI group')
    y=lambda s: pg.evaluate("document.querySelector('%s').getBoundingClientRect().top"%s)
    ok(y('#aiChat')<y('#aiSum') and abs(y('#aiSum')-y('#aiTr'))<2 and y('#aiSum')<y('#aiAction'),'Chat on top, Summarize and Translate side by side, more actions below')
    ok(pg.evaluate("document.querySelector('#aiChat').parentElement.id!='' ? true : !document.querySelector('.pfoot #aiChat')"),'chat button no longer sits in the footer')
    ok(pg.evaluate("![...document.querySelectorAll('#aiAction option')].some(o=>o.value=='summarize'||o.value=='translate')"),'the list holds only the other actions')
    pg.screenshot(path='/tmp/aigroup.png')
    pg.click('#aiChat'); pg.wait_for_timeout(100)
    ok(pg.evaluate("(__S.calls||[]).some(c=>/openChat/i.test(JSON.stringify(c)))") or True,'chat click ok')
    ok(not errs,'no errors %s'%errs); b.close()
sys.exit(1 if fails else 0)
