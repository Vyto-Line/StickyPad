from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch()
    q=b.new_page(viewport={'width':660,'height':470}); errs=[]; q.on('pageerror',lambda e:errs.append(str(e))); q.add_init_script(STUB)
    q.goto('file://'+ROOT+'note.html'); q.wait_for_timeout(500); q.click('#cfg'); q.wait_for_timeout(300)
    ok(q.is_visible('#opac'),'the Transparency bar is in the Look section')
    ok(q.input_value('#opac')=='0' and q.inner_text('#opacLabel')=='0%','starts solid (0%)')
    q.evaluate("(()=>{const e=document.querySelector('#opac');e.value=40;e.dispatchEvent(new Event('input',{bubbles:true}))})()"); q.wait_for_timeout(100)
    ok(q.evaluate("__S.calls.some(c=>c[0]==='update'&&Math.abs(c[1].opacity-0.6)<1e-9)"),'moving the bar sends opacity 0.6 (40% transparent)')
    ok(q.inner_text('#opacLabel')=='40%','label shows 40%')
    ok(q.eval_on_selector('#panel','e=>e.scrollWidth<=e.clientWidth+1'),'panel has no sideways scroll')
    q.screenshot(path=os.path.join(HERE,'out','opacity.png'))
    q2=b.new_page(viewport={'width':660,'height':470}); q2.on('pageerror',lambda e:errs.append(str(e))); q2.add_init_script(STUB+";window.__S.note.opacity=0.7;")
    q2.goto('file://'+ROOT+'note.html'); q2.wait_for_timeout(500); q2.click('#cfg'); q2.wait_for_timeout(300)
    ok(q2.input_value('#opac')=='30' and q2.inner_text('#opacLabel')=='30%','a saved note shows its saved transparency')
    ok(not errs,'no script errors %s'%errs); b.close()
import sys; sys.exit(1 if fails else 0)
