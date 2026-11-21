import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
function lab(){
 const window={};
 const forbidden=()=>{throw Error('side effect prohibited')};
 runInNewContext(readFileSync(new URL('../../modules/genesis-x-verifier.js',import.meta.url),'utf8'),
 {window,fetch:forbidden,eval:forbidden,document:{getElementById:forbidden},localStorage:{getItem:forbidden,setItem:forbidden}},
 {timeout:1000});
 return window.NERYXGenesisXVerifier;
}
const program=[{op:'add',c:2}];
const rule={kind:'atom',field:'a',op:'gt',target:'field',other:'b'};
const cases=[{x:3,b:4},{x:0,b:5}];
const claims=[{value:5,decision:true},{value:2,decision:false}];
const verify=(changes={})=>lab().verify({program,rule,cases,claims,...changes});
test('independently verifies declared arithmetic and Boolean computation',()=>{
 const r=verify();
 assert.equal(r.status,'execution_matched');assert.equal(r.checked,2);assert.equal(r.references,0);
});
test('reports numeric error at exact stage and index',()=>{
 const r=verify({claims:[claims[0],{value:4,decision:false}]});
 assert.equal(r.status,'mismatch');assert.equal(r.stage,'numeric');assert.equal(r.caseIndex,1);
});
test('reports logical error at exact stage and index',()=>{
 const r=verify({claims:[{value:5,decision:false},claims[1]]});
 assert.equal(r.status,'mismatch');assert.equal(r.stage,'logic');assert.equal(r.caseIndex,0);
});
test('externally supplied reference values are distinguished from execution match',()=>{
 const r=verify({cases:[{x:3,b:4,truth:{value:5,decision:true}},
  {x:0,b:5,truth:{value:2,decision:false}}]});
 assert.equal(r.status,'reference_matched');assert.equal(r.references,2);
});
test('false reference fails without trusting matching declared computation',()=>{
 const r=verify({cases:[{x:3,b:4,truth:{value:55,decision:true}},cases[1]]});
 assert.equal(r.status,'reference_mismatch');assert.equal(r.stage,'numeric');assert.equal(r.caseIndex,0);
});
test('invalid operators, rules, divisions and oversized payloads fail closed',()=>{
 for(const input of [
  {program:[{op:'execute',c:1}]},
  {program:[{op:'divide',c:0}]},
  {rule:{kind:'exec',js:'alert(1)'}},
  {program:[]},
  {cases:[]},
  {claims:[claims[0]]},
  {cases:[{x:Infinity,b:4}]},
  {cases:Array(21).fill(cases[0]),claims:Array(21).fill(claims[0])}
 ])assert.equal(verify(input).status,'invalid');
});
test('numeric and reference validation cannot be bypassed',()=>{
 assert.equal(verify({cases:[{x:3,b:4,truth:{value:NaN,decision:true}},cases[1]]}).status,'invalid');
 assert.equal(verify({claims:[{value:Infinity,decision:true},claims[1]]}).status,'invalid');
});
test('readonly interface and no user data or code execution',()=>{
 const x=lab();assert.equal(Object.isFrozen(x),true);
 assert.equal(x.version,'0.6');assert.equal(x.install,undefined);assert.equal(x.execute,undefined);
});
