from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':330,'height':420}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.add_init_script(STUB)
    pg.goto('file://'+ROOT+'note.html'); pg.wait_for_timeout(300)
    size=lambda: pg.evaluate("parseFloat(getComputedStyle(document.getElementById('ed')).fontSize)")
    ok(size()==15,'starts at 15px (%s)'%size())
    pg.mouse.move(150,200)
    pg.keyboard.down('Control'); pg.mouse.wheel(0,-100); pg.wait_for_timeout(150); pg.keyboard.up('Control')
    s1=size(); ok(s1>15,'Ctrl + wheel up makes the text bigger (%s)'%s1)
    pg.wait_for_timeout(500)
    pg.keyboard.down('Control'); pg.mouse.wheel(0,100); pg.mouse.wheel(0,100); pg.wait_for_timeout(150); pg.keyboard.up('Control')
    s2=size(); ok(s2<s1,'Ctrl + wheel down makes it smaller (%s -> %s)'%(s1,s2))
    ok(any(c[0]=='update' and 'size' in c[1] for c in pg.evaluate('window.__S.calls')),'the new size is saved')
    pg.wait_for_timeout(500); pg.mouse.wheel(0,-100)
    ok(size()==s2,'a wheel without Ctrl does not change the size')
    for _ in range(40):
        pg.wait_for_timeout(450); pg.keyboard.down('Control'); pg.mouse.wheel(0,-100); pg.keyboard.up('Control')
        if size()>=48: break
    pg.wait_for_timeout(300); ok(size()==48,'stops at the biggest size (%s)'%size())
    ok(not errs,'no errors %s'%errs); b.close()
import sys; sys.exit(1 if fails else 0)
