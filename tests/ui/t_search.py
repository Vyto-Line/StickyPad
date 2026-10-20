import sys, os
HERE=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(HERE,'out'); os.makedirs(OUT,exist_ok=True)
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read()
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
RES="""window.__RESULTS = q => {
  const all = [
    { id:'a', title:[{t:'Meeting',h:false}], snippet:[{t:'…talk about the ',h:false},{t:'budget',h:true},{t:' on Friday…',h:false}], color:'#FFF2A8', folder:'Work', locked:false, pinned:true, updated:Date.now() },
    { id:'b', title:[{t:'Bud',h:true},{t:'get 2026',h:false}], snippet:[{t:'numbers <b>x</b>',h:false}], color:'#BFE3FF', folder:'', locked:false, pinned:false, updated:Date.now()-3*864e5 },
    { id:'c', title:[{t:'Locked note',h:false}], snippet:[], color:'#FFC9C9', folder:'', locked:true, pinned:false, updated:Date.now()-40*864e5 }];
  return q === 'none' ? [] : (q ? all.slice(0, q === 'one' ? 1 : 3) : all);
};"""
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(f,q='',init=''):
        pg=b.new_page(viewport={'width':640,'height':460}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.add_init_script(STUB); pg.add_init_script(init); pg.goto('file://'+ROOT+f+q); pg.wait_for_timeout(400); pg.errs=errs; return pg
    pg=page('quick.html',init=RES)
    ok(pg.evaluate("document.activeElement.id")=='q','the search box has the focus when the window opens')
    ok(pg.locator('.r').count()==3,'with nothing typed the newest notes are listed (%d)'%pg.locator('.r').count())
    pg.keyboard.type('bud'); pg.wait_for_timeout(250)
    ok(pg.evaluate("__S.calls.filter(c=>c[0]=='searchQuery').map(c=>c[1])").count('bud')==1,'typing searches (once, after a short pause)')
    ok(pg.eval_on_selector('.r.on .t','e=>e.textContent')=='📌 Meeting','first result is highlighted; pinned shows a pin')
    ok(pg.eval_on_selector('.r.on mark','e=>e.textContent')=='budget','the matching word in the snippet is marked')
    ok(pg.eval_on_selector_all('.r:nth-child(2) .s *','e=>e.length')==0,'note text is shown as text, never as HTML')
    ok('<b>x</b>' in pg.eval_on_selector('.r:nth-child(2) .s','e=>e.textContent'),'(the tag in a note stays visible text)')
    ok(pg.eval_on_selector('.r:nth-child(1) .m','e=>e.textContent').startswith('Work'),'folder and age are shown')
    pg.keyboard.press('ArrowDown'); pg.keyboard.press('ArrowDown')
    ok(pg.eval_on_selector('.r.on','e=>e.id')=='r2','arrow down moves the highlight')
    pg.keyboard.press('ArrowDown'); ok(pg.eval_on_selector('.r.on','e=>e.id')=='r0','it wraps around at the end')
    pg.keyboard.press('ArrowUp'); ok(pg.eval_on_selector('.r.on','e=>e.id')=='r2','and at the start')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    ok(pg.evaluate("__S.calls.filter(c=>c[0]=='searchShow')")==[['searchShow','c']],'Enter opens the highlighted note')
    pg.click('.r:nth-child(2)'); pg.wait_for_timeout(100)
    ok(pg.evaluate("__S.calls.filter(c=>c[0]=='searchShow').pop()")==['searchShow','b'],'a click opens that note')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    ok(pg.evaluate("__S.calls.some(c=>c[0]=='searchClose')"),'Esc closes the window')
    pg.fill('#q','none'); pg.wait_for_timeout(250)
    ok(pg.is_visible('#empty') and 'No note' in pg.inner_text('#empty'),'no match: a friendly message')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    ok(len(pg.evaluate("__S.calls.filter(c=>c[0]=='searchShow')"))==2,'Enter with no results opens nothing')
    # quick typing: only the answer to the last text is shown
    pg.fill('#q','one'); pg.wait_for_timeout(250); ok(pg.locator('.r').count()==1,'results follow the text')
    pg.screenshot(path=os.path.join(OUT,'quick.png'))
    ok(not pg.errs,'no page errors (%s)'%pg.errs)
    # Home: searching finds words that are far inside a long note
    LONG="""window.__S.all = { emoji:'', greeting:'Hi', groups:[], trash:[], prefs:{}, notes:[
      { id:'n1', title:'Shopping', text:'milk, eggs', color:'#FFF2A8', group:null, updated:Date.now(), open:true },
      { id:'n2', title:'Long one', text:'start of a very long note', full:'start of a very long note ... and at the very end: zucchini', color:'#BFE3FF', group:null, updated:Date.now()-5, open:false } ] };"""
    pg=b.new_page(viewport={'width':980,'height':680}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.add_init_script(STUB); pg.goto('file://'+ROOT+'all.html'); pg.wait_for_timeout(300)
    pg.evaluate(LONG); pg.evaluate("refresh()"); pg.wait_for_timeout(200)
    ok(pg.locator('.card').count()==2,'two notes before searching')
    pg.fill('#q','zucchini'); pg.wait_for_timeout(300)
    ok(pg.locator('.card').count()==1 and 'Long one' in pg.inner_text('.card .t'),'a word at the end of a long note is found in Home too (%d)'%pg.locator('.card').count())
    pg.fill('#q','milk'); pg.wait_for_timeout(300)
    ok(pg.locator('.card').count()==1 and 'Shopping' in pg.inner_text('.card .t'),'and normal words still work')
    pg.fill('#q',''); pg.wait_for_timeout(300); ok(pg.locator('.card').count()==2,'clearing the box shows everything again')
    ok(not errs,'no page errors in Home (%s)'%errs)
    b.close()
print('FAILED: %s'%fails if fails else 'ALL PASS'); sys.exit(1 if fails else 0)
