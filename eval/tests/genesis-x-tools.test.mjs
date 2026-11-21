import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
function lab(){
 const window={};
 const context={window,
  localStorage:{getItem(){throw Error('storage')},setItem(){throw Error('storage')}},
  fetch(){throw Error('network')},
  document:{getElementById(){throw Error('dom')}},
  eval(){throw Error('eval')}};
 runInNewContext(readFileSync(new URL('../../modules/genesis-x-tools.js',import.meta.url),'utf8'),context);
 return window.NERYXGenesisXTools;
}
const p=(x,y)=>({x,y});
test('finds shortest x+2 solution validated on distinct holdout',()=>{
 const r=lab().compose({training:[p(0,2),p(1,3),p(2,4)],holdout:[p(4,6),p(7,9)]});
 assert.equal(r.status,'candidate');assert.equal(r.selected.passed,2);
 assert.equal(r.selected.program.length,1);
});
test('combines operations in bounded search',()=>{
 const r=lab().compose({training:[p(0,2),p(1,4),p(2,6)],holdout:[p(3,8),p(4,10)],maxSteps:2});
 assert.equal(r.status,'candidate');assert.equal(r.selected.total,2);
});
test('rejects unverified extrapolation',()=>{
 const r=lab().compose({training:[p(0,2),p(1,3),p(2,4)],holdout:[p(4,100),p(5,200)]});
 assert.equal(r.status,'unconfirmed');assert.equal(r.selected,null);
});
test('rejects overlapping samples, invalid inputs and excess depth',()=>{
 const x=lab(),training=[p(0,2),p(1,3),p(2,4)];
 for(const data of [
  {training,holdout:[p(2,4),p(4,6)]},
  {training,holdout:[p(4,6)]},
  {training,holdout:[p(4,6),p(5,7)],constants:[Infinity]},
  {training,holdout:[p(4,6),p(5,7)],maxSteps:4}
 ])assert.equal(x.compose(data).status,'invalid');
});
test('has fixed operation allowlist and no install/storage interface',()=>{
 const x=lab();assert.equal(x.version,'0.2');
 assert.equal(typeof x.install,'undefined');assert.equal(typeof x.executeCode,'undefined');
 assert.equal(x.operations.length,6);
});