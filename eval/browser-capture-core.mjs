/* NERYX Browser-Capture-Core 0.1 – ein künstliches Item, keine Gold-Antwort. */
export const dummyQuestion='Ein Maler hat 3 Räume mit jeweils 4 Wänden. Jede Wand ist 5 Meter breit und 2,5 Meter hoch.';
export const dummyItem={id:'capture-dummy-wall-001',input:{question:dummyQuestion}};
export const dummySuiteBytes=JSON.stringify([dummyItem]);
const fields=['itemId','inputSha256','answer','answerSha256','path','durationMs','prevRecordSha256'];
export async function sha256(value){
 const data=typeof value==='string'?new TextEncoder().encode(value):value;
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',data));
 return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function makeDummyCapture({answer,durationMs,scripts,startedAt=new Date().toISOString(),runId='dummy-browser-'+crypto.randomUUID()}){
 if(typeof runId!=='string'||!/^dummy-browser-[0-9a-f-]{36}$/.test(runId))throw Error('Lauf-ID ungültig.');
 if(typeof answer!=='string'||!answer.trim()||!Number.isFinite(durationMs)||durationMs<0)
  throw Error('Antwort oder Laufzeit ungültig.');
 if(!scripts||Object.keys(scripts).length!==2||
  !['modules/math-verifier.js','modules/orchestrator.js'].every(k=>/^[a-f0-9]{64}$/.test(scripts[k])))
  throw Error('Skriptmanifest ungültig.');
 const record={itemId:dummyItem.id,inputSha256:await sha256(dummyQuestion),answer,
  answerSha256:await sha256(answer),path:'deterministic',durationMs,
  prevRecordSha256:'0'.repeat(64)};
 record.recordSha256=await sha256(JSON.stringify(fields.map(k=>record[k])));
 return {schema:1,runId,
  suiteSha256:await sha256(dummySuiteBytes),modelId:'none-deterministic',
  startedAt,scripts:{...scripts},records:[record]};
}
