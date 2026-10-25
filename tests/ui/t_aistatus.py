from playwright.sync_api import sync_playwright
import os, sys
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ROOT='file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/'
BL0="window.__BLOCKS=[{t:'text',v:'intro tpyo'},{t:'check',v:'buy mlik',done:false},{t:'check',v:'call doctor',done:false},{t:'text',v:'tail txt'}];"
def page(b,extra=''):
    pg=b.new_page(viewport={'width':380,'height':560}); pg.add_init_script((BL0 if extra.startswith('BLK') else '')+STUB+extra.replace('BLK','')); pg.goto(ROOT+'note.html'); pg.wait_for_timeout(500); return pg
BL="window.__BLOCKS=[{t:'text',v:'intro tpyo'},{t:'check',v:'buy mlik',done:false},{t:'check',v:'call doctor',done:false},{t:'text',v:'tail txt'}];"
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    # the model line
    pg=page(b,"window.__S.ol.running=true;window.__S.ol.models=[{name:'qwen3:14b',size:9e9}];window.__S.loaded=['qwen3:14b'];window.__S.ai={provider:'ollama',model:'qwen3:14b',url:'http://x'};"); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.evaluate("document.querySelector('#cfg').click()"); pg.wait_for_timeout(300); pg.evaluate("showTab('ai')"); pg.wait_for_timeout(500)
    t=pg.inner_text('#aiLoad') if pg.is_visible('#aiLoad') else '(hidden)'
    ok(t=='Qwen3 14B · ready','the model is named and ready (%s)'%t)
    q=page(b,"window.__S.ol.running=true;window.__S.ol.models=[{name:'qwen3:14b',size:9e9}];window.__S.loaded=[];window.__S.ai={provider:'ollama',model:'qwen3:14b',url:'http://x'};")
    q.evaluate("document.querySelector('#cfg').click()"); q.wait_for_timeout(300); q.evaluate("showTab('ai')"); q.wait_for_timeout(500)
    t=q.inner_text('#aiLoad') if q.is_visible('#aiLoad') else '(hidden)'
    ok(t=='Qwen3 14B · loads when you use it','not loaded yet: it says so (%s)'%t)
    ok(q.evaluate("document.querySelector('#aiLoad').classList.contains('wait')"),'with an empty circle instead of a dot')
    r=page(b,"window.__S.ol.running=false;window.__S.ai={provider:'ollama',model:'qwen3:14b',url:'http://x'};")
    r.evaluate("document.querySelector('#cfg').click()"); r.wait_for_timeout(300); r.evaluate("showTab('ai')"); r.wait_for_timeout(500)
    ok(not r.is_visible('#aiLoad'),'Ollama not running: no status line (the hint explains)')
    o=page(b,"window.__S.ai={provider:'off',model:'',url:''};"); o.evaluate("document.querySelector('#cfg').click()"); o.wait_for_timeout(300); o.evaluate("showTab('ai')"); o.wait_for_timeout(300)
    ok(not o.is_visible('#aiLoad'),'AI off: no status line')
    # the Done bar
    w=page(b,'BLK'+"window.__S.editDelay=10;window.__S.editOut='REDONE';")
    w.evaluate("document.querySelector('#ed').focus()")
    w.evaluate("document.querySelector('#editMode').value='polish'; document.querySelector('#aiEdit').click()"); w.wait_for_timeout(1500)
    m=w.inner_text('#editMsg'); ok(m=='Done: 4 parts changed','whole note, every part changed: "%s"'%m)
    ok(errs==[],'no errors %s'%errs); b.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
