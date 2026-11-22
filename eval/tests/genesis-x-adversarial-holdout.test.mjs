import test from 'node:test';
import assert from 'node:assert/strict';
import {adversarialSuites} from '../genesis-x-adversarial-fixtures.mjs';
import {auditCases,reference} from '../genesis-x-independent-oracle.mjs';

test('three disjoint public challenge cohorts cover 30 bounded cases',()=>{
 assert.equal(adversarialSuites.length,3);
 assert.equal(new Set(adversarialSuites.map(x=>x.name)).size,3);
 let count=0,positive=0,negative=0,equal=0,fractional=0;
 for(const s of adversarialSuites){
  assert.equal(s.cases.length,10);
  const trainXs=new Set(s.numericTraining.map(p=>p.x));
  const validXs=new Set(s.numericValidation.map(p=>p.x));
  for(const c of s.cases){
   assert.deepEqual(Object.keys(c).sort(),['b','x']);
   assert.ok(Object.isFrozen(c));
   assert.equal(Number.isFinite(c.x),true);
   assert.equal(Number.isFinite(c.b),true);
   assert.ok(!trainXs.has(c.x)&&!validXs.has(c.x));
   const v=reference(c.x,c.b).value;
   count++;if(v>c.b)positive++;else if(v<c.b)negative++;else equal++;
   if(!Number.isInteger(c.x))fractional++;
  }
 }
 assert.equal(count,30);
 assert.ok(positive>=5&&negative>=5&&equal>=5&&fractional>=8);
});
test('oracle detects subtle near-boundary value corruption',()=>{
 const s=adversarialSuites[0],claims=s.cases.map(c=>({...c,...reference(c.x,c.b)}));
 claims[0].value+=0.000001;
 const a=auditCases(claims,s.cases);
 assert.equal(a.status,'reference_mismatch');
 assert.equal(a.mismatched,1);
 assert.equal(a.publishable,false);
});
test('oracle detects flipped decisions even if numeric predictions are right',()=>{
 const s=adversarialSuites[1],claims=s.cases.map(c=>({...c,...reference(c.x,c.b)}));
 claims[3].decision=!claims[3].decision;
 const a=auditCases(claims,s.cases);
 assert.equal(a.status,'reference_mismatch');
 assert.equal(a.valueMatches,10);
 assert.equal(a.decisionMatches,9);
});
test('oracle blocks reordered and sparse cases, and never returns individual predictions',()=>{
 const s=adversarialSuites[2],claims=s.cases.map(c=>({...c,...reference(c.x,c.b)}));
 const reordered=[...claims];[reordered[0],reordered[1]]=[reordered[1],reordered[0]];
 const mismatch=auditCases(reordered,s.cases);
 assert.equal(mismatch.status,'blocked');
 const sparse=[...claims];delete sparse[4];
 assert.equal(auditCases(sparse,s.cases).status,'blocked');
 const good=auditCases(claims,s.cases);
 assert.equal(good.status,'reference_matched');
 assert.equal(good.publishable,false);
 assert.equal(good.cases,undefined);
 assert.equal(good.predictions,undefined);
});
