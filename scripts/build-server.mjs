import {readdirSync,readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {resolve,relative,dirname} from 'node:path';
import ts from 'typescript';
const out=resolve('dist-server');rmSync(out,{recursive:true,force:true});
function walk(dir){for(const f of readdirSync(dir,{withFileTypes:true})){const p=resolve(dir,f.name);if(f.isDirectory())walk(p);else if(p.endsWith('.ts')){const dst=resolve(out,relative('.',p).replace(/\.ts$/,'.js'));mkdirSync(dirname(dst),{recursive:true});let s=readFileSync(p,'utf8').replace(/from\s+(['"])(@\/[^'"]+)\1/g,(_,q,spec)=>{let rel=relative(dirname(p),resolve(spec.slice(2))).replaceAll('\\','/');if(!rel.startsWith('.'))rel='./'+rel;return 'from '+q+rel+q;});s=ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/from\s+(['"])(\.[^'"]+)\1/g,(_,q,spec)=>'from '+q+spec+(spec.endsWith('.js')?'':'.js')+q);writeFileSync(dst,s);}}}
for(const dir of ['server','lib','app/api'])walk(resolve(dir));
console.log('Node server built.');
