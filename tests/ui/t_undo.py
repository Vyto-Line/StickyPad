import sys, os
HERE=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read()
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
def mk(undo): return "window.__S.all={emoji:'',greeting:'Hi',groups:[],trash:[],prefs:{},undo:%s,notes:[{id:'a',title:'A',text:'x',color:'#FFF2A8',font:'Segoe UI',open:true,pinned:true,updated:1},{id:'b',title:'B',text:'x',color:'#FFD6E0',font:'Segoe UI',open:false,updated:2}]};"%undo
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    pg=b.new_page(viewport={'width':1000,'height':600}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script('try{localStorage.clear()}catch(e){}'+STUB+';'+mk('{count:2,left:1500}')); pg.goto('file://'+ROOT+'all.html'); pg.wait_for_timeout(500)
    ok(pg.is_visible('#undoBar') and '2 notes moved to the trash' in pg.inner_text('#undoTxt'),'the Undo bar shows')
    pg.evaluate('window.__S.all.undo=null'); pg.click('#undoBtn'); pg.wait_for_timeout(200)
    ok(any(c[0]=='allUndoTrash' for c in pg.evaluate('__S.calls')) and not pg.is_visible('#undoBar'),'Undo asks the app and the bar goes')
    pg.evaluate("window.__S.all.undo={count:1,left:700}; refresh()"); pg.wait_for_timeout(300); ok(pg.is_visible('#undoBar') and 'Note moved' in pg.inner_text('#undoTxt'),'singular text')
    pg.wait_for_timeout(1000); ok(not pg.is_visible('#undoBar'),'the bar goes by itself')
    # pinned strip
    ok(pg.is_visible('#pinStrip') and pg.eval_on_selector_all('#pinStrip button','els=>els.map(e=>e.textContent)')==['A'],'pinned strip lists the pinned note')
    pg.click('#pinStrip button'); pg.wait_for_timeout(100); ok(['allShow','a'] in pg.evaluate('__S.calls'),'a click opens the note')
    pg.fill('#q','zzz'); pg.wait_for_timeout(200); ok(not pg.is_visible('#pinStrip'),'hidden while searching')
    pg.fill('#q',''); pg.wait_for_timeout(200); pg.click('#selectBtn'); pg.wait_for_timeout(100); ok(not pg.is_visible('#pinStrip'),'hidden while choosing notes')
    ok(not errs,'no page errors %s'%errs)
print('FAILS:',fails); sys.exit(1 if fails else 0)
