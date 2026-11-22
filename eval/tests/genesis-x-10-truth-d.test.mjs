import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const modules=['genesis-x-tools.js','genesis-x-logic.js','genesis-x-router.js',
 'genesis-x-chain.js','genesis-x-verifier.js','genesis-x-verified-chain.js',
 'genesis-x-diagnostics.js','genesis-x-research.js'];
function lab(){
 const window={},forbid=()=>{throw Error('Forbidden external effect');};
 const context={window,fetch:forbid,eval:forbid,
  localStorage:{setItem:forbid,getItem:forbid},document:{getElementById:forbid}};
 for(const file of modules)runInNewContext(readFileSync(new URL('../../modules/'+file,import.meta.url),'utf8'),context,{timeout:1500});
 return window;
}
function task(offset=5){
 const f=(a,b)=>a>b;
 return {
  numeric:{training:[0,1,2].map(x=>({x,y:x+offset})),validation:[4,7].map(x=>({x,y:x+offset})),maxSteps:1},
  logic:{training:[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]].map(([a,b])=>({a,b,expected:f(a,b)})),
   validation:[[8,2],[-2,0],[4,4]].map(([a,b])=>({a,b,expected:f(a,b)}))},
  cases:[{x:3,b:4},{x:8,b:20}]
 };
}
function audit(){
 return [-3,11,20,30].map((x,i)=>{
  const b=[1,50,12,50][i],value=x+5;
  return {x,b,truth:{value,decision:value>b}};
 });
}
test('D control: unlabeled selection still allows bounded proposal and separate truth audit',()=>{
 const w=lab(),t=task(),refs=audit(),before=JSON.stringify({t,refs});
 assert.equal(w.NERYXGenesisXDiagnostics.diagnose(t).status,'proposal');
 const result=w.NERYXGenesisXResearch.run({task:t,audit:refs});
 assert.equal(result.status,'coverage_gain_observed');
 assert.equal(result.hypothesis.referenceMatched,4);
 assert.equal(JSON.stringify({t,refs}),before);
});
for(const [block,collection] of [
 ['cases','cases'],['numeric','training'],['numeric','validation'],
 ['logic','training'],['logic','validation']
]){
 test('D: truth in selection '+block+'.'+collection+' is invalid',()=>{
  const w=lab(),t=task();
  const target=block==='cases'?t.cases:t[block][collection];
  target[0].truth={value:999,decision:false};
  assert.equal(w.NERYXGenesisXDiagnostics.diagnose(t).status,'invalid');
  assert.equal(w.NERYXGenesisXResearch.run({task:t,audit:audit()}).status,'invalid');
 });
}
test('D: truth property rejected even if undefined or false',()=>{
 const w=lab();
 for(const value of [undefined,false,null]){
  const t=task();t.cases[0].truth=value;
  assert.equal(w.NERYXGenesisXDiagnostics.diagnose(t).status,'invalid');
 }
});
test('D: no reference label is needed for a verified computation',()=>{
 const w=lab(),t=task(2);
 assert.equal(w.NERYXGenesisXDiagnostics.diagnose(t).status,'no_change');
});
