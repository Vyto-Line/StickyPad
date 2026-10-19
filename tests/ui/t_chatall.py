from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); q=b.new_page(viewport={'width':420,'height':640}); errs=[]; q.on('pageerror',lambda e:errs.append(str(e)))
    q.add_init_script(STUB+";window.__chat=null;window.__S_over=1;(function(){var t=setInterval(function(){if(window.api&&!window.__done){window.__done=1;var base=window.api;window.api=new Proxy({chatNotes:async function(){return [{id:'n1',title:'Plan'}]},chatLoad:async function(){return {messages:[],noteId:'*',provider:'ollama',model:'m'}},chatSend:async function(p){window.__chat=p;setTimeout(function(){window.__ev({id:p.id,type:'sources',titles:['Plan','Trip']});window.__ev({id:p.id,type:'chunk',text:'Hello'});window.__ev({id:p.id,type:'done',text:'Hello'})},30)},onChatEvent:function(cb){window.__ev=cb}},{get:function(t,k){return k in t?t[k]:base[k]}});clearInterval(t)}},0)})();")
    q.goto('file://'+ROOT+'chat.html'); q.wait_for_timeout(500)
    ok(q.input_value('#ctx')=='*','"All my notes" is selected (%s)'%q.input_value('#ctx'))
    ok('All my notes' in q.inner_text('#ctx option:nth-child(2)'),'option text')
    q.fill('#input','what is in my plan?') if q.locator('#input').count() else q.fill('textarea','what is in my plan?')
    q.keyboard.press('Enter'); q.wait_for_timeout(500)
    ok(q.evaluate('window.__chat && window.__chat.noteId')=='*','request carries the all-notes marker')
    ok('Looked at: Plan · Trip' in q.inner_text('#msgs'),'sources shown under the answer (%s)'%q.inner_text('#msgs')[:80])
    ok(not errs,'no errors %s'%errs); b.close()
print('FAILS:',fails); import sys; sys.exit(1 if fails else 0)
