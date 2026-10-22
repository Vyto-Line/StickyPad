import sys, os
HERE=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read(); OUT=os.path.join(HERE,'out'); os.makedirs(OUT,exist_ok=True)
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ALL="window.__S.all={emoji:'',greeting:'Hi',groups:[],trash:[],prefs:{},notes:[{id:'a',title:'Alpha',text:'one',color:'#FFF2A8',font:'Segoe UI',open:true},{id:'b',title:'Beta',text:'two',color:'#CDEBFF',font:'Segoe UI',open:true},{id:'c',title:'Gamma',text:'three',color:'#FFD6E0',font:'Segoe UI',open:true},{id:'d',title:'Secret',text:'',locked:true,color:'#EEE',font:'Segoe UI',open:true}]};"
def calls(pg,name): return [c for c in pg.evaluate('__S.calls') if c[0]==name]
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    pg=b.new_page(viewport={'width':980,'height':680}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script('try{localStorage.clear()}catch(e){}'+STUB+';'+ALL); pg.goto('file://'+ROOT+'all.html'); pg.wait_for_timeout(400)
    ok(not pg.is_visible('#printBar'),'the print bar is hidden at first')
    pg.click('#selectBtn'); pg.wait_for_timeout(100)
    ok(pg.is_visible('#printBar') and pg.is_disabled('#printGo'),'select mode: bar shown, Print needs a note')
    pg.click('.card >> text=Gamma'); pg.click('.card >> text=Alpha'); pg.click('.card >> text=Secret'); pg.wait_for_timeout(100)
    nums=pg.eval_on_selector_all('.card.picked','els=>els.map(e=>e.querySelector(".t").textContent+":"+e.querySelector(".pick").textContent)')
    ok(nums==['Alpha:2','Gamma:1'],'numbers follow the order chosen %s'%nums)
    ok(not calls(pg,'allShow'),'in select mode a click does not open the note')
    ok('2 notes' in pg.inner_text('#selInfo'),'count shown: %s'%pg.inner_text('#selInfo'))
    pg.click('.card >> text=Alpha'); pg.click('.card >> text=Alpha'); pg.wait_for_timeout(100)
    pg.screenshot(path=os.path.join(OUT,'print_select.png'))
    pg.click('#printGo'); pg.wait_for_timeout(300)
    ok([c[1] for c in calls(pg,'allPrint')]==[['c','a']],'sends the notes in the chosen order: %s'%calls(pg,'allPrint'))
    ok(not pg.is_visible('#printBar') and pg.locator('.card.picked').count()==0,'select mode ends after printing')
    pg.click('#selectBtn'); pg.click('.card >> text=Beta'); pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    ok(not pg.is_visible('#printBar') and pg.locator('.card.picked').count()==0,'Esc leaves select mode and forgets the choice')
    pg.evaluate("window.__PRINT=()=>({ok:false,error:'Locked and empty notes cannot be printed.'})")
    pg.click('#selectBtn'); pg.click('.card >> text=Beta'); pg.click('#printGo'); pg.wait_for_timeout(300)
    ok('cannot be printed' in pg.inner_text('#selInfo') and pg.is_visible('#printBar'),'a refusal is shown and the choice stays')
    ok(not errs,'no page errors %s'%errs)
print('FAILS:',fails); sys.exit(1 if fails else 0)
