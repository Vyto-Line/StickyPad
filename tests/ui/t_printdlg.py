import sys, os
HERE=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read(); OUT=os.path.join(HERE,'out'); os.makedirs(OUT,exist_ok=True)
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
def calls(pg,n): return [c for c in pg.evaluate('__S.calls') if c[0]==n]
def checked(pg,n): return pg.eval_on_selector('input[name=%s]:checked'%n,'e=>e.value')
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    # one note: saved choices are shown, multi-note layouts are hidden
    pg=b.new_page(viewport={'width':520,'height':700}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script(STUB); pg.goto('file://'+ROOT+'printdlg.html'); pg.wait_for_timeout(500)
    ok('Print this note' in pg.inner_text('#head'),'one note: heading')
    ok(checked(pg,'style')=='box' and checked(pg,'layout')=='actual' and checked(pg,'size')=='normal','saved choices are selected')
    ok(not pg.is_visible('label[data-l=cols2]') and not pg.is_visible('label[data-l=page]') and pg.is_visible('label[data-l=actual]'),'one note: only real size and full width')
    ok(len(calls(pg,'printPreview'))>=1,'a preview was asked for')
    n=len(calls(pg,'printPreview')); pg.check('input[name=style][value=sticky]'); pg.wait_for_timeout(300)
    ok(len(calls(pg,'printPreview'))>n and calls(pg,'printPreview')[-1][1]['style']=='sticky','changing a choice refreshes the preview')
    pg.check('input[name=size][value=large]'); pg.uncheck('#inPics'); pg.check('input[name=layout][value=flow]')
    pg.screenshot(path=os.path.join(OUT,'printdlg_one.png'))
    pg.click('#go'); pg.wait_for_timeout(300)
    ok(calls(pg,'printGo')[-1][1]=={'style':'sticky','layout':'flow','size':'large','title':True,'pictures':False},'Print sends exactly what is chosen: %s'%calls(pg,'printGo')[-1])
    pg.evaluate("window.__PGO=()=>({ok:false,error:'Printing did not start.'})"); pg.click('#go'); pg.wait_for_timeout(300)
    ok('did not start' in pg.inner_text('#msg'),'an error is shown in the window')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100); ok(len(calls(pg,'printClose'))==1,'Esc closes the window')
    pg.click('#cancel'); pg.wait_for_timeout(100); ok(len(calls(pg,'printClose'))==2,'Cancel closes the window')
    # several notes
    pg2=b.new_page(viewport={'width':520,'height':700}); pg2.on('pageerror',lambda e:errs.append(str(e)))
    pg2.add_init_script("window.__PINFO={count:3,skipped:1,many:true,titles:['A','B','C'],opts:{style:'plain',layout:'cols2',size:'small',title:true,pictures:true}};"+STUB)
    pg2.goto('file://'+ROOT+'printdlg.html'); pg2.wait_for_timeout(500)
    ok('Print 3 notes' in pg2.inner_text('#head') and '1 locked or empty skipped' in pg2.inner_text('#what'),'several: heading and skipped count')
    ok(pg2.is_visible('label[data-l=cols3]') and pg2.is_visible('label[data-l=page]') and checked(pg2,'layout')=='cols2','several: all layouts, saved one chosen')
    pg2.screenshot(path=os.path.join(OUT,'printdlg_many.png'))
    ok(not errs,'no page errors %s'%errs)
print('FAILS:',fails); sys.exit(1 if fails else 0)
