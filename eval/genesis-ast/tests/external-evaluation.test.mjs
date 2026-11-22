import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCorpus,validateCorpus} from '../evaluate-external.mjs';

const pass={schema:1,cases:[
  {id:'p1',expected:'eligible',source:'function simple(value){return value;}'},
  {id:'n1',expected:'review',source:'function risk(input){return this.value;}'}
]};
test('external benchmark: fixed labels and expected confusion matrix',()=>{
  const result=evaluateCorpus(pass);
  assert.deepEqual(result.confusion,{TP:1,FP:0,TN:1,FN:0});
  assert.equal(result.precision,1);
  assert.equal(result.eligibleRecall,1);
  assert.equal(result.reviewRecall,1);
  assert.equal(result.accuracy,1);
});
test('external benchmark: no source execution',()=>{
  globalThis.__externalProbe=0;
  const r=evaluateCorpus({schema:1,cases:[{
    id:'probe',expected:'review',
    source:'function unsafe(){globalThis.__externalProbe=99;return this.value;}'
  }]});
  assert.equal(r.confusion.TN,1);
  assert.equal(globalThis.__externalProbe,0);
  delete globalThis.__externalProbe;
});
test('external benchmark: parse failure remains review, with error report',()=>{
  const result=evaluateCorpus({schema:1,cases:[
    {id:'bad',expected:'review',source:'function broken( {'}
  ]});
  assert.equal(result.confusion.TN,0);
  assert.deepEqual(result.confusion,{TP:0,FP:0,TN:0,FN:0});
  assert.equal(result.submitted,1);
  assert.equal(result.evaluated,0);
  assert.equal(result.excluded,1);
  assert.equal(result.complete,false);
  assert.equal(result.accuracy,null);
  assert.deepEqual(result.errors,[{id:'bad',reason:'parse-error'}]);
});
test('external benchmark: wrong label does not silently change',()=>{
  const result=evaluateCorpus({schema:1,cases:[
    {id:'badlabel',expected:'review',source:'function f(x){return x;}'}
  ]});
  assert.equal(result.confusion.FP,1);
  assert.equal(result.accuracy,0);
});
test('external benchmark: schema, duplicate IDs and unexpected fields rejected',()=>{
  for(const value of [
    {schema:2,cases:pass.cases},
    {schema:1,cases:[]},
    {schema:1,cases:[pass.cases[0],pass.cases[0]]},
    {schema:1,cases:[{...pass.cases[0],expected:'maybe'}]},
    {schema:1,cases:[{...pass.cases[0],evil:true}]},
    {schema:1,cases:[{...pass.cases[0],source:''}]}
  ])assert.throws(()=>validateCorpus(value));
});
test('external benchmark: no full input source in the summary',()=>{
  const result=evaluateCorpus(pass);
  assert.ok(!JSON.stringify(result).includes('function simple'));
});

test('external benchmark: invalid review case cannot inflate accuracy',()=>{
  const result=evaluateCorpus({schema:1,cases:[
    {id:'good',expected:'review',source:'function risk(){return this.value;}'},
    {id:'bad',expected:'review',source:'function broken( {'}
  ]});
  assert.equal(result.submitted,2);
  assert.equal(result.evaluated,1);
  assert.equal(result.excluded,1);
  assert.equal(result.complete,false);
  assert.deepEqual(result.confusion,{TP:0,FP:0,TN:1,FN:0});
  assert.equal(result.accuracy,1); // conditional on ONE valid case, not two
});

test('external benchmark: executable top-level side effect is excluded, not a TP',()=>{
  globalThis.__outsideProbe=0;
  const result=evaluateCorpus({schema:1,cases:[{
    id:'top-level-side-effect',expected:'eligible',
    source:'globalThis.__outsideProbe=42;function safe(x){return x;}'
  }]});
  assert.equal(result.complete,false);
  assert.equal(result.evaluated,0);
  assert.equal(result.excluded,1);
  assert.deepEqual(result.confusion,{TP:0,FP:0,TN:0,FN:0});
  assert.deepEqual(result.errors,[{
    id:'top-level-side-effect',reason:'requires-single-top-level-function'
  }]);
  assert.equal(globalThis.__outsideProbe,0);
  delete globalThis.__outsideProbe;
});
test('external benchmark: multiple declarations and IIFE wrapper are excluded',()=>{
  const result=evaluateCorpus({schema:1,cases:[
    {id:'two',expected:'eligible',source:'function a(x){return x;} function b(y){return y;}'},
    {id:'wrapper',expected:'eligible',source:'(()=>{function a(x){return x;}})();'}
  ]});
  assert.equal(result.evaluated,0);
  assert.equal(result.excluded,2);
  assert.deepEqual(result.errors.map(e=>e.reason),[
    'requires-single-top-level-function','requires-single-top-level-function'
  ]);
});
