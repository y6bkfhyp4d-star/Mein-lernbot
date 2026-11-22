import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const modules=['genesis-x.js','genesis-x-tools.js','genesis-x-logic.js','genesis-x-router.js','genesis-x-chain.js','genesis-x-verifier.js','genesis-x-verified-chain.js','genesis-x-diagnostics.js','genesis-x-research.js','genesis-x-research-lab.js'];
function lab(){
 const window={},deny=()=>{throw Error('External side effect forbidden');};
 const context={window,fetch:deny,eval:deny,document:{getElementById:deny},
  localStorage:{getItem:deny,setItem:deny}};
 for(const file of modules)runInNewContext(readFileSync(new URL('../../modules/'+file,import.meta.url),'utf8'),context,{timeout:1500});
 return window;
}
const program=[{op:'add',c:2}];
const rule={kind:'atom',field:'a',op:'gt',target:'field',other:'b'};
const goodCases=[{x:3,b:4},{x:0,b:5}];
const goodClaims=[{value:5,decision:true},{value:2,decision:false}];
const validVerify=()=>({program,rule,cases:goodCases,claims:goodClaims});

test('NULL: five public APIs reject null and other malformed argument shapes without throwing',()=>{
 const w=lab();
 for(const [name,fn] of [
  ['strategy compare',w.NERYXGenesisX.compare],
  ['tools compose',w.NERYXGenesisXTools.compose],
  ['logic learn',w.NERYXGenesisXLogic.learn],
  ['verifier verify',w.NERYXGenesisXVerifier.verify],
  ['research run',w.NERYXGenesisXResearch.run]
 ]){
  for(const value of [null,undefined,false,0,[],{},'bad']){
   assert.doesNotThrow(()=>assert.equal(fn(value).status,'invalid'),
    name+' must reject malformed input'));
  }
 }
});
test('NULL: facade remains non-publishable on null or missing input',()=>{
 const w=lab();
 for(const value of [null,{},undefined]){
  assert.equal(w.NERYXGenesisXResearchLab.run({mode:'research',input:value}).status,'invalid');
 }
});
test('VERIFIER: original dense computation and reference check still work',()=>{
 const v=lab().NERYXGenesisXVerifier;
 const result=v.verify(validVerify());
 assert.equal(result.status,'execution_matched');
 assert.equal(result.checked,2);
 const truthCases=[{x:3,b:4,truth:{value:5,decision:true}},{x:0,b:5,truth:{value:2,decision:false}}];
 assert.equal(v.verify({...validVerify(),cases:truthCases}).status,'reference_matched');
});
for(const [name,change] of [
 ['all missing case entries',()=>({cases:new Array(2)})],
 ['first missing case',()=>({cases:[,{x:0,b:5}]})],
 ['last missing case',()=>({cases:[{x:3,b:4},,]})],
 ['first missing claim',()=>({claims:[,{value:2,decision:false}]})],
 ['last missing claim',()=>({claims:[{value:5,decision:true},,]})],
 ['explicit undefined case',()=>({cases:[undefined,{x:0,b:5}]})],
 ['explicit undefined claim',()=>({claims:[goodClaims[0],undefined]})]
]){
 test('VERIFIER: '+name+' produces invalid, not an exception',()=>{
  const v=lab().NERYXGenesisXVerifier;
  assert.doesNotThrow(()=>assert.equal(v.verify({...validVerify(),...change()}).status,'invalid'));
 });
}
test('VERIFIER: same-length sparse arrays are checked even if final item is a hole',()=>{
 const v=lab().NERYXGenesisXVerifier;
 const cases=Array(20),claims=Array(20);
 cases[0]=goodCases[0];claims[0]=goodClaims[0];
 cases[19]=goodCases[1];claims[19]=goodClaims[1];
 assert.equal(v.verify({...validVerify(),cases,claims}).status,'invalid');
});
test('VERIFIER: invalid reference labels never silently pass',()=>{
 const v=lab().NERYXGenesisXVerifier;
 const cases=[{x:3,b:4,truth:{value:999,decision:true}},goodCases[1]];
 assert.equal(v.verify({...validVerify(),cases}).status,'reference_mismatch');
});
