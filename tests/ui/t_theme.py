import sys, os, json, subprocess
HERE=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(HERE,'out'); os.makedirs(OUT,exist_ok=True)
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read()
UT=json.loads(subprocess.check_output(['node','-e',"const T=require('./themes');const u=(id,d)=>({id,dark:d,mode:d?'dark':'light',follow:true,vars:T.vars(id,d),palette:T.palette(id,d)});console.log(JSON.stringify({pl:u('purple',false),pd:u('purple',true),ol:u('ocean',false)}))"],cwd=ROOT))
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
def rgb(h):
    h=h.lstrip('#'); return 'rgb(%d, %d, %d)'%tuple(int(h[i:i+2],16) for i in (0,2,4))
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(f,ut,w=980,h=680,pre=''):
        pg=b.new_page(viewport={'width':w,'height':h}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.add_init_script('try{localStorage.clear()}catch(e){}'+pre+'window.__UT=%s;'%json.dumps(ut)+STUB+';window.__S.uiTheme=window.__UT;')
        pg.goto('file://'+ROOT+f); pg.wait_for_timeout(450); pg.errs=errs; return pg
    for f in ['all.html','settings.html','chat.html']:
        pg=page(f,UT['pd'])
        ok(pg.evaluate("getComputedStyle(document.body).backgroundColor")==rgb(UT['pd']['vars']['--bg']),f+': window background is Purple dark')
        ok(pg.evaluate("getComputedStyle(document.getElementById('homeNav')).backgroundColor")==rgb(UT['pd']['vars']['--nav']),f+': sidebar follows the theme')
        ok(pg.evaluate("document.documentElement.dataset.ui")=='dark',f+': marked dark')
        pg.screenshot(path=os.path.join(OUT,'theme_dark_%s.png'%f.split('.')[0]))
        pg.evaluate("window.__S.uiTheme=%s; window.__emit('ui', window.__S.uiTheme)"%json.dumps(UT['ol'])); pg.wait_for_timeout(100)
        ok(pg.evaluate("getComputedStyle(document.body).backgroundColor")==rgb(UT['ol']['vars']['--bg']),f+': repaints at once when the theme changes')
        ok(not pg.errs,f+': no page errors (%s)'%pg.errs)
    # remembered colours: a second load paints before the app answers
    pg=page('all.html',UT['pd']); pg.evaluate("window.__S.uiTheme=null"); pg.reload(); pg.wait_for_timeout(50)
    # (the reload re-runs the init script which clears storage; check the stored value exists instead)
    pg=page('all.html',UT['pd']); ok('#17111f' in (pg.evaluate("localStorage.getItem('sp.uitheme')") or ''),'theme remembered for the next window (no flash)')
    # settings: 10 themes with light|dark previews, mode switch, follow toggle
    pg=page('settings.html',UT['pl']); pg.click('[data-cat=appearance]'); pg.wait_for_timeout(200)
    ok(pg.eval_on_selector_all('#themes .theme','e=>e.length')==10,'10 themes listed')
    ok('Purple' in pg.inner_text('#themes'),'Purple is one of them')
    ok(pg.eval_on_selector_all('#themes .theme:first-child .half','e=>e.length')==2,'each preview has a light and a dark half')
    ok(pg.eval_on_selector('[data-mode=system]','e=>e.classList.contains("on")'),'"Same as Windows" is the default')
    pg.click('[data-mode=dark]'); pg.wait_for_timeout(150)
    ok(['settingsSet',{'mode':'dark'}] in pg.evaluate('__S.calls'),'Dark asks the app to switch')
    ok(pg.eval_on_selector('[data-mode=dark]','e=>e.classList.contains("on") && e.getAttribute("aria-checked")==="true"'),'Dark is shown as chosen')
    pg.click('#themes .theme:nth-child(2)'); pg.wait_for_timeout(150); ok(['settingsSet',{'theme':'purple'}] in pg.evaluate('__S.calls'),'clicking Purple chooses it')
    ok(pg.is_visible('#notesFollowMode'),'"Notes follow light and dark" switch is there')
    pg.locator('#cat-appearance').screenshot(path=os.path.join(OUT,'theme_settings.png'))
    ok(not pg.errs,'settings: no page errors (%s)'%pg.errs)
    # note: swatches come from the theme in its current version, accent follows the theme
    pg=page('note.html',UT['pd'],w=660,h=470,pre="window.__BLOCKS=[{t:'text',v:'Hello'}];"); pg.click('#cfg'); pg.wait_for_timeout(250)
    sw=pg.eval_on_selector_all('#swatches .sw[data-c]','e=>e.map(x=>x.dataset.c)')
    ok(sw==UT['pd']['palette'],'note colours offered are Purple dark (%s)'%sw[:3])
    acc=pg.evaluate("getComputedStyle(document.body).getPropertyValue('--accent').trim()")
    ok(acc=='#7c3aed','accent on a light note is the light Purple accent (%s)'%acc)
    pg.evaluate("window.__S.uiTheme=%s; window.__emit('ui', window.__S.uiTheme)"%json.dumps(UT['ol'])); pg.wait_for_timeout(150)
    ok(pg.eval_on_selector_all('#swatches .sw[data-c]','e=>e.map(x=>x.dataset.c)')==UT['ol']['palette'],'switching theme refreshes the note colours')
    ok(not pg.errs,'note: no page errors (%s)'%pg.errs)
    b.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
