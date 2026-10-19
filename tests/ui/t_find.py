from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':330,'height':420}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.add_init_script(STUB)
    pg.goto('file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/note.html'); pg.wait_for_timeout(300)
    pg.evaluate("""()=>{const e=document.getElementById('ed');e.textContent='';
      e.appendChild(document.createTextNode('Καλημέρα κόσμε\\nthe Cat sat\\nκαλημερα again\\n'));
      const d=document.createElement('div');d.className='todo';d.innerHTML='<input type=checkbox><span class=tx>buy a cat food</span><button class=x>×</button>';e.appendChild(d)}""")
    pg.locator('#ed').click(); pg.keyboard.press('Control+f'); pg.wait_for_timeout(100)
    ok(pg.is_visible('#findbar'),'Ctrl+F opens the bar')
    pg.keyboard.type('cat'); pg.wait_for_timeout(400)
    ok(pg.inner_text('#findCnt').strip()=='1 / 2','finds "cat" case-insensitively in text and checklist (%s)'%pg.inner_text('#findCnt'))
    pg.keyboard.press('Enter'); ok(pg.inner_text('#findCnt').strip()=='2 / 2','Enter goes to next')
    pg.keyboard.press('Shift+Enter'); ok(pg.inner_text('#findCnt').strip()=='1 / 2','Shift+Enter goes back')
    pg.fill('#findIn','καλημερα'); pg.wait_for_timeout(400)
    ok(pg.inner_text('#findCnt').strip()=='1 / 2','Greek accents are ignored (%s)'%pg.inner_text('#findCnt'))
    pg.fill('#findIn','zzz'); pg.wait_for_timeout(400); ok('No match' in pg.inner_text('#findCnt'),'no match message')
    ok(pg.evaluate("document.getElementById('ed').querySelectorAll('mark,span.hl').length")==0,'DOM untouched by highlighting')
    pg.keyboard.press('Escape'); ok(not pg.is_visible('#findbar'),'Esc closes the bar')
    ok(not errs,'no errors %s'%errs); b.close()
import sys; sys.exit(1 if fails else 0)
