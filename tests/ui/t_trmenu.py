from playwright.sync_api import sync_playwright
import os, sys, json
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ROOT='file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/'
def page(b,text):
    pg=b.new_page(viewport={'width':330,'height':520}); pg.add_init_script("window.__BLOCKS="+json.dumps([{'t':'text','v':text}])+";"+STUB)
    pg.goto(ROOT+'note.html'); pg.wait_for_timeout(500); pg.click('#cfg'); pg.wait_for_timeout(400); return pg
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    pg=page(b,'Καλημέρα, τι κάνεις σήμερα;'); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.click('#aiTr'); pg.wait_for_timeout(200)
    ok(pg.is_visible('#trmenu'),'Translate… opens the menu')
    ok(pg.inner_text('#trFrom')=='Greek (Auto-detected)','source shows "Greek (Auto-detected)" (%r)'%pg.inner_text('#trFrom'))
    ok(pg.locator('.tritem').count()==13,'13 languages listed')
    ok(pg.is_disabled('.tritem[data-code=el]') and 'same as the note' in pg.inner_text('.tritem[data-code=el]'),'the note\'s own language is greyed out')
    pg.fill('#trSearch','span'); ok(pg.locator('.tritem').count()==1,'search narrows the list')
    pg.fill('#trSearch','日本'); ok(pg.locator('.tritem[data-code=ja]').count()==1,'search also matches native names')
    pg.fill('#trSearch',''); pg.keyboard.press('Escape'); ok(not pg.is_visible('#trmenu') and pg.is_visible('#aiTr'),'Escape closes the menu and the panel stays')
    pg.click('#aiTr'); ok(pg.is_visible('#trmenu'),'the button opens it again'); pg.click('#aiTr'); ok(not pg.is_visible('#trmenu'),'and closes it')
    ok(pg.evaluate("document.querySelector('#trmenu').closest('#panel')!==null"),'the menu sits inside the panel (not a window-wide overlay)')
    ok(pg.evaluate("document.querySelector('#trmenu').getBoundingClientRect().width")<pg.evaluate("document.documentElement.clientWidth")-20,'and is narrower than the window')
    pg.click('#aiTr'); pg.click('.tritem[data-code=es]'); pg.wait_for_timeout(600)
    ok(pg.evaluate('__S.lastTo')=='es' and pg.evaluate("__S.calls.some(c=>c[0]=='edit'&&c[1]=='translate')"),'picking Spanish sends a translate edit with to=es (%r)'%pg.evaluate('__S.lastTo'))
    pg.wait_for_timeout(800)
    pg.click('#cfg'); pg.click('#aiTr'); pg.wait_for_timeout(100)
    ok(pg.evaluate("document.activeElement.dataset.code")=='es','the last language is remembered and focused (%r)'%pg.evaluate("document.activeElement.dataset.code"))
    pg.keyboard.press('Escape')
    q=page(b,'Remember to send the file to the team and call you'); q.click('#aiTr'); q.wait_for_timeout(100)
    ok(q.inner_text('#trFrom')=='English (Auto-detected)' and q.is_disabled('.tritem[data-code=en]'),'English note detected')
    q=page(b,'ok'); q.click('#aiTr'); q.wait_for_timeout(100)
    ok(q.inner_text('#trFrom')=='Auto-detected' and not q.is_disabled('.tritem[data-code=el]'),'unclear text: plain "Auto-detected", nothing greyed')
    ok(not errs,'no errors %s'%errs); b.close()
sys.exit(1 if fails else 0)
