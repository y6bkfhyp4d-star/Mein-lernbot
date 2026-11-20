/* NERYX Dummy Browser-Capture: Wandfläche und Zahlenmuster, keine Frozen-Daten. */
export const dummyQuestion='Ein Maler hat 3 Räume mit jeweils 4 Wänden. Jede Wand ist 5 Meter breit und 2,5 Meter hoch.';
export const dummyItem={id:'capture-dummy-wall-001',input:{question:dummyQuestion}};
export const sequenceQuestion='2, 4, 8, 16';
export const sequenceItem={id:'capture-dummy-sequence-001',input:{question:sequenceQuestion}};
export const dummyItems=[dummyItem,sequenceItem];
export const dummySuiteBytes=JSON.stringify(dummyItems);
export const REQUIRED_SCRIPTS=[
 'modules/math-verifier.js','modules/rule-patterns.js','modules/system-hub.js','modules/orchestrator.js'
];
const fields=['itemId','inputSha256','answer','answerSha256','path','durationMs','prevRecordSha256'];
export async function sha256(value){
 const data=typeof value==='string'?new TextEncoder().encode(value):value;
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',data));
 return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function makeDummyCapture({answers,durationsMs,scripts,startedAt=new Date().toISOString(),runId='dummy-browser-'+crypto.randomUUID()}){
 if(typeof runId!=='string'||!/^dummy-browser-[0-9a-f-]{36}$/.test(runId))throw Error('Lauf-ID ungültig.');
 if(!scripts||Object.keys(scripts).length!==REQUIRED_SCRIPTS.length||
  !REQUIRED_SCRIPTS.every(k=>/^[a-f0-9]{64}$/.test(scripts[k])))
  throw Error('Skriptmanifest ungültig.');
 if(!Array.isArray(answers)||!Array.isArray(durationsMs)||answers.length!==dummyItems.length||
  durationsMs.length!==dummyItems.length)throw Error('Zwei Dummy-Antworten sind erforderlich.');
 let previous='0'.repeat(64);
 const records=[];
 for(let i=0;i<dummyItems.length;i++){
  const answer=answers[i],durationMs=durationsMs[i];
  if(typeof answer!=='string'||!answer.trim()||!Number.isFinite(durationMs)||durationMs<0)
   throw Error('Antwort oder Laufzeit ungültig.');
  const record={itemId:dummyItems[i].id,inputSha256:await sha256(dummyItems[i].input.question),answer,
   answerSha256:await sha256(answer),path:'deterministic',durationMs,prevRecordSha256:previous};
  record.recordSha256=await sha256(JSON.stringify(fields.map(k=>record[k])));
  records.push(record);previous=record.recordSha256;
 }
 return {schema:1,runId,suiteSha256:await sha256(dummySuiteBytes),
  modelId:'none-deterministic',startedAt,scripts:{...scripts},records};
}
