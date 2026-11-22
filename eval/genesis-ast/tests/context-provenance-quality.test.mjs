// Phase 2 quality seed: known-positive and known-negative provenance cases.
// Fixed expectations are independent of the analyzer under test.
// No scanned source code is executed; source strings are parsed only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {correlateFlows} from '../flow-correlation.mjs';

const positive=[
  ['direct parameter', 'function simple(value){return value;}'],
  ['simple arithmetic', 'function addOne(value){return value+1;}'],
  ['literal return', 'function literal(){return 42;}']
];
const negative=[
  ['receiver property', 'function receiver(value){return this.count;}'],
  ['receiver mixed with parameter', 'function mixed(value){return value+this.count;}'],
  ['receiver through declaration', 'function viaLocal(){const result=this.count;return result;}'],
  ['default parameter calls external code', 'function withDefault(value=load()){return value;}'],
  ['destructured parameter', 'function destructured({value}){return value;}'],
  ['rest parameter', 'function rest(...values){return values;}'],
  ['new.target context', 'function constructorContext(){return new.target;}'],
  ['unknown call return', 'function external(value){return transform(value);}'],
  ['branch requires review', 'function branching(value){if(value){return 1;}return 2;}']
];

for(const [name,source] of positive){
  test('quality seed positive: '+name,()=>{
    const report=correlateFlows('seed.js',source);
    assert.equal(report.parsed,true);
    assert.equal(report.mode,'read-only');
    assert.equal(report.changesApplied,false);
    assert.equal(report.functions.length,1);
    assert.equal(report.functions[0].status,'eligible-for-limited-report');
  });
}
for(const [name,source] of negative){
  test('quality seed negative: '+name,()=>{
    const report=correlateFlows('seed.js',source);
    assert.equal(report.parsed,true);
    assert.equal(report.mode,'read-only');
    assert.equal(report.changesApplied,false);
    assert.equal(report.functions.length,1);
    assert.equal(report.functions[0].status,'manual-review-required');
    assert.deepEqual(report.functions[0].evidence,[]);
  });
}
test('quality seed: context-sensitive source is never executed',()=>{
  globalThis.__genesisSeedProbe=0;
  const source='function notExecuted(){globalThis.__genesisSeedProbe=1;return this.value;}';
  const report=correlateFlows('seed.js',source);
  assert.equal(report.parsed,true);
  assert.equal(globalThis.__genesisSeedProbe,0);
  delete globalThis.__genesisSeedProbe;
});
