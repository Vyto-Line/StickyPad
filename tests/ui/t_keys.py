from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(); q=b.new_page(viewport={'width':900,'height':700}); errs=[]; q.on('pageerror',lambda e:errs.append(str(e))); q.add_init_script(STUB)
    q.goto('file://'+ROOT+'settings.html'); q.wait_for_timeout(300); q.click('[data-cat=shortcuts]'); q.wait_for_timeout(100)
    ok(q.locator('.kbtn').count()==11,'11 shortcuts listed (%s)'%q.locator('.kbtn').count())
    ok(q.inner_text('[data-key=g_clip]')=='Ctrl + Alt + V','clipboard shortcut default shown (%s)'%q.inner_text('[data-key=g_clip]'))
    q.click('[data-key=g_new]'); ok('Press the keys' in q.inner_text('[data-key=g_new]'),'click starts recording')
    q.keyboard.press('Control+Alt+Q'); q.wait_for_timeout(200)
    ok(q.inner_text('[data-key=g_new]')=='Ctrl + Alt + Q','new shortcut is shown (%s)'%q.inner_text('[data-key=g_new]'))
    sent=[c for c in q.evaluate('__S.calls') if c[0]=='settingsSet' and 'keys' in c[1]]
    ok(sent and sent[-1][1]['keys']['g_new']=='Ctrl+Alt+Q','saved to the app')
    ok(q.is_visible('[data-reset=g_new]'),'Reset appears for a changed shortcut')
    # a clash is refused
    q.click('[data-key=g_all]'); q.keyboard.press('Control+Alt+Q'); q.wait_for_timeout(100)
    ok(q.is_visible('#keysMsg') and 'already used' in q.inner_text('#keysMsg'),'clash is explained (%s)'%q.inner_text('#keysMsg'))
    q.keyboard.press('Escape'); q.wait_for_timeout(100); ok(q.inner_text('[data-key=g_all]')=='Ctrl + Alt + A','Esc cancels, shortcut unchanged')
    # modifier alone does nothing; a weak shortcut is refused
    q.click('[data-key=g_all]'); q.keyboard.press('Control'); q.wait_for_timeout(50); ok('Press the keys' in q.inner_text('[data-key=g_all]'),'a lone Ctrl keeps waiting')
    q.keyboard.press('Shift+K'); q.wait_for_timeout(100); ok('Use Ctrl or Alt' in q.inner_text('#keysMsg'),'Shift+K is refused (%s)'%q.inner_text('#keysMsg')); q.keyboard.press('Escape')
    # in-note: reserved
    q.click('[data-key=n_find]'); q.keyboard.press('Control+z'); q.wait_for_timeout(100); ok('needed for editing' in q.inner_text('#keysMsg'),'Ctrl+Z is protected'); q.keyboard.press('Escape')
    # backspace restores the default
    q.click('[data-key=g_new]'); q.keyboard.press('Backspace'); q.wait_for_timeout(200)
    ok(q.inner_text('[data-key=g_new]')=='Ctrl + Alt + N' and not q.is_visible('[data-reset=g_new]'),'Backspace restores the default')
    q.click('[data-key=n_todo]'); q.keyboard.press('Alt+T'); q.wait_for_timeout(200); q.click('#keysReset'); q.wait_for_timeout(200)
    ok(q.inner_text('[data-key=n_todo]')=='Ctrl + Shift + C','Reset all')
    # warning for a shortcut Windows refused
    q.evaluate("__S.set.keysFailed=['g_chat']"); q.click('[data-key=g_new]'); q.keyboard.press('Control+Alt+Q'); q.wait_for_timeout(200)
    ok(q.is_visible('#keysWarn') and 'AI chat' in q.inner_text('#keysWarn'),'warns about a shortcut another program holds')
    ok(not errs,'no errors %s'%errs); b.close()
print('FAILS:',fails); import sys; sys.exit(1 if fails else 0)
