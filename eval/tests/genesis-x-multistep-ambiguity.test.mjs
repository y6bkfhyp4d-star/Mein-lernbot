import test from 'node:test';
import assert from 'node:assert/strict';
import {execute,programPool,detectAmbiguity} from '../genesis-x-multistep-oracle.mjs';

test('separate two-step oracle evaluates expected expressions',()=>{
 assert.equal(execute([{op:'square'},{op:'add',c:2}],-3),11);
 assert.equal(execute([{op:'multiply',c:3},{op:'add',c:2}],-3),-7);
 assert.equal(execute([{op:'add',c:2},{op:'square'}],-3),1);
});
test('independent oracle rejects unbounded and invalid operations',()=>{
 for(const program of [[],[{op:'cube'}],[{op:'divide',c:0}],
  [{op:'multiply',c:Infinity}],
  [{op:'add',c:2},{op:'negate'},{op:'square'}]])
  assert.throws(()=>execute(program,2),/Invalid|Unknown/);
});
test('enumerator includes both one and two-step candidates',()=>{
 const pool=programPool();
 assert.equal(pool.filter(p=>p.length===1).length,18);
 assert.equal(pool.filter(p=>p.length===2).length,324);
 assert.ok(pool.some(p=>p.length===2&&p[0].op==='square'&&p[1].op==='add'&&p[1].c===2));
});
test('ambiguity gate distinguishes divergent rules compatible with clustered observations',()=>{
 const xs=[0,1e-10,2e-10,3e-10,4e-10];
 const r=detectAmbiguity(xs.map(x=>({x,y:2+x})),[10,-10]);
 assert.equal(r.status,'ambiguous');
 assert.equal(r.publishable,false);
 assert.ok(r.candidates>=2);
 assert.ok(r.distinctProbeBehaviors>=2);
 assert.equal(r.rules,undefined);
 assert.equal(r.predictions,undefined);
});
test('clearly separated samples do not permit different probe behaviors',()=>{
 const xs=[-3,-1,0,1,3];
 const r=detectAmbiguity(xs.map(x=>({x,y:x*x+2})),[-6,4,7.5]);
 assert.equal(r.status,'probe_consistent');
 assert.equal(r.publishable,false);
 assert.equal(r.distinctProbeBehaviors,1);
});
test('malformed and inconsistent data are rejected rather than published',()=>{
 assert.equal(detectAmbiguity(null,[1]).status,'invalid');
 assert.equal(detectAmbiguity([{x:1,y:2}],[3]).status,'invalid');
 assert.equal(detectAmbiguity(Array(5).fill({x:1,y:Infinity}),[3]).status,'invalid');
 assert.equal(detectAmbiguity([0,1,2,3,4].map(x=>({x,y:x+2})),[NaN]).status,'invalid');
 const impossible=detectAmbiguity([-2,-1,0,1,2].map(x=>({x,y:x*x*x*x*x*x*x})),[3]);
 assert.ok(['unconfirmed','probe_consistent'].includes(impossible.status));
 assert.equal(impossible.publishable,false);
});
