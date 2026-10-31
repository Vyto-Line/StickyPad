import sys, os
HERE=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read(); OUT=os.path.join(HERE,'out'); os.makedirs(OUT,exist_ok=True)
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    pg=b.new_page(viewport={'width':420,'height':520}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script("window.__BLOCKS=[{t:'text',v:'hello'}];"+STUB); pg.goto('file://'+ROOT+'note.html'); pg.wait_for_timeout(500)
    pg.click('#ed'); pg.keyboard.press('Control+/'); pg.wait_for_timeout(150)
    ok(pg.is_visible('#kh'),'Ctrl+/ opens the list in a note')
    t=pg.inner_text('#kh')
    ok('Keep on top' in t and 'Ctrl+Shift+P' in t and 'Bold' in t and 'Ctrl+B' in t and 'Paste as plain text' in t and 'Search all notes' in t,'it lists note and Windows-wide shortcuts')
    pg.screenshot(path=os.path.join(OUT,'keyshelp.png'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100); ok(not pg.is_visible('#kh'),'Esc closes it')
    pg.keyboard.press('Control+/'); pg.wait_for_timeout(100); pg.keyboard.press('Control+/'); pg.wait_for_timeout(100); ok(not pg.is_visible('#kh'),'Ctrl+/ again closes it')
    # Keep on top
    before=pg.evaluate("note.pinned"); pg.click('#ed'); pg.keyboard.press('Control+Shift+P'); pg.wait_for_timeout(200)
    ok(pg.evaluate("note.pinned")!=before and ['pin',not before] in pg.evaluate("window.__S.calls"),'Ctrl+Shift+P toggles Keep on top')
    pg.keyboard.press('Control+Shift+P'); pg.wait_for_timeout(200); ok(pg.evaluate("note.pinned")==before,'and back')
    # Home
    pg.close(); h=b.new_page(viewport={'width':900,'height':600}); h.on('pageerror',lambda e:errs.append(str(e)))
    h.add_init_script(STUB+";window.__S.all={emoji:'',greeting:'Hi',groups:[],trash:[],prefs:{},notes:[]};"); h.goto('file://'+ROOT+'all.html'); h.wait_for_timeout(500)
    h.keyboard.press('Control+/'); h.wait_for_timeout(150); ok(h.is_visible('#kh') and 'in home' in h.inner_text('#kh').lower(),'Ctrl+/ in Home')
    ok(not errs,'no page errors %s'%errs)
print('FAILS:',fails); sys.exit(1 if fails else 0)
