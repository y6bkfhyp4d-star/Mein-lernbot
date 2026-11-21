import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// The independent oracle below does NOT call the composer prediction routine.
// Audit inputs never enter compose() and use a separate deterministic generator.
function composer(){
 const window={};
 const deny=()=>{throw Error('unexpected side effect');};
 runInNewContext(readFileSync(new URL('../../modules/genesis-x-tools.js',import.meta.url),'utf8'),
  {window,localStorage:{getItem:deny,setItem:deny},document:{getElementById:deny},fetch:deny,eval:deny},
  {timeout:1000});
 return window.NERYXGenesisXTools.compose;
}
function oracle(program,x){
 let value=x;
 for(const step of program){
  switch(step.op){
   case 'add':value+=step.c;break;
   case 'subtract':value-=step.c;break;
   case 'multiply':value*=step.c;break;
   case 'divide':value/=step.c;break;
   case 'square':value=value*value;break;
   case 'negate':value=-value;break;
   default:throw Error('unapproved instruction: '+step.op);
  }
  assert.ok(Number.isFinite(value),'nonfinite intermediate result');
 }
 return value;
}
function rng(seed){
 return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
const p=(x,y)=>({x,y});
const near=(a,b)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));

test('60 generated problems survive a third, unseen external audit',()=>{
 const random=rng(0x20A2F11);
 const compose=composer();
 let audited=0;
 for(let i=0;i<60;i++){
  const c=1+Math.floor(random()*3);
  const kind=i%4;
  const f=kind===0?(x=>x+c):
          kind===1?(x=>x*c):
          kind===2?(x=>x*x+c):
                   (x=>x*x-c);
  const training=[-3,-1,0,2].map(x=>p(x,f(x)));
  const validation=[4,6,-5].map(x=>p(x,f(x)));
  const r=compose({training,holdout:validation,constants:[0,1,2,3],maxSteps:2});
  assert.equal(r.status,'candidate',`generated case ${i}: ${r.status}`);
  assert.ok(r.selected.program.length<=2);
  // Entirely distinct evaluation set: not accessible to compose().
  for(let j=0;j<11;j++){
   const x=10+Math.floor(random()*1000)+(j/13);
   assert.ok(near(oracle(r.selected.program,x),f(x)),`audit case ${i}/${j}`);
   audited++;
  }
 }
 assert.equal(audited,660);
});
test('validation data cannot certify a misleading extrapolation as general truth',()=>{
 const compose=composer();
 // Training and validation support x+2, but the undisclosed actual rule diverges.
 const r=compose({
  training:[p(0,2),p(1,3),p(2,4)],
  holdout:[p(5,7),p(6,8)],
  constants:[0,1,2,3],maxSteps:2
 });
 assert.equal(r.status,'candidate');
 const hiddenActual=x=>x<10?x+2:x*x;
 const unseen=12;
 assert.equal(near(oracle(r.selected.program,unseen),hiddenActual(unseen)),false);
 // This is a documented limitation, not a failure of the third-party oracle.
});
test('randomized incompatible validation pairs never yield a certified candidate',()=>{
 const compose=composer(),random=rng(0x105A77);
 for(let i=0;i<30;i++){
  const offset=1+Math.floor(random()*3);
  const training=[-2,0,2].map(x=>p(x,x+offset));
  const validation=[7,9].map(x=>p(x,x*x+offset+20));
  const r=compose({training,holdout:validation,maxSteps:2});
  assert.equal(r.status,'unconfirmed');
  assert.equal(r.selected,null);
 }
});
