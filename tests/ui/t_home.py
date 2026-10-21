import sys, os
HERE=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(HERE,'out'); os.makedirs(OUT,exist_ok=True)
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read()
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(f,q='',w=980,h=680):
        pg=b.new_page(viewport={'width':w,'height':h}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.add_init_script(STUB); pg.goto('file://'+ROOT+f+q); pg.wait_for_timeout(400); pg.errs=errs; return pg
    for f,cur in [('all.html','notes'),('chat.html','chat'),('settings.html','settings')]:
        pg=page(f)
        ok(pg.is_visible('#homeNav'),f+': sidebar shown')
        names=pg.eval_on_selector_all('#homeNav .hitem','e=>e.map(x=>x.textContent.trim())')
        ok(names[:4]==['Notes','Trash','Ask the AI','Settings'],f+': items %s'%names)
        ok(pg.eval_on_selector('#homeNav .hitem.on','e=>e.dataset.go')==cur,f+': "%s" is highlighted'%cur)
        box=pg.eval_on_selector('.homeMain','e=>{const r=e.getBoundingClientRect();return [r.width,r.height]}')
        ok(box[1]>=670 and box[0]>=780,f+': page fills the rest of the window %s'%box)
        ok(not pg.errs,f+': no page errors (%s)'%pg.errs)
        pg.screenshot(path=os.path.join(OUT,'home_%s.png'%cur))
        if f=='all.html':
            pg.click('[data-go=trash]'); pg.wait_for_timeout(120)
            ok(pg.eval_on_selector('#homeNav .hitem.on','e=>e.dataset.go')=='trash' and pg.is_visible('#trashBar'),'Trash switches inside the page, no reload')
            pg.click('[data-go=notes]'); pg.wait_for_timeout(120); ok(pg.is_visible('#notesBar'),'Notes switches back')
            ok(not any(c[0]=='home' for c in pg.evaluate('__S.calls')),'Notes/Trash need no window change')
            pg.click('[data-go=chat]'); pg.click('[data-go=settings]')
            ok(['home','chat',None] in pg.evaluate('__S.calls') and ['home','settings',None] in pg.evaluate('__S.calls'),'Ask the AI and Settings ask the app to switch page')
        else:
            pg.click('[data-go=notes]'); ok(['home','notes',None] in pg.evaluate('__S.calls'),f+': Notes asks the app to switch page')
            pg.click('[data-go=%s]'%cur); ok(sum(1 for c in pg.evaluate('__S.calls') if c[0]=='home')==1,f+': clicking the page you are on does nothing')
    ALL="window.__S.all={emoji:'',greeting:'Hi',groups:[{id:'g1',name:'Home'},{id:'g2',name:'Work'}],trash:[],prefs:{},notes:[{id:'a',title:'Groceries',text:'milk',color:'#FFF2A8',group:'g1',open:true},{id:'b',title:'Meeting',text:'agenda',color:'#CDEFFF',group:'g2',open:false},{id:'c',title:'Loose',text:'x',color:'#D4F5C4',group:null,open:true}]};"
    pg=b.new_page(viewport={'width':980,'height':680}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script('try{localStorage.clear()}catch(e){}'+STUB+';'+ALL); pg.goto('file://'+ROOT+'all.html'); pg.wait_for_timeout(400)
    chips=pg.eval_on_selector_all('#chips .fchip','e=>e.map(x=>x.textContent)')
    ok(chips==['All3','Home1','Work1','No folder1'],'folder chips with counts %s'%chips)
    pg.click('#chips .fchip >> nth=2'); pg.wait_for_timeout(100)
    ok(pg.locator('.card').count()==1 and 'Meeting' in pg.inner_text('#sections'),'a chip shows only that folder')
    ok(pg.eval_on_selector('#chips .fchip >> nth=2','e=>e.getAttribute("aria-pressed")')=='true','chosen chip is marked')
    pg.click('#chips .fchip >> nth=0'); pg.wait_for_timeout(100); ok(pg.locator('.card').count()==3,'All shows everything again')
    pg.drag_and_drop('.card >> text=Loose','#chips .fchip >> nth=1'); pg.wait_for_timeout(300)
    ok(['grpMove','c','g1'] in pg.evaluate('__S.calls'),'dropping a card on a chip moves the note into that folder')
    pg.screenshot(path=os.path.join(OUT,'home_chips.png')); ok(not errs,'chips: no errors %s'%errs)
    pg=page('settings.html')
    subs=pg.eval_on_selector_all('#homeNav .hsub','e=>e.map(x=>x.textContent)')
    ok(len(subs)==9 and subs[0]=='General' and 'Shortcuts' in subs,'settings categories sit under Settings in the one sidebar %s'%subs)
    ok(not pg.is_visible('aside'),"Settings' own menu is gone")
    ok(pg.is_visible('#content > .search #sq'),'search box moved to the top of the page')
    pg.click('#homeNav .hsub >> text=Shortcuts'); pg.wait_for_timeout(150)
    ok(pg.is_visible('#cat-shortcuts') and pg.eval_on_selector('#homeNav .hsub.on','e=>e.textContent')=='Shortcuts','clicking a sub-item opens that page and marks it')
    pg.screenshot(path=os.path.join(OUT,'home_settings_onemenu.png'))
    pg=page('chat.html')
    ok(pg.is_visible('.composer .ctxchip #ctx'),'the note context is a chip inside the message box')
    ok(pg.locator('.ctx').count()==0,'the old Note context row is gone')
    pg.screenshot(path=os.path.join(OUT,'home_chat_chip.png'))
    pg=page('all.html','?tab=trash'); ok(pg.eval_on_selector('#homeNav .hitem.on','e=>e.dataset.go')=='trash','opening with ?tab=trash highlights Trash')
    pg=page('all.html',w=800,h=520); ok(pg.is_visible('#sections') or pg.is_visible('#empty'),'fits the smallest window (800x520)')
    pg=page('all.html'); pg.wait_for_timeout(300); ft=pg.inner_text('.hfoot'); ok(ft=='Ctrl+Alt+Q opens this window from anywhere.','the sidebar names the real shortcut: %r'%ft)
    b.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
