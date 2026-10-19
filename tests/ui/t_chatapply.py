from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
def init(note):
    return STUB+";window.__note=%r;window.api.chatLoad=async()=>({messages:[{role:'user',content:'Shorten my note'},{role:'assistant',content:'Book the ferry.\\n- [ ] Hat'}],noteId:window.__note,provider:'ollama',model:'llama3.2:latest'});window.api.chatNotes=async()=>[{id:'n1',title:'Trip'}];window.api.chatApply=async p=>{window.__S.calls.push(['apply',p]);return window.__res||{ok:true,mode:p.mode}};" % note
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    q=b.new_page(viewport={'width':900,'height':600}); q.on('pageerror',lambda e:errs.append(str(e))); q.add_init_script(init('n1'))
    q.goto('file://'+ROOT+'chat.html'); q.wait_for_timeout(500)
    ok(q.is_visible('.acts .apply'),'"Apply to note" shows under an answer when a note is attached')
    q.click('.acts .apply'); q.wait_for_timeout(100)
    ok(q.is_visible('.acts .choice >> text=Replace the note') and q.is_visible('.acts .choice >> text=Add at the end') and not q.is_visible('.acts .apply'),'it asks how: replace or add at the end')
    q.screenshot(path=os.path.join(HERE,'out','chat_apply.png'))
    q.click('.acts .choice >> text=Cancel'); q.wait_for_timeout(50); ok(q.is_visible('.acts .apply') and not q.evaluate("__S.calls.some(c=>c[0]==='apply')"),'Cancel changes nothing')
    q.click('.acts .apply'); q.click('.acts .choice >> text=Replace the note'); q.wait_for_timeout(150)
    ok(q.evaluate("__S.calls.some(c=>c[0]==='apply'&&c[1].noteId==='n1'&&c[1].mode==='replace'&&c[1].text.includes('Book the ferry'))"),'Replace sends the answer and the note')
    ok('Note replaced' in q.inner_text('.applymsg') and 'Earlier versions' in q.inner_text('.applymsg'),'it says the note was replaced and where the old text is (%s)'%q.inner_text('.applymsg'))
    q.click('.acts .apply'); q.click('.acts .choice >> text=Add at the end'); q.wait_for_timeout(150)
    ok(q.evaluate("__S.calls.some(c=>c[0]==='apply'&&c[1].mode==='append')") and 'Added' in q.inner_text('.applymsg'),'Add at the end appends')
    q.select_option('#ctx',''); q.wait_for_timeout(100); ok(not q.is_visible('.acts .apply'),'no note picked: no Apply button')
    q.select_option('#ctx','*'); q.wait_for_timeout(100); ok(not q.is_visible('.acts .apply'),'"All my notes": no Apply button (it would not know which note)')
    q.select_option('#ctx','n1'); q.wait_for_timeout(100); ok(q.is_visible('.acts .apply'),'picking a note brings the button back')
    q2=b.new_page(viewport={'width':900,'height':600}); q2.on('pageerror',lambda e:errs.append(str(e))); q2.add_init_script(init('n1')+";window.__res={ok:false,error:'That note is locked. Unlock it first.'}")
    q2.goto('file://'+ROOT+'chat.html'); q2.wait_for_timeout(400); q2.click('.acts .apply'); q2.click('.acts .choice >> text=Replace the note'); q2.wait_for_timeout(150)
    ok('locked' in q2.inner_text('.applymsg'),'an error from the app is shown (%s)'%q2.inner_text('.applymsg'))
    ok(not errs,'no script errors %s'%errs); b.close()
import sys; sys.exit(1 if fails else 0)
