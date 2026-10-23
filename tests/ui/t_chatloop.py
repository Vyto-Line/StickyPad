from playwright.sync_api import sync_playwright
import os, sys
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
INIT=STUB+""";window.__S.ol.models=[{name:'m',size:1e9}];
window.api.chatLoad=async()=>({messages:[],noteId:null,provider:'ollama',model:'m'});
window.api.chatSend=async p=>{const cb=window.__cb;
  const good='Intro paragraph that is long enough.\\n\\nThe list:\\n\\n- one thing\\n- another thing';
  const bad=good+'\\n\\nThe list:\\n\\n- one thing\\n- another thing\\n\\n';
  setTimeout(()=>{cb({id:p.id,type:'chunk',text:bad});cb({id:p.id,type:'done',text:good});},50); return true;};
const oc=window.api.onChatEvent; window.api.onChatEvent=f=>{window.__cb=f; return oc&&oc(f);};"""
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    q=b.new_page(viewport={'width':520,'height':600}); q.on('pageerror',lambda e:errs.append(str(e)))
    q.add_init_script(INIT); q.goto('file://'+ROOT+'chat.html'); q.wait_for_timeout(500)
    q.fill('#input','write about it'); q.keyboard.press('Enter'); q.wait_for_timeout(700)
    t=q.inner_text('#msgs') if q.query_selector('#msgs') else q.inner_text('body')
    ok(t.count('another thing')==1,'a repeated list is shown once (seen %d times)'%t.count('another thing'))
    ok('Intro paragraph' in t,'the answer itself is kept')
    ok(not errs,'no errors %s'%errs); b.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
