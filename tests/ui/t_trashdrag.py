import sys, os
HERE=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read()
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ALL="window.__S.all={emoji:'',greeting:'Hi',groups:[],trash:[{id:'t1',title:'Old',text:'gone',color:'#FFF2A8',font:'Segoe UI',deletedAt:1700000000000}],prefs:{},notes:[{id:'a',title:'Groceries',text:'milk',color:'#FFF2A8',font:'Segoe UI',open:true}]};"
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    pg=b.new_page(viewport={'width':980,'height':680}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script('try{localStorage.clear()}catch(e){}'+STUB+';'+ALL); pg.goto('file://'+ROOT+'all.html'); pg.wait_for_timeout(400)
    pg.drag_and_drop('.card >> text=Groceries','.hitem[data-go=trash]'); pg.wait_for_timeout(300)
    ok(['allTrash','a'] in pg.evaluate('__S.calls'),'a note dropped on Trash in the sidebar is deleted')
    pg.drag_and_drop('.card >> text=Groceries','.hitem[data-go=notes]'); pg.wait_for_timeout(200)
    ok(not any(c[0]=='trashRestore' for c in pg.evaluate('__S.calls')),'a note dropped on Notes in the sidebar does nothing')
    pg.click('.hitem[data-go=trash]'); pg.wait_for_timeout(200)
    pg.drag_and_drop('#trashList .item >> text=Old','.hitem[data-go=notes]'); pg.wait_for_timeout(300)
    ok(['trashRestore','t1'] in pg.evaluate('__S.calls'),'a deleted note dropped on Notes in the sidebar is restored')
    pg.drag_and_drop('#trashList .item >> text=Old','.hitem[data-go=trash]'); pg.wait_for_timeout(200)
    ok(len([c for c in pg.evaluate('__S.calls') if c[0]=='allTrash'])==1,'a deleted note dropped on Trash in the sidebar does nothing')
    ok(not errs,'no page errors %s'%errs)
print('FAILS:',fails); sys.exit(1 if fails else 0)
