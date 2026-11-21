/* NERYX Offline-Capture-Vertrag v1. Nur Dummy-/lokale Auswertung.
 * Hashkette erkennt unbeabsichtigte Änderungen, authentifiziert keinen Browser.
 * Trusted expectedScripts und Suite kommen ausschließlich vom Offline-Prüfer.
 * Gold/expect/verifierSource/verifierLabels dürfen nie im Capture stehen. */
import {createHash} from 'node:crypto';
import {evaluateItem} from './integration-score.mjs';
const hash=s=>createHash('sha256').update(s,'utf8').digest('hex');
const hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const exactKeys=(o,allowed)=>{
 if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!allowed.includes(k)))
  throw Error('Unbekanntes oder ungültiges Capture-Feld.');
};
const fields=['itemId','inputSha256','answer','answerSha256','path','durationMs','prevRecordSha256'];
const permittedPaths=new Set(['deterministic','local','model','abstain','unknown']);
const encode=r=>JSON.stringify(fields.map(k=>r[k]));
export const captureHash=hash;
export function recordDigest(record){return hash(encode(record));}
export function verifyOfflineCapture(capture,items,expectedScripts,suiteSha256){
 exactKeys(capture,['schema','runId','suiteSha256','modelId','startedAt','scripts','records']);
 if(capture.schema!==1||typeof capture.runId!=='string'||!capture.runId||
  typeof capture.modelId!=='string'||!capture.modelId||
  typeof capture.startedAt!=='string'||!capture.startedAt||
  !hex(suiteSha256)||capture.suiteSha256!==suiteSha256)
  throw Error('Capture-Metadaten oder Suite-Hash ungültig.');
 if(!Array.isArray(items)||!items.length||!Array.isArray(capture.records)||
   capture.records.length!==items.length)throw Error('Capture muss exakt alle Items enthalten.');
 exactKeys(capture.scripts,Object.keys(expectedScripts??{}));
 if(!expectedScripts||!Object.keys(expectedScripts).length||
  Object.keys(capture.scripts).length!==Object.keys(expectedScripts).length)
  throw Error('Skriptmanifest unvollständig.');
 for(const [file,digest] of Object.entries(expectedScripts))
  if(!hex(digest)||capture.scripts[file]!==digest)throw Error('Skript-Hashabweichung.');
 let previous='0'.repeat(64);
 const contexts=[];
 for(let i=0;i<items.length;i++){
  const item=items[i],r=capture.records[i];
  exactKeys(r,[...fields,'recordSha256']);
  if(!item||typeof item.id!=='string'||typeof item.input?.question!=='string'||
   r.itemId!==item.id||r.inputSha256!==hash(item.input.question)||
   typeof r.answer!=='string'||r.answerSha256!==hash(r.answer)||
   !permittedPaths.has(r.path)||!Number.isFinite(r.durationMs)||r.durationMs<0||
   r.prevRecordSha256!==previous||!hex(r.recordSha256)||
   r.recordSha256!==recordDigest(r))
   throw Error('Capture-Datensatz beschädigt, vertauscht oder nicht zugeordnet.');
  previous=r.recordSha256;
  // Ausschließlich Antworttext, niemals user-deklarierte Herkunft oder Gold.
  contexts.push({answer:r.answer});
 }
 return {contexts,recordCount:contexts.length,finalDigest:previous};
}
export function evaluateOfflineCapture(capture,items,expectedScripts,suiteSha256){
 const validated=verifyOfflineCapture(capture,items,expectedScripts,suiteSha256);
 // Ausgaben nur als Aggregate: keine Antworten/Goldwerte in den Bericht.
 const results=items.map((item,i)=>evaluateItem(item,validated.contexts[i]));
 return {verifiedRecords:validated.recordCount,finalDigest:validated.finalDigest,
  outcomes:results.reduce((a,r)=>(a[r.outcome]++,a),{pass:0,fail:0,review:0,not_evaluated:0}),
  dimensions:results.reduce((out,r)=>{
   for(const [k,v] of Object.entries(r.checks)){
    const s=out[k]??={pass:0,fail:0,review:0,not_evaluated:0};
    s[v.status]++;
   }
   return out;
  },{})};
}
