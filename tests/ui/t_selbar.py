import sys, os, json, subprocess
HERE=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read(); OUT=os.path.join(HERE,'out'); os.makedirs(OUT,exist_ok=True)
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
UT=subprocess.check_output(['node','-e',"const T=require('./themes');console.log(JSON.stringify({id:'classic',dark:false,vars:T.vars('classic',false),palette:T.palette('classic',false,'standard'),names:T.paletteNames('classic','standard'),paletteId:'standard',paletteName:'Standard',palettes:[],mine:[]}))"],cwd=ROOT).decode()
notes=",".join("{id:'%s',title:'%s',text:'x',color:'#FFF2A8',font:'Segoe UI',open:%s%s}"%(i,t,'true' if i!='c' else 'false',",locked:true" if i=='e' else "") for i,t in [('a','Alpha'),('b','Beta'),('c','Gamma'),('d','Delta'),('e','Secret')])
trash=",".join("{id:'t%s',title:'Old %s',text:'y',color:'#FFD6E0',font:'Segoe UI',deletedAt:%d,images:0}"%(i,i,1700000000000+i) for i in range(3))
ALL="window.__S.all={emoji:'',greeting:'Hi',groups:[{id:'g1',name:'Home'}],trash:[%s],prefs:{},notes:[%s]};window.__S.uiTheme=%s;"%(trash,notes,UT)
def calls(pg,n): return [c for c in pg.evaluate('__S.calls') if c[0]==n]
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    pg=b.new_page(viewport={'width':1000,'height':680}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script('try{localStorage.clear()}catch(e){}'+STUB+';'+ALL); pg.goto('file://'+ROOT+'all.html'); pg.wait_for_timeout(500)
    ok(not pg.is_visible('#selBar'),'no action bar before Select')
    pg.click('#selectBtn'); pg.wait_for_timeout(100)
    ok(pg.is_visible('#selBar') and pg.is_visible('#selAll') and pg.is_visible('#selDone'),'bar at the bottom, Select all and Cancel at the top')
    ok(not pg.is_visible('#selFolder') or pg.is_disabled('#selFolder'),'actions wait for a choice')
    labels=pg.eval_on_selector_all('#selBar .fb span','els=>els.map(e=>e.textContent)'); ok(labels==['Print','Export','Colour','Folder','More','Trash'],'buttons: %s'%labels)
    pg.click('.card >> text=Alpha'); pg.click('.card >> text=Beta'); pg.click('.card >> text=Secret'); pg.wait_for_timeout(100)
    ok(pg.inner_text('#selN')=='3 chosen','"3 chosen" in the bar')
    pg.click('#selColour'); pg.wait_for_timeout(100)
    sw=pg.locator('#selPop .sws button'); ok(sw.count()==8 and sw.nth(1).get_attribute('title')=='Pink','Colour menu: palette swatches with names (%d)'%sw.count())
    pg.screenshot(path=os.path.join(OUT,'selbar.png'))
    sw.nth(1).click(); pg.wait_for_timeout(300)
    bc=calls(pg,'allBulk'); ok(bc and bc[-1][1]=='colour' and bc[-1][2]==['a','b','e'] and bc[-1][3].lower()=='#ffc2d9','recolours the chosen notes %s'%bc[-1:])
    ok(pg.is_visible('#selBar') and pg.inner_text('#selN')=='3 chosen','the choice stays after recolouring')
    pg.click('#selMore'); pg.wait_for_timeout(100)
    ok(pg.eval_on_selector_all('#selPop .mi','els=>els.map(e=>e.textContent)')==['Open','Close','Pin on top'],'More menu (nothing is pinned, so no Unpin)')
    pg.click('#selPop .mi >> text=Pin'); pg.wait_for_timeout(300); ok(calls(pg,'allBulk')[-1][1]=='pin','Pin sends pin')
    pg.click('#selMore'); pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    ok(not pg.is_visible('#selPop') and pg.is_visible('#selBar'),'Esc closes the menu first, not select mode')
    pg.click('#selExport'); pg.wait_for_timeout(300); ok(calls(pg,'allBulk')[-1][1]=='export','Export sends export')
    # drag chosen notes together onto a folder chip
    pg.evaluate("window.__S.all.groups=[{id:'g1',name:'Home'}]"); 
    pg.click('#selAll'); pg.wait_for_timeout(100)
    pg.drag_and_drop('.card >> text=Alpha','.fchip >> text=Home') if pg.locator('.fchip').count() else None
    pg.wait_for_timeout(400)
    gm=[c[1:] for c in calls(pg,'grpMove')]
    ok(len(gm)==5 and all(x[1]=='g1' for x in gm),'dragging one chosen note moves all five %s'%gm)
    # trash tab
    pg.click('.hitem[data-go="trash"]'); pg.wait_for_timeout(150)
    ok(not pg.is_visible('#selBar'),'bar is gone in the Trash tab until Select')
    pg.click('#trashSelect'); pg.wait_for_timeout(100)
    ok(pg.is_visible('#tselBar') and pg.is_disabled('#tselRestore'),'trash bar: actions wait for a choice')
    pg.click('#selAll'); pg.wait_for_timeout(100); ok(pg.inner_text('#tselN')=='3 chosen','Select all in the trash')
    pg.screenshot(path=os.path.join(OUT,'selbar_trash.png'))
    pg.click('#tselRestore'); pg.wait_for_timeout(300)
    tb=calls(pg,'trashBulk'); ok(tb and tb[-1][1]=='restore' and tb[-1][2]==['t0','t1','t2'],'Restore sends the chosen notes %s'%tb)
    pg.click('#trashSelect'); pg.click('.item >> nth=0'); pg.wait_for_timeout(100)
    pg.click('#tselPurge'); pg.wait_for_timeout(100); ok(len(calls(pg,'trashBulk'))==1,'Delete forever asks first')
    pg.click('#tselPurge'); pg.wait_for_timeout(300); ok(calls(pg,'trashBulk')[-1][1]=='purge','second click deletes')
    ok(not errs,'no page errors %s'%errs)
print('FAILS:',fails); sys.exit(1 if fails else 0)
