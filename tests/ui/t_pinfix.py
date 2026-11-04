import sys, os, json, subprocess
HERE=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read(); OUT=os.path.join(HERE,'out'); os.makedirs(OUT,exist_ok=True)
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
UT=subprocess.check_output(['node','-e',"const T=require('./themes');console.log(JSON.stringify({id:'classic',dark:false,vars:T.vars('classic',false),palette:T.palette('classic',false,'standard'),names:T.paletteNames('classic','standard'),paletteId:'standard',paletteName:'Standard',palettes:[],mine:[]}))"],cwd=ROOT).decode()
notes="{id:'a',title:'Alpha',text:'x\\nsome words that fill the little preview of this note so there is text under the title',color:'#FFF2A8',font:'Segoe UI',open:false,pinned:true,rolled:true,locked:true,images:3},{id:'b',title:'Beta',text:'y',color:'#FFF2A8',font:'Segoe UI',open:true}"
ALL="window.__S.all={emoji:'',greeting:'Hi',groups:[],trash:[],prefs:{},notes:[%s]};window.__S.uiTheme=%s;"%(notes,UT)
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    pg=b.new_page(viewport={'width':1000,'height':680}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script('try{localStorage.clear()}catch(e){}'+STUB+';'+ALL); pg.goto('file://'+ROOT+'all.html'); pg.wait_for_timeout(500)
    # chips never sit on the text
    r=pg.evaluate("""()=>{const c=[...document.querySelectorAll('.card')].find(x=>x.textContent.includes('Alpha'));const s=c.querySelector('.s').getBoundingClientRect(),bd=c.querySelector('.b').getBoundingClientRect(),cr=c.getBoundingClientRect();return {sBottom:s.bottom,bTop:bd.top,bBottom:bd.bottom,cBottom:cr.bottom}}""")
    ok(r['bTop']>=r['sBottom']-0.5 and r['bBottom']<=r['cBottom']+0.5,'the chips (locked, pinned, pictures, rolled up, closed) sit under the text, inside the card %s'%r)
    pg.screenshot(path=os.path.join(OUT,'chips.png'))
    # More menu: only the choice that makes sense
    pg.click('#selectBtn'); pg.click('.card >> text=Beta'); pg.click('#selMore'); pg.wait_for_timeout(100)
    ok(pg.eval_on_selector_all('#selPop .mi','els=>els.map(e=>e.textContent)')==['Open','Close','Pin on top'],'an unpinned note: Pin on top only')
    pg.keyboard.press('Escape'); pg.click('.card >> text=Beta'); pg.click('.card >> text=Alpha'); pg.click('#selMore'); pg.wait_for_timeout(100)
    ok(pg.eval_on_selector_all('#selPop .mi','els=>els.map(e=>e.textContent)')==['Open','Close','Unpin'],'a pinned note: Unpin only')
    pg.click('.card >> text=Beta'); pg.click('#selMore'); pg.wait_for_timeout(100)
    ok(pg.eval_on_selector_all('#selPop .mi','els=>els.map(e=>e.textContent)')==['Open','Close','Pin on top','Unpin'],'a mix: both')
    # What's new above Support
    ok(pg.locator('#homeNav .hwhats').count()==1,"Home has a What's new button")
    order=pg.evaluate("[...document.querySelectorAll('#homeNav > *')].map(e=>e.className)")
    ok(order.index('hwhats')+1==order.index('hsupport'),"it sits directly above Support the project %s"%order)
    pg.click('#homeNav .hwhats'); pg.wait_for_timeout(100)
    ok(['whatsNewOpen'] in pg.evaluate('__S.calls'),"it opens What's new")
    ok(not errs,'no page errors %s'%errs)
    # the note's panel closes on a click elsewhere
    pg2=b.new_page(viewport={'width':420,'height':560}); pg2.on('pageerror',lambda e:errs.append(str(e)))
    pg2.add_init_script("window.__BLOCKS=[{t:'text',v:'Short'}];"+STUB+";window.__S.uiTheme=%s;"%UT); pg2.goto('file://'+ROOT+'note.html'); pg2.wait_for_timeout(500)
    pg2.click('#cfg'); pg2.wait_for_timeout(150); ok(pg2.is_visible('#panel'),'panel open')
    pg2.mouse.click(30,545); pg2.wait_for_timeout(150)
    ok(not pg2.is_visible('#panel'),'a click on a blank part of the note closes the panel')
    pg2.click('#cfg'); pg2.click('#panel summary >> nth=0'); pg2.wait_for_timeout(100); ok(pg2.is_visible('#panel'),'a click inside the panel keeps it open')
print('FAILS:',fails); sys.exit(1 if fails else 0)
