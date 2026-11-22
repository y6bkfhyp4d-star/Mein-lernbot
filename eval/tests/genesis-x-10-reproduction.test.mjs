/* Characterization and red-first security regressions using the real GENESIS X engines. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const modules=['genesis-x.js','genesis-x-tools.js','genesis-x-logic.js','genesis-x-router.js',
'genesis-x-chain.js','genesis-x-verifier.js','genesis-x-verified-chain.js',
'genesis-x-diagnostics.js','genesis-x-research.js','genesis-x-research-lab.js'];
function lab(){
 const window={},deny=()=>{throw Error('External side effect not allowed');};
 const ctx={window,fetch:deny,eval:deny,localStorage:{setItem:deny,getItem:deny},document:{getElementById:deny}};
 for(const name of modules)runInNewContext(readFileSync(new URL('../../modules/'+name,import.meta.url),'utf8'),ctx,{timeout:1000});
 return window;
}
const numberRows=offset=>[0,1,2].map(x=>({x,y:x+offset}));
const numeric=(offset=2)=>({training:numberRows(offset),
 validation:[4,7].map(x=>({x,y:x+offset})),maxSteps:1,
 constants:[0,1,2,3]});
const logic=()=>{
 const examples=[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]];
 return {training:examples.map(([a,b])=>({a,b,expected:a>b})),
 validation:[[8,2],[-2,0],[4,4]].map(([a,b])=>({a,b,expected:a>b}))};
};
const task=(offset=2)=>({numeric:numeric(offset),logic:logic(),cases:[{x:3,b:4},{x:0,b:5}]});
function assertCandidate(w,t=task()){
 assert.equal(w.NERYXGenesisXChain.solve(t).status,'candidate',
  'Fixture must be valid with actual Tools and Logic');
}
test('control: real numeric and logic engines accept disjoint fixtures',()=>{
 const w=lab(),t=task();
 assert.equal(w.NERYXGenesisXRouter.solve({...t.numeric,type:'numeric'}).status,'candidate');
 assert.equal(w.NERYXGenesisXRouter.solve({...t.logic,type:'logic'}).status,'candidate');
 assertCandidate(w,t);
 assert.equal(w.NERYXGenesisXVerifiedChain.solve(t).status,'execution_checked');
});
test('A / RED: public-facing facade should not expose unchecked chain case outputs',()=>{
 const w=lab();assertCandidate(w);
 const r=w.NERYXGenesisXResearchLab.run({mode:'chain',input:task()});
 assert.ok(r.status!=='candidate'||!Array.isArray(r.report?.cases),
  'Unchecked chain candidates should not be exposed as result-bearing answers');
});
test('B / RED: facade must reject checked status from unverified chain mode',()=>{
 const w=lab();assertCandidate(w);
 w.NERYXGenesisXChain={version:'0.5',solve:()=>({status:'execution_checked',cases:[]})};
 const r=w.NERYXGenesisXResearchLab.run({mode:'chain',input:task()});
 assert.notEqual(r.status,'execution_checked');
});
test('B2 / RED: verified chain should reject versionless substituted router',()=>{
 const w=lab();assertCandidate(w);
 const actual=w.NERYXGenesisXRouter;
 w.NERYXGenesisXRouter={solve:(input)=>actual.solve(input)};
 const r=w.NERYXGenesisXVerifiedChain.solve(task());
 assert.notEqual(r.status,'execution_checked');
});
test('C / RED: sparse case list should return invalid instead of throwing',()=>{
 const w=lab();assertCandidate(w);
 assert.doesNotThrow(()=>{
  const r=w.NERYXGenesisXChain.solve({...task(),cases:new Array(1)});
  assert.equal(r.status,'invalid');
 });
});
test('D / RED: diagnostics should reject caller truth in selection cases',()=>{
 const w=lab();assertCandidate(w);
 const t=task();t.cases[0].truth={value:999,decision:true};
 const r=w.NERYXGenesisXDiagnostics.diagnose(t);
 assert.equal(r.status,'invalid');
});
test('E / characterization: float eq shares strict equality in chain and verifier',()=>{
 const w=lab(),t=task();
 const savedRouter=w.NERYXGenesisXRouter;
 const real=savedRouter.solve;
 w.NERYXGenesisXRouter={version:'0.4',solve:(input)=>{
  const r=real(input);
  if(r.status!=='candidate')return r;
  return input.type==='numeric'?{...r,result:{...r.result,selected:{program:[{op:'add',c:0.1}]}}}:
   {...r,result:{...r.result,rule:{kind:'atom',field:'a',target:'constant',constant:0.3,op:'eq'}}};
 }};
 t.cases=[{x:0.2,b:0}];
 const chain=w.NERYXGenesisXChain.solve(t),checked=w.NERYXGenesisXVerifiedChain.solve(t);
 assert.equal(chain.status,'candidate');
 assert.equal(chain.cases[0].decision,false);
 assert.equal(checked.status,'execution_checked');
 t.cases[0].truth={value:0.3,decision:true};
 const discrepant=w.NERYXGenesisXVerifiedChain.solve(t);
 assert.equal(discrepant.status,'blocked');
 assert.equal(discrepant.reason,'reference_mismatch');
});
test('H / FIXED: verifier checks the exact candidate from first router selection',()=>{
 const w=lab();assertCandidate(w);
 const real=w.NERYXGenesisXRouter.solve;let numericCalls=0;
 w.NERYXGenesisXRouter={version:'0.4',solve:(input)=>{
  const r=real(input);
  if(r.status==='candidate'&&input.type==='numeric'){
   numericCalls++;
   if(numericCalls===2)
    return {...r,result:{...r.result,selected:{program:[{op:'multiply',c:1},{op:'add',c:2}]}}};
  }
  return r;
 }};
 const r=w.NERYXGenesisXVerifiedChain.solve(task());
 assert.equal(numericCalls,1,'Verifier must not reselect an alternate candidate');
 assert.equal(r.status,'execution_checked');
});
test('H / FIXED: captured program changed after evaluation fails independent audit',()=>{
 const w=lab(),original=w.NERYXGenesisXChain;
 w.NERYXGenesisXChain={version:'0.5',solve(t){
  const result=original.solve(t);
  result.artifacts.program=[{op:'add',c:3}];
  return result;
 }};
 const r=w.NERYXGenesisXVerifiedChain.solve(task());
 assert.equal(r.status,'blocked');
 assert.equal(r.stage,'artifact-provenance');
});
test('H / FIXED: missing candidate artifacts fail closed',()=>{
 const w=lab(),original=w.NERYXGenesisXChain;
 w.NERYXGenesisXChain={version:'0.5',solve(t){
  const result=original.solve(t);
  delete result.artifacts;
  return result;
 }};
 const r=w.NERYXGenesisXVerifiedChain.solve(task());
 assert.equal(r.status,'blocked');
 assert.equal(r.stage,'artifact-missing');
});
test('F / characterization: final audit excludes overlapping numeric x values',()=>{
 const w=lab(),t=task(5);
 const audit=[{x:0,b:2,truth:{value:5,decision:true}},
 {x:11,b:3,truth:{value:16,decision:true}},
 {x:12,b:4,truth:{value:17,decision:true}}];
 assert.equal(w.NERYXGenesisXResearch.run({task:t,audit}).status,'invalid');
});
test('G / characterization: improvement hypothesis is a single fixed constant expansion',()=>{
 const w=lab(),r=w.NERYXGenesisXDiagnostics.diagnose(task(5));
 assert.equal(r.status,'proposal');
 assert.deepEqual(Array.from(r.suggestedConstants),[0,1,2,3,4,5,10]);
});
