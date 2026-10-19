import os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..')) + '/'
STUB = open(os.path.join(HERE, 'stub.js')).read(); fails = []
def ok(c, m):
    print(('PASS ' if c else 'FAIL ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 900, 'height': 640}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(STUB); pg.goto('file://' + ROOT + 'settings.html'); pg.wait_for_timeout(300); pg.click('[data-cat=about]'); pg.wait_for_timeout(100)
    ok(pg.is_visible('#updCheck') and pg.is_visible('#autoUpdate'), 'About shows the update controls')
    pg.click('#updCheck'); pg.wait_for_timeout(150); ok('latest version' in pg.inner_text('#updMsg'), 'check -> up to date: %r' % pg.inner_text('#updMsg'))
    pg.evaluate("__emitUpdate({state:'available',version:'1.12.0'})"); ok(pg.is_visible('#updDownload') and 'available' in pg.inner_text('#updMsg') and pg.is_disabled('#updCheck') and pg.is_hidden('#updInstall'), 'found -> Download button (no restart yet)')
    pg.click('#updDownload'); pg.wait_for_timeout(100); ok(['updateDownload'] in pg.evaluate('__S.calls'), 'Download button asks the app to download')
    pg.evaluate("__emitUpdate({state:'downloading',version:'1.12.0',pct:37})"); ok('1.12.0' in pg.inner_text('#updMsg') and '37%' in pg.inner_text('#updMsg') and pg.is_disabled('#updCheck'), 'download progress shown, check disabled')
    pg.evaluate("__emitUpdate({state:'ready',version:'1.12.0',pct:100})"); ok(pg.is_visible('#updInstall') and 'ready' in pg.inner_text('#updMsg'), 'ready -> restart button')
    pg.click('#updInstall'); ok(['updateInstall'] in pg.evaluate('__S.calls'), 'restart button asks the app to install')
    pg.evaluate("__emitUpdate({state:'error',error:'Could not reach GitHub. Check your internet connection.'})"); ok('GitHub' in pg.inner_text('#updMsg') and pg.is_hidden('#updInstall'), 'error shown')
    pg.screenshot(path=os.path.join(HERE, 'out', 'about.png')) if os.path.isdir(os.path.join(HERE, 'out')) else None
    ok(not errs, 'no errors %s' % errs); b.close()
print('FAILS:', fails); sys.exit(1 if fails else 0)
