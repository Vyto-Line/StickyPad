from playwright.sync_api import sync_playwright
import os, sys, json
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ROOT='file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/'
BL=[{'t':'text','v':'first paragraph here'},{'t':'check','v':'buy mlik','done':False},{'t':'check','v':'call doctor','done':True},{'t':'text','v':'last paragraph'}]
def page(b,extra=''):
    pg=b.new_page(viewport={'width':420,'height':520}); pg.add_init_script("window.__BLOCKS="+json.dumps(BL)+";"+STUB+extra)
    pg.goto(ROOT+'note.html'); pg.wait_for_timeout(500); return pg
texts=lambda pg: pg.evaluate("[...document.querySelectorAll('#ed > *, #ed')].length && (()=>{const o=[];for(const c of document.querySelector('#ed').childNodes){if(c.nodeType===3&&c.nodeValue.trim())o.push(c.nodeValue.trim());else if(c.classList&&c.classList.contains('todo'))o.push('['+c.querySelector('.tx').textContent.trim()+']')}return o})()")
edits=lambda pg: pg.evaluate("__S.calls.filter(c=>c[0]=='edit').map(c=>c[2])")
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    pg=page(b,"window.__S.editOut='REDONE';window.__S.editDelay=20;"); pg.on('pageerror',lambda e:errs.append(str(e)))
    # caret in the note, nothing selected -> every piece is edited
    pg.evaluate("document.querySelector('#ed').focus()")
    pg.evaluate("document.querySelector('#editMode').value='polish'; document.querySelector('#aiEdit').click()"); pg.wait_for_timeout(1500)
    ok(len(edits(pg))==4,'nothing selected: all four pieces are sent, one after the other (%s)'%edits(pg))
    ok(texts(pg)==['REDONE','[REDONE]','[REDONE]','REDONE'],'and all four are replaced, checklist items stay items (%s)'%texts(pg))
    ok(pg.evaluate("document.querySelectorAll('.todo').length")==2 and pg.evaluate("document.querySelectorAll('.todo input:checked, .todo.done').length")>=1,'checklist structure and ticks are kept')
    ok(pg.is_visible('#editbar') and pg.is_visible('#editUndo'),'one Done bar with Undo at the end')
    pg.click('#editUndo'); pg.wait_for_timeout(300)
    ok(texts(pg)==['first paragraph here','[buy mlik]','[call doctor]','last paragraph'],'Undo brings the whole note back at once (%s)'%texts(pg))
    # Stop in the middle puts everything back
    pg.evaluate("__S.calls.length=0; __S.editDelay=600; document.querySelector('#aiEdit').click()"); pg.wait_for_timeout(900)
    ok(pg.is_visible('#editStop') and 'of 4' in pg.inner_text('#editMsg'),'a running job shows its progress (%s)'%pg.inner_text('#editMsg'))
    pg.click('#editStop'); pg.wait_for_timeout(700)
    ok(texts(pg)==['first paragraph here','[buy mlik]','[call doctor]','last paragraph'],'Stop in the middle: nothing is left half changed (%s)'%texts(pg))
    ok(len(edits(pg))<4,'and it does not go on with the rest (%s)'%len(edits(pg)))
    # a selection still edits only the selection
    pg.evaluate("__S.calls.length=0; __S.editDelay=20")
    pg.evaluate("""()=>{const ed=document.querySelector('#ed');const t=[...ed.childNodes].find(n=>n.nodeType===3&&/first/.test(n.nodeValue));const r=document.createRange();r.setStart(t,0);r.setEnd(t,5);const s=getSelection();s.removeAllRanges();s.addRange(r);}""")
    pg.evaluate("document.querySelector('#aiEdit').click()"); pg.wait_for_timeout(600)
    ok(edits(pg)==['first'],'a selection: only the selection is sent (%s)'%edits(pg))
    # an error stops the whole thing and puts everything back
    q=page(b,"window.__S.editOut='REDONE';window.__S.editMode='error';")
    q.evaluate("document.querySelector('#ed').focus(); document.querySelector('#editMode').value='shorten'; document.querySelector('#aiEdit').click()"); q.wait_for_timeout(800)
    ok(texts(q)==['first paragraph here','[buy mlik]','[call doctor]','last paragraph'],'an error: the note is as it was (%s)'%texts(q))
    ok(len(edits(q))==1,'and nothing else is sent after the error')
    # summarize uses the selection when there is one
    r=page(b)
    r.evaluate("""()=>{const ed=document.querySelector('#ed');const t=[...ed.childNodes].find(n=>n.nodeType===3&&/first/.test(n.nodeValue));const rg=document.createRange();rg.setStart(t,0);rg.setEnd(t,5);const s=getSelection();s.removeAllRanges();s.addRange(rg);}""")
    ok(r.evaluate("selectedText()")=='first' and 'first paragraph here' in r.evaluate("noteAsText()"),'summarize can tell the selection from the whole note')
    ok(not errs,'no errors %s'%errs); b.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
