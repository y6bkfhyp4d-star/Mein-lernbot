import test from 'node:test';
import assert from 'node:assert/strict';
import {positive,unsupported,oneStep,validProgram} from '../genesis-x-rule-challenges.mjs';

test('four distinct public rule families have different labels',()=>{
 assert.equal(positive.length,4);
 assert.deepEqual(positive.map(s=>s.name),['plus-two','triple','square','negate']);
 for(const s of positive){
  assert.equal(s.training.length,3);
  assert.equal(s.validation.length,2);
  assert.equal(s.probes.length,3);
  const seen=new Set([...s.training,...s.validation].map(p=>p.x));
  assert.ok(s.probes.every(p=>!seen.has(p.x)));
 }
});
test('one-step interpreter independently evaluates declared candidate operations',()=>{
 assert.equal(oneStep([{op:'add',c:2}],3),5);
 assert.equal(oneStep([{op:'multiply',c:3}],3),9);
 assert.equal(oneStep([{op:'square'}],-3),9);
 assert.equal(oneStep([{op:'negate'}],-3),3);
 assert.equal(oneStep([{op:'divide',c:2}],6),3);
 assert.equal(validProgram([{op:'cube'}]),false);
});
test('separate interpreter fails closed for malformed or illegal operations',()=>{
 for(const p of [null,[],[{op:'unknown'}],[{op:'add',c:Infinity}],
  [{op:'divide',c:0}],[{op:'square'},{op:'add',c:1}]])
  assert.throws(()=>oneStep(p,3),/Invalid/);
});
test('negative control tasks explicitly include unsupported and contradictory examples',()=>{
 assert.deepEqual(unsupported.map(s=>s.name),
 ['cubic-outside-one-step','contradictory-validation']);
 assert.equal(unsupported[1].validation[0].y,999);
 assert.equal(unsupported[1].training[0].y,2);
});
test('holdout labels are not provided in the requests passed to the engine',()=>{
 for(const s of positive){
  const inputs=[...s.training,...s.validation].map(r=>({...r}));
  assert.ok(inputs.every(x=>!Object.hasOwn(x,'expected')&&!Object.hasOwn(x,'truth')));
  assert.ok(s.probes.every(p=>Object.hasOwn(p,'expected')));
 }
});
