import sys, os
HERE=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(HERE,'out'); os.makedirs(OUT,exist_ok=True)
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read()
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
DROP="""(args) => {
  const [sel, files, kind] = args; const dt = new DataTransfer();
  files.forEach(([n, t]) => dt.items.add(new File(['x'], n, { type: t })));
  const el = document.querySelector(sel); const mk = ty => new DragEvent(ty, { dataTransfer: dt, bubbles: true, cancelable: true });
  if (kind === 'leave') { el.dispatchEvent(mk('dragleave')); return; }
  el.dispatchEvent(mk('dragenter')); const over = mk('dragover'); el.dispatchEvent(over);
  window.__over = over.defaultPrevented;
  if (kind === 'enter') return;
  const d = mk('drop'); el.dispatchEvent(d); window.__dropPrevented = d.defaultPrevented;
}"""
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(f,w=980,h=680):
        pg=b.new_page(viewport={'width':w,'height':h}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.add_init_script(STUB); pg.goto('file://'+ROOT+f); pg.wait_for_timeout(400); pg.errs=errs; return pg
    calls=lambda pg: pg.evaluate("__S.calls.filter(c=>c[0]=='dropFiles')")
    for f,sel in [('all.html','body'),('note.html','#ed'),('settings.html','body'),('chat.html','body')]:
        pg=page(f)
        pg.evaluate(DROP,[sel,[['Ideas.txt','text/plain']],'enter']); pg.wait_for_timeout(100)
        ok(pg.evaluate("__over")==True,f+': a file can be dropped here')
        ok(pg.evaluate("!!document.getElementById('spDropHint') && !document.getElementById('spDropHint').hidden"),f+': a hint shows while dragging')
        pg.evaluate(DROP,[sel,[['Ideas.txt','text/plain']],'leave']); pg.wait_for_timeout(50)
        ok(pg.evaluate("document.getElementById('spDropHint').hidden"),f+': and goes away when the file leaves')
        pg.evaluate(DROP,[sel,[['Ideas.txt','text/plain'],['Plan.stickypad',''],['notes.md','text/markdown']],'drop']); pg.wait_for_timeout(200)
        ok(calls(pg)==[['dropFiles',['Ideas.txt','Plan.stickypad','notes.md']]],f+': note files are handed to the app (%s)'%calls(pg))
        ok(pg.evaluate("__dropPrevented"),f+': the window does not open the file itself')
        ok('Added 3 notes' in pg.inner_text('#spDropToast'),f+': says what happened (%s)'%pg.inner_text('#spDropToast'))
        if f=='all.html': pg.screenshot(path=os.path.join(OUT,'drop_toast.png'))
        pg.evaluate("window.__DROP={ok:true,count:1,failed:1}"); pg.evaluate(DROP,[sel,[['a.txt','text/plain']],'drop']); pg.wait_for_timeout(200)
        ok('Added 1 note (1 could not be read)' in pg.inner_text('#spDropToast'),f+': failures are mentioned')
        pg.evaluate("__S.calls.length=0"); pg.evaluate(DROP,[sel,[['virus.exe','application/x-msdownload'],['doc.docx','']],'drop']); pg.wait_for_timeout(150)
        ok(calls(pg)==[] and pg.evaluate("__dropPrevented") and '.stickypad, .md and .txt' in pg.inner_text('#spDropToast'),f+': other files are refused politely and not opened')
        pg.evaluate("__S.calls.length=0"); pg.evaluate(DROP,[sel,[['pic.png','image/png']],'drop']); pg.wait_for_timeout(150)
        ok(calls(pg)==[],f+': a picture is not handed over as a note file')
        if f=='note.html': pg.wait_for_timeout(300); ok(pg.evaluate("__S.calls.some(c=>c[0]=='update')"),'note.html: the note itself still takes the picture (%s)'%pg.evaluate("__S.calls.map(c=>c[0])"))
        ok(not pg.errs,f+': no page errors (%s)'%pg.errs)
    b.close()
print('FAILED: %s'%fails if fails else 'ALL PASS'); sys.exit(1 if fails else 0)
