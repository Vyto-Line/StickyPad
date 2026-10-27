"""Makes the pictures used in README.md (docs/images/*.png) from the real app screens.
Run:  python tools/screenshots.py      (needs Playwright + Pillow; it uses the same browser stub as the UI tests)
The notes in the pictures are made-up sample notes."""
import os, time
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'docs', 'images')
STUB = open(os.path.join(ROOT, 'tests', 'ui', 'stub.js'), encoding='utf-8').read()
os.makedirs(OUT, exist_ok=True)
SCALE = 2

def T(v): return {'t': 'text', 'v': v}
def C(v, done=False): return {'t': 'check', 'v': v, 'done': done}

NOTES = {
  'groceries': dict(title='Groceries', color='#FFF2A8', font='Segoe UI', size=15,
    blocks=[T('For the weekend dinner'), C('Tomatoes and basil', True), C('Feta cheese', True), C('Olive oil'), C('Sourdough bread'), C('Lemons'), T('Ask Maria if she is coming!')]),
  'ideas': dict(title='Crete trip', color='#B9E4FF', font='Segoe UI', size=15,
    blocks=[T('Book the ferry before Friday.\nSamaria Gorge: start at 7:00, take water and a hat.\n'), C('Hotel in Chania', True), C('Rent a car'), C('Print tickets')]),
  'greek': dict(title='Σχέδιο', color='#FFD1E3', font='Segoe UI', size=15,
    blocks=[T('Καλημέρα! Σήμερα έχουμε συνάντηση στις 11:00 με την ομάδα.\nΝα ετοιμάσω την παρουσίαση και να στείλω το αρχείο πριν από τη συνάντηση.')]),
  'dark': dict(title='Meeting', color='#2E3440', font='Segoe UI', size=15,
    blocks=[T('Agenda\n'), C('Budget review', True), C('Launch date'), C('Hiring plan'), T('\nNext meeting: Thursday 10:00')]),
}

def page(b, name, w=360, h=440, extra=''):
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=SCALE)
    pg = ctx.new_page(); pg.add_init_script(STUB)
    n = NOTES.get(name)
    if n:
        import json
        pg.add_init_script('window.__S.note.title=%s;window.__S.note.color=%s;window.__S.note.font=%s;window.__S.note.size=%d;window.__S.note.blocks=%s;%s' % (
            json.dumps(n['title']), json.dumps(n['color']), json.dumps(n['font']), n['size'], json.dumps(n['blocks']), extra))
    elif extra: pg.add_init_script(extra)
    return pg

def goto(pg, f): pg.goto('file://' + ROOT + '/' + f); pg.wait_for_timeout(500)
def shot(pg, name): pg.screenshot(path=os.path.join(OUT, name + '.png'))

def panel(pg, tab, w=660, h=470):
    pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(150)
    pg.click('#cfg'); pg.wait_for_timeout(200)
    if tab == 'note': pg.click('#rowRem > summary')
    if tab == 'ai': pg.evaluate("document.querySelector('#aiChat').scrollIntoView({block:'start'})")
    pg.wait_for_timeout(400)

def shot_panel(pg, name):
    pg.screenshot(path=os.path.join(OUT, name + '.png'))

with sync_playwright() as p:
    b = p.chromium.launch()
    # plain notes
    for k in NOTES:
        pg = page(b, k); goto(pg, 'note.html'); shot(pg, 'note_' + k); pg.close()
    # find
    pg = page(b, 'groceries'); goto(pg, 'note.html'); pg.locator('#ed').click(); pg.keyboard.press('Control+f'); pg.keyboard.type('fe'); pg.wait_for_timeout(500); shot(pg, 'feature_find'); pg.close()
    pg = page(b, 'greek'); goto(pg, 'note.html'); pg.locator('#ed').click(); pg.keyboard.press('Control+f'); pg.keyboard.type('συναντηση'); pg.wait_for_timeout(500); shot(pg, 'feature_find_greek'); pg.close()
    # reminder + history in the Note tab
    soon = int((time.time() + 3 * 3600) * 1000)
    pg = page(b, 'groceries', extra='window.__S.note.remind=%d;window.__S.hist=[{t:Date.now()-20*60e3,words:19,pics:0,preview:"For the weekend dinner"},{t:Date.now()-26*3600e3,words:11,pics:0,preview:"For the weekend dinner"},{t:Date.now()-3*86400e3,words:4,pics:1,preview:"Tomatoes"}];' % soon)
    goto(pg, 'note.html'); panel(pg, 'note'); shot_panel(pg, 'feature_reminder')
    pg.click('#rowHist > summary'); pg.wait_for_timeout(400); shot_panel(pg, 'feature_history'); pg.close()
    # AI tab
    pg = page(b, 'greek'); goto(pg, 'note.html'); panel(pg, 'ai'); shot_panel(pg, 'feature_ai'); pg.close()
    pg = page(b, 'greek'); goto(pg, 'note.html'); pg.set_viewport_size({'width': 360, 'height': 520}); pg.click('#cfg'); pg.wait_for_timeout(300); pg.click('#aiTr'); pg.evaluate("document.querySelector('#rowAI').scrollIntoView({block:'start'})"); pg.wait_for_timeout(400); shot(pg, 'feature_translate'); pg.close()
    # style tab with themes
    pg = page(b, 'ideas'); goto(pg, 'note.html'); panel(pg, 'style'); shot_panel(pg, 'feature_style'); pg.close()
    # links underlined + the date bar + the update message
    NOTES['links'] = dict(title='Weekend', color='#CDEFFF', font='Segoe UI', size=15,
      blocks=[T('Tickets: https://www.aegeanair.com/booking\nHotel contact: reservations@seaview.gr\nDentist tomorrow at 5pm\nCall Nick'), ])
    pg = page(b, 'links'); goto(pg, 'note.html'); pg.wait_for_timeout(1000); shot(pg, 'feature_links'); pg.close()
    pg = page(b, 'links', extra="window.__S.updateNow={state:'ready',version:'1.15.8'}"); goto(pg, 'note.html'); pg.wait_for_timeout(1000); shot(pg, 'feature_update'); pg.close()
    # shortcuts you can change
    pg = page(b, None, 1030, 700); goto(pg, 'settings.html'); pg.click('[data-cat=shortcuts]'); pg.wait_for_timeout(300)
    pg.click('[data-key=g_clip]'); pg.keyboard.press('Control+Alt+Shift+V'); pg.wait_for_timeout(300); shot(pg, 'feature_shortcuts'); pg.close()
    # chat across all notes
    chatj = "window.api.chatLoad=async()=>({messages:[{role:'user',content:'What did I write about the dentist?'},{role:'assistant',content:'In your note **Weekend** you wrote: *Dentist tomorrow at 5pm*. Nothing else mentions it.'}],noteId:'*',provider:'ollama',model:'gemma3:4b'});window.api.chatNotes=async()=>[{id:'n1',title:'Weekend'},{id:'n2',title:'Groceries'}];window.__S.chats=[{id:'c1',title:'What did I write about the dentist?',messages:[{role:'user',content:'What did I write about the dentist?'},{role:'assistant',content:'x'}],updated:5e3},{id:'c2',title:'Plan my day',pinned:true,messages:[{role:'user',content:'Plan my day'},{role:'assistant',content:'x'}],updated:4e3},{id:'c3',title:'Trip ideas for Crete',messages:[{role:'user',content:'Trip ideas for Crete'},{role:'assistant',content:'x'}],updated:3e3},{id:'c4',title:'How does a VPN work?',messages:[{role:'user',content:'How does a VPN work?'},{role:'assistant',content:'x'}],updated:2e3}];window.__S.chatCur='c1';"
    pg = page(b, None, 900, 600, extra=chatj); goto(pg, 'chat.html'); pg.wait_for_timeout(300)
    pg.evaluate("(()=>{const s=document.createElement('div');s.className='src';s.textContent='Looked at: Weekend · Groceries';const m=document.querySelectorAll('.msg');m[m.length-1].appendChild(s)})()"); shot(pg, 'feature_chat_all'); pg.close()
    # all notes
    allj = '''window.api.allList = async () => ({ emoji: '☀️', greeting: 'Good morning', notes: [
      {id:'a',title:'Groceries',text:'For the weekend dinner\\n☑ Tomatoes and basil\\n☐ Olive oil',color:'#FFF2A8',group:'g1',updated:Date.now()-3e5,open:true},
      {id:'b',title:'Crete trip',text:'Book the ferry before Friday. Samaria Gorge: start at 7:00',color:'#B9E4FF',group:'g2',updated:Date.now()-36e5,open:true},
      {id:'c',title:'Σημειώσεις',text:'Καλημέρα! Σήμερα έχουμε συνάντηση στις 11:00',color:'#FFD1E3',group:null,updated:Date.now()-72e5,open:true},
      {id:'d',title:'Meeting',text:'Agenda: Budget review, Launch date',color:'#2E3440',group:'g2',updated:Date.now()-864e5,open:false},
      {id:'e',title:'Passwords hint',text:'Locked note',color:'#D9F2C2',group:null,updated:Date.now()-2*864e5,open:false,locked:true},
      {id:'f',title:'Reading list',text:'Dune, The Left Hand of Darkness',color:'#E6D5FF',group:'g1',updated:Date.now()-5*864e5,open:false}],
      groups: [{id:'g1',name:'Home',collapsed:false},{id:'g2',name:'Work',collapsed:false}], trash: [], prefs: {} });'''
    pg = page(b, None, 900, 560, extra=allj); goto(pg, 'all.html'); shot(pg, 'feature_all'); pg.close()
    # (Select mode is shown by an animation made in tools/readme_pictures.py)
    # Print options with the preview
    import json, subprocess
    items = [dict(title=NOTES[k]['title'], blocks=NOTES[k]['blocks'], font='Segoe UI', color=NOTES[k]['color']) for k in ('groceries', 'ideas', 'greek')]
    html = subprocess.run(['node', '-e', "const P=require('./print');const it=JSON.parse(process.argv[1]);process.stdout.write(P.build(it,'',P.cleanOpts({style:'sticky',layout:'actual',size:'normal'})))", json.dumps(items)], cwd=ROOT, capture_output=True, text=True, encoding='utf-8').stdout
    pinfo = "window.__PINFO={count:3,skipped:0,many:true,titles:['Groceries','Crete trip','Σχέδιο'],opts:{style:'sticky',layout:'actual',size:'normal',title:true,pictures:true}};window.__PREVIEW=%s;" % json.dumps(html)
    pg = page(b, None, 700, 800, extra=pinfo + "window.api.printPreview=async()=>window.__PREVIEW;"); goto(pg, 'printdlg.html'); pg.wait_for_timeout(700); shot(pg, 'feature_print'); pg.close()
    # settings window
    setj = "const o=window.api.settingsGet; window.api.settingsGet=async()=>({...(await o()),version:'1.14.11',notesCount:6,groups:[{id:'g1',name:'Home'},{id:'g2',name:'Work'}],autoBackup:true,backupCount:7,lastBackup:Date.now()-3600e3,dataPath:'C:/Users/you/OneDrive/StickyPad',dataCustom:true,autoUpdate:true,shortcuts:true,snap:true});"
    pg = page(b, None, 1030, 640, extra=setj); goto(pg, 'settings.html'); pg.click('[data-cat=data]'); pg.wait_for_timeout(300); shot(pg, 'feature_settings_data'); pg.click('[data-cat=about]'); pg.wait_for_timeout(300); shot(pg, 'feature_settings_about'); pg.close()
    b.close()

# (the hero picture and the animations are made by tools/readme_pictures.py)
for f in os.listdir(OUT):
    if f.endswith('.png') and f not in ('hero.png', 'feature_snap.png'):
        Image.open(os.path.join(OUT, f)).save(os.path.join(OUT, f), optimize=True)
print(sorted(os.listdir(OUT)))
