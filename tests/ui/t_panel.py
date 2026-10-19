from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
def box(q,sel): return q.evaluate("(s)=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom,r:r.right}}",sel)
with sync_playwright() as p:
    b=p.chromium.launch()
    for name,w,h in (('narrow',320,340),('wide',900,480),('tall narrow',300,600)):
        q=b.new_page(viewport={'width':w,'height':h}); errs=[]; q.on('pageerror',lambda e:errs.append(str(e)))
        q.add_init_script("window.__BLOCKS=[{t:'text',v:'hello world'}];"+STUB); q.goto('file://'+ROOT+'note.html'); q.wait_for_timeout(300)
        q.click('#cfg'); q.click('[data-tab=ai]'); q.wait_for_timeout(200)
        pn,ed=box(q,'#panel'),box(q,'#ed')
        overlap=not (ed['r']<=pn['x']+1 or pn['r']<=ed['x']+1 or ed['b']<=pn['y']+1 or pn['b']<=ed['y']+1)
        ok(not overlap,name+': the panel does not cover the note (panel %s, note %s)'%({k:round(v) for k,v in pn.items()},{k:round(v) for k,v in ed.items()}))
        ok(ed['h']>=90 and ed['w']>=200,name+': the note keeps a usable size (%dx%d)'%(ed['w'],ed['h']))
        if name=='wide':
            q.click('#ed'); q.wait_for_timeout(100); ok(q.is_visible('#panel'),'wide: clicking in the note keeps the panel open')
        elif name=='narrow':
            q.click('#ed'); q.wait_for_timeout(100); ok(not q.is_visible('#panel'),'narrow: clicking in the note closes the panel')
        ok(not errs,name+': no errors %s'%errs); q.close()
    b.close()
print('FAILS:',fails); import sys; sys.exit(1 if fails else 0)
