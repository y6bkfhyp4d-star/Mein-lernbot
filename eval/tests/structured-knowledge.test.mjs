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
test('Yes-no and negated place questions show evidence without confirmation or model',async()=>{
 const h=setup([fact]);
 for(const q of ['Lebt das Quendel in Europa?','Lebt das Quendel nicht in Testland?','Ist das Quendel in Testland heimisch?','Wohnt das Quendel in Testland?']){
  const parsed=h.window.NERYXTopicLearning.parseLocationCheck(q);
  assert.equal(parsed.subject,'quendel',q);
  const x=h.window.NERYXCoordinator.lookup(q);
  assert.equal(x.status,'related',q);
  assert.match(x.text,/Nebelwälder/,q);
  assert.match(x.text,/nicht sicher entscheiden/,q);
  assert.doesNotMatch(x.text,/^Ja\\b|^Nein\\b/m,q);
  const answered=await h.window.NERYXOrchestrator.solve(q);
  assert.equal(answered,x.text,q);
 }
 assert.deepEqual(h.calls,{model:0,writes:0});
});
test('Negation is flagged; missing habitat and unknown or similar subject do not borrow claims',async()=>{
 const h=setup([fact]);
 assert.equal(h.window.NERYXTopicLearning.parseLocationCheck('Lebt das Quendel nicht in Testland?').negated,true);
 assert.equal(h.window.NERYXCoordinator.lookup('Lebt das Quendelkraut in Testland?').status,'no_match');
 assert.equal(h.window.NERYXCoordinator.lookup('Ist das Quendel in Testland oder Europa heimisch?').status,'no_match');
 const other=setup([{subject:'quendel',property:'farbe',value:'Blau',origin:'Hauptwissen',source:'user'}]);
 const missing=other.window.NERYXCoordinator.lookup('Lebt das Quendel in Testland?');
 assert.equal(missing.status,'entity_known_no_attribute');
 assert.match(await other.window.NERYXOrchestrator.solve('Lebt das Quendel in Testland?'),/WISSENSLÜCKE/);
 assert.deepEqual(h.calls,{model:0,writes:0});
 assert.deepEqual(other.calls,{model:0,writes:0});
});
test('Contradictory habitat evidence blocks any yes-no judgment',async()=>{
 const h=setup([fact,{...fact,value:'Trockene Steppe'}]);
 const state=h.window.NERYXCoordinator.lookup('Lebt das Quendel in Testland?');
 assert.equal(state.status,'conflict');
 assert.match(state.text,/WISSENSKONFLIKT/);
 assert.match(await h.window.NERYXOrchestrator.solve('Lebt das Quendel in Testland?'),/WISSENSKONFLIKT/);
 assert.deepEqual(h.calls,{model:0,writes:0});
});
test('Other similarly named subjects never borrow Quendel habitat',()=>{
 const h=setup([fact]);
 assert.equal(h.window.NERYXCoordinator.lookup('Wo findet man das Quendelkraut?').status,'no_match');
});

const placeClaim=(property,value='Testland')=>({
 subject:'quendel',property,value,origin:'Hauptwissen',source:'user',conflict:false
});
test('Exact positive location claim supports explicit Ja; negated question remains unambiguous',async()=>{
 const h=setup([fact,placeClaim('vorkommen_in')]);
 for(const q of ['Lebt das Quendel in Testland?','Ist das Quendel in Testland heimisch?']){
  const r=h.window.NERYXCoordinator.lookup(q);
  assert.equal(r.status,'answered');
  assert.match(r.text,/Ergebnis: Ja/);
  assert.match(r.text,/vorkommen_in|Vorkommensfakt/);
  assert.match(await h.window.NERYXOrchestrator.solve(q),/Ergebnis: Ja/);
 }
 const neg=h.window.NERYXCoordinator.lookup('Lebt das Quendel nicht in Testland?');
 assert.equal(neg.status,'answered');
 assert.match(neg.text,/Ergebnis: Ja/);
 assert.match(neg.text,/bewertet ausdrücklich die positive Behauptung/);
 assert.deepEqual(h.calls,{model:0,writes:0});
});
test('Explicit negative claim supports Nein only for same exact place, no closed-world inference',async()=>{
 const h=setup([fact,placeClaim('nicht_vorkommen_in','Europa')]);
 const no=h.window.NERYXCoordinator.lookup('Lebt das Quendel in Europa?');
 assert.equal(no.status,'answered');
 assert.match(no.text,/Ergebnis: Nein/);
 const neither=h.window.NERYXCoordinator.lookup('Lebt das Quendel in Asien?');
 assert.equal(neither.status,'related');
 assert.match(neither.text,/nicht sicher entscheiden/);
 assert.doesNotMatch(neither.text,/Ergebnis: Nein/);
 assert.deepEqual(h.calls,{model:0,writes:0});
});
test('Positive and negative evidence for same exact location is a conflict',async()=>{
 const h=setup([fact,placeClaim('vorkommen_in'),placeClaim('nicht_vorkommen_in')]);
 const status=h.window.NERYXCoordinator.lookup('Lebt das Quendel in Testland?');
 assert.equal(status.status,'conflict');
 assert.match(status.text,/WISSENSKONFLIKT/);
 assert.match(await h.window.NERYXOrchestrator.solve('Lebt das Quendel in Testland?'),/WISSENSKONFLIKT/);
 assert.deepEqual(h.calls,{model:0,writes:0});
});
test('Conflicting free habitat claims block certainty even if an explicit claim exists',()=>{
 const h=setup([fact,{...fact,value:'Trockene Steppe'},placeClaim('vorkommen_in')]);
 const k=h.window.NERYXCoordinator.lookup('Lebt das Quendel in Testland?');
 assert.equal(k.status,'conflict');
});
test('An unrelated or longer place name never provides a proof for requested place',()=>{
 const h=setup([fact,placeClaim('vorkommen_in','Nordtestland')]);
 const k=h.window.NERYXCoordinator.lookup('Lebt das Quendel in Testland?');
 assert.equal(k.status,'related');
 assert.doesNotMatch(k.text,/Ergebnis: Ja/);
 const other=setup([fact,placeClaim('vorkommen_in')]);
 assert.equal(other.window.NERYXCoordinator.lookup('Lebt das Quendelkraut in Testland?').status,'no_match');
});
test('A marked explicit conflict or alternative never becomes a positive proof',()=>{
 const h=setup([fact,{...placeClaim('vorkommen_in'),conflict:true}]);
 assert.equal(h.window.NERYXCoordinator.lookup('Lebt das Quendel in Testland?').status,'conflict');
 const alternative=setup([fact,{...placeClaim('vorkommen_in'),alternatives:[{value:'Anderes Land'}]}]);
 assert.equal(alternative.window.NERYXCoordinator.lookup('Lebt das Quendel in Testland?').status,'conflict');
});
