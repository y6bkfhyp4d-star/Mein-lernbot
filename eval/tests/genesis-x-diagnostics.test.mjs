import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const files=['genesis-x-tools.js','genesis-x-logic.js','genesis-x-router.js',
 'genesis-x-chain.js','genesis-x-verifier.js','genesis-x-verified-chain.js',
 'genesis-x-diagnostics.js'];
function lab(skip=[]){
 const window={};
 const deny=()=>{throw Error('side effect forbidden');};
 const ctx={window,fetch:deny,eval:deny,localStorage:{getItem:deny,setItem:deny},document:{getElementById:deny}};
 for(const name of files.filter(n=>!skip.includes(n)))
  runInNewContext(readFileSync(new URL('../../modules/'+name,import.meta.url),'utf8'),ctx,{timeout:1500});
 return window;
}
function task(offset=2){
 const f=(a,b)=>a>b;
 return {
  numeric:{training:[{x:0,y:offset},{x:1,y:offset+1},{x:2,y:offset+2}],
   validation:[{x:4,y:offset+4},{x:7,y:offset+7}],maxSteps:1},
  logic:{training:[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]].map(([a,b])=>({a,b,expected:f(a,b)})),
   validation:[[8,2],[-2,0],[4,4]].map(([a,b])=>({a,b,expected:f(a,b)}))},
  cases:[{x:3,b:4},{x:0,b:5}]
 };
}
test('does not propose changes to already execution-checked solution',()=>{
 const r=lab().NERYXGenesisXDiagnostics.diagnose(task());
 assert.equal(r.status,'no_change');
});
test('proposes bounded constants only after new verification succeeds',()=>{
 const w=lab(),data=task(5);
 const before=JSON.stringify(data),r=w.NERYXGenesisXDiagnostics.diagnose(data);
 assert.equal(r.status,'proposal');assert.equal(r.reviewRequired,true);
 assert.ok(r.suggestedConstants.includes(5));
 assert.equal(JSON.stringify(data),before);
 assert.equal(r.cases,undefined);
});
test('does not call false success a repair',()=>{
 const data=task(5);
 data.numeric.validation=[{x:4,y:999},{x:7,y:1000}];
 const r=lab().NERYXGenesisXDiagnostics.diagnose(data);
 assert.notEqual(r.status,'proposal');
});
test('fails closed on tampered output instead of trying a repair',()=>{
 const w=lab(),old=w.NERYXGenesisXVerifiedChain;
 w.NERYXGenesisXVerifiedChain={solve(){return {status:'blocked',faultStage:'logic'}}};
 const r=w.NERYXGenesisXDiagnostics.diagnose(task());
 assert.equal(r.status,'blocked');assert.equal(r.stage,'logic');assert.equal(r.suggestedConstants,undefined);
 w.NERYXGenesisXVerifiedChain=old;
});
test('missing verifier chain is unavailable',()=>{
 const r=lab(['genesis-x-verified-chain.js']).NERYXGenesisXDiagnostics.diagnose(task());
 assert.equal(r.status,'unavailable');
});
test('rejects malformed and over-budget samples',()=>{
 const d=lab().NERYXGenesisXDiagnostics;
 assert.equal(d.diagnose(null).status,'invalid');
 assert.equal(d.diagnose({...task(),cases:[]}).status,'invalid');
 assert.equal(d.diagnose({...task(),cases:Array(21).fill({x:0,b:1})}).status,'invalid');
 assert.equal(d.diagnose({...task(),numeric:{...task().numeric,constants:[Infinity]}}).status,'invalid');
});
test('unrecognized solver statuses cannot produce proposal',()=>{
 const w=lab();
 w.NERYXGenesisXVerifiedChain={solve(){return {status:'approved'}}};
 assert.equal(w.NERYXGenesisXDiagnostics.diagnose(task()).status,'blocked');
});
test('public interface is frozen and cannot write state or install',()=>{
 const d=lab().NERYXGenesisXDiagnostics;
 assert.equal(Object.isFrozen(d),true);assert.equal(d.version,'0.8');
 assert.equal(d.install,undefined);assert.equal(d.save,undefined);
});
