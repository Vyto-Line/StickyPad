import base64, io, os
from playwright.sync_api import sync_playwright
from PIL import Image
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); fails=[]
ROOT='file://'+os.path.abspath(os.path.join(HERE,'..','..'))+'/'
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
b=io.BytesIO(); Image.new('RGB',(600,380),'#7fb3e6').save(b,'PNG'); SRC='data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
with sync_playwright() as p:
    br=p.chromium.launch(); errs=[]
    def page(w=None, locked=False):
        pg=br.new_page(viewport={'width':380,'height':470}); pg.on('pageerror',lambda e:errs.append(str(e)))
        im="{t:'img',id:'a1',src:'%s'%s}"%(SRC, (",w:%d"%w) if w else '')
        pg.add_init_script("window.__BLOCKS=[{t:'text',v:'Trip'},%s,{t:'text',v:'End'}];"%im+STUB); pg.goto(ROOT+'note.html'); pg.wait_for_timeout(500); return pg
    saved=lambda pg: pg.evaluate("(()=>{const u=__S.calls.filter(c=>c[0]=='update'&&c[1]&&c[1].blocks);return u.length?u[u.length-1][1].blocks:null})()")
    pg=page()
    full=pg.evaluate("document.querySelector('#ed img').getBoundingClientRect().width")
    ok(not pg.query_selector('#picTools'),'no handle until a picture is clicked')
    pg.click('#ed img'); ok(pg.query_selector('.pichandle') is not None and pg.query_selector('.picbar') is not None,'clicking a picture shows the handle and the size bar')
    pg.click('.picbar button:has-text("50%")'); pg.wait_for_timeout(400)
    w=pg.evaluate("document.querySelector('#ed img').getBoundingClientRect().width"); ok(abs(w/full-0.5)<0.03,'50%% button halves it (%.0f of %.0f)'%(w,full))
    bl=saved(pg); ok(bl and [x for x in bl if x['t']=='img'][0].get('w')==50,'the size is saved as w:50 (%s)'%bl)
    ok(pg.get_attribute('.picbar button[aria-pressed=true]','xx') is None and pg.inner_text('.picbar button[aria-pressed=true]')=='50%','the bar shows the current size')
    # drag the handle
    h=pg.query_selector('.pichandle').bounding_box(); L=pg.evaluate("document.querySelector('#ed img').getBoundingClientRect().left")
    pg.mouse.move(h['x']+9,h['y']+9); pg.mouse.down(); pg.mouse.move(L+full*0.3,h['y']+9,steps=5); pg.mouse.up(); pg.wait_for_timeout(400)
    w=pg.evaluate("document.querySelector('#ed img').getBoundingClientRect().width"); ok(0.2<w/full<0.4,'dragging the handle resizes (%.2f)'%(w/full))
    ar=pg.evaluate("(()=>{const r=document.querySelector('#ed img').getBoundingClientRect();return r.width/r.height})()"); ok(abs(ar-600/380)<0.03,'the shape is kept')
    bl=saved(pg); ok([x for x in bl if x['t']=='img'][0]['w'] in range(20,40),'dragged size saved (%s)'%bl)
    h=pg.query_selector('.pichandle').bounding_box(); pg.mouse.move(h['x']+9,h['y']+9); pg.mouse.down(); pg.mouse.move(1000,h['y']+9,steps=4); pg.mouse.up(); pg.wait_for_timeout(300)
    ok(pg.evaluate("document.querySelector('#ed img').style.width")=='' and 'w' not in [x for x in saved(pg) if x['t']=='img'][0],'dragging to the edge means full width again (nothing stored)')
    pg.click('.picbar button:has-text("25%")'); pg.wait_for_timeout(300); pg.dblclick('#ed img'); pg.wait_for_timeout(300)
    ok(pg.evaluate("document.querySelector('#ed img').style.width")=='','double-click resets to full width')
    pg.click('.picbar button:has-text("25%")'); pg.wait_for_timeout(300)
    pg.click('#ed >> text=End'); ok(pg.query_selector('#picTools') is None,'the handle goes away when you click elsewhere')
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(100)
    # a saved size is shown when the note opens
    p2=page(40); w2=p2.evaluate("document.querySelector('#ed img').getBoundingClientRect().width")/p2.evaluate("document.querySelector('#ed').clientWidth-20"); ok(0.3<w2<0.5,'a note with w:40 opens at that size (%.2f)'%w2)
    ok(not errs,'no script errors %s'%errs)
    br.close()
print('FAILS:',fails)
