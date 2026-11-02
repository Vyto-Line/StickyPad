import sys, os, json, subprocess
HERE=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read()
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
UT=subprocess.check_output(['node','-e',"const T=require('./themes');console.log(JSON.stringify({id:'classic',dark:false,vars:T.vars('classic',false),palette:T.palette('classic',false,'standard'),names:T.paletteNames('classic','standard'),paletteId:'standard',paletteName:'Standard',palettes:T.allPalettes().map(p=>({id:p.id,name:p.name,custom:false,colors:p.colors.slice(0,6),dark:p.dark.slice(0,6),names:p.names})),mine:[]}))"],cwd=ROOT).decode()
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    pg=b.new_page(viewport={'width':420,'height':560}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script("window.__BLOCKS=[{t:'text',v:'Book the ferry before Friday.'}];"+STUB+";window.__S.uiTheme=%s;"%UT); pg.goto('file://'+ROOT+'note.html'); pg.wait_for_timeout(500)
    sel="""()=>{const ed=document.querySelector('#ed');const tw=document.createTreeWalker(ed,NodeFilter.SHOW_TEXT);const n=tw.nextNode();const r=document.createRange();r.setStart(n,9);r.setEnd(n,14);const s=getSelection();s.removeAllRanges();s.addRange(r)}"""
    pg.evaluate(sel); pg.wait_for_timeout(200)
    pg.click('#fmtHa'); pg.wait_for_timeout(100); ok(pg.is_visible('#fmtPal'),'highlight colours open')
    pg.mouse.click(400,540); pg.wait_for_timeout(150)   # empty corner of the note
    ok(not pg.is_visible('#fmtPal'),'a click elsewhere closes the colour menu')
    pg.evaluate(sel); pg.wait_for_timeout(200); pg.click('#fmtC'); pg.wait_for_timeout(100); ok(pg.is_visible('#fmtPal'),'letter colours open')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100); ok(not pg.is_visible('#fmtPal'),'Esc closes it')
    pg.click('#cfg'); pg.wait_for_timeout(150); pg.click('#palBtn'); pg.wait_for_timeout(100); ok(pg.is_visible('#palMenu'),'palettes menu open')
    pg.click('#panel .ph >> nth=1'); pg.wait_for_timeout(100); ok(not pg.is_visible('#palMenu'),'a click on the panel closes the palettes menu')
    pg.click('#palBtn'); pg.mouse.click(300,500); pg.wait_for_timeout(100); ok(not pg.is_visible('#palMenu'),'a click on the note closes it')
    if not pg.is_visible('#palBtn'): pg.click('#cfg'); pg.wait_for_timeout(150)
    pg.click('#palBtn'); pg.keyboard.press('Escape'); pg.wait_for_timeout(100); ok(not pg.is_visible('#palMenu'),'Esc closes it')
    if not pg.is_visible('#palBtn'): pg.click('#cfg'); pg.wait_for_timeout(150)
    pg.click('#palBtn'); pg.wait_for_timeout(100); pg.click('#palBtn'); pg.wait_for_timeout(100); ok(not pg.is_visible('#palMenu'),'the button still toggles')
    ok(not errs,'no page errors %s'%errs)
print('FAILS:',fails); sys.exit(1 if fails else 0)
