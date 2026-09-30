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
async function start(){child=spawn(process.execPath,['dist-server/server/index.js'],{env:{...process.env,DATABASE_URL:databaseURL,PORT:String(port),APP_URL:origin,ADMIN_PASSWORD:'test-password-only-2026',INVITE_CODE:'friends-invitation-2026',SESSION_SECRET:'test-secret-that-is-at-least-thirty-two-characters',CRON_SECRET:cronSecret,SEED_DEMO:'true',NODE_ENV:'test'},stdio:['ignore','pipe','pipe']});let err='';child.stderr.on('data',c=>err+=c);for(let i=0;i<200;i++){try{const r=await fetch(origin+'/healthz');if(r.ok)return;}catch{}if(child.exitCode!==null)throw Error(err);await new Promise(r=>setTimeout(r,100));}throw Error('Server timeout '+err);}
async function stop(){await new Promise(resolve=>{child.once('exit',resolve);child.kill('SIGTERM');});}
let cookie='';
async function api(path,method='GET',body){return fetch(origin+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json',Origin:origin}:{})},...(body?{body:JSON.stringify(body)}:{})});}
async function action(body){const r=await api('/api/data','POST',body);const data=await r.json();console.log('action',body.action,r.status);assert.equal(r.status,200,JSON.stringify(data));return data;}
async function tick(){const r=await fetch(origin+'/api/cron',{method:'POST',headers:{Authorization:'Bearer '+cronSecret}});assert.equal(r.status,200);return r.json();}

try{
 await start();
 async function register(username){const r=await api('/api/accounts','POST',{action:'register',username,name:username,password:'my-personal-password-2026',avatar:'😎',invite:'friends-invitation-2026'});assert.equal(r.status,200,await r.text());cookie=r.headers.get('set-cookie').split(';')[0];return {cookie,id:(await (await api('/api/session')).json()).actor.person_id};}
 const a=await register('alice'),b=await register('bob'),c=await register('cara'),outsider=await register('outside');cookie=a.cookie;
 const {id}=await action({action:'create',bet:{title:'Demain il fera jour',members:[{personId:a.id,side:'for'}],stake:{type:'money',amount:100,currency:'EUR'},reminders:[]}});
 async function current(){return (await (await api('/api/data')).json()).bets.find(x=>x.id===id);}
 async function send(user,actionName,extra={}){cookie=user.cookie;const revision=(await current()).revision;return action({action:actionName,id,revision,...extra});}
 async function fail(user,actionName,extra={}){cookie=user.cookie;const revision=(await current()).revision;const r=await api('/api/data','POST',{action:actionName,id,revision,...extra});assert.equal(r.status,400,await r.text());}
 await send(b,'join',{side:'against'});await send(c,'join',{side:'against'});
 await fail(b,'join',{side:'for'});await fail(a,'lock');
 const money={type:'money',amount:100,currency:'EUR'},pushups={type:'dare',text:'Faire 1000 pompes'};
 await fail(outsider,'dealPropose',{recipients:[a.id],stake:money});await fail(b,'dealPropose',{recipients:[c.id],stake:money});
 await send(a,'dealPropose',{recipients:[b.id,c.id],stake:money});let rows=(await current()).deals;const ab=rows.find(d=>d.recipient_id===b.id),ac=rows.find(d=>d.recipient_id===c.id);
 await fail(a,'dealAccept',{dealId:ab.id});await fail(c,'dealAccept',{dealId:ab.id});
 await send(b,'dealAccept',{dealId:ab.id});await send(c,'dealReject',{dealId:ac.id});assert.equal((await current()).deals.filter(d=>d.status==='accepted').length,1);
 await send(c,'dealPropose',{recipients:[a.id],stake:pushups});let ca=(await current()).deals.find(d=>d.status==='pending');await send(a,'dealAccept',{dealId:ca.id});
 await send(a,'lock');assert.equal((await current()).deals.filter(d=>d.status==='accepted').length,2);
 await send(a,'dealPropose',{recipients:[b.id],stake:{...money,amount:200}});let offer=(await current()).deals.find(d=>d.status==='pending');assert.equal((await current()).deals.find(d=>d.id===ab.id).status,'accepted');
 await send(b,'dealReject',{dealId:offer.id});assert.equal((await current()).deals.find(d=>d.id===ab.id).status,'accepted');
 await send(a,'dealPropose',{recipients:[b.id],stake:{...money,amount:300}});offer=(await current()).deals.find(d=>d.status==='pending');
 await send(b,'dealPropose',{recipients:[a.id],stake:{...money,amount:150}});await fail(b,'dealAccept',{dealId:offer.id});let counter=(await current()).deals.find(d=>d.status==='pending');await send(a,'dealAccept',{dealId:counter.id});
 assert.equal((await current()).deals.find(d=>d.id===ab.id).status,'superseded');assert.equal((await current()).deals.find(d=>d.id===ca.id).status,'accepted');
 await send(a,'dealPropose',{recipients:[b.id],stake:money});offer=(await current()).deals.find(d=>d.status==='pending');await send(a,'dealWithdraw',{dealId:offer.id});assert.equal((await current()).deals.filter(d=>d.status==='accepted').length,2);
 // Same revision: exactly one of two concurrent offers may commit.
 cookie=a.cookie;let rev=(await current()).revision;let results=await Promise.all([100,200].map(amount=>api('/api/data','POST',{action:'dealPropose',id,revision:rev,recipients:[b.id],stake:{...money,amount}})));assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
 // Atomic recipient validation prevents partial multi-recipient offers.
 await fail(a,'dealPropose',{recipients:[c.id,outsider.id],stake:money});assert(!(await current()).deals.some(d=>d.recipient_id===c.id&&d.status==='pending'));
 await stop();await start();cookie=a.cookie;assert.equal((await current()).deals.filter(d=>d.status==='accepted').length,2);
 await send(a,'resolve',{result:'against',comment:'Tous les accords sont conservés.'});await fail(b,'dealPropose',{recipients:[a.id],stake:money});assert.equal((await current()).deals.filter(d=>d.status==='accepted').length,2);
 console.log('PASS: independent recipients, immutable camps, accepted terms preserved on refusal/withdrawal, counters and targeted replacement, authorization, atomic batches, concurrent revisions, locked-bet negotiation, restart persistence and closed-bet guards.');
}catch(e){console.error(e);throw e;}finally{if(child&&child.exitCode===null)await stop();await sql.end();await socket.stop();
 // Socket close handlers defer their PostgreSQL cleanup to the next event-loop turn.
 await new Promise(resolve=>setImmediate(resolve));
 await new Promise(resolve=>setImmediate(resolve));
 await database.close();rmSync(dir,{recursive:true,force:true});}
