import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const files=['genesis-x-tools.js','genesis-x-logic.js','genesis-x-router.js','genesis-x-chain.js','genesis-x-verifier.js','genesis-x-verified-chain.js'];
function lab(){
 const window={},deny=()=>{throw Error('forbidden side effect');};
 const context={window,fetch:deny,eval:deny,localStorage:{getItem:deny,setItem:deny},document:{getElementById:deny}};
 for(const name of files)runInNewContext(readFileSync(new URL('../../modules/'+name,import.meta.url),'utf8'),context,{timeout:1500});
 return window;
}
function task(){
 const rows=[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]];
 return {numeric:{training:[0,1,2].map(x=>({x,y:x+2})),validation:[4,7].map(x=>({x,y:x+2}))},
 logic:{training:rows.map(([a,b])=>({a,b,expected:a>b})),validation:[[8,2],[-2,0],[4,4]].map(([a,b])=>({a,b,expected:a>b}))},
 cases:[{x:3,b:4},{x:8,b:20}]};
}
test('H baseline: genuine router candidate selected once, checked output preserved',()=>{
 const w=lab(),original=w.NERYXGenesisXRouter,reads={numeric:0,logic:0};
 w.NERYXGenesisXRouter={version:'0.4',solve(input){
  reads[input.type]++;
  return original.solve(input);
 }};
 const r=w.NERYXGenesisXVerifiedChain.solve(task());
 assert.equal(r.status,'execution_checked');
 assert.equal(reads.numeric,1);assert.equal(reads.logic,1);
 assert.deepEqual(Array.from(r.cases,c=>c.value),[5,10]);
});
test('H Claude regression: forged consistent multiply-2 artifacts cannot authorize result',()=>{
 const w=lab(),selectedRule=w.NERYXGenesisXRouter.solve({...task().logic,type:'logic'}).result.rule;
 w.NERYXGenesisXChain={version:'0.5',solve(t){
  return {status:'candidate',
   cases:t.cases.map(c=>({x:c.x,b:c.b,value:c.x*2,decision:c.x*2>c.b})),
   artifacts:{program:[{op:'multiply',c:2}],rule:selectedRule}};
 }};
 const r=w.NERYXGenesisXVerifiedChain.solve(task());
 assert.equal(r.status,'blocked');
 assert.equal(r.stage,'artifact-provenance');
 assert.equal(r.cases,undefined);
});
test('H equal outputs but a distinct program must not pass provenance check',()=>{
 const w=lab(),old=w.NERYXGenesisXChain;
 w.NERYXGenesisXChain={version:'0.5',solve(t){
  const r=old.solve(t);
  r.artifacts.program=[{op:'multiply',c:1},{op:'add',c:2}];
  return r;
 }};
 const r=w.NERYXGenesisXVerifiedChain.solve(task());
 assert.equal(r.status,'blocked');
 assert.equal(r.stage,'artifact-provenance');
});
test('H malicious chain cannot smuggle an unselected program if it claims different cases',()=>{
 const w=lab(),old=w.NERYXGenesisXChain;
 w.NERYXGenesisXChain={version:'0.5',solve(t,selected){
  const r=old.solve(t,selected);
  r.cases[0].value=600;
  return r;
 }};
 const r=w.NERYXGenesisXVerifiedChain.solve(task());
 assert.equal(r.status,'blocked');
 assert.equal(r.reason,'mismatch');
});
test('H selector rejects missing/wrong router versions independently of chain',()=>{
 for(const version of [undefined,'wrong']){
  const w=lab(),old=w.NERYXGenesisXRouter;
  w.NERYXGenesisXRouter={version,solve:old.solve};
  assert.equal(w.NERYXGenesisXVerifiedChain.solve(task()).status,'unavailable');
 }
});
