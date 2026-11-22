import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

function load(){
 const window={};
 const fail=()=>{throw Error('Side effects not permitted')};
 const ctx={window,fetch:fail,document:{querySelector:fail},
  localStorage:{getItem:fail,setItem:fail}};
 for(const name of ['genesis-x-tools.js','genesis-x-ambiguity-gate.js'])
  runInNewContext(readFileSync(new URL('../../modules/'+name,import.meta.url),'utf8'),ctx,{timeout:2000});
 return window.NERYXGenesisXAmbiguityGate;
}
const task=(fn,train,valid,probes)=>({
 training:train.map(x=>({x,y:fn(x)})),
 validation:valid.map(x=>({x,y:fn(x)})),probes
});
const clustered=()=>task(x=>x+2,[0,1e-10,2e-10],[3e-10,4e-10],[10,-10]);
test('clustered data is identified as ambiguous without leaking predictions',()=>{
 const r=load().inspect(clustered());
 assert.equal(r.status,'ambiguous');
 assert.equal(r.publishable,false);
 assert.ok(r.candidates>1);
 assert.ok(r.distinctProbeBehaviors>1);
 for(const key of ['selected','program','predictions','value','truth'])
  assert.equal(r[key],undefined);
});
test('separated two-step data report review_required, not publishable',()=>{
 for(const fn of [x=>x*x+2,x=>3*x+2]){
  const r=load().inspect(task(fn,[-3,-1,0],[1,3],[-6,4,7.5]));
  assert.equal(r.status,'review_required');
  assert.equal(r.publishable,false);
  assert.equal(r.distinctProbeBehaviors,1);
 }
});
test('invalid, overlapping, sparse and truth-injected requests are rejected',()=>{
 const api=load(),good=clustered();
 const malformed=[
  null,
  {...good,probes:[0]},
  {...good,probes:[NaN]},
  {...good,extra:'untrusted'},
  {...good,training:[...good.training.slice(0,1),,good.training[2]]},
  {...good,training:good.training.map((r,i)=>i===0?{...r,truth:123}:r)},
  {...good,probes:Array(3)},
  {...good,training:[{x:0,y:2},{x:0,y:2},{x:2,y:4}]}
 ];
 for(const input of malformed){
  const result=api.inspect(input);
  assert.equal(result.status,'invalid');
  assert.equal(result.publishable,false);
 }
});
test('unfittable labels fail closed',()=>{
 const bad=task(x=>x+2,[0,1,2],[4,7],[10]);
 bad.validation[0].y=999;
 const r=load().inspect(bad);
 assert.equal(r.status,'unconfirmed');
 assert.equal(r.publishable,false);
});
