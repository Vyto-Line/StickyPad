from playwright.sync_api import sync_playwright
import os, sys
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ROOT='file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/'
INIT=STUB+";window.api.onSnapHint=cb=>{window.__fire=cb};"
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    for answer in (True, False):
        pg=b.new_page(viewport={'width':380,'height':260}); pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.add_init_script(INIT); pg.goto(ROOT+'note.html'); pg.wait_for_timeout(400)
        ok(not pg.is_visible('#snapbar'),'the hint is hidden until a note is let go at an edge')
        pg.evaluate("__fire()"); pg.wait_for_timeout(100)
        ok(pg.is_visible('#snapbar') and 'half screen' in pg.inner_text('#snapbar'),'the hint appears')
        ok(pg.get_attribute('#snapbar','role')=='status','screen readers are told about it')
        ok(pg.is_visible('#snapOpen') and pg.is_visible('#snapNo'),'it has Settings and No thanks')
        if answer: pg.click('#snapOpen')
        else: pg.click('#snapNo')
        pg.wait_for_timeout(100)
        ok(not pg.is_visible('#snapbar'),'it goes away')
        ok(pg.evaluate("__S.calls.filter(c=>c[0]=='snapHintAnswer').map(c=>c[1])")==[answer],'the answer is passed on (%s)'%answer)
        if answer: pg.screenshot(path=os.path.join(HERE,'out','snaphint.png'))
    s=b.new_page(viewport={'width':1000,'height':600}); s.on('pageerror',lambda e:errs.append(str(e)))
    s.add_init_script(STUB); s.goto(ROOT+'settings.html'); s.wait_for_timeout(400)
    s.evaluate("document.querySelector('#nav button[data-cat=notes]').click()"); s.wait_for_timeout(200)
    heads=s.eval_on_selector_all('#cat-notes .grp','e=>e.map(x=>x.textContent)')
    ok(heads==['Snapping','Look and behaviour'],'Notes has two small headings %s'%heads)
    ok('off by default' in s.inner_text('#cat-notes'),'the side-snap row says it is off by default')
    ok(s.evaluate("document.querySelector('#snapSides')!=null || document.querySelector('[data-set=snapSides]')!=null"),'its switch is still there')
    s.fill('#q, input[type=search], .search input','snap'); s.wait_for_timeout(200)
    ok(not s.is_visible('#cat-notes .grp'),'headings are hidden while searching')
    ok(not errs,'no errors %s'%errs); b.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
