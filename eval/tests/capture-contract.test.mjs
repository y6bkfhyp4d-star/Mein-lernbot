import test from 'node:test';
import assert from 'node:assert/strict';
import {captureHash,recordDigest,verifyOfflineCapture, evaluateOfflineCapture} from '../capture-contract.mjs';
const items=[
 {id:'dummy-1',input:{question:'Wie viele kg?'},layers:['generation'],
  expect:{exact:{value:6,tol:0,unit:'kg'}}},
 {id:'dummy-2',input:{question:'Wie viel Liter?'},layers:['generation'],
  expect:{mode:'answer'}}
];
const scripts={'modules/orchestrator.js':captureHash('dummy application source')};
const suiteSha=captureHash('synthetic suite, not a frozen file');
function fixture(){
 let prev='0'.repeat(64);
 const records=items.map((it,i)=>{
  const answer=i===0?'6 kg':'Die Testflasche enthält 4 Liter und ist blau.';
  const r={itemId:it.id,inputSha256:captureHash(it.input.question),answer,
   answerSha256:captureHash(answer),path:'deterministic',durationMs:18,
   prevRecordSha256:prev};
  r.recordSha256=recordDigest(r);prev=r.recordSha256;return r;
 });
 return {schema:1,runId:'synthetic-run-1',suiteSha256:suiteSha,modelId:'dummy-no-model',
  startedAt:'2026-11-20T00:00:00Z',scripts:{...scripts},records};
}
const verify=c=>verifyOfflineCapture(c,items,scripts,suiteSha);
test('Gültige Dummy-Capture-Kette wird strukturell geprüft',()=>{
 const r=verify(fixture());assert.equal(r.recordCount,2);
});
test('Solver wird aus einer gelieferten Antwort geprüft; mode nicht als pass vorgetäuscht',()=>{
 const r=evaluateOfflineCapture(fixture(),items,scripts,suiteSha);
 assert.equal(r.dimensions.exact.pass,1);
 assert.equal(r.dimensions.mode.not_evaluated>=1,true);
 assert.equal(r.verifiedRecords,2);
 assert.equal(r.outcomes.pass,0);
});
test('Geänderte Frage wird abgelehnt',()=>{
 const c=fixture();c.records[0].inputSha256=captureHash('andere Frage');
 assert.throws(()=>verify(c));
});
test('Geänderte Antwort wird abgelehnt',()=>{
 const c=fixture();c.records[0].answer='7 kg';assert.throws(()=>verify(c));
});
test('Manipulierte Antwort mit nachgezogenem Antwort-Hash wird durch Datensatz-Hash erkannt',()=>{
 const c=fixture();c.records[0].answer='7 kg';
 c.records[0].answerSha256=captureHash('7 kg');
 assert.throws(()=>verify(c));
});
test('Fehlender Datensatz wird abgelehnt',()=>{
 const c=fixture();c.records.pop();assert.throws(()=>verify(c));
});
test('Vertauschte Datensätze werden abgelehnt',()=>{
 const c=fixture();c.records.reverse();assert.throws(()=>verify(c));
});
test('Manipulierter Vorgängerhash wird abgelehnt',()=>{
 const c=fixture();c.records[1].prevRecordSha256='f'.repeat(64);
 assert.throws(()=>verify(c));
});
test('Skript-Hashabweichung wird abgelehnt',()=>{
 const c=fixture();c.scripts['modules/orchestrator.js']=captureHash('falscher Code');
 assert.throws(()=>verify(c));
});
test('Unbekanntes Skript ist nicht erlaubt',()=>{
 const c=fixture();c.scripts['unknown.js']=captureHash('x');assert.throws(()=>verify(c));
});
test('Anderer Suite-Hash wird abgelehnt',()=>{
 const c=fixture();c.suiteSha256=captureHash('andere Suite');assert.throws(()=>verify(c));
});
test('Gold-Erwartung im Capture wird abgelehnt',()=>{
 const c=fixture();c.records[0].expect={exact:{value:6}};assert.throws(()=>verify(c));
});
test('Gefälschte Verifier-Herkunft im Capture wird abgelehnt',()=>{
 const c=fixture();c.records[0].verifierSource='neryx';assert.throws(()=>verify(c));
});
test('Verifier-Labels im Capture werden abgelehnt',()=>{
 const c=fixture();c.records[0].verifierLabels=['supported'];assert.throws(()=>verify(c));
});
test('Falsche Item-ID wird abgelehnt',()=>{
 const c=fixture();c.records[0].itemId='dummy-wrong';assert.throws(()=>verify(c));
});
test('Unbekanntes Capture-Metadatenfeld wird abgelehnt',()=>{
 const c=fixture();c.expect={mode:'answer'};assert.throws(()=>verify(c));
});
test('Hashkette allein ist keine Authentifizierung',()=>{
 const c=fixture();c.records[0].answer='7 kg';c.records[0].answerSha256=captureHash('7 kg');
 c.records[0].recordSha256=recordDigest(c.records[0]);
 c.records[1].prevRecordSha256=c.records[0].recordSha256;
 c.records[1].recordSha256=recordDigest(c.records[1]);
 // Ein vollständig neu berechneter, gefälschter Capture ist strukturell gültig.
 // Die externe Herkunftssicherung fehlt bewusst.
 assert.equal(verify(c).recordCount,2);
});
