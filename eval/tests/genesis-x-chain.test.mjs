import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
function lab(files=['genesis-x-tools.js','genesis-x-logic.js','genesis-x-router.js','genesis-x-chain.js']){
 const window={};
 const deny=()=>{throw Error('Forbidden side effect');};
 const context={window,fetch:deny,eval:deny,
  localStorage:{getItem:deny,setItem:deny},document:{getElementById:deny}};
 for(const file of files)runInNewContext(readFileSync(new URL('../../modules/'+file,import.meta.url),'utf8'),context,{timeout:1000});
 return window;
}
const pair=(x,y)=>({x,y});
const logicPair=(a,b,expected)=>({a,b,expected});
function task(){
 const gt=(a,b)=>a>b;
 return {
  numeric:{training:[pair(0,2),pair(1,3),pair(2,4)],validation:[pair(4,6),pair(7,9)]},
  logic:{training:[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]].map(([a,b])=>logicPair(a,b,gt(a,b))),
    validation:[[8,2],[-2,0],[4,4]].map(([a,b])=>logicPair(a,b,gt(a,b)))},
  cases:[{x:3,b:4},{x:0,b:5},{x:-2,b:0}]
 };
}
test('runs numeric mapping then Boolean decision on explicit cases',()=>{
 const r=lab().NERYXGenesisXChain.solve(task());
 assert.equal(r.status,'candidate');
 assert.deepEqual(Array.from(r.stages),['numeric','logic']);
 assert.deepEqual(JSON.parse(JSON.stringify(r.cases)),[
  {x:3,b:4,value:5,decision:true},
  {x:0,b:5,value:2,decision:false},
  {x:-2,b:0,value:0,decision:false}
 ]);
});
test('refuses invalid and oversized inputs',()=>{
 const x=lab().NERYXGenesisXChain;
 assert.equal(x.solve({...task(),cases:[]}).status,'invalid');
 assert.equal(x.solve({...task(),cases:[{x:Infinity,b:2}]}).status,'invalid');
 assert.equal(x.solve({...task(),cases:Array(21).fill({x:1,b:2})}).status,'invalid');
 assert.equal(x.solve({numeric:{},logic:{},cases:[{x:1,b:2}]}).status,'invalid');
});
test('missing router fails closed',()=>{
 const x=lab(['genesis-x-chain.js']).NERYXGenesisXChain;
 assert.equal(x.solve(task()).status,'unavailable');
});
test('invalid learning stage prevents downstream answer',()=>{
 const t=task();
 t.numeric.validation=[pair(4,90),pair(7,111)];
 const r=lab().NERYXGenesisXChain.solve(t);
 assert.equal(r.status,'unconfirmed');assert.equal(r.stage,'numeric');
});
test('logic failure prevents all predictions',()=>{
 const t=task();t.logic.training=[logicPair(0,0,true)];
 const r=lab().NERYXGenesisXChain.solve(t);
 assert.equal(r.status,'invalid');assert.equal(r.stage,'logic');
});
test('rejects malicious or malformed module output',()=>{
 const w=lab();
 const saved=w.NERYXGenesisXRouter;
 w.NERYXGenesisXRouter={solve(input){return input.type==='numeric'?
  {status:'candidate',result:{selected:{program:[{op:'exec',c:1}]}}}:
  {status:'candidate',result:{rule:{kind:'atom',field:'a',target:'constant',constant:2,op:'gt'}}};}};
 assert.equal(w.NERYXGenesisXChain.solve(task()).status,'unconfirmed');
 w.NERYXGenesisXRouter=saved;
});
test('no install, mutable memory or scripting interface',()=>{
 const x=lab().NERYXGenesisXChain;
 assert.equal(Object.isFrozen(x),true);
 assert.equal(x.install,undefined);
 assert.equal(x.executeCode,undefined);
 assert.equal(x.version,'0.5');
});
