from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    q=b.new_page(viewport={'width':660,'height':470}); q.on('pageerror',lambda e:errs.append(str(e))); q.add_init_script(STUB)
    q.goto('file://'+ROOT+'note.html'); q.wait_for_timeout(400)
    ok(q.get_attribute('#cfg','aria-label')=='This note' and 'This note' in q.get_attribute('#cfg','title'),'title-bar button is "This note", not a gear')
    ok(q.locator('#cfg svg circle').count()==2 and q.locator('#cfg svg path').count()==1,'it shows the sliders icon (two knobs)')
    ok(q.is_visible('#allTop') and q.get_attribute('#allTop','aria-label')=='Home' and q.evaluate("document.querySelector('header .ib').id")=='allTop','a Home button is visible, first in the title bar')
    q.click('#allTop'); q.wait_for_timeout(100); ok(['openAll'] in q.evaluate('__S.calls'),'the Home button opens the Home window')
    q.set_viewport_size({'width':260,'height':300}); q.wait_for_timeout(150)
    ok(q.evaluate("(()=>{const h=document.querySelector('header');return h.scrollWidth<=h.clientWidth+1})()"),'at the smallest note width the title bar still fits')
    q.set_viewport_size({'width':660,'height':470}); q.wait_for_timeout(150)
    q.click('#cfg'); q.wait_for_timeout(300)
    ok(q.locator('#tabSettings').count()==0 and q.locator('.ph .tabgear').count()==0,'the second gear inside the panel is gone')
    q.evaluate("document.getElementById('allSet').scrollIntoView()"); 
    ok(q.is_visible('#allSet') and q.inner_text('#allSet').startswith('All settings'),'"All settings…" is in the panel footer')
    ok(q.eval_on_selector('.pfoot','e=>e.scrollWidth<=e.clientWidth+1'),'the three footer links fit (they wrap instead of being cut off)')
    q.click('#allSet'); ok(['openSettings',None] in q.evaluate('__S.calls'),'it opens Settings')
    q.screenshot(path=os.path.join(HERE,'out','gear_footer.png'))
    q2=b.new_page(viewport={'width':360,'height':440}); q2.on('pageerror',lambda e:errs.append(str(e))); q2.add_init_script(STUB+";window.__S.updateNow={state:'ready',version:'1.14.17'}")
    q2.goto('file://'+ROOT+'note.html'); q2.wait_for_timeout(600)
    bg=q2.eval_on_selector('#updbar .ub-go','e=>getComputedStyle(e).backgroundImage')
    ok('linear-gradient' in bg and 'rgb(255, 43, 214)' in bg and 'rgb(0, 229, 255)' in bg,'the Restart to update button is a pink-purple-cyan gradient, not yellow')
    q2.screenshot(path=os.path.join(HERE,'out','upd_colour.png'))
    ok(not errs,'no script errors %s'%errs); b.close()
import sys; sys.exit(1 if fails else 0)
