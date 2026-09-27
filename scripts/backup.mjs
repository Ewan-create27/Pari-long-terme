// pg_dump includes the schema, avatars, push keys and all other tables.
// Run locally with PostgreSQL client tools installed (same major version as Neon or newer).
import {spawnSync} from 'node:child_process';
import {mkdirSync,chmodSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
if(!process.env.DATABASE_URL)throw Error('Renseigne DATABASE_URL dans .env.');
const dir=resolve('backups');mkdirSync(dir,{recursive:true,mode:0o700});
const file=join(dir,'pari-'+new Date().toISOString().replace(/[:.]/g,'-')+'.dump');
const result=spawnSync('pg_dump',['--format=custom','--no-owner','--no-acl','--file='+file],{env:{...process.env,PGDATABASE:process.env.DATABASE_URL},stdio:'inherit'});
if(result.error||result.status!==0){rmSync(file,{force:true});console.error('Sauvegarde impossible. Installe pg_dump (version compatible avec Neon), puis vérifie la connexion.');process.exit(1);}
chmodSync(file,0o600);console.log('Sauvegarde privée créée : '+file);
