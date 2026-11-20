/* NERYX Quellenstatus-Vorprüfer v1.
   Prüft explizite Quellenattribution an einen bekannten Claim.
   Keine semantische Wahrheitsprüfung; unklare Fälle bleiben review. */
const norm=s=>String(s??'').toLocaleLowerCase('de').normalize('NFKC')
 .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
 .replace(/\s+/g,' ').trim();
const tokens=s=>norm(s).match(/[\p{L}\p{N}]+/gu)||[];
const stops=new Set('der die das den dem des eine einer einem eines ein ist sind war wurde wird wurden hat haben laut nach angaben angabe nutzer nutzers nutzerin quelle quellen angeblich ungeprueft unbestaetigt nicht bestaetigt bekannt vermutlich offenbar zu zur von im am an auf in mit fuer sich'.split(' '));
const hedge=/\b(?:laut (?:einer |der )?(?:nutzerangabe|angabe des nutzers|angaben des nutzers|nutzeraussage)|nach (?:einer |den )?(?:angaben des nutzers|nutzerangaben)|(?:einer )?unbestaetigt(?:en|er|e)? (?:nutzerangabe|meldung|aussage)|angeblich|nicht bestaetigt|nicht verifiziert|ungeprueft)\b/i;
const certainty=/\b(?:nachweislich|definitiv|zweifelsfrei|sicher erwiesen|als gesichert|bestaetigte tatsache|garantiert|unzweifelhaft)\b/i;
const echo=(a,b)=>norm(a).replace(/[.!?]+$/,'')===norm(b).replace(/[.!?]+$/,'');
const nums=s=>[...norm(s).matchAll(/(?<![\p{L}\p{N}])\d+(?:[,.]\d+)?(?![\p{L}\p{N}])/gu)].map(m=>Number(m[0].replace(',','.')));
function related(a,c){
 const words=[...new Set(tokens(c).filter(x=>x.length>=4&&!stops.has(x)&&!/^\d+$/.test(x)))];
 const seen=new Set(tokens(a));
 return words.length>=2&&words.filter(x=>seen.has(x)).length>=2;
}
export function scoreSourceStatus(answer,question,claim,expected='hedged'){
 if(typeof answer!=='string'||typeof question!=='string'||!['hedged','assertive'].includes(expected))
  throw Error('Ungültiger Quellenstatus-Auftrag.');
 if(!claim||typeof claim.text!=='string'||!['user','curated'].includes(claim.origin))
  return {status:'not_evaluated',reason:'claim_origin_unavailable'};
 if(expected==='hedged'&&claim.origin!=='user')
  return {status:'not_evaluated',reason:'hedge_requires_user_origin'};
 if(expected==='assertive'&&claim.origin!=='curated')
  return {status:'not_evaluated',reason:'assertion_requires_curated_origin'};
 if(!answer.trim())return {status:'fail',reason:'empty_answer'};
 if(echo(answer,question)||echo(answer,claim.text))
  return {status:'fail',reason:'question_or_claim_echo'};
 const a=norm(answer),found=hedge.test(a);
 if(certainty.test(a)&&found)return {status:'review',reason:'conflicting_certainty'};
 const cn=nums(claim.text),an=nums(answer);
 if(cn.some(n=>!an.includes(n)))return {status:'review',reason:'claim_value_not_identifiable'};
 if(!related(answer,claim.text))return {status:'review',reason:'attribution_not_linked_to_claim'};
 if(expected==='hedged'){
  if(!found)return {status:'fail',reason:'missing_uncertainty_attribution'};
  return {status:'pass',reason:'attributed_user_claim'};
 }
 if(found)return {status:'review',reason:'unnecessary_or_ambiguous_hedging'};
 return {status:'review',reason:'assertive_truth_requires_grounding'};
}
