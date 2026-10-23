from playwright.sync_api import sync_playwright
import os, sys
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ROOT='file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/'
SEED="""window.__S.chats=[
 {id:'a',title:'Plan my day',messages:[{role:'user',content:'Plan my day'},{role:'assistant',content:'Start with email.'}],updated:3000},
 {id:'b',title:'VPN question',messages:[{role:'user',content:'How does a VPN work?'},{role:'assistant',content:'It is a tunnel.'}],updated:2000},
 {id:'c',title:'Trip ideas',messages:[{role:'user',content:'Trip ideas'},{role:'assistant',content:'Lisbon.'}],updated:1000}];window.__S.chatCur='a';"""
def page(b,extra=''):
    q=b.new_page(viewport={'width':1000,'height':640}); q.add_init_script(STUB+';'+SEED+extra); q.goto(ROOT+'chat.html'); q.wait_for_timeout(600); return q
titles=lambda q: q.eval_on_selector_all('.crow .t','e=>e.map(x=>x.textContent)')
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    q=page(b); q.on('pageerror',lambda e:errs.append(str(e)))
    ok(q.is_visible('#chats'),'the list of chats is visible')
    ok(titles(q)==['Plan my day','VPN question','Trip ideas'],'chats listed newest first (%s)'%titles(q))
    ok(q.locator('.crow.cur .t').inner_text()=='Plan my day' and 'Start with email' in q.inner_text('#msgs'),'the current chat is marked and drawn')
    q.click('.crow[data-id=b] .citem'); q.wait_for_timeout(300)
    ok('tunnel' in q.inner_text('#msgs') and 'Start with email' not in q.inner_text('#msgs'),'clicking a chat shows it')
    ok(q.locator('.crow.cur').get_attribute('data-id')=='b','and marks it as the current one')
    q.fill('#chatSearch','lisbon'); q.wait_for_timeout(400)
    ok(titles(q)==['Trip ideas'],'search finds text inside a chat (%s)'%titles(q))
    q.fill('#chatSearch','zzz'); q.wait_for_timeout(400); ok('No chat matches' in q.inner_text('#chatList'),'empty search says so')
    q.fill('#chatSearch',''); q.wait_for_timeout(400)
    # menu: pin
    q.hover('.crow[data-id=c]'); q.click('.crow[data-id=c] .cmore'); ok(q.is_visible('.cmenu'),'the ... menu opens')
    ok([x.strip() for x in q.eval_on_selector_all('.cmenu button','e=>e.map(x=>x.textContent)')]==['Rename','Pin to top','Save as note','Delete chat'],'menu has rename, pin, save as note, delete')
    q.click('.cmenu >> text=Pin to top'); q.wait_for_timeout(300)
    ok(titles(q)[0]=='Trip ideas' and q.locator('.crow[data-id=c] .pin').count()==1,'pinned chat moves to the top')
    # rename
    q.hover('.crow[data-id=a]'); q.click('.crow[data-id=a] .cmore'); q.click('.cmenu >> text=Rename'); q.fill('.crename','Morning plan'); q.keyboard.press('Enter'); q.wait_for_timeout(300)
    ok('Morning plan' in titles(q),'rename works (%s)'%titles(q))
    # save as note
    q.hover('.crow[data-id=b]'); q.click('.crow[data-id=b] .cmore'); q.click('.cmenu >> text=Save as note'); q.wait_for_timeout(200)
    ok(q.evaluate("__S.calls.some(c=>c[0]=='chatToNote'&&c[1]=='b')"),'save as note sends the chat')
    # delete asks first; Keep cancels
    q.hover('.crow[data-id=b]'); q.click('.crow[data-id=b] .cmore'); q.click('.cmenu >> text=Delete chat'); q.wait_for_timeout(100)
    ok(q.is_visible('.cask') and 'Delete this chat?' in q.inner_text('.cask'),'delete asks first, in the row')
    q.click('.cask >> text=Keep'); q.wait_for_timeout(200); ok('VPN question' in titles(q),'Keep leaves the chat alone')
    q.hover('.crow[data-id=b]'); q.click('.crow[data-id=b] .cmore'); q.click('.cmenu >> text=Delete chat'); q.click('.cask .yes'); q.wait_for_timeout(400)
    ok('VPN question' not in titles(q),'Delete removes the chat')
    ok('tunnel' not in q.inner_text('#msgs'),'deleting the open chat opens another, not the deleted one')
    # new chat keeps the old ones
    q.click('#listNew'); q.wait_for_timeout(300); ok(q.is_visible('#empty') and len(titles(q))==2,'+ New starts an empty chat and keeps the others')
    # delete all needs two clicks
    q.click('#delAll'); ok(len(titles(q))==2 and 'Sure?' in q.inner_text('#delAll'),'Delete all asks first')
    q.click('#delAll'); q.wait_for_timeout(400); ok(len(titles(q))==0 and 'Your chats show up here' in q.inner_text('#chatList'),'second click deletes everything')
    # toggle
    q.click('#toggleChats'); ok(not q.is_visible('#chats'),'the Chats button hides the list'); q.click('#toggleChats'); ok(q.is_visible('#chats'),'and shows it again')
    # history off note
    r=page(b,"window.__S.chatHistory=false;"); ok(r.is_visible('#histNote'),'a note explains when history is off')
    # narrow window starts with the list hidden
    n=b.new_page(viewport={'width':700,'height':640}); n.add_init_script(STUB+';'+SEED); n.goto(ROOT+'chat.html'); n.wait_for_timeout(500); ok(not n.is_visible('#chats'),'narrow window: list starts hidden')
    ok(not errs,'no errors %s'%errs); b.close()
sys.exit(1 if fails else 0)
