import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeDataFlow} from '../dataflow-analyzer.mjs';

const first=code=>analyzeDataFlow('example.mjs',code).functions[0];
test('links parameter through local assignment to return',()=>{
  const f=first('function calculate(input){ const copy=input; const total=copy+1; return total; }');
  assert.deepEqual(f.events.at(-1).sources,['input']);
  assert.deepEqual(f.events[1].sources,['input']);
  assert.equal(f.confidence,'limited-straight-line');
});
test('shows changed provenance after assignment',()=>{
  const f=first('function update(arg){ let x=arg; x=10; return x; }');
  assert.deepEqual(f.events.at(-1).sources,[]);
  assert.deepEqual(f.events[1].sources,[]);
});
test('does not pretend external calls or globals are known',()=>{
  const f=first('function run(data){ const x=external(data); return x; }');
  assert.deepEqual(f.events.at(-1).sources,['data','unknown:call-result','unknown:external']);
});
test('does not turn branch code into a false flow',()=>{
  const f=first('function branch(a){ let x=a; if(a){ x=777; } return x; }');
  assert.ok(f.limitations.includes('control-flow-or-statement-not-tracked:IfStatement'));
  assert.equal(f.confidence,'partial');
});
test('marks closure and unsupported destructuring',()=>{
  const f=first('function nested(data){ const {x}=data; const cb=()=>data; return cb; }');
  assert.ok(f.limitations.includes('destructuring-not-tracked'));
  assert.ok(f.events.at(-1).sources.includes('unknown:closure'));
});
test('never executes the provided source',()=>{
  globalThis.__dataFlowProbe=0;
  analyzeDataFlow('example.mjs','globalThis.__dataFlowProbe=9; function f(x){return x;}');
  assert.equal(globalThis.__dataFlowProbe,0);
  delete globalThis.__dataFlowProbe;
});
test('does not execute any file writes and returns explicit mode',()=>{
  const r=analyzeDataFlow('example.mjs','export function answer(x){return x;}');
  assert.equal(r.mode,'read-only');assert.equal(r.changesApplied,false);
  assert.equal(r.parsed,true);
});
test('syntax errors have exact parser positions',()=>{
  const r=analyzeDataFlow('example.mjs','const x=1;\nfunction (');
  assert.equal(r.parsed,false);
  assert.equal(r.error.line,2);
});
test('reports assigned arrow functions as not analyzed instead of guessing',()=>{
  const r=analyzeDataFlow('example.mjs','const doIt=(x)=>x+1;');
  assert.equal(r.functions.length,0);
  assert.equal(r.untracked[0].reason,'assigned-function-not-tracked');
});
