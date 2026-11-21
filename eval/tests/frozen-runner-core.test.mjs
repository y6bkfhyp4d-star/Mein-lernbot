import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateFrozenBatch as run} from '../frozen-runner-core.mjs';
const item=(category,layers,expect)=>({category,layers,input:{question:'Wie ist die Dummy-Box?'},expect});
const hit=item('retrieval_hit',['retrieval'],{retrieval:{verdict:'sufficient',mustInclude:['a']}});
const missing=item('retrieval_hit',['retrieval','generation'],{retrieval:{verdict:'sufficient',mustInclude:['a']},mode:'answer',concepts:[{id:'x',anyOf:['blau']}]});
const solver=item('solver',['generation'],{exact:{value:6,tol:0,unit:'kg'}});
const verifier=item('grounding',['verifier'],{labels:['supported']});
verifier.input={question:'Prüfe Text.',draft:'Die Dummy-Box ist blau.',evidence:['a']};
const docs=[{id:'a',title:'',content:'Die Dummy-Box ist blau.'}];
const rank=()=>[{id:'a'}];
test('Retrieval ohne andere Ebenen kann vollständig bestanden sein',()=>{
 const s=run([hit],docs,rank);
 assert.equal(s.fullyEvaluated,1);assert.equal(s.outcomes.pass,1);
});
test('Gemischtes Item darf trotz Retrieval-Erfolg nicht vollständig bestehen',()=>{
 const s=run([missing],docs,rank);
 assert.equal(s.fullyEvaluated,0);assert.equal(s.outcomes.pass,0);
 assert.equal(s.outcomes.not_evaluated,1);
 assert.equal(s.dimensions.retrieval.pass,1);
 assert.equal(s.dimensions.mode.not_evaluated,1);
 assert.equal(s.dimensions.concepts.not_evaluated,1);
});
test('Ohne Solver-Antwort kein Solver-Pass',()=>{
 const s=run([solver],docs,rank);
 assert.equal(s.outcomes.not_evaluated,1);
 assert.equal(s.dimensions.exact.not_evaluated,1);
});
test('Gold-Draft darf nicht als NERYX-Verifier-Ausgabe gelten',()=>{
 const s=run([verifier],docs,rank);
 assert.equal(s.outcomes.not_evaluated,1);
 assert.equal(s.dimensions.labels.not_evaluated,1);
});
test('Gemischter Batch: nur vollständig geprüfte Treffer können bestehen',()=>{
 const s=run([hit,missing,solver,verifier],docs,rank);
 assert.equal(s.total,4);assert.equal(s.fullyEvaluated,1);
 assert.equal(s.outcomes.pass,1);assert.equal(s.outcomes.not_evaluated,3);
 assert.equal(s.categories.retrieval_hit.total,2);
});
test('Null-Gate darf Hit nicht bestehen',()=>{
 const s=run([hit],docs,()=>[]);
 assert.equal(s.outcomes.fail,1);
});
test('Fremde Treffer führen zu Fehler',()=>{
 const s=run([hit],docs,()=>[{id:'z'}]);
 assert.equal(s.outcomes.fail,1);
});
test('Fehlerhafte Rank-Ausgabe wird nicht still akzeptiert',()=>{
 assert.throws(()=>run([hit],docs,()=>null));
});
test('Report enthält keine Fragen, Antworten oder Belegtexte',()=>{
 const result=JSON.stringify(run([hit,solver,verifier],docs,rank));
 assert.equal(result.includes('Dummy-Box'),false);
 assert.equal(result.includes('blau'),false);
 assert.equal(result.includes('Die Dummy'),false);
});
test('Unbekannte Evaluations-Layer werfen Fehler',()=>{
 assert.throws(()=>run([item('retrieval_hit',['mystery'],{})],docs,rank));
});
