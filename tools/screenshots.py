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

def panel(pg, tab):
    pg.set_viewport_size({'width': 360, 'height': 900}); pg.wait_for_timeout(150)
    pg.click('#cfg'); pg.click('[data-tab=%s]' % tab); pg.wait_for_timeout(350)

def shot_panel(pg, name):
    h = pg.evaluate("(()=>{const r=document.getElementById('panel').getBoundingClientRect();return Math.ceil(r.bottom)+4})()")
    pg.screenshot(path=os.path.join(OUT, name + '.png'), clip={'x': 0, 'y': 0, 'width': 360, 'height': min(h, 900)})

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
    pg.click('#histBtn'); pg.wait_for_timeout(400); shot_panel(pg, 'feature_history'); pg.close()
    # AI tab
    pg = page(b, 'greek'); goto(pg, 'note.html'); panel(pg, 'ai'); shot_panel(pg, 'feature_ai'); pg.close()
    # style tab with themes
    pg = page(b, 'ideas'); goto(pg, 'note.html'); panel(pg, 'style'); shot_panel(pg, 'feature_style'); pg.close()
    # all notes
    allj = '''window.api.allList = async () => ({ emoji: '☀️', greeting: 'Good morning', notes: [
      {id:'a',title:'Groceries',text:'For the weekend dinner\\n☑ Tomatoes and basil\\n☐ Olive oil',color:'#FFF2A8',group:'g1',updated:Date.now()-3e5,open:true},
      {id:'b',title:'Crete trip',text:'Book the ferry before Friday. Samaria Gorge: start at 7:00',color:'#B9E4FF',group:'g2',updated:Date.now()-36e5,open:true},
      {id:'c',title:'Σημειώσεις',text:'Καλημέρα! Σήμερα έχουμε συνάντηση στις 11:00',color:'#FFD1E3',group:null,updated:Date.now()-72e5,open:true},
      {id:'d',title:'Meeting',text:'Agenda: Budget review, Launch date',color:'#2E3440',group:'g2',updated:Date.now()-864e5,open:false},
      {id:'e',title:'Passwords hint',text:'Locked note',color:'#D9F2C2',group:null,updated:Date.now()-2*864e5,open:false,locked:true},
      {id:'f',title:'Reading list',text:'Dune, The Left Hand of Darkness',color:'#E6D5FF',group:'g1',updated:Date.now()-5*864e5,open:false}],
      groups: [{id:'g1',name:'Home',collapsed:false},{id:'g2',name:'Work',collapsed:false}], trash: [], prefs: {} });'''
    pg = page(b, None, 420, 600, extra=allj); goto(pg, 'all.html'); shot(pg, 'feature_all'); pg.close()
    # settings window
    setj = "const o=window.api.settingsGet; window.api.settingsGet=async()=>({...(await o()),version:'1.13.2',notesCount:6,groups:[{id:'g1',name:'Home'},{id:'g2',name:'Work'}],autoBackup:true,backupCount:7,lastBackup:Date.now()-3600e3,dataPath:'C:/Users/you/OneDrive/StickyPad',dataCustom:true,autoUpdate:true,shortcuts:true,snap:true});"
    pg = page(b, None, 860, 640, extra=setj); goto(pg, 'settings.html'); pg.click('[data-cat=data]'); pg.wait_for_timeout(300); shot(pg, 'feature_settings_data'); pg.click('[data-cat=about]'); pg.wait_for_timeout(300); shot(pg, 'feature_settings_about'); pg.close()
    b.close()

# --- the hero picture: three notes on a desktop-like background ---
def card(name, radius=14):
    im = Image.open(os.path.join(OUT, name + '.png')).convert('RGBA')
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], radius * SCALE, fill=255)
    im.putalpha(m); return im
def shadow(im, blur=22, off=(0, 14), alpha=110):
    pad = blur * 3; sh = Image.new('RGBA', (im.size[0] + pad * 2, im.size[1] + pad * 2), (0, 0, 0, 0))
    a = Image.new('L', im.size, alpha); a = Image.composite(a, Image.new('L', im.size, 0), im.split()[3])
    sh.paste((0, 0, 0, 255), (pad + off[0], pad + off[1]), a); return sh.filter(ImageFilter.GaussianBlur(blur)), pad
order = ['note_groceries', 'note_ideas', 'feature_find_greek', 'note_dark']
ims = [card(n) for n in order]
GAP, MARGIN, TOPS = 30 * SCALE, 48 * SCALE, [60 * SCALE, 24 * SCALE, 90 * SCALE, 40 * SCALE]
W = MARGIN * 2 + sum(i.size[0] for i in ims) + GAP * (len(ims) - 1); H = max(t + i.size[1] for t, i in zip(TOPS, ims)) + 60 * SCALE
bg = Image.new('RGBA', (W, H)); px = bg.load()
for y in range(H):
    for x in range(W):
        t = x / W * 0.65 + y / H * 0.35
        px[x, y] = (int(34 + 74 * t), int(48 + 44 * t), int(96 + 96 * t), 255)
x = MARGIN
for im, top in zip(ims, TOPS):
    sh, pad = shadow(im); bg.alpha_composite(sh, (x - pad, top - pad)); bg.alpha_composite(im, (x, top)); x += im.size[0] + GAP
bg = bg.convert('RGB'); bg = bg.resize((1800, round(1800 * H / W)), Image.LANCZOS); bg.save(os.path.join(OUT, 'hero.png'), optimize=True)
for f in os.listdir(OUT):
    if f.endswith('.png') and f != 'hero.png':
        Image.open(os.path.join(OUT, f)).save(os.path.join(OUT, f), optimize=True)
print(sorted(os.listdir(OUT)))
