from playwright.sync_api import sync_playwright
import os, sys, json
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ROOT='file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/'
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; pg=b.new_page(viewport={'width':420,'height':420}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script("window.__BLOCKS="+json.dumps([{'t':'text','v':'hello world again'}])+";"+STUB); pg.goto(ROOT+'note.html'); pg.wait_for_timeout(600)
    sel="getSelection().toString()"
    # what Windows does: the word and the space after it are selected, then the double-click event arrives
    pg.evaluate("""(()=>{const ed=document.querySelector('#ed');const t=[...ed.childNodes].find(n=>n.nodeType===3&&/hello world/.test(n.data));const r=document.createRange();r.setStart(t,6);r.setEnd(t,12);const s=getSelection();s.removeAllRanges();s.addRange(r);ed.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));})()""")
    ok(pg.evaluate(sel)=='world','note text: "world " becomes "world" (%r)'%pg.evaluate(sel))
    pg.evaluate("""(()=>{const ed=document.querySelector('#ed');const t=[...ed.childNodes].find(n=>n.nodeType===3&&/hello world/.test(n.data));const r=document.createRange();r.setStart(t,5);r.setEnd(t,6);const s=getSelection();s.removeAllRanges();s.addRange(r);ed.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));})()""")
    ok(pg.evaluate(sel)==' ','double-clicking a lone space keeps it selected')
    # a real double-click on a word
    box=pg.evaluate("(()=>{const ed=document.querySelector('#ed');const t=[...ed.childNodes].find(n=>n.nodeType===3);const r=document.createRange();r.setStart(t,6);r.setEnd(t,9);const q=r.getBoundingClientRect();return [q.x+q.width/2,q.y+q.height/2]})()")
    pg.mouse.dblclick(box[0],box[1]); pg.wait_for_timeout(100)
    ok(pg.evaluate(sel)=='world','a real double-click selects just the word (%r)'%pg.evaluate(sel))
    # the topic box
    pg.fill('#topic','Shopping list'); pg.evaluate("(()=>{const t=document.querySelector('#topic');t.focus();t.setSelectionRange(0,9);t.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))})()")
    ok(pg.evaluate("(()=>{const t=document.querySelector('#topic');return t.value.slice(t.selectionStart,t.selectionEnd)})()")=='Shopping','topic box: "Shopping " becomes "Shopping"')
    ok(not errs,'no errors %s'%errs); b.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
