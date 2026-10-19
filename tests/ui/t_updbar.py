from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch()
    for page_name in ('note.html','all.html'):
        q=b.new_page(viewport={'width':360,'height':440}); errs=[]; q.on('pageerror',lambda e:errs.append(str(e))); q.add_init_script(STUB)
        q.goto('file://'+ROOT+page_name); q.wait_for_timeout(500)
        ok(q.locator('#updbar').count()==0 or not q.is_visible('#updbar'),page_name+': no bar while there is no update')
        q.evaluate("__emitUpdate({state:'downloading',version:'1.14.9',pct:0})"); q.wait_for_timeout(80)
        ok(q.is_visible('#updbar .ub-track') and q.eval_on_selector('#updbar .ub-track','e=>e.classList.contains("indet")'),page_name+': neon bar moves while the size is not known yet')
        q.evaluate("__emitUpdate({state:'downloading',version:'1.14.9',pct:40})"); q.wait_for_timeout(400)
        ok('Downloading update 1.14.9' in q.inner_text('#updbar') and '40%' in q.inner_text('#updbar'),page_name+': shows progress (%s)'%q.inner_text('#updbar').replace('\n',' | '))
        w=q.eval_on_selector('#updbar .ub-fill','e=>e.getBoundingClientRect().width/e.parentElement.getBoundingClientRect().width')
        ok(0.35<w<0.45,page_name+': bar is 40%% full (%.2f)'%w)
        ok(q.eval_on_selector('#updbar .ub-track','e=>e.getAttribute("aria-valuenow")')=='40',page_name+': screen readers hear the progress')
        ok(not q.is_visible('#updbar .ub-go'),page_name+': no restart button until it is ready')
        if page_name=='note.html': q.screenshot(path=os.path.join(HERE,'out','updbar_neon.png'))
        q.click('#updbar .ub-x'); q.evaluate("__emitUpdate({state:'downloading',version:'1.14.9',pct:60})"); ok(not q.is_visible('#updbar'),page_name+': ✕ hides the download bar')
        q.evaluate("__emitUpdate({state:'ready',version:'1.14.9',pct:100})"); q.wait_for_timeout(100)
        ok(not q.is_visible('#updbar .ub-track'),page_name+': progress bar gone when ready')
        ok(q.is_visible('#updbar') and 'Update 1.14.9 is ready' in q.inner_text('#updbar') and 'Restart to update' in q.inner_text('#updbar'),page_name+': message appears (%s)'%q.inner_text('#updbar').replace('\n',' | '))
        q.click('#updbar .ub-x'); ok(not q.is_visible('#updbar'),page_name+': ✕ hides it')
        q.evaluate("__emitUpdate({state:'ready',version:'1.14.9',pct:100})"); ok(not q.is_visible('#updbar'),page_name+': stays hidden for the same version')
        q.evaluate("__emitUpdate({state:'ready',version:'1.15.0',pct:100})"); ok(q.is_visible('#updbar'),page_name+': a newer version shows it again')
        q.click('#updbar .ub-go'); q.wait_for_timeout(100); ok(['updateInstall'] in q.evaluate('__S.calls'),page_name+': button restarts to update')
        ok(not errs,page_name+': no errors %s'%errs); q.close()
    q=b.new_page(viewport={'width':360,'height':440}); q.add_init_script(STUB+";window.__S.updateNow={state:'ready',version:'2.0.0'}")
    q.goto('file://'+ROOT+'note.html'); q.wait_for_timeout(500); ok(q.is_visible('#updbar'),'a window opened after the update was downloaded shows it too')
    b.close()
print('FAILS:',fails); import sys; sys.exit(1 if fails else 0)
