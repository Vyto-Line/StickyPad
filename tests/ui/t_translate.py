from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':330,'height':420}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.add_init_script(STUB)
    pg.goto('file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/note.html'); pg.wait_for_timeout(300)
    pg.click('#cfg'); pg.wait_for_timeout(50); pg.wait_for_timeout(300)
    ok(pg.is_visible('#aiRun') and not pg.is_disabled('#aiRun') and pg.evaluate("[...document.querySelectorAll('#aiAction option')].some(o=>o.value=='translate')"),'Translate is in the AI list and Run is enabled')
    ok(pg.evaluate("[...document.querySelectorAll('#editMode option')].some(o=>o.value=='translate')"),'dropdown has the translate option')
    # model installed (stub has llama3.2:latest, config says llama3.2) -> normal hint
    ok('not installed' not in pg.inner_text('#aiHint'),'no warning when the model is installed (%s)'%pg.inner_text('#aiHint'))
    def fresh(js):
        q=b.new_page(viewport={'width':330,'height':420}); q.add_init_script(STUB+';'+js)
        q.goto('file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/note.html'); q.wait_for_timeout(300); q.click('#cfg'); q.wait_for_timeout(50); q.wait_for_timeout(500); return q
    q=fresh("window.__S.ai.model='gemma3:4b'")
    ok('not installed' in q.inner_text('#aiHint') and 'gemma3:4b' in q.inner_text('#aiHint'),'warns when the model is missing (%s)'%q.inner_text('#aiHint'))
    q=fresh("window.__S.ol.running=false")
    ok('not running' in q.inner_text('#aiHint'),'warns when Ollama is off (%s)'%q.inner_text('#aiHint'))
    ok(not errs,'no errors %s'%errs); b.close()
import sys; sys.exit(1 if fails else 0)
