/* Final audit characterization on genuine modules; no product integration. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const paths=['genesis-x.js','genesis-x-tools.js','genesis-x-logic.js','genesis-x-router.js',
 'genesis-x-chain.js','genesis-x-verifier.js','genesis-x-verified-chain.js',
 'genesis-x-diagnostics.js','genesis-x-research.js','genesis-x-research-lab.js'];
function lab(){
 const window={},deny=()=>{throw Error('External side effect forbidden');};
 const context={window,fetch:deny,eval:deny,
  localStorage:{getItem:deny,setItem:deny},document:{getElementById:deny}};
 for(const name of paths)
  runInNewContext(readFileSync(new URL('../../modules/'+name,import.meta.url),'utf8'),context,{timeout:1500});
 return window;
}
function task(offset=2){
 const rows=[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]];
 return {
  numeric:{training:[0,1,2].map(x=>({x,y:x+offset})),
   validation:[4,7].map(x=>({x,y:x+offset})),maxSteps:1},
  logic:{training:rows.map(([a,b])=>({a,b,expected:a>b})),
   validation:[[8,2],[-2,0],[4,4]].map(([a,b])=>({a,b,expected:a>b}))},
  cases:[{x:3,b:4},{x:8,b:20}]
 };
}
const audit=()=>[-3,11,20,30].map((x,i)=>{
 const b=[1,50,12,50][i],value=x+5;
 return {x,b,truth:{value,decision:value>b}};
});
test('AUDIT: all expected modules are loaded with correct versions',()=>{
 const w=lab(),c=w.NERYXGenesisXResearchLab.capabilities();
 assert.equal(c.length,9);
 assert.ok(c.every(x=>x.available));
 assert.equal(w.NERYXGenesisXResearchLab.version,'1.0');
});
test('AUDIT: checked calculation is consistency only, never release authorization',()=>{
 const w=lab(),r=w.NERYXGenesisXResearchLab.run({mode:'checked',input:task()});
 assert.equal(r.status,'execution_checked');
 assert.equal(r.publishable,false);
 assert.match(r.note,/not establish real-world correctness/);
 assert.equal(r.report.audit.references,0);
});
test('AUDIT: unchecked chain predictions are absent from facade',()=>{
 const w=lab(),r=w.NERYXGenesisXResearchLab.run({mode:'chain',input:task()});
 assert.equal(r.status,'exploration_only');
 assert.equal(r.report,undefined);
 assert.equal(r.publishable,false);
});
test('AUDIT: wrong engine status and version fail closed',()=>{
 const w=lab(),x=w.NERYXGenesisXResearchLab,old=w.NERYXGenesisXChain;
 w.NERYXGenesisXChain={version:'0.5',solve:()=>({status:'execution_checked',cases:[{value:999}]})};
 assert.equal(x.run({mode:'chain',input:task()}).status,'blocked');
 w.NERYXGenesisXChain={version:'0.1',solve:old.solve};
 assert.equal(x.run({mode:'chain',input:task()}).status,'unavailable');
});
test('AUDIT: full comparison is required; caller reference mismatch blocks',()=>{
 const w=lab(),data=task(),expected=w.NERYXGenesisXVerifiedChain.solve(data);
 assert.equal(expected.status,'execution_checked');
 data.cases[0].truth={value:999,decision:true};
 const r=w.NERYXGenesisXVerifiedChain.solve(data);
 assert.equal(r.status,'blocked');
 assert.equal(r.reason,'reference_mismatch');
 assert.equal(r.cases,undefined);
});
test('AUDIT: a single wrong external audit truth rejects proposed coverage',()=>{
 const w=lab(),refs=audit();
 const ok=w.NERYXGenesisXResearch.run({task:task(5),audit:refs});
 assert.equal(ok.status,'coverage_gain_observed');
 refs[0].truth.value=999;
 const bad=w.NERYXGenesisXResearch.run({task:task(5),audit:refs});
 assert.equal(bad.status,'rejected');
});
test('AUDIT: 0.9 refuses numerical holdout overlap and duplicate x',()=>{
 const w=lab(),api=w.NERYXGenesisXResearch;
 for(const refs of [
  audit().map((a,i)=>i? a:{...a,x:0}),
  audit().map((a,i)=>i? a:{...a,x:4}),
  audit().map((a,i)=>i? a:{...a,x:3}),
  [audit()[0],audit()[0],audit()[2]],
  audit().slice(0,2)
 ])assert.equal(api.run({task:task(5),audit:refs}).status,'invalid');
});
test('AUDIT: selection labels rejected in all data groups',()=>{
 const w=lab();
 for(const mutate of [
  x=>x.cases[0].truth=undefined,
  x=>x.numeric.training[0].truth={value:4,decision:true},
  x=>x.numeric.validation[0].truth={value:6,decision:true},
  x=>x.logic.training[0].truth={value:2,decision:true},
  x=>x.logic.validation[0].truth={value:2,decision:true}
 ]){
  const data=task(5);mutate(data);
  assert.equal(w.NERYXGenesisXDiagnostics.diagnose(data).status,'invalid');
  assert.equal(w.NERYXGenesisXResearch.run({task:data,audit:audit()}).status,'invalid');
 }
});
test('AUDIT: sparse cases and nonfinite values are rejected before evaluation',()=>{
 const w=lab();
 for(const cases of [new Array(1),[{x:3,b:4}, ,],[{x:Infinity,b:0}]]){
  assert.equal(w.NERYXGenesisXChain.solve({...task(),cases}).status,'invalid');
  assert.equal(w.NERYXGenesisXVerifiedChain.solve({...task(),cases}).status,'invalid');
 }
});
test('AUDIT: output does not mutate caller supplied training and audit examples',()=>{
 const w=lab(),data=task(5),refs=audit(),before=JSON.stringify({data,refs});
 assert.equal(w.NERYXGenesisXResearch.run({task:data,audit:refs}).status,'coverage_gain_observed');
 assert.equal(JSON.stringify({data,refs}),before);
});
test('AUDIT: no user-data or self-deployment interface exposed',()=>{
 const w=lab(),api=w.NERYXGenesisXResearchLab;
 assert.equal(api.save,undefined);
 assert.equal(api.install,undefined);
 assert.equal(api.executeCode,undefined);
 assert.ok(Object.isFrozen(api));
});
test('AUDIT FINDING: null research request currently throws (not yet fixed)',()=>{
 const w=lab();
 assert.throws(()=>w.NERYXGenesisXResearch.run(null),TypeError);
});
