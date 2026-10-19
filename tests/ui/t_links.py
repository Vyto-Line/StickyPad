from playwright.sync_api import sync_playwright
import os, time, datetime
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
def where(q, word, k=4):
    return q.evaluate("""(w)=>{const tw=document.createTreeWalker(document.querySelector('#ed'),NodeFilter.SHOW_TEXT);for(let n=tw.nextNode();n;n=tw.nextNode()){const i=n.nodeValue.indexOf(w);if(i>=0){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+3);const b=r.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]}}return null}""", word)
def page(b, js='', blocks=None):
    q=b.new_page(viewport={'width':360,'height':440}); q.errs=[]; q.on('pageerror',lambda e:q.errs.append(str(e))); q.add_init_script(('window.__BLOCKS=%s;'%blocks if blocks else '')+STUB+';'+js)
    q.goto('file://'+ROOT+'note.html'); q.wait_for_timeout(1200); return q
with sync_playwright() as p:
    b=p.chromium.launch()
    # ---- links ----
    q=page(b,'',"[{t:'text',v:'Read https://example.com/docs now.\\nMail me: me@example.org\\nplain text'}]")
    n=q.evaluate("CSS.highlights.get('links') ? CSS.highlights.get('links').size : -1"); ok(n==2,'two links are underlined (%s)'%n)
    pos=where(q,'example.com')
    q.mouse.click(pos[0],pos[1]); q.wait_for_timeout(100)
    ok(not [c for c in q.evaluate('__S.calls') if c[0]=='openLink'],'a plain click does not open the link (it edits the text)')
    q.keyboard.down('Control'); q.mouse.click(pos[0],pos[1]); q.keyboard.up('Control'); q.wait_for_timeout(100)
    ok(['openLink','https://example.com/docs'] in q.evaluate('__S.calls'),'Ctrl+click opens the link without the full stop')
    q.keyboard.down('Control'); q.mouse.move(pos[0],pos[1]); q.mouse.move(pos[0]+1,pos[1]); q.wait_for_timeout(80)
    ok(q.evaluate("document.getElementById('ed').classList.contains('linkhover')"),'pointer cursor over a link while Ctrl is held'); q.keyboard.up('Control')
    pos2=where(q,'plain')
    before=len(q.evaluate('__S.calls')); q.keyboard.down('Control'); q.mouse.click(pos2[0],pos2[1]); q.keyboard.up('Control')
    ok(len(q.evaluate('__S.calls'))==before,'Ctrl+click on normal text does nothing')
    pos=where(q,'example.com'); q.mouse.click(pos[0],pos[1],button='right'); q.wait_for_timeout(100)
    ok(['linkMenu','https://example.com/docs'] in q.evaluate('__S.calls'),'right-click on a link asks for the link menu')
    pos2=where(q,'plain'); n0=len(q.evaluate('__S.calls')); q.mouse.click(pos2[0],pos2[1],button='right'); q.wait_for_timeout(100)
    ok(len([c for c in q.evaluate('__S.calls') if c[0]=='linkMenu'])==1,'right-click on normal text does not')
    ok(not q.errs,'no errors %s'%q.errs); q.close()
    # ---- date suggestion ----
    q=page(b,'',"[{t:'text',v:'Dentist tomorrow at 5pm'}]")
    ok(q.is_visible('#datebar'),'date bar appears for "tomorrow at 5pm" (%s)'%q.inner_text('#dateTxt'))
    q.click('#dateSet'); q.wait_for_timeout(200)
    calls=[c for c in q.evaluate('__S.calls') if c[0]=='remind']
    t=datetime.datetime.fromtimestamp(calls[0][1]/1000) if calls else None
    ok(t and t.hour==17 and t.minute==0 and t.date()==(datetime.date.today()+datetime.timedelta(days=1)),'reminder set for tomorrow 17:00 (%s)'%t)
    ok(not q.is_visible('#datebar'),'bar closes after setting'); q.close()
    q=page(b,'',"[{t:'text',v:'Call Nick στις 23:59 σήμερα'}]"); q.wait_for_timeout(200)
    q.click('#dateNo'); q.wait_for_timeout(1000); ok(not q.is_visible('#datebar'),'Not now hides it for this date'); q.close()
    q=page(b,'',"[{t:'text',v:'price 5.50 and room 12'}]"); ok(not q.is_visible('#datebar'),'no suggestion for ordinary numbers'); q.close()
    q=page(b,'window.__S.note.suggestDates=false',"[{t:'text',v:'tomorrow 9am'}]"); ok(not q.is_visible('#datebar'),'switched off in settings -> no suggestion'); q.close()
    # ---- title ----
    q=page(b,'',"[{t:'text',v:'milk bread eggs'}]"); q.click('#cfg'); q.wait_for_timeout(100)
    q.evaluate("__S.calls.length=0"); q.select_option('#aiAction','title'); q.click('#aiRun'); q.wait_for_timeout(400)
    ok('ok' in q.inner_text('#aiBody') and q.is_visible('#aibox'),'suggested title is shown')
    q.click('#aiActs .btn.primary'); q.wait_for_timeout(300)
    ok(q.input_value('#topic')=='ok' and [c for c in q.evaluate('__S.calls') if c[0]=='update' and c[1].get('title')=='ok'],'Use this title puts it in the topic and saves')
    ok(not q.errs,'no errors %s'%q.errs); q.close()
    # ---- custom shortcuts ----
    q=page(b,"window.__S.note.keys={n_new:'Ctrl+N',n_todo:'Alt+T',n_find:'Ctrl+Alt+G',n_copy:'Ctrl+Shift+T',n_edit:'Ctrl+Shift+E',n_settings:'Ctrl+,'}")
    q.click('#ed'); q.keyboard.press('Control+f'); q.wait_for_timeout(100); ok(not q.is_visible('#findbar'),'old Ctrl+F no longer opens find')
    q.keyboard.press('Control+Alt+g'); q.wait_for_timeout(100); ok(q.is_visible('#findbar'),'custom Ctrl+Alt+G opens find')
    q.keyboard.press('Escape'); q.wait_for_timeout(50)
    q.click('#ed'); q.keyboard.press('Alt+t'); q.wait_for_timeout(100); ok(q.evaluate("!!document.querySelector('#ed .todo')"),'custom Alt+T adds a checklist item')
    q.evaluate("window.__emitKeys && 0"); ok(not q.errs,'no errors %s'%q.errs); q.close()
    b.close()
print('FAILS:',fails); import sys; sys.exit(1 if fails else 0)
