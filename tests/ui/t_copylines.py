from playwright.sync_api import sync_playwright
import os, sys
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ROOT='file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/'
READ="""navigator.clipboard.read().then(async i=>{const o={};for(const t of i[0].types){o[t]=await (await i[0].getType(t)).text()}return o})"""
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(permissions=['clipboard-read','clipboard-write'],viewport={'width':380,'height':420}); errs=[]
    pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script("window.__BLOCKS=[{t:'text',v:'Alpha Bank\\n22 TX\\n18 RX'}];"+STUB); pg.goto(ROOT+'note.html'); pg.wait_for_timeout(500)
    pg.click('#ed'); pg.keyboard.press('Control+a'); pg.keyboard.press('Control+c'); pg.wait_for_timeout(200)
    c=pg.evaluate(READ)
    ok(c['text/plain'].replace('\r','')=='Alpha Bank\n22 TX\n18 RX','plain text keeps the lines (%r)'%c['text/plain'])
    ok('<br>' in c['text/html'] and 'pre-wrap' not in c['text/html'] and 'background' not in c['text/html'],'the HTML flavour uses line breaks and carries no colour or font (%s)'%c['text/html'][:80])
    # what a chat app does: show the HTML as normal text (white space collapsed)
    pg.set_content('<div id=t></div>'); pg.evaluate("html=>{document.getElementById('t').innerHTML=html}", c['text/html'])
    ok(pg.evaluate("document.getElementById('t').innerText")=='Alpha Bank\n22 TX\n18 RX','a normal page shows three lines (Teams, Word, mail)')
    # special characters stay as they are
    q=ctx.new_page(); q.add_init_script("window.__BLOCKS=[{t:'text',v:'a < b & c > d\\nline 2'}];"+STUB); q.goto(ROOT+'note.html'); q.wait_for_timeout(500)
    q.click('#ed'); q.keyboard.press('Control+a'); q.keyboard.press('Control+c'); q.wait_for_timeout(200)
    c=q.evaluate(READ); q.set_content('<div id=t></div>'); q.evaluate("html=>{document.getElementById('t').innerHTML=html}", c['text/html'])
    ok(q.evaluate("document.getElementById('t').innerText")=='a < b & c > d\nline 2','< & > survive in the HTML flavour')
    # a checklist is still copied as its words only
    r=ctx.new_page(); r.add_init_script("window.__BLOCKS=[{t:'text',v:'Shopping'},{t:'check',v:'milk',done:false},{t:'check',v:'eggs',done:true}];"+STUB); r.goto(ROOT+'note.html'); r.wait_for_timeout(500)
    r.click('#ed'); r.keyboard.press('Control+a'); r.keyboard.press('Control+c'); r.wait_for_timeout(200)
    c=r.evaluate(READ); ok(c['text/plain'].replace('\r','').strip()=='Shopping\nmilk\neggs','checklist copy unchanged (%r)'%c['text/plain'])
    # pasting back into a plain-text note keeps the lines
    pg=ctx.new_page(); pg.add_init_script("window.__BLOCKS=[{t:'text',v:'Alpha Bank\\n22 TX\\n18 RX'}];"+STUB); pg.goto(ROOT+'note.html'); pg.wait_for_timeout(500)
    pg.click('#ed'); pg.keyboard.press('Control+a'); pg.keyboard.press('Control+c'); pg.keyboard.press('Control+End'); pg.keyboard.press('Enter'); pg.keyboard.press('Control+v'); pg.wait_for_timeout(300)
    txt=pg.evaluate("document.querySelector('#ed').innerText"); ok(txt.strip()=='Alpha Bank\n22 TX\n18 RX\nAlpha Bank\n22 TX\n18 RX','pasting back into a note keeps the lines (%r)'%txt)
    ok(not errs,'no errors %s'%errs); b.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
