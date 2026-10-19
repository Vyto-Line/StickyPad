from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
def init(prov, model, models):
    return STUB+";window.__prov=%r;window.__model=%r;window.__S.ol.models=%s;window.api.chatLoad=async()=>({messages:[],noteId:null,provider:window.__prov,model:window.__model});window.api.aiSet=async p=>{window.__S.calls.push(['aiSet',p]);if(p.model!=null)window.__model=p.model;return true};window.api.home=async(a,b)=>{window.__S.calls.push(['home',a,b])};" % (prov, model, models)
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    q=b.new_page(viewport={'width':520,'height':600}); q.on('pageerror',lambda e:errs.append(str(e)))
    q.add_init_script(init('ollama','gemma4:e4b',"[{name:'llama3.2:latest',size:2e9},{name:'gemma4:e4b',size:5e9}]"))
    q.goto('file://'+ROOT+'chat.html'); q.wait_for_timeout(500)
    ok(q.is_visible('#mdlchip') and not q.is_visible('#aiOff'),'model chip shown when the AI is on')
    opts=q.eval_on_selector_all('#mdl option','e=>e.map(o=>o.textContent)')
    ok(opts[:2]==['llama3.2:latest','gemma4:e4b'] and opts[-1].startswith('Get more models'),'lists installed models, in order, then "Get more" (%s)'%opts)
    ok(q.eval_on_selector('#mdl','e=>e.value')=='gemma4:e4b','current model is selected')
    q.select_option('#mdl','llama3.2:latest'); q.wait_for_timeout(300)
    ok(q.evaluate("__S.calls.some(c=>c[0]==='aiSet'&&c[1].model==='llama3.2:latest')"),'choosing a model saves it')
    ok('llama3.2:latest' in q.inner_text('#status'),'status line shows the new model (%s)'%q.inner_text('#status'))
    q.select_option('#mdl','__more'); q.wait_for_timeout(200)
    ok(q.evaluate("__S.calls.some(c=>c[0]==='home'&&c[1]==='settings'&&c[2]==='ai')"),'"Get more models" opens Settings > AI')
    q.screenshot(path=os.path.join(HERE,'out','chat_model.png'))
    q2=b.new_page(viewport={'width':520,'height':600}); q2.on('pageerror',lambda e:errs.append(str(e)))
    q2.add_init_script(init('off','',"[]")); q2.goto('file://'+ROOT+'chat.html'); q2.wait_for_timeout(400)
    ok(q2.is_visible('#aiOff') and not q2.is_visible('#mdlchip'),'AI off: a button to set it up instead of the model chip')
    q2.click('#aiOff'); q2.wait_for_timeout(100)
    ok(q2.evaluate("__S.calls.some(c=>c[0]==='home'&&c[2]==='ai')"),'the button opens Settings > AI')
    ok('Settings > AI' in q2.inner_text('#status'),'hint points at Settings (%s)'%q2.inner_text('#status'))
    q3=b.new_page(viewport={'width':520,'height':600}); q3.on('pageerror',lambda e:errs.append(str(e)))
    q3.add_init_script(init('ollama','',"[]")); q3.goto('file://'+ROOT+'chat.html'); q3.wait_for_timeout(400)
    ok(q3.eval_on_selector_all('#mdl option','e=>e.map(o=>o.textContent)')[0]=='No model installed','no models installed says so')
    q4=b.new_page(viewport={'width':520,'height':600}); q4.on('pageerror',lambda e:errs.append(str(e)))
    q4.add_init_script(init('claude','claude-sonnet-5-5',"[]")); q4.goto('file://'+ROOT+'chat.html'); q4.wait_for_timeout(400)
    ok('claude-opus-5-5' in q4.eval_on_selector_all('#mdl option','e=>e.map(o=>o.value)') and q4.eval_on_selector('#mdl','e=>e.value')=='claude-sonnet-5-5','Claude: usual models, current one selected')
    ok(not errs,'no script errors %s'%errs); b.close()
import sys; sys.exit(1 if fails else 0)
