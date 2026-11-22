import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const load=(filename,context)=>runInNewContext(readFileSync(new URL('../../modules/'+filename,import.meta.url),'utf8'),context,{timeout:1000});
function laboratory(which=['genesis-x-tools.js','genesis-x-logic.js']){
 const window={};
 const fail=()=>{throw Error('Forbidden side effect');};
 const ctx={window,fetch:fail,localStorage:{getItem:fail,setItem:fail},document:{getElementById:fail},eval:fail};
 for(const file of which)load(file,ctx);
 load('genesis-x-router.js',ctx);
 return window.NERYXGenesisXRouter;
}
const numeric={training:[{x:0,y:2},{x:1,y:3},{x:2,y:4}],validation:[{x:4,y:6},{x:7,y:9}]};
const logic={training:[{a:0,b:1,expected:false},{a:2,b:1,expected:true},{a:3,b:4,expected:false},{a:9,b:4,expected:true}],validation:[{a:5,b:2,expected:true},{a:1,b:9,expected:false}]};
test('selects numeric composer based on exact typed samples',()=>{
 const r=laboratory().solve(numeric);
 assert.equal(r.status,'candidate');assert.equal(r.type,'numeric');assert.equal(r.result.selected.passed,2);
});
test('selects logical engine based on exact typed samples',()=>{
 const r=laboratory().solve(logic);
 assert.equal(r.status,'candidate');assert.equal(r.type,'logic');assert.ok(r.result.rule);
});
test('explicit type must agree with schema',()=>{
 assert.equal(laboratory().solve({...numeric,type:'logic'}).status,'invalid');
 assert.equal(laboratory().solve({...logic,type:'numeric'}).status,'invalid');
});
test('mixed and unknown sample schemas fail closed',()=>{
 const x=laboratory();
 for(const task of [
  {training:[numeric.training[0],logic.training[0]],validation:numeric.validation},
  {training:[{query:'who?'}],validation:[{answer:'nobody'}]},
  {training:[],validation:logic.validation},
  {training:[{x:0,y:2,a:1}],validation:numeric.validation},
  {training:[{x:Infinity,y:1}],validation:numeric.validation},
  {training:null,validation:numeric.validation},
  null
 ])assert.equal(x.solve(task).status,'invalid');
});
test('missing specialized engine is unavailable instead of fabricated answer',()=>{
 const x=laboratory([]);
 assert.equal(x.solve(numeric).status,'unavailable');
 assert.equal(x.solve(logic).status,'unavailable');
});
test('unconfirmed stays unconfirmed, never elevated by router',()=>{
 const task={training:numeric.training,validation:[{x:4,y:88},{x:7,y:123}]};
 const r=laboratory().solve(task);
 assert.equal(r.type,'numeric');assert.equal(r.status,'unconfirmed');
});
test('no storage, DOM, network, code execution or installation interface',()=>{
 const r=laboratory();
 assert.equal(Object.isFrozen(r),true);
 assert.equal(r.install,undefined);
 assert.equal(r.execute,undefined);
 assert.equal(r.version,'0.4');
});
test('capability exceptions and malformed success signals fail closed',()=>{
 const w={NERYXGenesisXTools:{version:'0.2',compose(){throw Error('failure');}}};
 const ctx={window:w};
 load('genesis-x-router.js',ctx);
 assert.equal(w.NERYXGenesisXRouter.solve(numeric).status,'unconfirmed');
 w.NERYXGenesisXTools.compose=()=>({status:'yes'});
 assert.equal(w.NERYXGenesisXRouter.solve(numeric).status,'unconfirmed');
});
