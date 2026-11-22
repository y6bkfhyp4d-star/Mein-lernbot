import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const files=['genesis-x-tools.js','genesis-x-logic.js','genesis-x-router.js',
'genesis-x-chain.js','genesis-x-verifier.js','genesis-x-verified-chain.js',
'genesis-x-diagnostics.js','genesis-x-research.js'];
function lab(){
 const window={},deny=()=>{throw Error('Side effects forbidden');};
 const ctx={window,fetch:deny,eval:deny,document:{getElementById:deny},
 localStorage:{getItem:deny,setItem:deny}};
 for(const file of files)runInNewContext(readFileSync(new URL('../../modules/'+file,import.meta.url),'utf8'),ctx,{timeout:1500});
 return window;
}
function task(offset=5){
 const training=[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]];
 const validation=[[8,2],[-2,0],[4,4]];
 return {
 numeric:{training:[0,1,2].map(x=>({x,y:x+offset})),validation:[4,7].map(x=>({x,y:x+offset})),maxSteps:1},
 logic:{training:training.map(([a,b])=>({a,b,expected:a>b})),
 validation:validation.map(([a,b])=>({a,b,expected:a>b}))},
 cases:[{x:3,b:4},{x:8,b:20}]
 };
}
function audit(xs=[-3,11,20,30]){
 return xs.map((x,i)=>{
  const b=[1,50,12,50][i],value=x+5;
  return {x,b,truth:{value,decision:value>b}};
 });
}
test('LEDGER: genuine research audit accepted once, repeated identical references blocked',()=>{
 const w=lab(),s=w.NERYXGenesisXResearch.createSession(),request={task:task(),audit:audit()};
 const first=s.run(request);
 assert.equal(first.status,'coverage_gain_observed');
 const again=s.run(request);
 assert.equal(again.status,'blocked');
 assert.equal(again.reason,'audit_reuse');
 assert.equal(again.reuseDetected,true);
 assert.equal(again.hypothesis,undefined);
 assert.equal(s.summary().evaluations,1);
 assert.equal(s.summary().distinctAuditInputs,4);
});
test('LEDGER: reordered references, copied references and relabeled truth cannot be double-counted',()=>{
 const w=lab(),s=w.NERYXGenesisXResearch.createSession();
 assert.equal(s.run({task:task(),audit:audit()}).status,'coverage_gain_observed');
 const reordered=audit().reverse();
 const copied=JSON.parse(JSON.stringify(audit()));
 const changed=audit();changed[0].truth.value=999;
 for(const refs of [reordered,copied,changed]){
  const r=s.run({task:task(),audit:refs});
  assert.equal(r.status,'blocked');
  assert.equal(r.reason,'audit_reuse');
 }
 assert.equal(s.summary().evaluations,1);
});
test('LEDGER: even one reused audit x blocks a mostly fresh batch',()=>{
 const w=lab(),s=w.NERYXGenesisXResearch.createSession();
 assert.equal(s.run({task:task(),audit:audit()}).status,'coverage_gain_observed');
 const mixed=audit([11,15,16,17]);
 const r=s.run({task:task(),audit:mixed});
 assert.equal(r.reason,'audit_reuse');
});
test('LEDGER: independent disjoint batches can be recorded within a session',()=>{
 const w=lab(),s=w.NERYXGenesisXResearch.createSession();
 const initial=s.run({task:task(),audit:audit()});
 assert.equal(initial.status,'coverage_gain_observed');
 const next=audit([21,22,23,24]);
 const second=s.run({task:task(),audit:next});
 assert.equal(second.status,'coverage_gain_observed');
 assert.equal(s.summary().evaluations,2);
 assert.equal(s.summary().distinctAuditInputs,8);
});
test('LEDGER: invalid audit does not consume a valid sample',()=>{
 const w=lab(),s=w.NERYXGenesisXResearch.createSession();
 const invalid=audit();invalid[0].truth.value=NaN;
 assert.equal(s.run({task:task(),audit:invalid}).status,'invalid');
 assert.equal(s.summary().evaluations,0);
 assert.equal(s.run({task:task(),audit:audit()}).status,'coverage_gain_observed');
 assert.equal(s.summary().evaluations,1);
});
test('LEDGER: missing or malformed requests fail closed without throwing',()=>{
 const s=lab().NERYXGenesisXResearch.createSession();
 for(const r of [null,undefined,{}, {audit:[]},{audit:[null,null,null]}])
  assert.doesNotThrow(()=>assert.equal(s.run(r).status,'invalid'));
});
test('LEDGER: session is sealed, summaries do not expose raw audit records',()=>{
 const s=lab().NERYXGenesisXResearch.createSession();
 assert.equal(Object.isFrozen(s),true);
 assert.equal(Object.isFrozen(s.summary()),true);
 assert.equal(s.summary().persistent,false);
 assert.equal(s.summary().audit,undefined);
 assert.equal(s.save,undefined);
 assert.equal(s.export,undefined);
});
test('LEDGER LIMITATION: a new session cannot detect reuse in another session',()=>{
 const w=lab(),a=w.NERYXGenesisXResearch.createSession(),b=w.NERYXGenesisXResearch.createSession();
 assert.equal(a.run({task:task(),audit:audit()}).status,'coverage_gain_observed');
 assert.equal(b.run({task:task(),audit:audit()}).status,'coverage_gain_observed');
 assert.equal(a.summary().evaluations,1);
 assert.equal(b.summary().evaluations,1);
});
