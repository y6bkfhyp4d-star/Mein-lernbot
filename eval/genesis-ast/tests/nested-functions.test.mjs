import test from 'node:test';
import assert from 'node:assert/strict';
import {collectNamedFunctions} from '../function-discovery.mjs';
import {analyzeControlFlow} from '../control-flow.mjs';
import {analyzeDataFlow} from '../dataflow-analyzer.mjs';
import {correlateFlows} from '../flow-correlation.mjs';

const source='(()=>{ function outer(input){ function inner(value){return value;} return inner(input); }})();';
test('discovers declarations within IIFE and nested named functions',()=>{
  const r=collectNamedFunctions('app.js',source);
  assert.equal(r.parsed,true);
  assert.deepEqual(r.functions.map(f=>f.name),['outer','inner']);
  assert.equal(new Set(r.functions.map(f=>f.id)).size,2);
  assert.ok(r.functions.every(f=>f.depth>0));
});
test('CFG and dataflow now cover named functions nested inside IIFE',()=>{
  const cfg=analyzeControlFlow('app.js',source);
  const data=analyzeDataFlow('app.js',source);
  assert.deepEqual(cfg.graphs.map(f=>f.name),['outer','inner']);
  assert.deepEqual(data.functions.map(f=>f.name),['outer','inner']);
  assert.deepEqual(cfg.graphs.map(f=>f.functionId),data.functions.map(f=>f.functionId));
});
test('correlation resolves nested functions by source identity',()=>{
  const r=correlateFlows('app.js',source);
  assert.equal(r.functions.length,2);
  const inner=r.functions.find(f=>f.name==='inner');
  assert.equal(inner.status,'eligible-for-limited-report');
  assert.deepEqual(inner.evidence.at(-1).sources,['value']);
  const outer=r.functions.find(f=>f.name==='outer');
  assert.equal(outer.status,'manual-review-required');
});
test('separate same-name declarations are not mixed across source locations',()=>{
  const r=correlateFlows('app.js','(()=>{function first(){function same(a){return a;}} function second(){function same(b){return b;}}})();');
  assert.equal(r.functions.filter(f=>f.name==='same').length,2);
  assert.ok(r.functions.filter(f=>f.name==='same').every(f=>f.reasons.includes('nonunique-function-identity')));
});
test('untracked arrow declarations stay visible',()=>{
  const r=analyzeDataFlow('app.js','(()=>{const arrow=x=>x; function named(y){return y;}})();');
  assert.equal(r.functions.length,1);
  assert.equal(r.untracked[0].reason,'assigned-function-not-tracked');
});
test('no IIFE invocation or scanned source evaluation',()=>{
  globalThis.__iifeProbe=0;
  const danger='(()=>{globalThis.__iifeProbe=123;function safe(x){return x;}})();';
  const result=correlateFlows('app.js',danger);
  assert.equal(result.changesApplied,false);
  assert.equal(globalThis.__iifeProbe,0);
  delete globalThis.__iifeProbe;
});
