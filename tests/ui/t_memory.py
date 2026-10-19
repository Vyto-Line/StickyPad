import os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..')) + '/'
STUB = open(os.path.join(HERE, 'stub.js')).read(); fails = []
def ok(c, m):
    print(('PASS ' if c else 'FAIL ') + m)
    if not c: fails.append(m)
OVER = "window.api = new Proxy({ settingsAction: async a => a === 'memory' ? { ok: true, total: 210, processes: 4, notes: 120, main: 60, gpu: 0, other: 30, windows: 2 } : { ok: true } }, { get: (t, k) => k in t ? t[k] : window.__apiBase[k] });"
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 900, 'height': 640}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(STUB); pg.add_init_script("window.__apiBase = null; (function(){ var t = setInterval(function(){ if (window.api && !window.__apiBase) { window.__apiBase = window.api; window.api = new Proxy({ settingsAction: async function(a){ return a === 'memory' ? { ok: true, total: 210, processes: 4, notes: 120, main: 60, gpu: 0, other: 30, windows: 2 } : { ok: true }; } }, { get: function(t, k){ return k in t ? t[k] : window.__apiBase[k]; } }); clearInterval(t); } }, 0); })();")
    pg.goto('file://' + ROOT + 'settings.html'); pg.wait_for_timeout(300)
    pg.click('[data-cat=about]'); pg.wait_for_timeout(100)
    pg.click('#memBtn'); pg.wait_for_timeout(150)
    t = pg.inner_text('#memInfo'); ok('210 MB' in t and '4 processes' in t and '2 windows' in t, 'meter text: %r' % t)
    pg.click('[data-cat=general]'); pg.wait_for_timeout(100)
    ok(pg.is_checked('#lowMemory') and pg.is_hidden('#lowMemRestart'), 'low memory on, no restart needed')
    pg.click('[data-cat=ai]'); pg.wait_for_timeout(100)
    ok(pg.input_value('#aiKeep') == '5m', 'keep model default 5m')
    ok(not errs, 'no errors %s' % errs); b.close()
print('FAILS:', fails); sys.exit(1 if fails else 0)
