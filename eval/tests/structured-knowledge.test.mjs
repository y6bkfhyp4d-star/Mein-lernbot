/* Echte Coordinator-/Orchestrator-Module; nur synthetische Fakten. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
function setup(claims){
 const calls={model:0,writes:0},window={};
 const localStorage={
  getItem:()=>null,
  setItem:()=>{calls.writes++;throw Error('write forbidden')}
 };
 window.NERYXLearningHub={collect:()=>({claims})};
 window.NERYXLocalModel={
  info(){calls.model++;throw Error('unexpected model call')},
  load(){calls.model++;throw Error('unexpected model call')}
 };
 const run=path=>runInNewContext(readFileSync(new URL('../../'+path,import.meta.url),'utf8'),
  {window,localStorage,navigator:{onLine:true}});
 run('modules/topic-learning.js');
 run('modules/learning-coordinator.js');
 run('modules/orchestrator.js');
 return {window,calls};
}
const fact={subject:'quendel',property:'lebensraum',value:'Nebelwälder im Norden von Testland',
 origin:'Hauptwissen',source:'user',conflict:false};
test('Exact property is answered with source; no model or writes',async()=>{
 const h=setup([fact]);
 const k=h.window.NERYXCoordinator.lookup('Wo lebt das Quendel?');
 assert.equal(k.status,'answered');
 assert.equal(k.subject,'quendel');
 assert.equal(k.property,'lebensraum');
 assert.match(k.text,/Testland/);
 const result=await h.window.NERYXOrchestrator.solve('Wo lebt das Quendel?');
 assert.match(result,/Hauptwissen/);
 assert.deepEqual(h.calls,{model:0,writes:0});
});
test('Known subject but missing attribute is not fabricated',async()=>{
 const h=setup([fact]);
 const q='Welche Farbe hat das Quendel?';
 const k=h.window.NERYXCoordinator.lookup(q);
 assert.equal(k.status,'entity_known_no_attribute');
 const response=await h.window.NERYXOrchestrator.solve(q);
 assert.match(response,/WISSENSLÜCKE/);
 assert.match(response,/farbe/);
 assert.doesNotMatch(response,/Nebelwälder/);
 assert.deepEqual(h.calls,{model:0,writes:0});
});
test('Conflicting claims are explicitly flagged',async()=>{
 const h=setup([fact,{...fact,value:'Trockene Steppe'}]);
 const k=h.window.NERYXCoordinator.lookup('Wo lebt das Quendel?');
 assert.equal(k.status,'conflict');
 assert.match(k.text,/WISSENSKONFLIKT/);
 assert.match(await h.window.NERYXOrchestrator.solve('Wo lebt das Quendel?'),/WISSENSKONFLIKT/);
 assert.deepEqual(h.calls,{model:0,writes:0});
});
test('Unknown topic and unparsed formulation are no_match',()=>{
 const h=setup([fact]);
 assert.equal(h.window.NERYXCoordinator.lookup('Wo lebt das Quendelkraut?').status,'no_match');
 assert.equal(h.window.NERYXCoordinator.lookup('Ist Quendel in Europa?').status,'no_match');
 assert.deepEqual(h.calls,{model:0,writes:0});
});
test('Duplicate identical facts remain one non-conflict answer',()=>{
 const h=setup([fact,{...fact,origin:'Themenlernen'}]);
 const k=h.window.NERYXCoordinator.lookup('Wo lebt das Quendel?');
 assert.equal(k.status,'answered');
 assert.match(k.text,/Übereinstimmende gespeicherte Einträge: 2/);
});

test('Five location paraphrases reuse the identical stored habitat, with no model call',async()=>{
 const h=setup([fact]);
 for(const q of [
  'In welchem Land kommt das Quendel vor?',
  'In welcher Region lebt das Quendel?',
  'Wo ist das Quendel heimisch?',
  'Wo findet man das Quendel?',
  'Wo gibt es das Quendel?'
 ]){
  const item=h.window.NERYXCoordinator.lookup(q);
  assert.equal(item.status,'answered',q);
  assert.equal(item.subject,'quendel',q);
  assert.equal(item.property,'lebensraum',q);
  assert.match(await h.window.NERYXOrchestrator.solve(q),/Nebelwälder/,q);
 }
 assert.deepEqual(h.calls,{model:0,writes:0});
});
test('Origin questions must not be misrepresented as habitat claims',()=>{
 const h=setup([fact]);
 assert.equal(h.window.NERYXTopicLearning.parse('Aus welchem Land stammt das Quendel?'),null);
 assert.equal(h.window.NERYXCoordinator.lookup('Aus welchem Land stammt das Quendel?').status,'no_match');
 assert.equal(h.window.NERYXCoordinator.lookup('Woher kommt das Quendel?').status,'entity_known_no_attribute');
});
test('Yes-no and negated place questions are not treated as habitat confirmation',()=>{
 const h=setup([fact]);
 for(const q of ['Lebt das Quendel in Europa?','Lebt das Quendel nicht in Testland?','Ist das Quendel in Testland heimisch?']){
  const x=h.window.NERYXCoordinator.lookup(q);
  assert.equal(x.status,'no_match',q);
 }
 assert.deepEqual(h.calls,{model:0,writes:0});
});
test('Other similarly named subjects never borrow Quendel habitat',()=>{
 const h=setup([fact]);
 assert.equal(h.window.NERYXCoordinator.lookup('Wo findet man das Quendelkraut?').status,'no_match');
});
