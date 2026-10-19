from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    q=b.new_page(viewport={'width':400,'height':400}); q.on('pageerror',lambda e:errs.append(str(e))); q.add_init_script(STUB)
    q.goto('file://'+ROOT+'note.html'); q.wait_for_timeout(500)
    ed=lambda: q.inner_text('#ed')
    q.click('#ed'); q.keyboard.press('Control+End'); q.keyboard.type(' plus typed'); q.wait_for_timeout(700)
    ok('plus typed' in ed(),'typed text is in the note')
    # the chat puts new text into the note (the app changes it, then tells the window)
    q.evaluate("window.__S.note.blocks=[{t:'text',v:'NEW TEXT FROM THE AI'}];window.__applied()"); q.wait_for_timeout(300)
    ok(ed().strip()=='NEW TEXT FROM THE AI','the note shows the applied text (%r)'%ed())
    q.click('#ed'); q.keyboard.press('Control+z'); q.wait_for_timeout(300)
    ok('plus typed' in ed() and 'NEW TEXT' not in ed(),'Ctrl+Z brings back the text from before (%r)'%ed())
    q.keyboard.press('Control+Shift+z'); q.wait_for_timeout(300)
    ok(ed().strip()=='NEW TEXT FROM THE AI','Ctrl+Shift+Z applies it again (%r)'%ed())
    q.keyboard.press('Control+z'); q.wait_for_timeout(300); q.keyboard.press('Control+z'); q.wait_for_timeout(300)
    ok('helo wrold this is a tset' in ed() and 'plus typed' not in ed(),'a second Ctrl+Z keeps going back through the earlier typing (%r)'%ed())
    # a second apply right away
    q.evaluate("window.__S.note.blocks=[{t:'text',v:'ONE'}];window.__applied()"); q.wait_for_timeout(200)
    q.evaluate("window.__S.note.blocks=[{t:'text',v:'ONE'},{t:'check',v:'two',done:false}];window.__applied()"); q.wait_for_timeout(200)
    q.click('#ed'); q.keyboard.press('Control+z'); q.wait_for_timeout(300); ok(ed().strip()=='ONE','two applies in a row: each Ctrl+Z undoes one (%r)'%ed())
    ok(not errs,'no script errors %s'%errs); b.close()
import sys; sys.exit(1 if fails else 0)
