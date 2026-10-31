from playwright.sync_api import sync_playwright
import os, sys, json
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ROOT='file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/'
BLOCKS=[{'t':'text','v':'Book the ferry before Friday.\nSecond line here\n','m':[[9,14,'b'],[9,14,'h1'],[29,35,'i']]},{'t':'check','v':'Rent a car','done':False,'m':[[0,4,'c2']]},{'t':'text','v':'End'}]
SEL="""(w)=>{const ed=document.querySelector('#ed');const tw=document.createTreeWalker(ed,NodeFilter.SHOW_TEXT);let n;while(n=tw.nextNode()){const i=n.data.indexOf(w);if(i>=0&&!n.parentElement.closest('.x')){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+w.length);const s=getSelection();s.removeAllRanges();s.addRange(r);return true}}return false}"""
COPY="""(()=>{const dt=new DataTransfer();const ev=new ClipboardEvent('copy',{clipboardData:dt,bubbles:true,cancelable:true});document.querySelector('#ed').dispatchEvent(ev);window.__dt=dt;return {plain:dt.getData('text/plain'),html:dt.getData('text/html')}})()"""
PASTE="""(()=>{const ev=new ClipboardEvent('paste',{clipboardData:window.__dt,bubbles:true,cancelable:true});document.querySelector('#ed').dispatchEvent(ev)})()"""
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; pg=b.new_page(viewport={'width':420,'height':460}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script("window.__BLOCKS="+json.dumps(BLOCKS)+";"+STUB); pg.goto(ROOT+'note.html'); pg.wait_for_timeout(600)
    ok(pg.evaluate("serialize()")==BLOCKS,'a note with formatting is drawn and read back exactly (%r)'%pg.evaluate("serialize()")[0].get('m'))
    ok(pg.evaluate("document.querySelector('#ed .f-b.f-h1').textContent")=='ferry','bold + highlight drawn together')
    ok(pg.evaluate("document.querySelector('.todo .tx .f-c2').textContent")=='Rent','checklist item formatting drawn')
    # copy a formatted word
    pg.evaluate(SEL,'ferry'); r=pg.evaluate(COPY)
    ok(r['plain']=='ferry','plain text of the copy: %r'%r['plain'])
    ok('<b>ferry</b>' in r['html'] and 'background-color:#ffe680' in r['html'],'HTML copy carries bold and highlight for Word: %s'%r['html'][:160])
    # paste it at the end of the note ("End")
    pg.evaluate("(()=>{const ed=document.querySelector('#ed');const tw=document.createTreeWalker(ed,NodeFilter.SHOW_TEXT);let n,l;while(n=tw.nextNode())l=n;const r=document.createRange();r.setStart(l,l.data.length);r.collapse(true);const s=getSelection();s.removeAllRanges();s.addRange(r);ed.focus()})()")
    pg.evaluate(PASTE); pg.wait_for_timeout(100)
    bl=pg.evaluate("serialize()"); ok(bl[-1]['v']=='Endferry' and sorted(bl[-1].get('m',[]))==[[3,8,'b'],[3,8,'h1']],'pasting into a note brings the formatting back: %r'%bl[-1])
    # Ctrl+Shift+V (the keys alone, no real paste): the next paste brings the words only; the caret's own look is what the text takes
    pg.evaluate("(()=>{const ed=document.querySelector('#ed');ed.focus();const tw=document.createTreeWalker(ed,NodeFilter.SHOW_TEXT);const n=tw.nextNode();const r=document.createRange();r.setStart(n,0);r.collapse(true);const s=getSelection();s.removeAllRanges();s.addRange(r)})()")
    pg.evaluate("document.querySelector('#ed').dispatchEvent(new KeyboardEvent('keydown',{key:'V',ctrlKey:true,shiftKey:true,bubbles:true}))")
    pg.evaluate(PASTE); pg.wait_for_timeout(100)
    bl=pg.evaluate("serialize()"); ok(bl[0]['v'].startswith('ferryBook the ') and [14,19,'b'] in bl[0]['m'] and not any(x[0]==0 for x in bl[0]['m']),'Ctrl+Shift+V pastes the words only (plain at the start, old formatting moved along): %r'%bl[0]['m'])
    pg.evaluate(PASTE); pg.wait_for_timeout(100)
    bl=pg.evaluate("serialize()"); ok([5,10,'b'] in bl[0]['m'],'the paste after that is formatted again')
    # copy that spans formatted and unformatted text and a checklist item
    pg.evaluate(SEL,'Second'); 
    pg.evaluate("(()=>{const ed=document.querySelector('#ed');const tw=document.createTreeWalker(ed,NodeFilter.SHOW_TEXT);let a=null,z=null,n;while(n=tw.nextNode()){if(n.data.includes('Secon'))a=n;if(n.data==='Rent')z=n}const r=document.createRange();r.setStart(a,1);r.setEnd(z,4);const s=getSelection();s.removeAllRanges();s.addRange(r)})()")
    r=pg.evaluate(COPY); ok(r['plain'].startswith('Second line here') and r['plain'].endswith('Rent') and '<span style="color:#c5221f' in r['html'],'a copy over text and a checklist item: %r'%r['plain'])
    # text without any formatting: the old plain copy
    pg.evaluate(SEL,'End'); r=pg.evaluate(COPY); ok('data-stickypad' not in r['html'] and r['plain']=='End','unformatted text copies as before')
    # text that was changed on the way is not guessed
    pg.evaluate(SEL,'ferry'); pg.evaluate(COPY); pg.evaluate("window.__dt.setData('text/plain','other')")
    pg.evaluate("(()=>{const ed=document.querySelector('#ed');ed.focus();const r=document.createRange();r.selectNodeContents(ed);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r)})()")
    pg.evaluate(PASTE); pg.wait_for_timeout(100)
    bl=pg.evaluate("serialize()"); ok(bl[-1]['v'].endswith('other') and not any(x[0]>=len(bl[-1]['v'])-5 for x in bl[-1].get('m',[])),'changed text pastes as plain')
    ok(not errs,'no page errors %s'%errs); b.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
