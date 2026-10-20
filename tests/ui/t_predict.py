from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
WORDS="window.__WORDS=[{k:'meeting',w:'meeting',n:5},{k:'meetings',w:'meetings',n:3},{k:'καλημερα',w:'Καλημέρα',n:4}];"
def page(b,pre=''):
    q=b.new_page(viewport={'width':330,'height':420}); q.on('pageerror',lambda e:ERR.append(str(e)))
    q.add_init_script(WORDS+"window.__BLOCKS=[];")
    q.add_init_script(STUB)
    if pre: q.add_init_script(pre)
    q.goto('file://'+ROOT+'note.html'); q.wait_for_timeout(400); q.click('#ed'); return q
ERR=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    q=page(b)
    shown=lambda: q.evaluate("!document.getElementById('ac').hidden")
    rows=lambda: q.evaluate("[...document.querySelectorAll('#ac .acr')].map(x=>x.textContent.replace('Tab',''))")
    txt=lambda: q.evaluate("document.getElementById('ed').textContent")
    q.keyboard.type('mee'); q.wait_for_timeout(150)
    ok(shown() and rows()==['meeting','meetings'],'after 3 letters the words you use appear (%s)'%rows())
    box=q.evaluate("(()=>{const r=document.getElementById('ac').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom,innerWidth,innerHeight]})()")
    ok(box[0]>=0 and box[1]>=0 and box[2]<=box[4] and box[3]<=box[5],'the list stays inside the window %s'%box)
    q.keyboard.press('Tab'); q.wait_for_timeout(150)
    ok(txt()=='meeting' and not shown(),'Tab finishes the word (%r)'%txt())
    q.keyboard.press('Control+z'); q.wait_for_timeout(250)
    ok(txt()=='mee','Ctrl+Z takes back just the finished word (%r)'%txt())
    q.keyboard.press('Control+a'); q.keyboard.press('Delete'); q.wait_for_timeout(200)
    q.keyboard.type('mee'); q.keyboard.press('ArrowDown'); q.keyboard.press('Enter'); q.wait_for_timeout(150)
    ok(txt()=='meetings','arrow down then Enter picks the second word (%r)'%txt())
    q.keyboard.press('Control+a'); q.keyboard.press('Delete'); q.keyboard.type('mee'); q.keyboard.press('Enter'); q.wait_for_timeout(150)
    ok('\n' in txt() and not shown() and 'meeting' not in txt(),'Enter alone is still a new line (%r)'%txt())
    q.keyboard.press('Control+a'); q.keyboard.press('Delete'); q.keyboard.type('mee'); q.keyboard.press('Escape'); q.wait_for_timeout(100)
    ok(not shown(),'Esc closes the list')
    q.keyboard.type('x'); q.wait_for_timeout(100); ok(not shown(),'no suggestion for "meex"')
    q.keyboard.press('Control+a'); q.keyboard.press('Delete'); q.keyboard.type('me'); q.wait_for_timeout(100); ok(not shown(),'two letters are not enough')
    q.keyboard.press('Control+a'); q.keyboard.press('Delete'); q.keyboard.type('ΚΑΛΗ'); q.wait_for_timeout(150)
    ok(shown() and rows()==['Καλημέρα'],'Greek works, ignoring case and accents (%s)'%rows())
    q.keyboard.press('Tab'); q.wait_for_timeout(100); ok(txt()=='ΚΑΛΗμέρα','finishes with what is left of the word (%r)'%txt())
    # words repeated in the same note
    q.keyboard.press('Control+a'); q.keyboard.press('Delete')
    q.keyboard.type('elephant elephant stable '); q.wait_for_timeout(1700); q.keyboard.type('ele'); q.wait_for_timeout(200)
    ok(shown() and rows()==['elephant'],'a word you wrote twice in this note is offered (%s)'%rows())
    q.keyboard.press('Escape'); q.keyboard.type('x stab'); q.wait_for_timeout(200); ok(not shown(),'a word used once is not offered')
    # mid-word: no list
    q.keyboard.press('Control+a'); q.keyboard.press('Delete'); q.keyboard.type('meeng'); q.keyboard.press('ArrowLeft'); q.keyboard.press('ArrowLeft'); q.wait_for_timeout(150)
    ok(not shown(),'no list while the cursor is in the middle of a word')
    # clicking an entry
    q.keyboard.press('Control+a'); q.keyboard.press('Delete'); q.keyboard.type('mee'); q.wait_for_timeout(150)
    q.locator('#ac .acr').nth(1).dispatch_event('mousedown'); q.wait_for_timeout(150); ok(txt()=='meetings','clicking a word finishes it (%r)'%txt())
    q.close()
    # switched off
    q=page(b,"window.__S.note.predict=false;"); q.keyboard.type('mee'); q.wait_for_timeout(150)
    ok(not q.evaluate("!document.getElementById('ac').hidden"),'nothing appears when it is switched off in Settings'); q.close()
    ok(not ERR,'no errors %s'%ERR); b.close()
import sys; sys.exit(1 if fails else 0)
