import test from 'node:test';
import assert from 'node:assert/strict';
import {correlateFlows} from '../flow-correlation.mjs';

function get(code){return correlateFlows('test.mjs',code);}
test('simple declaration and return provides limited review evidence',()=>{
  const r=get('function process(input){const copy=input;return copy;}');
  const f=r.functions[0];
  assert.equal(f.status,'eligible-for-limited-report');
  assert.equal(f.evidence.at(-1).type,'return');
  assert.deepEqual(f.evidence.at(-1).sources,['input']);
  assert.equal(r.mode,'read-only');
  assert.equal(r.changesApplied,false);
});
test('if statement fails closed, even if original dataflow could look simple',()=>{
  const f=get('function f(input){let x=input;if(input){x=3;}return x;}').functions[0];
  assert.equal(f.status,'manual-review-required');
  assert.deepEqual(f.evidence,[]);
  assert.ok(f.reasons.includes('nonlinear-or-unsupported-control-flow'));
});
test('while loop fails closed',()=>{
  const f=get('function f(input){while(input){input=0;}return input;}').functions[0];
  assert.equal(f.status,'manual-review-required');
  assert.equal(f.evidence.length,0);
});
test('unknown variable fails closed',()=>{
  const f=get('function f(input){const x=outside;return x;}').functions[0];
  assert.ok(f.reasons.includes('unknown-provenance'));
  assert.deepEqual(f.evidence,[]);
});
test('external call fails closed',()=>{
  const f=get('function f(input){const x=external(input);return x;}').functions[0];
  assert.ok(f.reasons.includes('unknown-provenance'));
});
test('expression statement side-effects are not certified',()=>{
  const f=get('function f(input){sideEffect();return input;}').functions[0];
  assert.ok(f.reasons.includes('expression-statement-effects-not-verified'));
});
test('more than one return is unavailable',()=>{
  const f=get('function f(input){return input;return 2;}').functions[0];
  assert.ok(f.reasons.includes('requires-exactly-one-return'));
});
test('syntax errors produce unavailable result',()=>{
  const r=get('function f(');
  assert.equal(r.parsed,false);
  assert.equal(r.status,'unavailable');
  assert.equal(r.functions.length,0);
});
test('no evaluated code or mutation',()=>{
  globalThis.__flowCorrelationProbe=0;
  const r=get('globalThis.__flowCorrelationProbe=99;function f(input){return input;}');
  assert.equal(globalThis.__flowCorrelationProbe,0);
  assert.equal(r.changesApplied,false);
  delete globalThis.__flowCorrelationProbe;
});
test('assigned arrow function remains untracked',()=>{
  const r=get('const f=input=>input;');
  assert.equal(r.functions.length,0);
  assert.equal(r.untracked.data[0].reason,'assigned-function-not-tracked');
});

test('duplicate top-level function names cannot be correlated by name',()=>{
  const r=correlateFlows('test.cjs','function f(a){return a;} function f(b){return b;}');
  assert.equal(r.functions.length,2);
  assert.ok(r.functions.every(x=>x.reasons.includes('nonunique-function-identity')));
  assert.ok(r.functions.every(x=>x.evidence.length===0));
});
