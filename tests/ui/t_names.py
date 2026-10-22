from playwright.sync_api import sync_playwright
import os, sys
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ROOT='file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/'
JS="()=>[...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(e=>!(e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||(e.labels&&e.labels.length)||e.placeholder||e.title)).map(e=>e.tagName+'#'+e.id)"
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    for f in ('settings.html','all.html','chat.html','note.html','printdlg.html','quick.html'):
        pg=b.new_page(viewport={'width':900,'height':700}); pg.on('pageerror',lambda e:errs.append(str(e))); pg.add_init_script(STUB)
        pg.goto(ROOT+f); pg.wait_for_timeout(400); bad=pg.evaluate(JS); ok(not bad,f+': every field has a name %s'%bad); pg.close()
    pg=b.new_page(viewport={'width':900,'height':700}); pg.add_init_script(STUB); pg.goto(ROOT+'settings.html'); pg.wait_for_timeout(400)
    ok(pg.evaluate("document.querySelector('#snap').getAttribute('aria-labelledby')&&document.getElementById(document.querySelector('#snap').getAttribute('aria-labelledby')).textContent")=='Snap to edges and other notes','a switch is named by its row title')
    ok(bool(pg.evaluate("document.querySelector('#snap').getAttribute('aria-describedby')")),'and described by the grey text')
    ok(not errs,'no errors %s'%errs); b.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
