import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const files=['genesis-x-tools.js','genesis-x-logic.js','genesis-x-router.js','genesis-x-chain.js','genesis-x-verifier.js','genesis-x-verified-chain.js','genesis-x-diagnostics.js','genesis-x-research.js'];
function load(){
 const window={},deny=()=>{throw Error('Forbidden external side effect');};
 const context={window,fetch:deny,eval:deny,localStorage:{setItem:deny,getItem:deny},document:{getElementById:deny}};
 for(const file of files)runInNewContext(readFileSync(new URL('../../modules/'+file,import.meta.url),'utf8'),context,{timeout:1500});
 return window;
}
const numeric={training:[{x:0,y:2},{x:1,y:3},{x:2,y:4}],validation:[{x:4,y:6},{x:7,y:9}]};
const logic={training:[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]].map(([a,b])=>({a,b,expected:a>b})),
 validation:[[8,2],[-2,0],[4,4]].map(([a,b])=>({a,b,expected:a>b}))};
const task=()=>({numeric,logic,cases:[{x:3,b:4},{x:0,b:5}]});
const audit=()=>[10,11,12].map(x=>({x,b:1,truth:{value:x+2,decision:true}}));

test('control: genuine versions still solve and verify valid task',()=>{
 const w=load();
 assert.equal(w.NERYXGenesisXRouter.solve({...numeric,type:'numeric'}).status,'candidate');
 assert.equal(w.NERYXGenesisXChain.solve(task()).status,'candidate');
 assert.equal(w.NERYXGenesisXVerifiedChain.solve(task()).status,'execution_checked');
 assert.equal(w.NERYXGenesisXDiagnostics.diagnose(task()).status,'no_change');
 assert.equal(w.NERYXGenesisXResearch.run({task:task(),audit:audit()}).status,'no_change');
});
test('B2 router refuses versionless or mismatched numeric and logic engines',()=>{
 for(const key of ['NERYXGenesisXTools','NERYXGenesisXLogic']){
  for(const version of [undefined,'999']){
   const w=load(),old=w[key];
   w[key]={version,compose:old.compose,learn:old.learn};
   const input=key==='NERYXGenesisXTools'?{...numeric,type:'numeric'}:{...logic,type:'logic'};
   assert.equal(w.NERYXGenesisXRouter.solve(input).status,'unavailable');
  }
 }
});
test('B2 chain refuses versionless or incompatible router before evaluation',()=>{
 for(const version of [undefined,'wrong']){
  const w=load(),old=w.NERYXGenesisXRouter;
  w.NERYXGenesisXRouter={version,solve:old.solve};
  assert.equal(w.NERYXGenesisXChain.solve(task()).status,'unavailable');
 }
});
test('B2 verified chain refuses versionless or mismatched chain and verifier',()=>{
 for(const key of ['NERYXGenesisXChain','NERYXGenesisXVerifier']){
  for(const version of [undefined,'wrong']){
   const w=load(),old=w[key];
   w[key]={version,solve:old.solve,verify:old.verify};
   assert.equal(w.NERYXGenesisXVerifiedChain.solve(task()).status,'unavailable');
  }
 }
});
test('B2 diagnostics refuses versionless checked engine',()=>{
 for(const version of [undefined,'wrong']){
  const w=load(),old=w.NERYXGenesisXVerifiedChain;
  w.NERYXGenesisXVerifiedChain={version,solve:old.solve};
  assert.equal(w.NERYXGenesisXDiagnostics.diagnose(task()).status,'unavailable');
 }
});
test('B2 research refuses mismatched diagnosis and checked dependencies',()=>{
 for(const key of ['NERYXGenesisXDiagnostics','NERYXGenesisXVerifiedChain']){
  for(const version of [undefined,'wrong']){
   const w=load(),old=w[key];
   w[key]={version,diagnose:old.diagnose,solve:old.solve};
   assert.equal(w.NERYXGenesisXResearch.run({task:task(),audit:audit()}).status,'unavailable');
  }
 }
});
