import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const filenames=['genesis-x-tools.js','genesis-x-logic.js','genesis-x-router.js',
 'genesis-x-chain.js','genesis-x-verifier.js','genesis-x-verified-chain.js',
 'genesis-x-diagnostics.js','genesis-x-research.js'];
function lab(skip=[]){
 const window={}; const deny=()=>{throw Error('external effect forbidden');};
 const context={window,fetch:deny,eval:deny,
  localStorage:{getItem:deny,setItem:deny},document:{getElementById:deny}};
 for(const f of filenames.filter(n=>!skip.includes(n)))
  runInNewContext(readFileSync(new URL('../../modules/'+f,import.meta.url),'utf8'),context,{timeout:1500});
 return window;
}
function task(offset=5){
 const cmp=(a,b)=>a>b;
 return {
  numeric:{training:[{x:0,y:offset},{x:1,y:1+offset},{x:2,y:2+offset}],
   validation:[{x:4,y:4+offset},{x:7,y:7+offset}],maxSteps:1},
  logic:{training:[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]].map(([a,b])=>({a,b,expected:cmp(a,b)})),
   validation:[[8,2],[-2,0],[4,4]].map(([a,b])=>({a,b,expected:cmp(a,b)}))},
  cases:[{x:3,b:4},{x:8,b:20}]
 };
}
function audit(offset=5){
 return [-3,11,20,30].map((x,i)=>{
  const b=[1,50,12,50][i],value=x+offset;
  return {x,b,truth:{value,decision:value>b}};
 });
}
test('observes coverage gain on untouched reference set without mutating task',()=>{
 const w=lab(),data=task(),refs=audit(),before=JSON.stringify({data,refs});
 const r=w.NERYXGenesisXResearch.run({task:data,audit:refs});
 assert.equal(r.status,'coverage_gain_observed');
 assert.equal(r.baseline.status,'unconfirmed');
 assert.equal(r.hypothesis.referenceMatched,4);
 assert.equal(r.reviewRequired,true);
 assert.equal(JSON.stringify({data,refs}),before);
 assert.equal(r.auditCount,4);
});
test('refuses to make proposal from an already checked baseline',()=>{
 const r=lab().NERYXGenesisXResearch.run({task:task(2),audit:audit(2)});
 assert.equal(r.status,'no_change');
});
test('false hidden references reject a formerly promising proposal',()=>{
 const refs=audit();refs[0].truth.value=999;
 const r=lab().NERYXGenesisXResearch.run({task:task(),audit:refs});
 assert.equal(r.status,'rejected');assert.equal(r.hypothesis.referenceMatched,0);
});
test('held out records must be disjoint from training, validation and selection cases',()=>{
 const r=lab().NERYXGenesisXResearch;
 for(const refs of [
  audit().map((v,i)=>i? v:{...v,x:0}),
  audit().map((v,i)=>i? v:{...v,x:4}),
  audit().map((v,i)=>i? v:{...v,x:3}),
  [audit()[0],audit()[0],audit()[2]],
  [{...audit()[0],truth:{value:NaN,decision:true}},...audit().slice(1)],
  audit().slice(0,2)
 ])assert.equal(r.run({task:task(),audit:refs}).status,'invalid');
});
test('missing dependency returns unavailable without inventing a score',()=>{
 const r=lab(['genesis-x-diagnostics.js']).NERYXGenesisXResearch.run({task:task(),audit:audit()});
 assert.equal(r.status,'unavailable');
});
test('hypothesis is not trained on audit cases or reference outputs',()=>{
 const w=lab(),original=w.NERYXGenesisXDiagnostics;
 w.NERYXGenesisXDiagnostics={diagnose(data){
  assert.equal(data.audit,undefined);
  assert.equal(data.cases.length,2);
  assert.equal(data.cases.some(c=>Object.hasOwn(c,'truth')),false);
  return original.diagnose(data);
 }};
 assert.equal(w.NERYXGenesisXResearch.run({task:task(),audit:audit()}).status,'coverage_gain_observed');
});
test('refuses unsupported proposal or fabricated success',()=>{
 const w=lab();
 w.NERYXGenesisXDiagnostics={diagnose(){return {status:'proposal',reviewRequired:false,suggestedConstants:[5]}}};
 assert.equal(w.NERYXGenesisXResearch.run({task:task(),audit:audit()}).status,'no_evidence');
});
test('unexpected baseline evaluation status cannot produce a gain',()=>{
 const w=lab(),old=w.NERYXGenesisXVerifiedChain;
 w.NERYXGenesisXVerifiedChain={solve(data){
  if(data.cases.length===4)return {status:'blocked'};
  return old.solve(data);
 }};
 assert.equal(w.NERYXGenesisXResearch.run({task:task(),audit:audit()}).status,'blocked');
});
test('frozen API and no persistence or self promotion',()=>{
 const r=lab().NERYXGenesisXResearch;
 assert.equal(r.version,'0.9');assert.equal(Object.isFrozen(r),true);
 assert.equal(r.install,undefined);assert.equal(r.save,undefined);
});
