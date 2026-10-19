from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':330,'height':420}); ctx.grant_permissions(['clipboard-read','clipboard-write'])
    pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.add_init_script(STUB)
    pg.goto('file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/note.html'); pg.wait_for_timeout(300)
    pg.fill('#topic','Shopping'); pg.locator('#ed').click(); pg.keyboard.type('hello')
    pg.click('#chk'); pg.keyboard.type('milk'); pg.keyboard.press('Enter'); pg.keyboard.type('eggs'); pg.wait_for_timeout(300)
    print('todos',pg.locator('.todo').count(), pg.inner_html('#ed')[:300]); pg.locator('.todo input').first.click()
    pg.keyboard.press('Control+Alt+c'); pg.wait_for_timeout(300)
    t=pg.evaluate('navigator.clipboard.readText()'); print(repr(t))
    ok(t.startswith('Shopping\n') and 'hello' in t,'topic and text copied')
    ok('[x] milk' in t and '[ ] eggs' in t,'checklist copied as [x]/[ ]')
    pg.click('#cfg'); pg.click('[data-tab=note]'); pg.click('#copyTxt'); ok('Copied' in pg.inner_text('#copyTxt'),'button confirms')
    ok(not errs,'no errors %s'%errs); b.close()
import sys; sys.exit(1 if fails else 0)
