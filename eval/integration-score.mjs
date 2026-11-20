/* NERYX Integrationsadapter v1 – reine Evaluationslogik.
   Nutzt nur ausdrücklich gelieferte Antworten und Belege.
   Kein Frozen-Lauf, keine Datenpersistenz, keine semantische Vollprüfung. */
import {scoreRetrieval} from './retrieval-score.mjs';
import {checkAggregateResult} from './check-contract.mjs';
import {scoreSolver} from './solver-score.mjs';
import {scoreAnswerMode} from './answer-mode-score.mjs';
import {scoreConflict} from './contradiction-score.mjs';
import {scoreSourceStatus} from './source-status-score.mjs';

const dimensionNames=['retrieval','mode','concepts','exact','labels','numbersFromEvidenceOnly',
 'forbidden','conflictSurfaced','statusWording'];
const validStatuses=new Set(['pass','fail','review','not_evaluated']);
const notReady=reason=>({status:'not_evaluated',reason});
function requiredDimensions(item){
 const e=item.expect??{},layers=item.layers??[];
 const dims=new Set();
 if(layers.includes('retrieval'))dims.add('retrieval');
 if(layers.includes('generation')||Object.hasOwn(e,'mode'))dims.add('mode');
 if(Object.hasOwn(e,'concepts'))dims.add('concepts');
 if(Object.hasOwn(e,'exact'))dims.add('exact');
 if(layers.includes('verifier')||Object.hasOwn(e,'labels'))dims.add('labels');
 for(const key of ['numbersFromEvidenceOnly','forbidden','conflictSurfaced','statusWording'])
  if(Object.hasOwn(e,key))dims.add(key);
 return dimensionNames.filter(x=>dims.has(x));
}
function evidenceFor(item,claimMap){
 const ids=item.input?.evidence;
 if(!Array.isArray(ids)||!ids.length)return null;
 if(ids.some(id=>!claimMap.has(id)))return null;
 return ids.map(id=>claimMap.get(id));
}
function conflictSources(ids,claimMap){
 if(!Array.isArray(ids)||!ids.length||ids.some(id=>!claimMap.has(id)))return null;
 const found=new Map();
 for(const id of ids){
  const c=claimMap.get(id);found.set(id,c);
  for(const other of c.conflicts??[]){
   if(!claimMap.has(other))return null;
   found.set(other,claimMap.get(other));
  }
 }
 return [...found.values()];
}
export function evaluateItem(item,context={}){
 if(!item||!Array.isArray(item.layers)||!item.layers.length||
  item.layers.some(x=>!['retrieval','generation','verifier'].includes(x))||
  !item.expect||typeof item.expect!=='object'||!item.input||
  typeof item.input.question!=='string')throw Error('Ungültiges Evaluationsitem.');
 const expected=item.expect,question=item.input.question;
 const claims=context.claims??[];
 if(!Array.isArray(claims))throw Error('Claims müssen ein Array sein.');
 const claimMap=new Map();
 for(const c of claims){
  if(!c||typeof c.id!=='string'||claimMap.has(c.id))throw Error('Ungültige oder doppelte Claim-ID.');
  claimMap.set(c.id,c);
 }
 const requested=requiredDimensions(item),checks={};
 const answer=typeof context.answer==='string'?context.answer:null;
 const insert=(key,result)=>{
  if(!validStatuses.has(result?.status))throw Error('Ungültiger Auswerterstatus: '+key);
  checks[key]={status:result.status,reason:result.reason??'checked'};
 };
 for(const key of requested){
  if(key==='retrieval'){
   if(!Array.isArray(context.foundIds)){insert(key,notReady('retrieval_output_missing'));continue;}
   const r=scoreRetrieval(context.foundIds,expected);
   insert(key,{status:r.pass?'pass':'fail',reason:r.kind});
  }else if(key==='mode'){
   if(answer===null){insert(key,notReady('generated_answer_missing'));continue;}
   if(expected.mode===undefined){insert(key,notReady('mode_expectation_missing'));continue;}
   // missingEvidenceConfirmed darf nur aus einem expliziten Testorakel stammen.
   const c=context.missingEvidenceConfirmed===true?{missingEvidenceConfirmed:true}:{};
   insert(key,scoreAnswerMode(answer,question,expected.mode,c));
  }else if(key==='exact'){
   insert(key,answer===null?notReady('solver_answer_missing'):
    scoreSolver(answer,question,expected.exact));
  }else if(key==='labels'){
   // Hier darf KEIN Gold-Draft durch unseren eigenen Grounding-Auswerter laufen:
   // Die Labels müssen zuvor vom tatsächlichen NERYX-Verifier erzeugt worden sein.
   if(context.verifierSource!=='neryx'||!Array.isArray(context.verifierLabels)){
    insert(key,notReady('neryx_verifier_output_missing'));continue;
   }
   const allowed=['supported','unsupported','contradicted','unverified'];
   if(!context.verifierLabels.every(x=>allowed.includes(x)))
    throw Error('Ungültige NERYX-Verifier-Labels.');
   if(!Array.isArray(expected.labels)||!expected.labels.every(x=>allowed.includes(x)))
    throw Error('Ungültige Gold-Verifier-Labels.');
   const same=context.verifierLabels.length===expected.labels.length&&
    context.verifierLabels.every((x,i)=>x===expected.labels[i]);
   insert(key,{status:same?'pass':'fail',reason:'neryx_labels_compared'});
  }else if(key==='conflictSurfaced'){
   const sources=conflictSources(context.conflictIds,claimMap);
   insert(key,answer===null||!sources?notReady('answer_or_conflict_sources_missing'):
    scoreConflict(answer,sources,expected.conflictSurfaced));
  }else if(key==='statusWording'){
   const c=typeof context.statusClaimId==='string'?claimMap.get(context.statusClaimId):null;
   insert(key,answer===null||!c?notReady('answer_or_origin_missing'):
    scoreSourceStatus(answer,question,c,expected.statusWording));
  }else{
   // Diese Dimensionen besitzen noch keinen fachlich belastbaren Auswerter.
   insert(key,notReady('scorer_not_implemented'));
  }
 }
 const statuses=Object.values(checks).map(x=>x.status);
 const fullyEvaluated=statuses.length>0&&statuses.every(s=>s!=='not_evaluated');
 const outcome=!statuses.length?'not_evaluated':
  statuses.includes('fail')?'fail':
  statuses.includes('not_evaluated')?'not_evaluated':
  statuses.includes('review')?'review':'pass';
 const result={outcome,fullyEvaluated,checks};
 checkAggregateResult(result,validStatuses);
 return result;
}
export function aggregateEvaluation(results){
 if(!Array.isArray(results))throw Error('Ergebnisliste muss Array sein.');
 const summary={total:results.length,fullyEvaluated:0,
  outcomes:{pass:0,fail:0,review:0,not_evaluated:0},dimensions:{}};
 for(const result of results){
  checkAggregateResult(result,validStatuses);
  const full=result.fullyEvaluated;
  summary.outcomes[result.outcome]++;
  if(full)summary.fullyEvaluated++;
  for(const [key,check] of Object.entries(result.checks)){
   if(!dimensionNames.includes(key))throw Error('Unbekannte Prüfdimension.');
   const bucket=summary.dimensions[key]??={pass:0,fail:0,review:0,not_evaluated:0};
   bucket[check.status]++;
  }
 }
 return summary; // Keine Antworten, Goldwerte oder Claim-IDs ausgeben.
}
