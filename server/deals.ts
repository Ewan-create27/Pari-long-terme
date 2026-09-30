import {uid} from '../lib/store';
export async function dealAction(d:any,b:any,members:any[],personId:string,body:any,at:string,stakeSchema:any){
 const mine=members.find(m=>m.person_id===personId);
 if(b.status!=='active'||!mine)throw Error('Rejoins ce pari en cours pour discuter d’un accord.');
 if(b.deadline&&b.deadline<at.slice(0,10))throw Error('La date limite est dépassée.');
 const rows=(await d.prepare('SELECT * FROM deals WHERE bet_id=?').bind(b.id).all()).results;
 if(body.action==='dealPropose'){
 const stake=stakeSchema.parse(body.stake);
 if(!Array.isArray(body.recipients)||!body.recipients.length||body.recipients.length>99||body.recipients.some((v:any)=>typeof v!=='string')||new Set(body.recipients).size!==body.recipients.length)throw Error('Choisis au moins une personne.');
 for(const target of body.recipients){
 if(!members.some(m=>m.person_id===target&&m.side!==mine.side))throw Error('Choisis une personne du camp opposé.');
 const pair=rows.filter((r:any)=>[r.proposer_id,r.recipient_id].includes(personId)&&[r.proposer_id,r.recipient_id].includes(target));
 const pending=pair.find((r:any)=>r.status==='pending'),accepted=pair.find((r:any)=>r.status==='accepted');
 if(pending)await d.prepare("UPDATE deals SET status='superseded',decided=? WHERE id=?").bind(at,pending.id).run();
 await d.prepare("INSERT INTO deals(id,bet_id,proposer_id,recipient_id,stake,status,replaces_id,created) VALUES(?,?,?,?,?,'pending',?,?)").bind(uid(),b.id,personId,target,JSON.stringify(stake),accepted?.id||null,at).run();
 }
 }else{
 const offer=rows.find((r:any)=>r.id===body.dealId);
 if(!offer||offer.status!=='pending')throw Error('Cette proposition n’est plus en attente. Actualise le pari.');
 if(body.action==='dealWithdraw'){
 if(offer.proposer_id!==personId)throw Error('Seul l’auteur peut retirer sa proposition.');
 await d.prepare("UPDATE deals SET status='withdrawn',decided=? WHERE id=?").bind(at,offer.id).run();
 }else{
 if(offer.recipient_id!==personId)throw Error('Seul le destinataire peut répondre.');
 if(body.action==='dealAccept'&&offer.replaces_id)await d.prepare("UPDATE deals SET status='superseded',decided=? WHERE id=? AND status='accepted'").bind(at,offer.replaces_id).run();
 await d.prepare('UPDATE deals SET status=?,decided=? WHERE id=?').bind(body.action==='dealAccept'?'accepted':'rejected',at,offer.id).run();
 }
 }
 await d.prepare('UPDATE bets SET revision=revision+1 WHERE id=?').bind(b.id).run();
}
