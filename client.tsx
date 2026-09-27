import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './app/page';
import './app/globals.css';
function Gate(){const [ready,setReady]=useState(false),[authorized,setAuthorized]=useState(false),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
useEffect(()=>{fetch('/api/session').then(r=>r.json()).then(d=>{setAuthorized(d.authorized);setReady(true)}).catch(()=>{setError('Connexion au serveur impossible. Réessaie.');setReady(true)});},[]);
if(!ready)return <div className="loading">On retrouve la bande…</div>;
if(authorized)return <App/>;
return <main className="login-shell"><div className="login-mark">🤞</div><h1>Pari à Long Terme<span className="coral">.</span></h1><p className="muted">Entre dans l’espace privé de la bande.</p><form className="panel" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const d=await r.json();if(!r.ok)throw Error(d.error);setPassword('');setAuthorized(true);}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}><label className="field">Mot de passe du groupe<input autoComplete="current-password" type="password" required value={password} onChange={e=>setPassword(e.target.value)} maxLength={256}/></label>{error&&<p role="alert" className="inline-warning">{error}</p>}<button className="primary full" disabled={busy}>{busy?'Connexion…':'Entrer'}</button></form><p className="small-text muted">Le mot de passe est défini par l’administrateur.</p></main>;
}
createRoot(document.getElementById('root')!).render(<Gate/>);
