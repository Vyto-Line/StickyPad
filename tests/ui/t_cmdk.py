import sys, os
HERE=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(HERE,'out'); os.makedirs(OUT,exist_ok=True)
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read()
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
RES="""window.__RESULTS = q => q.trim().startsWith('>') || /dark/i.test(q) ? [{cmd:'dark',title:[{t:'Dark mode',h:false}],snippet:[{t:'Switch the look to dark',h:false}]}].concat(/dark/i.test(q)?[{id:'a',title:[{t:'Dark ',h:false},{t:'dark',h:true}],snippet:[],color:'#fff',folder:'',locked:false,pinned:false,updated:Date.now()}]:[]) : [];"""
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(f,init=''):
        pg=b.new_page(viewport={'width':700,'height':500}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.add_init_script(STUB); pg.add_init_script(init); pg.goto('file://'+ROOT+f); pg.wait_for_timeout(400); pg.errs=errs; return pg
    c=lambda pg,n: pg.evaluate("__S.calls.filter(c=>c[0]=='%s')"%n)
    pg=page('quick.html',RES); pg.fill('#q','dark'); pg.wait_for_timeout(300)
    rows=pg.locator('.r'); ok(rows.count()==2 and 'Dark mode' in rows.nth(0).inner_text() and 'action' in rows.nth(0).inner_text(),'an action is listed first, marked as an action')
    ok(pg.inner_text('#count')=='1 note','the count counts notes only (%s)'%pg.inner_text('#count'))
    pg.screenshot(path=os.path.join(OUT,'cmdk.png'))
    pg.keyboard.press('Enter'); pg.wait_for_timeout(100); ok(c(pg,'searchRun')==[['searchRun','dark']],'Enter runs the action')
    pg.fill('#q','>'); pg.wait_for_timeout(300); ok(pg.locator('.r').count()==1,'">" lists actions')
    pg.locator('.r').first.click(); pg.wait_for_timeout(100); ok(len(c(pg,'searchRun'))==2,'clicking runs it too')
    pg.fill('#q','>zzz'); pg.wait_for_timeout(300)
    pg.screenshot(path=os.path.join(OUT,'cmdk2.png'))
    ok(not pg.errs,'no errors (%s)'%pg.errs)
    for f in ('note.html','all.html','settings.html','chat.html'):
        q=page(f); q.keyboard.press('Control+k'); q.wait_for_timeout(100); ok(len(c(q,'searchOpen'))==1,f+': Ctrl+K opens the search window')
    b.close()
print('FAILED: %s'%fails if fails else 'ALL PASS'); sys.exit(1 if fails else 0)
