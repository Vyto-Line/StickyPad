import sys, os
HERE=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read(); OUT=os.path.join(HERE,'out'); os.makedirs(OUT,exist_ok=True)
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ALL="window.__S.all={emoji:'',greeting:'Hi',groups:[{id:'g1',name:'Home'}],trash:[],prefs:{},notes:["+",".join("{id:'%s',title:'%s',text:'x',color:'#FFF2A8',font:'Segoe UI',open:true%s}"%(i,t,",locked:true" if i=='e' else "") for i,t in [('a','Alpha'),('b','Beta'),('c','Gamma'),('d','Delta'),('e','Secret')])+"]};"
def calls(pg,n): return [c for c in pg.evaluate('__S.calls') if c[0]==n]
def picked(pg): return pg.eval_on_selector_all('.card.picked','els=>els.map(e=>e.dataset.id)')
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    pg=b.new_page(viewport={'width':1000,'height':680}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script('try{localStorage.clear()}catch(e){}'+STUB+';'+ALL); pg.goto('file://'+ROOT+'all.html'); pg.wait_for_timeout(400)
    ok(pg.inner_text('#selectBtn')=='Select','the button is called Select')
    pg.click('#selectBtn'); pg.wait_for_timeout(100)
    ok(pg.is_disabled('#selTrash') and pg.is_disabled('#selFolder') and pg.is_disabled('#printGo'),'actions wait for a choice')
    pg.click('.card >> text=Alpha'); pg.keyboard.down('Shift'); pg.click('.card >> text=Gamma'); pg.keyboard.up('Shift'); pg.wait_for_timeout(100)
    ok(picked(pg)==['a','b','c'],'Shift+click chooses the range %s'%picked(pg))
    pg.keyboard.press('Control+a'); pg.wait_for_timeout(100)
    ok(sorted(picked(pg))==['a','b','c','d','e'],'Ctrl+A chooses every note shown %s'%picked(pg))
    nums=pg.eval_on_selector_all('.card.picked .pick','els=>els.map(e=>e.textContent)')
    ok(nums==['1','2','3','4','5'],'numbers stay in the order chosen %s'%nums)
    pg.click('#selDone'); pg.wait_for_timeout(100); ok(picked(pg)==[] and not pg.is_visible('#printBar'),'Cancel leaves select mode')
    # move to folder (a locked note can be moved)
    pg.click('#selectBtn'); pg.click('.card >> text=Beta'); pg.click('.card >> text=Secret'); pg.wait_for_timeout(100)
    opts=pg.eval_on_selector_all('#selFolder option','els=>els.map(e=>e.textContent)')
    ok(opts==['Move to folder…','No folder','📁 Home'],'folder list %s'%opts)
    pg.select_option('#selFolder','g1'); pg.wait_for_timeout(400)
    gm=[c[1:] for c in calls(pg,'grpMove')]
    ok(gm==[['b','g1'],['e','g1']],'both notes are moved to the folder %s'%gm)
    ok(not pg.is_visible('#printBar'),'select mode ends after moving')
    # trash needs two clicks
    pg.click('#selectBtn'); pg.click('.card >> text=Alpha'); pg.click('.card >> text=Delta'); pg.wait_for_timeout(100)
    pg.click('#selTrash'); pg.wait_for_timeout(100)
    ok(not calls(pg,'allTrash') and 'Sure' in pg.inner_text('#selTrash'),'the first click only asks')
    pg.click('#selTrash'); pg.wait_for_timeout(400)
    ok([c[1] for c in calls(pg,'allTrash')]==['a','d'],'the second click moves them to the trash %s'%calls(pg,'allTrash'))
    ok(not pg.is_visible('#printBar'),'select mode ends after trashing')
    pg.screenshot(path=os.path.join(OUT,'select_bar.png'))
    ok(not errs,'no page errors %s'%errs)
print('FAILS:',fails); sys.exit(1 if fails else 0)
