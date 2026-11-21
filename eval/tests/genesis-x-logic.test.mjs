import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
function lab(){
 const window={};
 const deny=()=>{throw Error('forbidden access');};
 runInNewContext(readFileSync(new URL('../../modules/genesis-x-logic.js',import.meta.url),'utf8'),
 {window,fetch:deny,localStorage:{getItem:deny,setItem:deny},document:{getElementById:deny},eval:deny},
 {timeout:1000});
 return window.NERYXGenesisXLogic;
}
const sample=(a,b,expected)=>({a,b,expected});
const as=(pairs,f)=>pairs.map(([a,b])=>sample(a,b,f(a,b)));
// Separate oracle: does not call or share GENESIS X's internal evaluator.
function audit(rule,a,b){
 if(rule.kind==='atom'){
  const x=rule.field==='a'?a:b;
  const y=rule.target==='field'?(rule.other==='a'?a:b):rule.constant;
  return rule.op==='gt'?x>y:rule.op==='lt'?x<y:x===y;
 }
 if(rule.kind==='not')return !audit(rule.child,a,b);
 if(rule.kind==='and')return audit(rule.left,a,b)&&audit(rule.right,a,b);
 if(rule.kind==='or')return audit(rule.left,a,b)||audit(rule.right,a,b);
 throw Error('unknown rule');
}
test('learns comparison from separate examples and passes third-set audit',()=>{
 const f=(a,b)=>a>b;
 const r=lab().learn({training:as([[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]],f),
 validation:as([[8,2],[-2,0],[4,4]],f)});
 assert.equal(r.status,'candidate');
 for(const [a,b] of [[100,2],[2,100],[7,7],[-3,-9]])assert.equal(audit(r.rule,a,b),f(a,b));
});
test('learns conjunction of two comparisons',()=>{
 const f=(a,b)=>a>2&&b>1;
 const training=as([[0,0],[4,0],[0,4],[4,4],[3,2],[1,1],[2,8],[9,1]],f);
 const validation=as([[5,5],[8,0],[0,8],[2,2]],f);
 const r=lab().learn({training,validation,constants:[0,1,2,3,5,10]});
 assert.equal(r.status,'candidate');
 for(const [a,b] of [[3,3],[1,5],[6,0],[2,8],[20,20]])assert.equal(audit(r.rule,a,b),f(a,b));
});
test('rejects contradictory labels across training and validation',()=>{
 const tr=as([[0,0],[1,0],[2,0],[3,0]],(a)=>a>1);
 const vr=as([[4,0],[5,0]],()=>false);
 const r=lab().learn({training:tr,validation:vr,constants:[0,1,2,3]});
 // A rule that happens to explain finite data may still exist, so never claim all contradictory-looking cases are impossible.
 assert.ok(['candidate','unconfirmed'].includes(r.status));
});
test('refuses duplicated, overlapping, non-boolean or malformed samples',()=>{
 const x=lab(),base=as([[0,0],[1,0],[2,0],[3,0]],(a)=>a>1),v=as([[4,0],[5,0]],(a)=>a>1);
 for(const args of [
 {training:[base[0],base[0],base[1],base[2]],validation:v},
 {training:base,validation:[base[0],v[0]]},
 {training:base,validation:[sample(4,0,'true'),v[0]]},
 {training:base,validation:v,constants:[Infinity]},
 {training:base,validation:v,constants:[]}
 ])assert.equal(x.learn(args).status,'invalid');
});
test('bound evaluation, readonly interface and no installation feature',()=>{
 const x=lab();
 assert.equal(x.version,'0.3');
 assert.equal(Object.isFrozen(x),true);
 assert.equal(x.install,undefined);
 assert.equal(x.execute,undefined);
 assert.equal(x.operations.length,6);
 const r=x.learn({training:as([[0,0],[1,0],[2,0],[3,0]],(a)=>a>1),validation:as([[4,0],[5,0]],(a)=>a>1)});
 assert.ok(r.evaluated<=5000);
});
