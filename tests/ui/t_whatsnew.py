from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch()
    q=b.new_page(viewport={'width':540,'height':620}); errs=[]; q.on('pageerror',lambda e:errs.append(str(e))); q.add_init_script(STUB)
    q.goto('file://'+ROOT+'whatsnew.html'); q.wait_for_timeout(400)
    ok('1.14.12' in q.inner_text('#sub'),'says which version you are on (%s)'%q.inner_text('#sub'))
    ok(q.locator('section').count()==2 and q.locator('li').count()==2,'one block per version, one card per change')
    ok(q.locator('.tag').count()==1 and q.inner_text('.tag')=='Latest','only the newest is marked Latest')
    ok(q.locator('li b').first.inner_text()=='One thing.' and q.locator('li code').count()==1 and q.locator('li i').count()==1,'**bold**, `code` and *italic* are formatted')
    ok(q.locator('li b').count()==1 and '<b>not html</b>' in q.locator('li').first.inner_text(),'html in the text is shown as text, never run')
    q.screenshot(path=os.path.join(HERE,'out','whatsnew.png'))
    q.check('#off'); q.click('#ok'); q.wait_for_timeout(100)
    ok(q.evaluate("__S.calls.some(c=>c[0]==='whatsNewClose'&&c[1].off===true)"),'Got it closes and sends the "do not show" choice')
    q2=b.new_page(viewport={'width':540,'height':620}); q2.add_init_script(STUB); q2.add_init_script("window.__S.whats={version:'1.14.12',off:false,sections:[]}")
    q2.goto('file://'+ROOT+'whatsnew.html'); q2.wait_for_timeout(300)
    ok('Nothing to show' in q2.inner_text('#list'),'empty list says so')
    q2.keyboard.press('Escape'); q2.wait_for_timeout(100); ok(q2.evaluate("__S.calls.some(c=>c[0]==='whatsNewClose')"),'Escape closes it')
    ok(not errs,'no script errors %s'%errs)
    b.close()
import sys; sys.exit(1 if fails else 0)
