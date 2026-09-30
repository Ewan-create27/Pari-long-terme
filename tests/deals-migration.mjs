import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=await PGlite.create();
try{
 for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')&&f<'0006').sort())await db.exec(readFileSync('migrations/'+f,'utf8'));
 await db.exec(`INSERT INTO groups(id,name) VALUES('local','Test');
 INSERT INTO participants(id,group_id,name,avatar,color) VALUES('a','local','A','x','#ffffff'),('b','local','B','x','#ffffff');
 INSERT INTO bets(id,group_id,title,description,stake,created,phase,revision) VALUES
 ('locked','local','locked','','{"type":"money","amount":100,"currency":"EUR"}','2026-01-01','locked',1),
 ('unanimous','local','unanimous','','{"type":"dare","text":"Pizza"}','2026-01-01','open',1),
 ('pending','local','pending','','{"type":"money","amount":200,"currency":"EUR"}','2026-01-01','open',1);
 INSERT INTO members(id,bet_id,person_id,side) VALUES('1','locked','a','for'),('2','locked','b','against'),('3','unanimous','a','for'),('4','unanimous','b','against'),('5','pending','a','for'),('6','pending','b','against');
 INSERT INTO acceptances(bet_id,person_id,revision) VALUES('unanimous','a',1),('unanimous','b',1),('pending','a',1);`);
 await db.exec(readFileSync('migrations/0006_individual_deals.sql','utf8'));
 const rows=(await db.query('SELECT * FROM bets')).rows;
 assert.equal(JSON.parse(rows.find(b=>b.id==='locked').legacy_agreement).amount,100);
 assert.equal(JSON.parse(rows.find(b=>b.id==='unanimous').legacy_agreement).text,'Pizza');
 assert.equal(rows.find(b=>b.id==='pending').legacy_agreement,null);
 assert.deepEqual(JSON.parse(rows.find(b=>b.id==='locked').legacy_members).sort(),['a','b']);
 assert.equal((await db.query('SELECT * FROM deals')).rows.length,0);
 console.log('PASS migration: historical collective agreements preserved, pending proposals not converted, no multiplied debts.');
}finally{await db.close();}
