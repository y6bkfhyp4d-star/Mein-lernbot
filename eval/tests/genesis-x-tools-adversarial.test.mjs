import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

function lab(){
 const window={};
 const forbidden=()=>{throw Error('Forbidden side effect');};
 const context={window,localStorage:{getItem:forbidden,setItem:forbidden},
  fetch:forbidden,document:{getElementById:forbidden},eval:forbidden};
 runInNewContext(readFileSync(new URL('../../modules/genesis-x-tools.js',import.meta.url),'utf8'),context,
  {timeout:1000});
 return window.NERYXGenesisXTools;
}
const p=(x,y)=>({x,y});
const samples=(xs,f)=>xs.map(x=>p(x,f(x)));
const compose=(f,opts={})=>lab().compose({
 training:samples([-2,0,1,3],f),holdout:samples([-5,4,8],f),...opts
});

test('multi-step square plus offset passes out-of-range holdout',()=>{
 const r=compose(x=>x*x+2,{maxSteps:2});
 assert.equal(r.status,'candidate');assert.equal(r.selected.program.length,2);
 assert.equal(r.selected.passed,3);
});
test('multi-step negative scale passes unseen inputs',()=>{
 const r=compose(x=>-2*x,{constants:[0,1,2,3],maxSteps:2});
 assert.equal(r.status,'candidate');assert.equal(r.selected.passed,3);
});
test('held-out values reject memorised but false training rule',()=>{
 const r=lab().compose({
  training:samples([0,1,2],x=>x+2),
  holdout:samples([5,7],x=>x*x+2),maxSteps:2
 });
 assert.equal(r.status,'unconfirmed');assert.equal(r.selected,null);
});
test('no confirmed candidate when actual mapping is beyond available depth',()=>{
 const r=compose(x=>x*x*x+17,{maxSteps:1});
 assert.equal(r.status,'unconfirmed');assert.equal(r.selected,null);
});
test('invalid repeated, overlapping and nonfinite sample values fail closed',()=>{
 const x=lab(),good=samples([0,1,2],v=>v+1),held=samples([4,5],v=>v+1);
 const cases=[
  {training:[p(0,1),p(0,1),p(2,3)],holdout:held},
  {training:good,holdout:[p(2,3),p(4,5)]},
  {training:good,holdout:[p(4,5),p(5,NaN)]},
  {training:good,holdout:held,constants:[0,1e10]},
  {training:good,holdout:held,maxSteps:0},
  {training:good,holdout:held,maxSteps:1.5},
  {training:good,holdout:held,constants:[]},
  {training:good,holdout:held,constants:Array(9).fill(1)}
 ];
 for(const item of cases)assert.equal(x.compose(item).status,'invalid');
});
test('search remains bounded and never exposes a false success on budget exhaustion',()=>{
 const r=compose(x=>x*x*x+0.125,{constants:[0,1,2,3,4,5,6,7],maxSteps:3});
 assert.ok(r.evaluated<=5000);assert.equal(r.status,'unconfirmed');
 assert.equal(r.selected,null);
 if(r.limitReached)assert.equal(r.evaluated,5000);
});
test('deterministic selection for identical declared inputs',()=>{
 const x=lab(),args={training:samples([0,1,2],v=>v*2),holdout:samples([5,7],v=>v*2)};
 const a=x.compose(args),b=x.compose(args);
 assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
});
test('public interface is read-only and contains no arbitrary execution endpoint',()=>{
 const x=lab();
 assert.equal(Object.isFrozen(x),true);
 assert.equal(Object.isFrozen(x.operations),true);
 assert.deepEqual(Array.from(x.operations),['add','subtract','multiply','divide','square','negate']);
 assert.equal(typeof x.install,'undefined');
 assert.equal(typeof x.run,'undefined');
 assert.equal(typeof x.eval,'undefined');
 assert.equal(typeof x.compose,'function');
});
