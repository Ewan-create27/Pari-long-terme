import {spawn} from 'node:child_process';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import pg from 'pg';
import assert from 'node:assert/strict';
const dir=mkdtempSync(join(tmpdir(),'pari-pg-'));
const database=await PGlite.create(join(dir,'postgres'));
const socket=new PGLiteSocketServer({db:database,host:'127.0.0.1',port:55439,maxConnections:10});await socket.start();
const databaseURL='postgresql://postgres:postgres@127.0.0.1:55439/postgres';
const sql=new pg.Pool({connectionString:databaseURL,max:1});
const port=3197,origin='http://127.0.0.1:'+port,cronSecret='test-cron-secret-at-least-thirty-two-characters';let child;
async function start(){child=spawn(process.execPath,['dist-server/server/index.js'],{env:{...process.env,DATABASE_URL:databaseURL,PORT:String(port),APP_URL:origin,ADMIN_PASSWORD:'test-password-only-2026',SESSION_SECRET:'test-secret-that-is-at-least-thirty-two-characters',CRON_SECRET:cronSecret,SEED_DEMO:'true',NODE_ENV:'test'},stdio:['ignore','pipe','pipe']});let err='';child.stderr.on('data',c=>err+=c);for(let i=0;i<200;i++){try{const r=await fetch(origin+'/healthz');if(r.ok)return;}catch{}if(child.exitCode!==null)throw Error(err);await new Promise(r=>setTimeout(r,100));}throw Error('Server timeout '+err);}
async function stop(){await new Promise(resolve=>{child.once('exit',resolve);child.kill('SIGTERM');});}
let cookie='';
async function api(path,method='GET',body){return fetch(origin+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json',Origin:origin}:{})},...(body?{body:JSON.stringify(body)}:{})});}
async function action(body){const r=await api('/api/data','POST',body);const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
async function tick(){const r=await fetch(origin+'/api/cron',{method:'POST',headers:{Authorization:'Bearer '+cronSecret}});assert.equal(r.status,200);return r.json();}
try{
 await start();assert.equal((await api('/api/data')).status,401);
 assert.equal((await api('/api/session','POST',{password:'incorrect'})).status,401);
 const login=await api('/api/session','POST',{password:'test-password-only-2026'});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];assert(login.headers.get('set-cookie').includes('HttpOnly'));
 let d=await (await api('/api/data')).json();assert.equal(d.people.length,5);assert(d.pushConfigured);assert.equal(d.schedulerActive,false);
 const bet={title:'Test Neon indépendant',description:'Conditions conservées',icon:'✈️',stake:{type:'none'},members:[{personId:'eva',side:'for'},{personId:'lucas',side:'against'},{personId:'lea',side:'for'}],reminders:[{next:'2035-01-01T00:00:00.000Z',frequency:'monthly',timezone:'Pacific/Noumea'}]};
 const created=await action({action:'create',bet});
 await action({action:'archiveBet',id:created.id});
 d=await (await api('/api/data')).json();assert.equal(d.bets.find(b=>b.id===created.id).status,'archived');assert.equal(d.bets.find(b=>b.id===created.id).reminders[0].active,0);
 assert.equal((await api('/api/data','POST',{action:'deleteBet',id:created.id,confirmDelete:true})).status,400);
 const image=readFileSync('tests/avatar.jpg');const uploaded=await fetch(origin+'/api/avatar',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'image/jpeg'},body:image});assert.equal(uploaded.status,200);const avatar=(await uploaded.json()).avatar;
 assert.equal((await fetch(origin+avatar)).status,401);assert.deepEqual(Buffer.from(await (await api(avatar)).arrayBuffer()),image);
 await action({action:'person',person:{name:'Photo',avatar,color:'#ffe2d5'}});
 assert.equal((await fetch(origin+'/api/data',{method:'POST',headers:{Cookie:cookie,Origin:'https://evil.invalid','Content-Type':'application/json'},body:'{}'})).status,403);
 assert.equal((await api('/api/cron','POST',{})).status,401);
 const before=d.publicKey;await stop();await start();d=await (await api('/api/data')).json();assert.equal(d.publicKey,before);assert.equal(d.people.length,6);assert(d.bets.some(b=>b.id===created.id));assert.deepEqual(Buffer.from(await (await api(avatar)).arrayBuffer()),image);
 // A real HTTP cron call, with external persistent storage and no browser timer.
 await action({action:'restoreBet',id:created.id});
 await action({action:'reminders',id:created.id,reminders:bet.reminders});
 await sql.query("UPDATE reminders SET next='2020-01-01T00:00:00.000Z' WHERE bet_id=$1 AND active=1",[created.id]);
 assert.equal((await tick()).processed,1);assert.equal((await tick()).processed,0);
 d=await (await api('/api/data')).json();assert(d.schedulerActive);assert(Date.parse(d.bets.find(b=>b.id===created.id).reminders.find(r=>r.active).next)>Date.now());
 await action({action:'resolve',id:created.id,result:'for',comment:'Terminé avec succès.'});
 assert.equal((await api('/api/data','POST',{action:'resolve',id:created.id,result:'against'})).status,400);
 d=await (await api('/api/data')).json();const finished=d.bets.find(b=>b.id===created.id);assert.equal(finished.status,'closed');assert.equal(finished.result,'for');assert.equal(finished.members.length,3);assert(finished.reminders.every(r=>r.active===0));assert.equal(finished.comment,'Terminé avec succès.');
 await action({action:'archiveDemo'});d=await (await api('/api/data')).json();assert(!d.bets.some(b=>b.demo&&b.status==='active'));
 const cancelled=await action({action:'create',bet:{...bet,title:'Pari annulé à conserver',reminders:[]}});await action({action:'resolve',id:cancelled.id,result:'cancelled'});
 // Check rollback on the PostgreSQL adapter, using a separate app runtime.
 process.env.DATABASE_URL=databaseURL;process.env.CRON_SECRET=cronSecret;
 const {initRuntime,closeRuntime}=await import('../dist-server/server/runtime.js');const {DB}=await initRuntime();
 await assert.rejects(DB.batch([DB.prepare("INSERT INTO groups(id,name) VALUES('rollback-test','Test')"),DB.prepare('INSERT INTO members(id,bet_id,person_id,side) VALUES(?,?,?,?)').bind('invalid','missing','eva','for')]));
 assert.equal(await DB.prepare("SELECT id FROM groups WHERE id='rollback-test'").first(),null);await closeRuntime();
 await api('/api/session','DELETE');assert.equal((await api('/api/data')).status,401);
 console.log('PASS: PostgreSQL migrations, sessions, photos/keys/data across app restart, multiple participants, archive/restore, deletion refused, resolution/cancellation, demo archive, transactional rollback, authenticated external scheduler and logout.');
}finally{if(child&&child.exitCode===null)await stop();await sql.end();await socket.stop();
 // Socket close handlers defer their PostgreSQL cleanup to the next event-loop turn.
 await new Promise(resolve=>setImmediate(resolve));
 await new Promise(resolve=>setImmediate(resolve));
 await database.close();rmSync(dir,{recursive:true,force:true});}
