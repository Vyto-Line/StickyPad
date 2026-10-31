import sys, os, json, subprocess
HERE=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(HERE,'out'); os.makedirs(OUT,exist_ok=True)
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read()
UT=json.loads(subprocess.check_output(['node','-e',"""const T=require('./themes');
T.setCustom([{id:'my-a',name:'Beach',colors:['#ffe9a0','#ffc4c4','#bfe3ff','#c9f2c0','#ffd9a8','#e1ccff'],letters:[null,'#7a0000',null,null,null,null]}]);
const pals=T.allPalettes().map(p=>({id:p.id,name:p.name,custom:!!p.custom,colors:p.colors.slice(0,6),dark:p.dark.slice(0,6),names:p.names.slice(0,6)}));
const mk=pid=>({id:'classic',dark:false,mode:'light',follow:true,vars:T.vars('classic',false),palette:T.palette('classic',false,pid),names:T.paletteNames('classic',pid),paletteId:pid,paletteName:pid==='theme'?'Classic (from the theme)':T.paletteById(pid).name,palettes:pals,mine:T.customList()});
console.log(JSON.stringify({theme:mk('theme'),std:mk('standard'),mine:mk('my-a'),pals}))"""],cwd=ROOT))
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(f,ut,extra='',w=420,h=560):
        pg=b.new_page(viewport={'width':w,'height':h}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.add_init_script(extra+'window.__UT=%s;'%json.dumps(ut)+STUB+';window.__S.uiTheme=window.__UT;')
        pg.goto('file://'+ROOT+f); pg.wait_for_timeout(500); pg.errs=errs; return pg
    pg=page('note.html',UT['std'],'window.__BLOCKS=[{"t":"text","v":"hi"}];')
    pg.click('#cfg'); pg.wait_for_timeout(150)
    ok(pg.inner_text('#palName')=='Standard','menu shows the palette name')
    t=pg.evaluate("[...document.querySelectorAll('.sw[data-c]')].map(x=>x.title)")
    ok(t[:3]==['Yellow','Pink','Blue'] and len(t)==8,'colour names on hover: %r'%t)
    pg.click('#palBtn'); pg.wait_for_timeout(100)
    ok(pg.is_visible('#palMenu') and pg.locator('#palMenu .pal').count()==6,'Palettes lists: theme, 3 built in, 1 own, and the make button (%d)'%pg.locator('#palMenu .pal').count())
    pg.screenshot(path=os.path.join(OUT,'palette_menu.png'))
    pg.click('#palMenu .pal:nth-child(3)'); pg.wait_for_timeout(100)
    ok(['paletteSet','clear'] in pg.evaluate("window.__S.calls"),'choosing a palette asks the app to switch')
    ok(not pg.is_visible('#palMenu'),'the menu closes')
    # the app answers with the own palette: letters colour on its second colour
    pg.evaluate("window.__emit('ui', %s)"%json.dumps(UT['mine'])); pg.wait_for_timeout(150)
    ok(pg.inner_text('#palName')=='Beach','switching shows the new name')
    pg.click('#palBtn'); pg.wait_for_timeout(100); ok(pg.locator('#palMenu .pal').count()==6,'own palette is in the list')
    pg.click('#palMenu .make'); pg.wait_for_timeout(100)
    ok(['openSettings','appearance'] in pg.evaluate("window.__S.calls"),'"Make my own palette" opens Settings > Appearance')
    pg.click('#palBtn'); pg.click('.sw[data-c="#FFC4C4" i]'); pg.wait_for_timeout(200)
    ok(pg.evaluate("getComputedStyle(document.querySelector('#ed')).color")=='rgb(122, 0, 0)','a colour with an own letter colour uses it in the note')
    pg.click('.sw[data-c="#FFE9A0" i]'); pg.wait_for_timeout(200)
    ok(pg.evaluate("getComputedStyle(document.querySelector('#ed')).color")!='rgb(122, 0, 0)','automatic letters elsewhere')
    ok(not pg.errs,'no page errors %r'%pg.errs)
    # settings
    pg=page('settings.html',UT['std'],'',980,760)
    pg.evaluate("window.__S.set.palettes=%s; window.__S.set.notePalette='standard'; window.__S.set.theme='classic'"%json.dumps(UT['pals'])); pg.evaluate('load()'); pg.wait_for_timeout(500)
    pg.click('[data-cat=appearance]'); pg.wait_for_timeout(150)
    ok(pg.locator('#palettes .pal').count()==5 and pg.locator('#palettes .pal.on').count()==1,'Settings lists the palettes with the chosen one marked (%d)'%pg.locator('#palettes .pal').count())
    pg.click('#palettes .pal:nth-child(4)'); pg.wait_for_timeout(100)
    ok(['paletteSet','cb'] in pg.evaluate("window.__S.calls"),'picking a default palette')
    pg.click('#palNew'); pg.wait_for_timeout(100)
    ok(pg.is_visible('#palEd') and pg.locator('.paledrow').count()==6,'editor: six colours')
    pg.fill('#palEdName','Mine')
    pg.evaluate("(()=>{const i=document.querySelector('.paledrow input[type=color]');i.value='#7a7a7a';i.dispatchEvent(new Event('change'))})()"); pg.wait_for_timeout(100)
    ok('Hard to read' in pg.inner_text('.paledrow'),'a mid-grey colour is flagged as hard to read')
    pg.select_option('.paledrow select','own'); pg.evaluate("(()=>{const i=document.querySelector('.paledrow .lt input');i.value='#000000';i.dispatchEvent(new Event('change'))})()"); pg.wait_for_timeout(100)
    ok('Readable' in pg.inner_text('.paledrow'),'an own black letter colour fixes it')
    pg.screenshot(path=os.path.join(OUT,'palette_editor.png'))
    pg.click('#palEdSave'); pg.wait_for_timeout(150)
    sv=[c for c in pg.evaluate("window.__S.calls") if c[0]=='paletteSave']
    ok(sv and sv[0][1]['name']=='Mine' and sv[0][1]['colors'][0]=='#7a7a7a' and sv[0][1]['letters'][0]=='#000000' and sv[0][1]['use'] is True,'Save sends name, colours, letters: %r'%sv)
    ok(not pg.errs,'no page errors %r'%pg.errs)
    b.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
