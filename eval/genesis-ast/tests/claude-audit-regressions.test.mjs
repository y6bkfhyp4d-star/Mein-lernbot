// Independent audit regressions B1-B3: parse only, never execute source.
import test from 'node:test';
import assert from 'node:assert/strict';
import {collectNamedFunctions} from '../function-discovery.mjs';
import {correlateFlows} from '../flow-correlation.mjs';

const review=[
  ["class static initializer, quoted key", "function f(){return class{static 'k'=load();};}"],
  ["class static initializer, numeric key", "function f(){return class{static 0=load();};}"],
  ["class static creation with method", "function f(){return class{m(){return 1;}};}"],
  ["array spread iterator", "function f(a){return [...a];}"],
  ["object spread getter/proxy", "function f(a){return {...a};}"],
  ["binary in", "function f(k,o){return k in o;}"],
  ["binary instanceof", "function f(value,C){return value instanceof C;}"]
];
for(const [name,source] of review)test('audit B1/B2 review: '+name,()=>{
  const r=correlateFlows('audit.js',source);
  assert.equal(r.parsed,true);
  assert.equal(r.changesApplied,false);
  assert.equal(r.functions.length,1);
  assert.equal(r.functions[0].status,'manual-review-required');
  assert.deepEqual(r.functions[0].evidence,[]);
});

test('audit B3 finds functions below object and class value properties',()=>{
  const fixtures=[
    "const o={m(){function inner(x){return x;}}};",
    "const o={m:function(){function inner(x){return x;}}};",
    "class A{m(){function inner(x){return x;}}}",
    "class A{f=function(){function inner(x){return x;}}}",
    "class A{static{function inner(x){return x;}}}"
  ];
  for(const source of fixtures){
    const r=collectNamedFunctions('audit.js',source);
    assert.equal(r.parsed,true);
    assert.deepEqual(r.functions.map(f=>f.name),['inner'],source);
  }
});
test('audit discovery still includes ordinary nested declarations',()=>{
  const r=collectNamedFunctions('audit.js','function outer(){function inner(x){return x;}return 1;}');
  assert.deepEqual(r.functions.map(f=>f.name),['outer','inner']);
});
test('audit reproductions never execute scanned source',()=>{
  globalThis.__genesisAudit=0;
  const source="const o={m(){globalThis.__genesisAudit=1;function inner(){return 1;}}};";
  const r=collectNamedFunctions('audit.js',source);
  assert.equal(r.functions.length,1);
  assert.equal(globalThis.__genesisAudit,0);
  delete globalThis.__genesisAudit;
});
