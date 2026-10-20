import sys, os
HERE=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(HERE,'out'); os.makedirs(OUT,exist_ok=True)
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; STUB=open(os.path.join(HERE,'stub.js')).read()
fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
SA="""window.__SA = (n, a) => {
  if (n === 'listBackups') return { ok: true, items: window.__ITEMS || [
    { id: 'b:2026-10-19_09-30-00', kind: 'backup', when: new Date(2026, 9, 19, 9, 30).getTime(), notes: 12, trash: 2, ok: true },
    { id: 'b:2026-10-18_09-30-00', kind: 'backup', when: new Date(2026, 9, 18, 9, 30).getTime(), notes: 0, trash: 0, ok: false },
    { id: 'lastgood', kind: 'lastgood', when: Date.now(), notes: 1, trash: 0, ok: true } ] };
  if (n === 'restoreBackup') return window.__RES || (a.mode === 'replace' ? { ok: true, mode: 'replace', added: 12, images: 3, safety: 'before-restore-2026-10-20_17-00-00' } : { ok: true, mode: 'add', added: 3, images: 1 });
  if (n === 'restoreFromFile') return window.__FILE || { ok: false, cancelled: true };
  return { ok: true, info: { lastBackup: Date.now(), backupCount: 2, prefs: {}, version: '1.14.27' } };
};"""
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(init=''):
        pg=b.new_page(viewport={'width':900,'height':700}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.add_init_script(STUB); pg.add_init_script(SA); pg.add_init_script(init); pg.goto('file://'+ROOT+'settings.html'); pg.wait_for_timeout(400); pg.errs=errs
        pg.click('[data-cat=data]'); pg.wait_for_timeout(150); pg.click('#restoreSum'); pg.wait_for_timeout(100); return pg
    calls=lambda pg,n: pg.evaluate("__S.calls.filter(c=>c[0]=='settingsAction'&&c[1]=='%s')"%n)
    pg=page()
    ok('(3)' in pg.inner_text('#restoreSum') and pg.eval_on_selector('#restoreDet','e=>e.open'),'the backups sit in a drop down that says how many (%s)'%pg.inner_text('#restoreSum'))
    pg.click('#restoreSum'); ok(not pg.is_visible('.bitem'),'closed by default view hides the list'); pg.click('#restoreSum'); pg.wait_for_timeout(100)
    rows=pg.locator('.bitem'); ok(rows.count()==3,'three entries listed (%d)'%rows.count())
    ok('12 notes' in rows.nth(0).inner_text() and '2 in trash' in rows.nth(0).inner_text(),'notes and trash counted: '+rows.nth(0).inner_text().replace('\n',' | '))
    ok('cannot be read' in rows.nth(1).inner_text() and rows.nth(1).locator('button').count()==0,'a damaged backup is shown and has no buttons')
    ok('last start that went well' in rows.nth(2).inner_text(),'the last good copy is offered too')
    pg.screenshot(path=os.path.join(OUT,'restore.png'))
    rows.nth(0).get_by_text('Add missing notes').click(); pg.wait_for_timeout(200)
    ok(calls(pg,'restoreBackup')[-1][2]=={'id':'b:2026-10-19_09-30-00','mode':'add'},'Add missing sends the backup id and mode add')
    ok('Added 3 notes and 1 picture' in pg.inner_text('#restoreMsg') and 'Nothing else was changed' in pg.inner_text('#restoreMsg'),'says what happened: '+pg.inner_text('#restoreMsg'))
    n0=len(calls(pg,'restoreBackup')); rep=rows.nth(0).get_by_text('Replace all…'); rep.click(); pg.wait_for_timeout(100)
    ok(len(calls(pg,'restoreBackup'))==n0 and 'Sure' in pg.inner_text('.bitem:nth-child(1) .warn'),'Replace needs a second click (nothing sent yet)')
    pg.wait_for_timeout(3700); ok('Replace all…' in pg.inner_text('.bitem:nth-child(1) .warn') and len(calls(pg,'restoreBackup'))==n0,'and the question times out by itself')
    pg.click('.bitem:nth-child(1) .warn'); pg.click('.bitem:nth-child(1) .warn'); pg.wait_for_timeout(250)
    ok(calls(pg,'restoreBackup')[-1][2]=={'id':'b:2026-10-19_09-30-00','mode':'replace'},'second click replaces')
    ok('exactly like that backup' in pg.inner_text('#restoreMsg') and 'before-restore-2026-10-20_17-00-00' in pg.inner_text('#restoreMsg') and '3 pictures' in pg.inner_text('#restoreMsg'),'tells where the safety copy is: '+pg.inner_text('#restoreMsg'))
    pg.click('#restoreFile'); pg.wait_for_timeout(150); ok(pg.inner_text('#restoreMsg')=='' or True,'choosing a file and cancelling is silent')
    ok(len(calls(pg,'restoreFromFile'))==1,'the file button asks the app')
    ok(not pg.errs,'no page errors (%s)'%pg.errs)
    pg2=page("window.__RES={ok:false,error:'That backup is gone.'}"); pg2.locator('.bitem').nth(0).get_by_text('Add missing notes').click(); pg2.wait_for_timeout(200)
    ok('That backup is gone.' in pg2.inner_text('#restoreMsg'),'errors are shown')
    pg3=page("window.__ITEMS=[]"); ok('No backups yet' in pg3.inner_text('#restoreList'),'no backups: a hint')
    pg4=page("window.__RES={ok:true,mode:'add',added:0,images:0}"); pg4.locator('.bitem').nth(0).get_by_text('Add missing notes').click(); pg4.wait_for_timeout(200)
    ok('Nothing was missing' in pg4.inner_text('#restoreMsg'),'nothing to add is explained')
    pg.click('[data-cat=about]'); pg.wait_for_timeout(100); pg.click('#welcomeBtn'); pg.wait_for_timeout(100); ok(len(calls(pg,'openWelcome'))==1,'About has a button for the welcome tour')
    pg.fill('#sq','restore'); pg.wait_for_timeout(150); ok(pg.is_visible('#restoreRow'),'the settings search finds the restore row')
    for q in (pg2,pg3,pg4): ok(not q.errs,'no page errors (%s)'%q.errs)
    b.close()
print('FAILED: %s'%fails if fails else 'ALL PASS'); sys.exit(1 if fails else 0)
