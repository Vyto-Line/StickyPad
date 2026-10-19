import json, os, sys, tempfile, sqlite3, shutil
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','tools')); import stickypad_db as T
d=tempfile.mkdtemp(); os.makedirs(d+'/images')
open(d+'/images/a.png','wb').write(b'\x89PNG123')
data={'version':2,'groups':[{'id':'g1','name':'Φάκελος'}],
 'notes':{'n1':{'id':'n1','title':'Λίστα','group':'g1','updated':5,'color':'#fff','font':'Segoe UI','size':16,'pinned':True,'rolled':False,'bounds':{'x':1,'y':2,'width':300,'height':320},
   'blocks':[{'t':'text','v':'γειά σου\nκόσμε'},{'t':'check','v':'γάλα','done':True},{'t':'img','id':'a.png'}],'text':'x'},
  'n2':{'id':'n2','title':'secret','updated':6,'lock':{'salt':'s','iv':'i','data':'d','imgs':[]},'blocks':[],'text':''}},
 'trash':[{'id':'t1','title':'old','deletedAt':99,'blocks':[{'t':'text','v':'bye'}],'text':'bye','updated':1}],'settings':{'theme':'classic'}}
json.dump(data,open(d+'/notes.json','w',encoding='utf-8'),ensure_ascii=False)
print(T.export_db(d,d+'/x.db'))
c=sqlite3.connect(d+'/x.db')
assert c.execute("select count(*) from notes where deleted_at is null").fetchone()[0]==2
assert c.execute("select count(*) from notes where deleted_at is not null").fetchone()[0]==1
assert c.execute("select text from notes where id='n2'").fetchone()[0]==''
assert c.execute("select group_id from notes where id='n1'").fetchone()[0]=='g1'
assert c.execute("select count(*) from images").fetchone()[0]==1
# edit in the DB like another app would
c.execute("update notes set title='Νέος τίτλος' where id='n1'"); c.execute("update blocks set text='ψωμί' where note_id='n1' and pos=1"); c.commit(); c.close()
d2=tempfile.mkdtemp(); print(T.import_db(d+'/x.db',d2))
o=json.load(open(d2+'/notes.json',encoding='utf-8'))
assert o['notes']['n1']['title']=='Νέος τίτλος' and o['notes']['n1']['blocks'][1]=={'t':'check','v':'ψωμί','done':True}
assert o['notes']['n1']['blocks'][0]['v']=='γειά σου\nκόσμε' and o['notes']['n1']['blocks'][2]=={'t':'img','id':'a.png'}
assert o['notes']['n2']['lock']==data['notes']['n2']['lock'] and o['notes']['n2']['blocks']==[]
assert o['trash'][0]['id']=='t1' and o['trash'][0]['deletedAt']==99 and o['groups']==data['groups'] and o['settings']['theme']=='classic'
assert open(d2+'/images/a.png','rb').read()==b'\x89PNG123'
# existing notes.json is backed up
T.import_db(d+'/x.db',d2); assert os.path.exists(d2+'/notes.json.bak')
print('db ok')
