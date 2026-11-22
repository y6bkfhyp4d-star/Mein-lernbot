import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const files=['genesis-x-tools.js','genesis-x-logic.js','genesis-x-router.js','genesis-x-chain.js','genesis-x-verifier.js','genesis-x-verified-chain.js'];
function lab(){
 const window={};
 const deny=()=>{throw Error('External side effects forbidden');};
 const env={window,fetch:deny,eval:deny,document:{getElementById:deny},localStorage:{getItem:deny,setItem:deny}};
 for(const file of files)runInNewContext(readFileSync(new URL('../../modules/'+file,import.meta.url),'utf8'),env,{timeout:1500});
 return window;
}
function task(){
 const pairs=[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]];
 return {
  numeric:{training:[{x:0,y:2},{x:1,y:3},{x:2,y:4}],validation:[{x:4,y:6},{x:7,y:9}]},
  logic:{training:pairs.map(([a,b])=>({a,b,expected:a>b})),validation:[[8,2],[-2,0],[4,4]].map(([a,b])=>({a,b,expected:a>b}))},
  cases:[{x:3,b:4},{x:0,b:5}]
 };
}
test('control: valid dense cases still yield candidate and independently checked output',()=>{
 const w=lab();assert.equal(w.NERYXGenesisXChain.solve(task()).status,'candidate');
 assert.equal(w.NERYXGenesisXVerifiedChain.solve(task()).status,'execution_checked');
});
for(const [name,make] of [
 ['all holes',()=>new Array(1)],
 ['leading hole',()=>[, {x:0,b:5}]],
 ['trailing hole',()=>[{x:3,b:4}, ,]],
 ['middle hole',()=>[{x:3,b:4}, , {x:0,b:5}]],
 ['explicit undefined',()=>[undefined,{x:0,b:5}]]
]){
 test('C: '+name+' is invalid in both chain paths without throwing',()=>{
  const w=lab(),input={...task(),cases:make()};
  assert.doesNotThrow(()=>assert.equal(w.NERYXGenesisXChain.solve(input).status,'invalid'));
  assert.doesNotThrow(()=>assert.equal(w.NERYXGenesisXVerifiedChain.solve(input).status,'invalid'));
 });
}
test('C: a sparse list of maximum permitted length also fails before evaluation',()=>{
 const w=lab(),cases=Array(20);cases[0]={x:3,b:4};cases[19]={x:0,b:5};
 assert.equal(w.NERYXGenesisXChain.solve({...task(),cases}).status,'invalid');
 assert.equal(w.NERYXGenesisXVerifiedChain.solve({...task(),cases}).status,'invalid');
});
