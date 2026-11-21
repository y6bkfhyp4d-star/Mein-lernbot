/* Regression: irrelevant document snippets must not block unknown-question fallback. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../../modules/orchestrator.js',import.meta.url),'utf8');
function harness({loaded=true,online=true}={}){
 const calls={load:0,model:0},window={};
 const navigator={onLine:online};
 runInNewContext(source,{window,navigator});
 window.NERYXLocalModel={
  info:()=>({loaded}),
  load:async()=>{calls.load++;loaded=true;return 'geladen'},
  askRaw:async()=>{calls.model++;return 'Eine Hypothese ist eine prüfbare Annahme mit konkreter Testmöglichkeit.'}
 };
 return {solve:window.NERYXOrchestrator.solve,calls};
}
const unrelated='IN GESPEICHERTEN DOKUMENTEN:\n• Saturn: definition – Der Saturn ist der sechste Planet.\nQuelle: Lerninhalt: Saturn';
const relevant='IN GESPEICHERTEN DOKUMENTEN:\n• Okapi: definition – Das Okapi ist ein Säugetier.\nQuelle: Lerninhalt: Okapi';
test('unrelated Saturn documents do not block model for hypothesis question',async()=>{
 const h=harness();
 const q='Was ist der Unterschied zwischen Hypothese und Messung?';
 const answer=await h.solve(q,{knowledge:async()=>unrelated});
 assert.match(answer,/LOKALES SPRACHMODELL \(unverifiziert\)/);
 assert.doesNotMatch(answer,/Saturn/);
 assert.equal(h.calls.model,1);
});
test('relevant document remains visible as explicitly unverified context',async()=>{
 const h=harness();
 const answer=await h.solve('Was ist ein Okapi?',{knowledge:async()=>relevant});
 assert.match(answer,/Okapi/);
 assert.match(answer,/keine sichere Antwort/);
 assert.equal(h.calls.model,0);
});
test('offline unrelated document does not start model',async()=>{
 const h=harness({loaded:false,online:false});
 const answer=await h.solve('Was ist eine Hypothese?',{knowledge:async()=>unrelated});
 assert.match(answer,/OFFLINE/);
 assert.doesNotMatch(answer,/Saturn/);
 assert.equal(h.calls.load,0);
 assert.equal(h.calls.model,0);
});
test('explicitly related local facts keep their context without model',async()=>{
 const h=harness();
 const answer=await h.solve('Wo lebt Quendel?',{knowledge:async()=> 'VERWANDTES WISSEN\n• Quendel: lebt im Testwald'});
 assert.match(answer,/Quendel/);
 assert.match(answer,/keine sichere Antwort/);
 assert.equal(h.calls.model,0);
});
