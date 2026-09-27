import {createHash,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {runtime} from './runtime';
let passwordHash:Buffer;let fingerprint:string;
export function initAuth(){const p=process.env.ADMIN_PASSWORD||'',secret=process.env.SESSION_SECRET||'';if(p.length<12||p.length>256)throw Error('ADMIN_PASSWORD doit contenir entre 12 et 256 caractères.');if(secret.length<32)throw Error('SESSION_SECRET doit contenir au moins 32 caractères.');passwordHash=scryptSync(p,secret,32);fingerprint=createHash('sha256').update(passwordHash).digest('hex');}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function token(req:Request){return /(?:^|;\s*)pari_session=([A-Za-z0-9_-]+)/.exec(req.headers.get('cookie')||'')?.[1]||'';}
export async function authorized(req:Request){const t=token(req);if(!t)return false;const row:any=await runtime().DB.prepare('SELECT expires,fingerprint FROM _sessions WHERE hash=?').bind(hash(t)).first();return !!row&&row.expires>Date.now()&&row.fingerprint===fingerprint;}
export async function login(password:unknown){if(typeof password!=='string'||password.length>256)return null;const candidate=scryptSync(password,process.env.SESSION_SECRET!,32);if(!timingSafeEqual(candidate,passwordHash))return null;const t=randomBytes(32).toString('base64url');await runtime().DB.prepare('DELETE FROM _sessions WHERE expires<? OR fingerprint<>?').bind(Date.now(),fingerprint).run();await runtime().DB.prepare('INSERT INTO _sessions(hash,expires,fingerprint) VALUES(?,?,?)').bind(hash(t),Date.now()+7*86400000,fingerprint).run();return t;}
export async function logout(req:Request){await runtime().DB.prepare('DELETE FROM _sessions WHERE hash=?').bind(hash(token(req))).run();}
export function cookie(value:string,secure:boolean){return `pari_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${value?604800:0}${secure?'; Secure':''}`;}
