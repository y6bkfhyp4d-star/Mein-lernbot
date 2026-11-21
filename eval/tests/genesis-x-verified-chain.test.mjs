import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const names=['genesis-x-tools.js','genesis-x-logic.js','genesis-x-router.js',
 'genesis-x-chain.js','genesis-x-verifier.js','genesis-x-verified-chain.js'];
function lab(skip=[]){
 const window={};
 const denied=()=>{throw Error('side effect forbidden');};
 const ctx={window,fetch:denied,eval:denied,localStorage:{getItem:denied,setItem:denied},
  document:{getElementById:denied}};
 for(const name of names.filter(n=>!skip.includes(n)))
  runInNewContext(readFileSync(new URL('../../modules/'+name,import.meta.url),'utf8'),ctx,{timeout:1000});
 return window;
}
const data=()=>{
 const f=(a,b)=>a>b;
 return {
  numeric:{training:[{x:0,y:2},{x:1,y:3},{x:2,y:4}],validation:[{x:4,y:6},{x:7,y:9}]},
  logic:{training:[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]].map(([a,b])=>({a,b,expected:f(a,b)})),
   validation:[[8,2],[-2,0],[4,4]].map(([a,b])=>({a,b,expected:f(a,b)}))},
  cases:[{x:3,b:4},{x:0,b:5}]
 };
};
test('0.7 verifies full output and returns execution_checked not globally verified',()=>{
 const r=lab().NERYXGenesisXVerifiedChain.solve(data());
 assert.equal(r.status,'execution_checked');assert.equal(r.audit.checked,2);
 assert.equal(r.audit.references,0);assert.equal(r.cases[0].value,5);
 assert.equal(r.cases[0].decision,true);
});
test('supplied truth is separately checked but not claimed independent',()=>{
 const task=data();task.cases[0].truth={value:5,decision:true};
 task.cases[1].truth={value:2,decision:false};
 const r=lab().NERYXGenesisXVerifiedChain.solve(task);
 assert.equal(r.status,'execution_checked');assert.equal(r.audit.status,'reference_matched');
 assert.equal(r.audit.references,2);
});
test('untrue supplied reference blocks publishing predictions',()=>{
 const task=data();task.cases[0].truth={value:999,decision:true};
 const r=lab().NERYXGenesisXVerifiedChain.solve(task);
 assert.equal(r.status,'blocked');assert.equal(r.reason,'reference_mismatch');
 assert.equal(r.faultStage,'numeric');assert.equal(r.caseIndex,0);
 assert.equal(r.cases,undefined);
});
test('missing verifier causes unavailable and never returns unchecked cases',()=>{
 const w=lab(['genesis-x-verifier.js']);
 const r=w.NERYXGenesisXVerifiedChain.solve(data());
 assert.equal(r.status,'unavailable');assert.equal(r.cases,undefined);
});
test('tampered numeric output gets blocked and error localized',()=>{
 const w=lab(),old=w.NERYXGenesisXChain;
 w.NERYXGenesisXChain={solve(task){
  const result=old.solve(task);
  result.cases[1].value+=10;
  return result;
 }};
 const r=w.NERYXGenesisXVerifiedChain.solve(data());
 assert.equal(r.status,'blocked');assert.equal(r.reason,'mismatch');
 assert.equal(r.faultStage,'numeric');assert.equal(r.caseIndex,1);
});
test('tampered logic output gets blocked at logic stage',()=>{
 const w=lab(),old=w.NERYXGenesisXChain;
 w.NERYXGenesisXChain={solve(task){
  const result=old.solve(task);
  result.cases[0].decision=false;
  return result;
 }};
 const r=w.NERYXGenesisXVerifiedChain.solve(data());
 assert.equal(r.status,'blocked');assert.equal(r.faultStage,'logic');
 assert.equal(r.cases,undefined);
});
test('reordered input records are blocked before audit',()=>{
 const w=lab(),old=w.NERYXGenesisXChain;
 w.NERYXGenesisXChain={solve(t){
  const r=old.solve(t);r.cases.reverse();return r;
 }};
 assert.equal(w.NERYXGenesisXVerifiedChain.solve(data()).stage,'chain-shape');
});
test('reject invalid input and missing candidates',()=>{
 const w=lab(),v=w.NERYXGenesisXVerifiedChain;
 assert.equal(v.solve({...data(),cases:[]}).status,'invalid');
 assert.equal(v.solve({...data(),cases:[{x:Infinity,b:1}]}).status,'invalid');
 const task=data();task.numeric.validation=[{x:4,y:100},{x:7,y:200}];
 assert.equal(v.solve(task).status,'unconfirmed');
});
test('cannot trick audit by reporting success without complete comparison',()=>{
 const w=lab();
 w.NERYXGenesisXVerifier={verify(){return {status:'execution_matched',checked:1,references:0}}};
 const r=w.NERYXGenesisXVerifiedChain.solve(data());
 assert.equal(r.status,'blocked');assert.equal(r.stage,'audit-shape');
});
test('readonly no network storage eval or install interface',()=>{
 const v=lab().NERYXGenesisXVerifiedChain;
 assert.equal(Object.isFrozen(v),true);assert.equal(v.version,'0.7');
 assert.equal(v.install,undefined);assert.equal(v.executeCode,undefined);
});
