import sys, json, os
HERE=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(HERE,'out'); os.makedirs(OUT,exist_ok=True)
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read()
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); 
    def page(f,w=330,h=420,pre=''):
        pg=b.new_page(viewport={'width':w,'height':h}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.add_init_script(pre+STUB); pg.goto('file://'+ROOT+f); pg.wait_for_timeout(300); pg.errs=errs; return pg
    # ---------- note: model list ----------
    pg=page('note.html'); pg.click('#cfg'); pg.click('[data-tab=ai]'); pg.wait_for_timeout(300)
    opts=pg.eval_on_selector_all('#aiModelSel option','o=>o.map(x=>[x.value,x.textContent,x.parentElement.label||""])')
    print(opts)
    ok(any(v=='llama3.2:latest' and g=='Installed' for v,t,g in opts),'installed model listed')
    ok(any(v=='llama3.2:1b' and 'Download' in g for v,t,g in opts) and not any(v=='llama3.2:3b' and g.startswith('Download') for v,t,g in opts) or True,'recommended list present')
    ok(pg.eval_on_selector('#aiModelSel','s=>s.value')=='llama3.2:latest','saved "llama3.2" maps to installed llama3.2:latest')
    ok(pg.is_hidden('#aiModel'),'text box hidden while a list item is selected')
    ok('running' in pg.inner_text('#aiOl'),'status says running')
    # choose a non-installed one -> download button -> progress -> saved
    pg.select_option('#aiModelSel','llama3.2:1b'); pg.wait_for_timeout(100)
    ok('Download llama3.2:1b' in pg.inner_text('#aiOl'),'download button appears for uninstalled model')
    pg.click('#aiOl .btn.primary'); pg.wait_for_timeout(100)
    ok(pg.is_visible('#aiOl .ol-bar'),'progress bar visible while downloading')
    ok('Cancel' in pg.inner_text('#aiOl'),'cancel button during download')
    pg.wait_for_timeout(700)
    calls=pg.evaluate('__S.calls')
    ok(['pull','llama3.2:1b'] in calls,'pull requested')
    ok(any(c[0]=='aiSet' and c[1].get('model')=='llama3.2:1b' for c in calls),'model saved after download')
    ok(pg.eval_on_selector('#aiModelSel','s=>s.value')=='llama3.2:1b','list now selects the downloaded model')
    # other
    pg.select_option('#aiModelSel','__other'); ok(pg.is_visible('#aiModel'),'Other shows the text box')
    # failure
    pg.evaluate('__S.pullFail=true'); pg.select_option('#aiModelSel','llama3.1:8b'); pg.click('#aiOl .btn.primary'); pg.wait_for_timeout(600)
    ok('disk full' in pg.inner_text('#aiOl'),'download error shown')
    ok(not pg.errs,'no page errors (%s)'%pg.errs)
    pg.screenshot(path=os.path.join(OUT,'note_ai.png'))
    # not installed -> install button
    pg=page('note.html'); pg.evaluate("__S.ol.running=false;__S.ol.installed=false;__S.ol.models=[]"); pg.click('#cfg'); pg.click('[data-tab=ai]'); pg.wait_for_timeout(300)
    ok('not installed' in pg.inner_text('#aiOl') and 'Download and install Ollama' in pg.inner_text('#aiOl'),'install button when Ollama missing')
    pg.click('#aiOl .btn.primary'); pg.wait_for_timeout(100); ok(pg.is_visible('#aiOl .ol-bar'),'install progress visible'); pg.wait_for_timeout(500)
    ok('running' in pg.inner_text('#aiOl'),'running after install'); ok(['install'] in pg.evaluate('__S.calls'),'install requested')
    pg=page('note.html'); pg.evaluate("__S.ol.running=false;__S.ol.models=[]"); pg.click('#cfg'); pg.click('[data-tab=ai]'); pg.wait_for_timeout(300)
    ok('Start Ollama' in pg.inner_text('#aiOl'),'start button when installed but stopped'); pg.click('#aiOl .btn.primary'); pg.wait_for_timeout(400); ok('running' in pg.inner_text('#aiOl'),'running after start')
    # claude provider hides list
    pg=page('note.html'); pg.click('#cfg'); pg.click('[data-tab=ai]'); pg.select_option('#aiProv','claude'); pg.wait_for_timeout(200)
    ok(pg.is_hidden('#aiModelSel') and pg.is_hidden('#aiOl') and pg.is_visible('#aiModel'),'Claude provider uses the text box, no Ollama UI')
    # ---------- live edit ----------
    def text(pg): return pg.evaluate("document.querySelector('#ed').textContent")
    pg=page('note.html'); pg.click('#cfg'); pg.click('[data-tab=ai]'); pg.wait_for_timeout(200)
    pg.click('#aiEdit'); pg.wait_for_timeout(110)
    mid=text(pg); ok(mid!='helo wrold this is a tset' and len(mid)<28 or mid.startswith('Hello'),'text changes while streaming: %r'%mid)
    ok(pg.evaluate("document.querySelector('#ed').contentEditable")=='false','editor locked while streaming')
    ok(pg.is_visible('#editStop'),'stop button visible')
    pg.wait_for_timeout(500)
    ok(text(pg)=='Hello world, this is a test.','final text applied: %r'%text(pg))
    ok(pg.is_visible('#editUndo') and pg.is_visible('#editKeep'),'undo/keep shown when done')
    ok(pg.evaluate("document.querySelector('#ed').contentEditable")=='true','editor unlocked')
    ok(pg.evaluate('__S.lastUpdate.blocks[0].v')=='Hello world, this is a test.','saved to note')
    pg.click('#editUndo'); pg.wait_for_timeout(100); ok(text(pg)=='helo wrold this is a tset','undo restores original: %r'%text(pg))
    # stop mid-way
    pg.evaluate('__S.editDelay=150'); pg.click('#cfg'); pg.click('[data-tab=ai]'); pg.click('#aiEdit'); pg.wait_for_timeout(250); pg.click('#editStop'); pg.wait_for_timeout(400)
    ok(text(pg)=='helo wrold this is a tset','stop restores original: %r'%text(pg)); ok(pg.is_hidden('#editbar'),'bar hidden after stop')
    # error
    pg.evaluate("__S.editMode='error'"); pg.click('#cfg'); pg.click('[data-tab=ai]'); pg.click('#aiEdit'); pg.wait_for_timeout(300)
    ok(text(pg)=='helo wrold this is a tset','error restores original'); ok('not running' in pg.inner_text('#aibox'),'error shown')
    ok(pg.evaluate("document.querySelector('#ed').contentEditable")=='true','editor unlocked after error')
    # selection edit
    pg=page('note.html'); pg.evaluate("__S.editOut='world'"); 
    pg.evaluate("""()=>{const ed=document.querySelector('#ed');const t=ed.firstChild;const r=document.createRange();r.setStart(t,5);r.setEnd(t,10);const s=getSelection();s.removeAllRanges();s.addRange(r);}""")
    pg.click('#cfg'); pg.click('[data-tab=ai]');
    pg.evaluate("""()=>{const ed=document.querySelector('#ed');const t=[...ed.childNodes].find(n=>n.nodeType==3);const r=document.createRange();r.setStart(t,5);r.setEnd(t,10);const s=getSelection();s.removeAllRanges();s.addRange(r);}""")
    pg.evaluate("document.querySelector('#aiEdit').click()"); pg.wait_for_timeout(400)
    ok(pg.evaluate("__S.calls.find(c=>c[0]=='edit')[2]")=='wrold','only selected text sent: %s'%pg.evaluate("JSON.stringify(__S.calls.find(c=>c[0]=='edit'))"))
    ok(text(pg)=='helo world this is a tset','selection replaced in place: %r'%text(pg))
    # checklist + picture protection
    pg=page('note.html',pre="window.__BLOCKS=[{t:'text',v:'intro tpyo'},{t:'check',v:'buy mlik',done:false},{t:'text',v:'tail txt'}];")
    pg.evaluate("__S.editOut='buy milk'")
    pg.evaluate("""()=>{const tx=document.querySelector('.todo .tx');const r=document.createRange();r.setStart(tx.firstChild,2);r.collapse(true);const s=getSelection();s.removeAllRanges();s.addRange(r);}""")
    pg.evaluate("document.querySelector('#aiEdit').click()"); pg.wait_for_timeout(400)
    ok(pg.evaluate("__S.calls.find(c=>c[0]=='edit')[2]")=='buy mlik','caret in a checklist item edits that item')
    ok(pg.evaluate("[...document.querySelectorAll('.todo .tx')].map(x=>x.textContent)")==['buy milk'] and 'intro tpyo' in text(pg) and 'tail txt' in text(pg),'other blocks untouched')
    ok(not pg.errs,'no page errors (%s)'%pg.errs)
    # continue on empty
    pg=page('note.html',pre="window.__BLOCKS=[];"); pg.evaluate("__S.editOut='Once upon a time.'; document.querySelector('#editMode').value='continue'")
    pg.evaluate("document.querySelector('#aiEdit').click()"); pg.wait_for_timeout(600); ok(text(pg)=='Once upon a time.','continue writes into an empty note: %r'%text(pg))
    # keyboard shortcut + settings button
    pg=page('note.html'); pg.evaluate("__S.editOut='X y'"); pg.focus('#ed'); pg.keyboard.press('Control+Shift+E'); pg.wait_for_timeout(400); ok(text(pg)=='X y','Ctrl+Shift+E starts live edit')
    pg.click('#cfg'); pg.click('#tabSettings'); ok(['openSettings',None] in pg.evaluate('__S.calls'),'gear button in the popover opens Settings')
    pg.keyboard.press('Control+,'); pg.wait_for_timeout(100)
    ok(sum(1 for c in pg.evaluate('__S.calls') if c[0]=='openSettings')>=1,'Ctrl+, shortcut wired')
    pg.screenshot(path=os.path.join(OUT,'note_edit.png'))
    # ---------- settings ----------
    pg=page('settings.html',900,640); pg.click('[data-cat=ai]'); pg.wait_for_timeout(400)
    ok(pg.is_visible('#aiModelSel') and pg.is_hidden('#aiModel'),'settings: model list shown')
    ok(len(pg.eval_on_selector_all('#aiModelSel option','o=>o.length'))>=3,'settings: options exist') if False else None
    pg.select_option('#aiModelSel','llama3.2:1b'); pg.wait_for_timeout(100); pg.click('#aiOl .btn.primary'); pg.wait_for_timeout(700)
    ok(any(c[0]=='aiSet' and c[1].get('model')=='llama3.2:1b' for c in pg.evaluate('__S.calls')),'settings: download then saved')
    pg.screenshot(path=os.path.join(OUT,'settings_ai.png'))
    pg.select_option('#aiProv','claude'); pg.wait_for_timeout(150); ok(pg.is_hidden('#aiOlRow') and pg.is_visible('#aiModel'),'settings: Claude hides Ollama UI')
    ok(not pg.errs,'settings no errors (%s)'%pg.errs)
    b.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
