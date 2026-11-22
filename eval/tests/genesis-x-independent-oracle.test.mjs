import test from 'node:test';
import assert from 'node:assert/strict';
import {holdout,reference,auditCases} from '../genesis-x-independent-oracle.mjs';

const claims=()=>holdout.map(({x,b})=>({x,b,...reference(x,b)}));

test('oracle uses a separate, explicit numeric and comparison specification',()=>{
 assert.deepEqual(reference(3,4),{value:5,decision:true});
 assert.deepEqual(reference(8,20),{value:10,decision:false});
 assert.deepEqual(reference(0,2),{value:2,decision:false});
 assert.deepEqual(reference(-4,-1),{value:-2,decision:false});
});
test('reference test cases contain only held-out x and b inputs',()=>{
 assert.equal(holdout.length,12);
 for(const c of holdout){
  assert.deepEqual(Object.keys(c).sort(),['b','x']);
  assert.equal(Object.isFrozen(c),true);
 }
});
test('all separate reference results match only if both outputs match',()=>{
 const result=auditCases(claims(),holdout);
 assert.deepEqual(result,{status:'reference_matched',publishable:false,
  checked:12,matched:12,mismatched:0,valueMatches:12,decisionMatches:12});
});
test('wrong candidate values and decisions are counted, never published',()=>{
 const wrong=claims();
 wrong[0]={...wrong[0],value:wrong[0].value+1};
 wrong[1]={...wrong[1],decision:!wrong[1].decision};
 const result=auditCases(wrong,holdout);
 assert.equal(result.status,'reference_mismatch');
 assert.equal(result.mismatched,2);
 assert.equal(result.valueMatches,11);
 assert.equal(result.decisionMatches,11);
 assert.equal(result.publishable,false);
 assert.equal(result.cases,undefined);
 assert.equal(result.answers,undefined);
});
test('malformed and reordered case claims are blocked',()=>{
 const good=claims();
 for(const actual of [good.slice(1),[...good].reverse(),[...good.slice(0,4),null,...good.slice(5)],
  [...good.slice(0,3),{...good[3],value:NaN},...good.slice(4)]]){
  const r=auditCases(actual,holdout);
  assert.equal(r.publishable,false);
  assert.ok(['invalid','blocked'].includes(r.status));
 }
});
test('malformed and out-of-range inputs do not get oracle values',()=>{
 for(const args of [[NaN,1],[Infinity,1],[0,Infinity],[1000001,0],[null,1]])
  assert.throws(()=>reference(...args),/Unsupported/);
});
