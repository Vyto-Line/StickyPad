import sys, os
HERE=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read(); OUT=os.path.join(HERE,'out'); os.makedirs(OUT,exist_ok=True)
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
# slot colours: yellow 0, pink 1, blue 2, green 3
N=[('a','banana','#FFF2A8',False,False,50),('b','Apple','#CDEFFF',True,False,40),('c','cherry','#FFD6E0',False,True,30),('d','Date 10','#D4F5C4',True,False,20),('e','Date 9','#FFF2A8',False,False,10)]
notes=",".join("{id:'%s',title:'%s',text:'x',color:'%s',font:'Segoe UI',open:%s,pinned:%s,updated:%d}"%(i,t,c,str(o).lower(),str(pn).lower(),u) for i,t,c,o,pn,u in N)
ALL="window.__S.all={emoji:'',greeting:'Hi',groups:[],trash:[],prefs:{},notes:[%s]};"%notes
def order(pg): return pg.eval_on_selector_all('#sections .card','els=>els.map(e=>e.dataset.id)')
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    pg=b.new_page(viewport={'width':1000,'height':680}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script('try{if(!sessionStorage.getItem("x")){localStorage.clear();sessionStorage.setItem("x","1")}}catch(e){}'+STUB+';'+ALL); pg.goto('file://'+ROOT+'all.html'); pg.wait_for_timeout(500)
    ok(pg.inner_text('#sortLbl')=='Last edited','the button shows the current choice')
    ok(order(pg)==['c','a','b','d','e'],'default: pinned first, then last edited %s'%order(pg))
    pg.click('#sortBtn'); pg.wait_for_timeout(100)
    ok(pg.eval_on_selector_all('#sortMenu button','els=>els.map(e=>e.textContent)')==['✓Last edited','A to Z','Z to A','Colour','Open first'],'menu with a tick on the current choice')
    ok('Pinned notes always stay first' in pg.inner_text('#sortMenu'),'the pinned note is explained')
    pg.screenshot(path=os.path.join(OUT,'sortmenu.png'))
    pg.click('#sortMenu button >> text=A to Z'); pg.wait_for_timeout(100)
    ok(order(pg)==['c','b','a','e','d'],'A to Z (numbers in order: Date 9 before Date 10), pinned first %s'%order(pg))
    ok(pg.inner_text('#sortLbl')=='A to Z' and not pg.is_visible('#sortMenu'),'label changes and the menu closes')
    pg.click('#sortBtn'); pg.click('#sortMenu button >> text=Z to A'); pg.wait_for_timeout(100)
    ok(order(pg)==['c','d','e','a','b'],'Z to A %s'%order(pg))
    pg.click('#sortBtn'); pg.click('#sortMenu button >> text=Colour'); pg.wait_for_timeout(100)
    ok(order(pg)==['c','a','e','b','d'],'Colour: yellow, blue, green in palette order %s'%order(pg))
    pg.click('#sortBtn'); pg.click('#sortMenu button >> text=Open first'); pg.wait_for_timeout(100)
    ok(order(pg)==['c','b','d','a','e'],'Open first (pinned still first) %s'%order(pg))
    # Select all follows the order shown
    pg.click('#selectBtn'); pg.click('#selAll'); pg.wait_for_timeout(100)
    ok(pg.eval_on_selector_all('.card.picked .pick','els=>els.map(e=>e.closest(".card").dataset.id)')==['c','b','d','a','e'],'Select all numbers the notes in the order shown')
    pg.click('#selDone')
    # remembered
    pg.reload(); pg.wait_for_timeout(500)
    ok(pg.inner_text('#sortLbl')=='Open first' and order(pg)==['c','b','d','a','e'],'the choice is remembered')
    # keyboard
    pg.focus('#sortBtn'); pg.keyboard.press('Enter'); pg.wait_for_timeout(100); ok(pg.is_visible('#sortMenu'),'Enter opens the menu')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100); ok(not pg.is_visible('#sortMenu') and not pg.is_visible('#printBar'),'Esc closes it')
    ok(not errs,'no page errors %s'%errs)
print('FAILS:',fails); sys.exit(1 if fails else 0)
