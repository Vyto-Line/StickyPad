from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
PNG="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
PASTE="""([txt, html, withImg]) => {
  const dt = new DataTransfer(); if (txt !== null) dt.setData('text/plain', txt); if (html) dt.setData('text/html', html);
  if (withImg) { const b = atob(%r), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); dt.items.add(new File([u], 'p.png', { type: 'image/png' })); }
  const ed = document.getElementById('ed'); ed.focus();
  ed.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
}""" % PNG
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':330,'height':420}); ctx.grant_permissions(['clipboard-read','clipboard-write'])
    pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.add_init_script(STUB)
    pg.goto('file://'+ROOT+'note.html'); pg.wait_for_timeout(300)
    pg.evaluate("document.getElementById('ed').replaceChildren()")
    # Excel: text + html table + a picture of the cells -> the values, not the picture
    pg.evaluate(PASTE,["10\t20\r\n30\t40\r\n","<html><table><tr><td>10</td></tr></table></html>",True]); pg.wait_for_timeout(400)
    t=pg.evaluate("document.getElementById('ed').textContent")
    ok(t=="10\t20\r\n30\t40".replace('\r\n','\n') or t=="10\t20\n30\t40",'Excel paste gives the values (%r)'%t)
    ok(pg.locator('#ed img').count()==0,'no picture was pasted')
    # a picture alone is still pasted as a picture
    pg.evaluate("document.getElementById('ed').replaceChildren()")
    pg.evaluate(PASTE,[None,None,True]); pg.wait_for_timeout(600)
    ok(pg.locator('#ed img').count()==1,'a picture with no text is still pasted as a picture')
    # plain text keeps its trailing line break (only spreadsheet cells lose it)
    pg.evaluate("document.getElementById('ed').replaceChildren()")
    pg.evaluate(PASTE,["abc\n",None,False]); pg.wait_for_timeout(300)
    ok(pg.evaluate("document.getElementById('ed').textContent")=="abc\n",'normal text is pasted as it is')
    # one Excel cell
    pg.evaluate("document.getElementById('ed').replaceChildren()")
    pg.evaluate(PASTE,["42\r\n","<table><tr><td>42</td></tr></table>",True]); pg.wait_for_timeout(300)
    ok(pg.evaluate("document.getElementById('ed').textContent")=="42",'one cell: just the value')
    # checklist copy and cut
    pg.evaluate("document.getElementById('ed').replaceChildren()")
    pg.locator('#ed').click(); pg.keyboard.type('hello'); pg.click('#chk'); pg.keyboard.type('milk'); pg.keyboard.press('Enter'); pg.keyboard.type('eggs'); pg.wait_for_timeout(300)
    pg.locator('.todo input').first.click(); pg.locator('#ed').click(); pg.keyboard.press('Control+a'); pg.keyboard.press('Control+c'); pg.wait_for_timeout(200)
    c=pg.evaluate('navigator.clipboard.readText()'); print(repr(c))
    ok(c=='hello\nmilk\neggs','copy gives only the words, one per line (%r)'%c)
    ok('×' not in c and 'x' not in c.replace('eggs','').replace('hello','').replace('milk',''),'no x or quote marks from the checklist')
    pg.keyboard.press('Control+x'); pg.wait_for_timeout(300)
    c2=pg.evaluate('navigator.clipboard.readText()')
    ok(c2=='hello\nmilk\neggs','cut puts the same clean text on the clipboard (%r)'%c2)
    ok(pg.locator('.todo').count()==0 and pg.evaluate("document.getElementById('ed').textContent.trim()")=='','cut removes the selection')
    ok(not errs,'no errors %s'%errs); b.close()
import sys; sys.exit(1 if fails else 0)
