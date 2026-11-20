/* Synthetic in-memory knowledge; never reads real user data or Frozen. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
function harness(claims){
 const window={NERYXLearningHub:{collect:()=>({claims})}};
 const localStorage={getItem:()=>null,setItem:()=>{throw Error('no writes')}};
 const run=path=>runInNewContext(readFileSync(new URL('../../'+path,import.meta.url),'utf8'),{window,localStorage});
 run('modules/topic-learning.js');
 window.NERYXTopicLearning=window.NERYXTopicLearning;
 run('modules/learning-coordinator.js');
 return window;
}
const claim={subject:'okapi',property:'lebensraum',value:'Tropische Regenwälder im Nordosten der Demokratischen Republik Kongo.',origin:'Hauptwissen',source:'user'};
test('Landesfrage nutzt gespeicherten Lebensraum anstatt eine Modellbehauptung',()=>{
 const w=harness([claim]);
 const q='In welchem Land ist das Okapi heimisch?';
 assert.equal(w.NERYXTopicLearning.parse(q).type,'lebensraum');
 const a=w.NERYXCoordinator.decide(q);
 assert.match(a,/Demokratischen Republik Kongo/);
 assert.match(a,/Hauptwissen/);
 assert.doesNotMatch(a,/Austria|Österreich/);
});
test('Allgemeine und Heimatregion-Formulierungen bleiben konsistent',()=>{
 const w=harness([claim]);
 for(const q of ['Wo lebt das Okapi?','In welcher Region ist das Okapi heimisch?']){
  assert.match(w.NERYXCoordinator.decide(q),/Demokratischen Republik Kongo/);
 }
});
test('Kein fremder Fakt darf für ein anderes Thema ausgegeben werden',()=>{
 const w=harness([claim]);
 assert.equal(w.NERYXCoordinator.decide('In welchem Land ist der Panda heimisch?'),null);
});
test('Widersprüche bleiben als Konflikt sichtbar, keine Modellantwort',()=>{
 const w=harness([claim,{...claim,value:'Fiktives Gebiet'}]);
 assert.match(w.NERYXCoordinator.decide('In welchem Land ist das Okapi heimisch?'),/WISSENSKONFLIKT/);
});
