from playwright.sync_api import sync_playwright
import os, sys, json
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ROOT='file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/'
RES=[{'id':'a','title':[{'t':'Groceries','h':False}],'snippet':[{'t':'Dinner · ☑ Tomatoes · ☐ Olive oil · ☐ Print ','h':False},{'t':'tickets','h':True}],'color':'#FFF2A8','updated':0,'folder':''}]
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; pg=b.new_page(viewport={'width':640,'height':330}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script(STUB+"window.api.searchQuery=async()=>"+json.dumps(RES)+";"); pg.goto(ROOT+'quick.html'); pg.wait_for_timeout(500)
    txt=pg.inner_text('.r .s')
    ok('☑' not in txt and '☐' not in txt,'no box characters are shown in a result (%r)'%txt)
    ok(pg.locator('.r .s .cb').count()==3 and pg.locator('.r .s .cb.done').count()==1,'one ticked and two empty circles are drawn')
    ok('Tomatoes' in txt and 'Olive oil' in txt and 'tickets' in txt,'the words are still there')
    ok(pg.eval_on_selector('.r .s mark','e=>e.textContent')=='tickets','the matched word is still marked')
    ok(pg.eval_on_selector_all('.r .s .cb','e=>e.map(x=>x.getAttribute("aria-label"))')==['done','to do','to do'],'screen readers hear "done" or "to do"')
    ok(not errs,'no errors %s'%errs); b.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
