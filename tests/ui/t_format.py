from playwright.sync_api import sync_playwright
import os, sys, json
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
ROOT='file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/'
BLOCKS=[{'t':'text','v':'Book the ferry before Friday.\nSamaria Gorge: start at 7:00\n'},{'t':'check','v':'Hotel in Chania','done':True},{'t':'check','v':'Rent a car','done':False},{'t':'text','v':'End'}]
def select(pg, word, nth=0):
    # select the first occurrence of word in the editor text
    return pg.evaluate("""(w)=>{const ed=document.querySelector('#ed');const tw=document.createTreeWalker(ed,NodeFilter.SHOW_TEXT);let n;while(n=tw.nextNode()){const i=n.data.indexOf(w);if(i>=0&&!n.parentElement.closest('.x')){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+w.length);const s=getSelection();s.removeAllRanges();s.addRange(r);return true}}return false}""",word)
def blocks(pg): return pg.evaluate("serialize()")
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; pg=b.new_page(viewport={'width':420,'height':460}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script("window.__BLOCKS="+json.dumps(BLOCKS)+";"+STUB); pg.goto(ROOT+'note.html'); pg.wait_for_timeout(600)
    ok(not pg.is_visible('#fmt'),'no bar without a selection')
    ok(blocks(pg)==BLOCKS,'an unformatted note is read back exactly as it was (no m keys)')
    select(pg,'ferry'); pg.wait_for_timeout(150)
    ok(pg.is_visible('#fmt'),'the bar shows over selected text')
    pg.click('#fmt [data-k=b]'); pg.wait_for_timeout(100)
    bl=blocks(pg); ok(bl[0]['m']==[[9,14,'b']] and bl[0]['v']==BLOCKS[0]['v'],'bold: marks %r, text unchanged'%bl[0].get('m'))
    ok(pg.evaluate("document.querySelector('#ed .f-b').textContent")=='ferry','the word is drawn bold')
    ok(pg.evaluate("getSelection().toString()")=='ferry','the selection stays')
    pg.click('#fmt [data-k=i]'); pg.wait_for_timeout(100)
    ok(sorted(blocks(pg)[0]['m'])==[[9,14,'b'],[9,14,'i']],'italic on top of bold')
    pg.click('#fmt [data-k=b]'); pg.wait_for_timeout(100)
    ok(blocks(pg)[0]['m']==[[9,14,'i']],'bold again turns bold off')
    # highlight with the remembered colour, then another colour
    pg.click('#fmtH'); pg.wait_for_timeout(100)
    ok([9,14,'h1'] in blocks(pg)[0]['m'],'highlight button: yellow')
    pg.click('#fmtHa'); pg.wait_for_timeout(100); pg.click('#fmtPal [data-k=h4]'); pg.wait_for_timeout(100)
    m=blocks(pg)[0]['m']; ok([9,14,'h4'] in m and [9,14,'h1'] not in m,'another highlight colour replaces the old one: %r'%m)
    # letter colour
    pg.click('#fmtC'); pg.wait_for_timeout(100); pg.click('#fmtPal [data-k=c2]'); pg.wait_for_timeout(100)
    ok([9,14,'c2'] in blocks(pg)[0]['m'],'letter colour red')
    pg.click('#fmtHa'); pg.wait_for_timeout(100); pg.click('#fmtPal .none'); pg.wait_for_timeout(100)
    ok(not any(x[2].startswith('h') for x in blocks(pg)[0]['m']),'"No highlight" takes the highlight away')
    pg.click('#fmtX'); pg.wait_for_timeout(100)
    ok('m' not in blocks(pg)[0],'clear formatting removes everything')
    # checklist item
    select(pg,'Chania'); pg.wait_for_timeout(120); pg.click('#fmt [data-k=u]'); pg.wait_for_timeout(100)
    bl=blocks(pg); ok(bl[1]['m']==[[9,15,'u']] and bl[1]['v']=='Hotel in Chania' and bl[1]['done'] is True,'checklist item: %r'%bl[1])
    # selection across text, a checklist item and more text
    pg.evaluate("""(()=>{const ed=document.querySelector('#ed');const tw=document.createTreeWalker(ed,NodeFilter.SHOW_TEXT);let a=null,z=null,n;while(n=tw.nextNode()){if(n.data.includes('Gorge'))a=n;if(n.data==='End')z=n}const r=document.createRange();r.setStart(a,a.data.indexOf('Gorge'));r.setEnd(z,2);const s=getSelection();s.removeAllRanges();s.addRange(r)})()""")
    pg.wait_for_timeout(120); pg.keyboard.press('Control+b'); pg.wait_for_timeout(120)
    bl=blocks(pg); g=BLOCKS[0]['v'].index('Gorge')
    ok([g,len(BLOCKS[0]['v']),'b'] in bl[0]['m'] and [0,15,'b'] in bl[1]['m'] and [0,10,'b'] in bl[2]['m'] and bl[3]['m']==[[0,2,'b']],'Ctrl+B over text, two items and more text: %r'%[x.get('m') for x in bl])
    ok(len(bl)==4 and [x['v'] for x in bl]==[x['v'] for x in BLOCKS],'the plain text of every block is untouched')
    # save and reload keeps it
    pg.evaluate("saveNow()"); pg.wait_for_timeout(200)
    saved=pg.evaluate("window.__S && window.__S.note && window.__S.note.blocks")
    # undo takes the last change back
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(200)
    ok(all('m' not in x or x['m']!=[[0,2,'b']] for x in blocks(pg)[-1:]),'Ctrl+Z undoes the formatting')
    pg.keyboard.press('Control+y'); pg.wait_for_timeout(200)
    ok(blocks(pg)[3].get('m')==[[0,2,'b']],'Ctrl+Y brings it back')
    # typing next to formatted text keeps the plain text and the marks consistent
    select(pg,'ferry'); pg.wait_for_timeout(100); pg.keyboard.press('Control+i'); pg.wait_for_timeout(100)
    pg.evaluate("(()=>{const sp=document.querySelector('#ed .f-i');const r=document.createRange();r.setStart(sp.firstChild,2);r.collapse(true);const s=getSelection();s.removeAllRanges();s.addRange(r);document.querySelector('#ed').focus()})()")
    pg.keyboard.type('XX'); pg.wait_for_timeout(100)
    bl=blocks(pg); ok('FeXXrry'.lower() in bl[0]['v'].lower() and bl[0]['m'][0][2]=='i' and bl[0]['m'][0][1]-bl[0]['m'][0][0]==7,'typing inside formatted text grows the mark: %r'%bl[0].get('m'))
    ok(not errs,'no page errors %s'%errs); b.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
