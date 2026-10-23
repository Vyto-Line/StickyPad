from playwright.sync_api import sync_playwright
import os, sys
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); OUT=os.path.join(HERE,'out'); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ROOT='file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/'
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    def page(reduce=False):
        c=b.new_context(viewport={'width':560,'height':640},reduced_motion='reduce' if reduce else 'no-preference'); pg=c.new_page()
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.add_init_script(STUB); pg.goto(ROOT+'welcome.html'); pg.wait_for_timeout(500); return pg
    title=lambda pg: pg.inner_text('#title')
    cls=lambda pg: pg.evaluate("document.querySelector('#card').className")
    pg=page(); pg.click('#next'); pg.wait_for_timeout(60)
    ok('out' in cls(pg) and title(pg)=='Welcome to StickyPad','Next: the old content slides out first, the step has not changed yet')
    ok(pg.evaluate("document.querySelector('#card').style.getPropertyValue('--dx')")=='-26px','going forward it slides to the left')
    hs=[]
    for i in range(24): hs.append(pg.evaluate("document.querySelector('#card').getBoundingClientRect().height")); pg.wait_for_timeout(30)
    ok(title(pg)=='Pick your look','then the new step appears')
    ok(len(set(round(h) for h in hs))>=3,'the card eases between its two heights (%s)'%sorted(set(round(h) for h in hs))[:8])
    pg.wait_for_timeout(400)
    ok('out' not in cls(pg) and 'moving' not in cls(pg) and pg.evaluate("document.querySelector('#card').style.height")=='','everything is cleaned up afterwards (%s)'%cls(pg))
    pg.click('#back'); pg.wait_for_timeout(60)
    ok(pg.evaluate("document.querySelector('#card').style.getPropertyValue('--dx')")=='26px','Back slides the other way')
    pg.wait_for_timeout(700); ok(title(pg)=='Welcome to StickyPad','Back returns to the first step')
    # quick clicks end on the right step, once
    pg.click('#next'); pg.click('#next'); pg.click('#next'); pg.wait_for_timeout(900)
    ok(title(pg)=='Tidy your desk' and 'out' not in cls(pg),'three quick clicks land on the fourth step (%s)'%title(pg))
    pg.click('#dots button:nth-child(1)'); pg.wait_for_timeout(700); ok(title(pg)=='Welcome to StickyPad','a dot jumps with the same motion')
    pg.focus('#next'); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(700); ok(title(pg)=='Pick your look','arrow keys too')
    ok(pg.evaluate("document.activeElement.tagName")!='BODY','the keyboard focus is kept on a control')
    # reduce motion: no waiting
    pg2=page(True); pg2.click('#next'); pg2.wait_for_timeout(30); ok(title(pg2)=='Pick your look','Reduce motion: the step changes at once')
    ok(not errs,'no errors %s'%errs); b.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
