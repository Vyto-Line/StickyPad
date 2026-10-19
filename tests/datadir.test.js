const D=require('../datadir.js'),fs=require('fs'),path=require('path'),assert=require('assert'),os=require('os');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'dd-')),def=path.join(root,'def'),sync=path.join(root,'sync');fs.mkdirSync(def);
assert.strictEqual(D.resolve(def),def);
fs.writeFileSync(path.join(def,'notes.json'),'{"a":1}');fs.mkdirSync(path.join(def,'images'));fs.writeFileSync(path.join(def,'images','x.png'),'img');
let r=D.setLocation(def,def,sync);assert(!r.adopted&&!r.same);
assert.strictEqual(D.resolve(def),sync);assert.strictEqual(fs.readFileSync(path.join(sync,'notes.json'),'utf8'),'{"a":1}');assert(fs.existsSync(path.join(sync,'images','x.png')));
// second PC adopts existing
const def2=path.join(root,'def2');fs.mkdirSync(def2);fs.writeFileSync(path.join(def2,'notes.json'),'{"b":2}');
r=D.setLocation(def2,def2,sync);assert(r.adopted);assert.strictEqual(fs.readFileSync(path.join(sync,'notes.json'),'utf8'),'{"a":1}');
// reset
D.resetLocation(def,sync);assert.strictEqual(D.resolve(def),def);assert(!fs.existsSync(path.join(def,'location.json')));
// missing folder falls back
fs.writeFileSync(path.join(def,'location.json'),JSON.stringify({dir:path.join(root,'gone')}));assert.strictEqual(D.resolve(def),def);
// relative rejected
assert.throws(()=>D.setLocation(def,def,'rel/x'));
// atomic
const f=path.join(root,'n.json');D.writeAtomic(f,'1');D.writeAtomic(f,'2');assert.strictEqual(fs.readFileSync(f,'utf8'),'2');assert(!fs.existsSync(f+'.tmp'));
// conflicts capped at 10
for(let i=0;i<13;i++)D.keepConflict(sync,'x'+i,new Date(2026,0,1,0,0,i));assert.strictEqual(fs.readdirSync(path.join(sync,'conflicts')).length,10);
console.log('datadir ok');
