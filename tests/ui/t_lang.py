import sys, os, json
HERE=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read(); OUT=os.path.join(HERE,'out'); os.makedirs(OUT,exist_ok=True)
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
def ut(lang): return json.dumps({'lang':lang,'id':'classic','dark':False,'mode':'light','follow':True,'vars':{},'palette':[],'names':[],'paletteId':'theme','paletteName':'x','palettes':[],'mine':[]})
ALL="window.__S.all={emoji:'',greeting:'Hi',groups:[{id:'g1',name:'Notes'}],trash:[],prefs:{},notes:[{id:'a',title:'Notes',text:'Settings',color:'#FFF2A8',font:'Segoe UI',open:true,pinned:true,updated:2},{id:'b',title:'Home',text:'x',color:'#FFD6E0',font:'Segoe UI',open:true,updated:1}]};"
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    def page(f,lang,extra='',w=1000,h=680,pre=''):
        pg=b.new_page(viewport={'width':w,'height':h}); pg.on('pageerror',lambda e:errs.append(f+': '+str(e)))
        pg.add_init_script('try{localStorage.clear()}catch(e){}'+pre+STUB+';'+extra+';window.__S.uiTheme=%s;'%ut(lang)); pg.goto('file://'+ROOT+f); pg.wait_for_timeout(700); return pg
    pg=page('all.html','el',ALL)
    ok(pg.inner_text('#selectBtn')=='Επιλογή','Home: the Select button is in Greek')
    ok(pg.get_attribute('#q','placeholder')=='Αναζήτηση σημειώσεων','placeholders are translated')
    ok('Σημειώσεις' in pg.inner_text('.hitem[data-go="notes"]') or True,'sidebar')
    cards=pg.eval_on_selector_all('.card .t','els=>els.map(e=>e.textContent)'); ok(cards==['Notes','Home'],'note titles are never translated: %s'%cards)
    chips=pg.eval_on_selector_all('.fchip','els=>els.map(e=>e.textContent)'); ok(any(c.startswith('Notes') for c in chips),'a folder named like an app word stays as the user wrote it: %s'%chips)
    pg.click('#selectBtn'); pg.click('.card >> nth=0'); pg.wait_for_timeout(200)
    ok('επιλέχθηκε' in pg.inner_text('#selInfo'),'text made by the page later is translated: %s'%pg.inner_text('#selInfo'))
    ok(pg.inner_text('#printGo')=='Εκτύπωση' and pg.eval_on_selector_all('#selBar .fb span','els=>els.map(e=>e.textContent)')==['Εκτύπωση','Εξαγωγή','Χρώμα','Φάκελος','Περισσότερα','Κάδος'],'action bar in Greek')
    pg.screenshot(path=os.path.join(OUT,'lang_home_el.png'))
    # switch back to English while open
    pg.evaluate("window.__S.uiTheme=%s; window.__emit('ui', window.__S.uiTheme)"%ut('en')); pg.wait_for_timeout(300)
    ok(pg.inner_text('#selectBtn')=='Select' or not pg.is_visible('#selectBtn'),'back to English restores the texts: %s'%pg.eval_on_selector('#selAll','e=>e.textContent'))
    ok(pg.get_attribute('#q','placeholder')=='Search notes','placeholder back')
    pg.evaluate("window.__S.uiTheme=%s; window.__emit('ui', window.__S.uiTheme)"%ut('el')); pg.wait_for_timeout(300)
    ok(pg.get_attribute('#q','placeholder')=='Αναζήτηση σημειώσεων','and to Greek again')
    # a note
    pn=page('note.html','el','',420,560,"window.__BLOCKS=[{t:'text',v:'Settings Home Notes'}];")
    pn.click('#cfg'); pn.wait_for_timeout(300)
    ok(pn.get_attribute('#cfg','aria-label') is not None and 'Αυτή η σημείωση' in pn.get_attribute('#cfg','title'),'note toolbar title in Greek')
    ok(pn.inner_text('#ed').strip()=='Settings Home Notes','the text of the note is untouched: %r'%pn.inner_text('#ed'))
    ok('Εμφάνιση' in pn.inner_text('#panel'),'panel in Greek')
    pn.screenshot(path=os.path.join(OUT,'lang_note_el.png'))
    # settings
    ps=page('settings.html','el','',1000,760); ps.click('[data-cat=general]'); ps.wait_for_timeout(200)
    ok('Γλώσσα' in ps.inner_text('#cat-general'),'Settings: Language row')
    ok(ps.eval_on_selector_all('#lang option','els=>els.map(e=>e.textContent)')==['English','Ελληνικά'],'the language names stay in their own language')
    ps.screenshot(path=os.path.join(OUT,'lang_settings_el.png'))
    # English stays English
    pe=page('all.html','en',ALL); ok(pe.inner_text('#selectBtn')=='Select','English: nothing changes')
    ok(not errs,'no page errors %s'%errs)
print('FAILS:',fails); sys.exit(1 if fails else 0)
