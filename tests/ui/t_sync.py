from playwright.sync_api import sync_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); STUB=open(os.path.join(HERE,'stub.js')).read(); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))+'/'; fails=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
SYNC="{on:true,server:'https://stickypad-sync.alexvit-pad.workers.dev',acct:'Y7QEZWKgqsXvtrjNWo5BNQ',lastAt:Date.now(),count:214,conflicts:2,error:'',busy:false}"
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    pg=b.new_context(viewport={'width':860,'height':640},device_scale_factor=1.5).new_page(); pg.on('pageerror',lambda e:errs.append(str(e))); pg.add_init_script(STUB)
    pg.goto('file://'+ROOT+'settings.html'); pg.wait_for_timeout(600)
    pg.evaluate("document.querySelector('#nav button[data-cat=sync]').click()"); pg.wait_for_timeout(200)
    ok(pg.is_visible('#cat-sync') and not pg.is_visible('#syncForm') and not pg.is_visible('#syncRun'),'Sync starts switched off with nothing to fill in')
    pg.click('#syncOn'); pg.wait_for_timeout(100)
    ok(pg.is_visible('#syncForm') and pg.is_visible('#syncReg') and not pg.is_visible('#syncAcctIn'),'switching on shows the form for a new account')
    pg.click('#syncJoin'); ok(pg.is_visible('#syncAcctIn') and not pg.is_visible('#syncReg'),'"Join existing" asks for the account id instead of the registration code')
    pg.click('#syncNew')
    pg.fill('#syncServer','https://stickypad-sync.alexvit-pad.workers.dev'); pg.fill('#syncReg','reg-code'); pg.fill('#syncPass','correct horse battery')
    pg.screenshot(path=os.path.join(HERE,'out','sync_form.png'))
    # a refused start shows the reason
    pg.evaluate("window.__S.act=async()=>({ok:false,error:'Wrong registration code.'})"); pg.click('#syncGo'); pg.wait_for_timeout(200)
    ok('Wrong registration code' in pg.inner_text('#syncMsg') and pg.is_visible('#syncForm'),'a refused start explains why and keeps the form')
    # success: running view
    pg.evaluate("window.__S.act=async(n,a)=>({ok:true,info:{...(await window.api.settingsGet()),sync:%s}})"%SYNC); pg.click('#syncGo'); pg.wait_for_timeout(300)
    call=[c for c in pg.evaluate('window.__S.calls') if c[0]=='settingsAction' and c[1]=='syncStart'][-1]
    ok(call[2]['mode']=='new' and call[2]['server'].startswith('https://') and call[2]['pass']=='correct horse battery' and call[2]['reg']=='reg-code','the app receives mode, server, code and passphrase')
    ok(pg.is_visible('#syncRun') and not pg.is_visible('#syncForm') and pg.input_value('#syncPass')=='','running view shows; the passphrase field is cleared')
    ok('Synced today' in pg.inner_text('#syncStatus') and '214 notes' in pg.inner_text('#syncStatus'),'status line: %r'%pg.inner_text('#syncStatus'))
    ok(pg.is_visible('#syncConfRow') and '2 times' in pg.inner_text('#syncConf'),'conflict copies are mentioned')
    ok('alexvit-pad' in pg.inner_text('#syncSrv') and pg.inner_text('#syncAcctOut')=='Y7QEZWKgqsXvtrjNWo5BNQ','server and account id shown')
    pg.screenshot(path=os.path.join(HERE,'out','sync_running.png'))
    # error state
    pg.evaluate("window.__S.act=async(n,a)=>({ok:true,info:{...(await window.api.settingsGet()),sync:{%s,error:'Offline or the server cannot be reached.'}}})"%SYNC[1:-1]); pg.click('#syncNowBtn'); pg.wait_for_timeout(300)
    ok('Offline' in pg.inner_text('#syncStatus') and 'warn' in pg.get_attribute('#syncStatus','class'),'an error shows in the status line')
    # stopping takes two taps
    pg.evaluate("window.__S.act=async(n,a)=>({ok:true,info:{...(await window.api.settingsGet()),sync:{on:false}}})")
    pg.click('#syncStop'); ok(not pg.evaluate("window.__S.calls.some(c=>c[1]==='syncStop')"),'one tap on Stop syncing does nothing yet'); pg.click('#syncStop'); pg.wait_for_timeout(300)
    ok(pg.evaluate("window.__S.calls.some(c=>c[1]==='syncStop')") and not pg.is_visible('#syncRun'),'a second tap stops syncing')
    ok(not errs,'no script errors %s'%errs); b.close()
import sys; sys.exit(1 if fails else 0)
