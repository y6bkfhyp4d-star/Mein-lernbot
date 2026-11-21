/* Synthetic model tripwire: no real browser, network, localStorage or Frozen. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const src=readFileSync(new URL('../../modules/orchestrator.js',import.meta.url),'utf8');
const facts='VERWANDTES WISSEN\n• Quendel – lebensraum: Nebelwälder im Norden von Testland';
function harness(){
 const calls=[];
 const trip=(name)=>(...args)=>{calls.push(name);throw Error('MODEL TRIPWIRE '+name)};
 const window={NERYXLocalModel:{load:trip('load'),ask:trip('ask'),askRaw:trip('askRaw'),
  info:trip('info'),status:trip('status'),shouldFallback:trip('shouldFallback')}};
 const localStorage={setItem:()=>{throw Error('WRITE TRIPWIRE')}};
 runInNewContext(src,{window,localStorage,navigator:{onLine:true}},{filename:'modules/orchestrator.js'});
 return {api:window.NERYXOrchestrator,calls};
}
test('Related saved knowledge is not silently discarded for unfamiliar phrasings',async()=>{
 const h=harness();
 const questions=[
  'In welchem Land kommt das Quendel vor?',
  'Ist das Quendel in Testland heimisch?',
  'Lebt das Quendel in Europa?',
  'Aus welchem Land stammt das Quendel?'
 ];
 for(const q of questions){
  const answer=await h.api.solve(q,{knowledge:async()=>facts});
  assert.match(answer,/Nebelwälder/);
  assert.match(answer,/keine sichere Antwort/);
  assert.match(answer,/KI fragen:/);
 }
 assert.deepEqual(h.calls,[]);
});
test('Real no-match still reaches the automatic-model path',async()=>{
 const h=harness();
 await assert.rejects(h.api.solve('Warum sieht Quendel blau aus?',{
  knowledge:async()=> 'Zu „Quendel“ habe ich noch keine passenden Informationen gespeichert.'
 }),/MODEL TRIPWIRE info/);
 assert.deepEqual(h.calls,['info']);
});
test('Valid stored value mentioning nicht bekannt remains an answer',async()=>{
 const h=harness();
 const fact='Quendel – ursache: Die Ursache ist nicht bekannt.';
 assert.equal(h.api.classify(fact),'answered');
 assert.equal(h.api.isUnknown(fact),false);
 assert.equal(await h.api.solve('Was ist die Ursache?',{knowledge:async()=>fact}),fact);
 assert.deepEqual(h.calls,[]);
});
test('Conflicts remain visible without any model contact',async()=>{
 const h=harness(),msg='NERYX · WISSENSKONFLIKT\nQuendel / lebensraum: zwei verschiedene Werte.';
 assert.equal(h.api.classify(msg),'conflict');
 assert.equal(await h.api.solve('Wo lebt Quendel?',{knowledge:async()=>msg}),msg);
 assert.deepEqual(h.calls,[]);
});
test('Explicit negative locations never become affirmative confirmation',async()=>{
 const h=harness();
 const out=await h.api.solve('Lebt das Quendel in Europa?',{knowledge:async()=>facts});
 assert.match(out,/verwandtes gespeichertes Wissen/i);
 assert.doesNotMatch(out,/^(?:Ja|Stimmt|Genau)\b/);
 assert.deepEqual(h.calls,[]);
});
test('App text-marker integration continues to use the expected fallback route',()=>{
 const app=readFileSync(new URL('../../app.js',import.meta.url),'utf8');
 assert.match(app,/VERWANDTES WISSEN/);
 assert.match(app,/habe ich noch keine passenden Informationen gespeichert/);
 assert.match(app,/NERYXOrchestrator\.solve/);
});
