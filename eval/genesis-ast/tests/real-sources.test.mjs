// GENESIS X evaluation on real repository sources.
// Tests coverage, uncertainty reporting and non-mutation, NOT code correctness.
// No production source is executed, changed, or imported.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {analyzeAST} from '../analyzer.mjs';
import {analyzeScopes} from '../scope-analyzer.mjs';
import {analyzeDataFlow} from '../dataflow-analyzer.mjs';
import {analyzeControlFlow} from '../control-flow.mjs';
import {correlateFlows} from '../flow-correlation.mjs';
import {inspectDependencyFiles} from '../dependency-graph.mjs';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const samples=[
  'app.js',
  'modules/code-diagnose.js',
  'modules/genesis-x.js',
  'modules/orchestrator.js',
  'modules/local-model-bridge.js'
];
const digest=p=>createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex');
const read=p=>readFileSync(resolve(root,p),'utf8');

test('real-source baseline: five files are readable without source execution',()=>{
  const before=Object.fromEntries(samples.map(p=>[p,digest(p)]));
  let totalParsed=0,astFunctions=0,astFindings=0,scopedBindings=0;
  const measurements=[];
  for(const path of samples){
    assert.ok(statSync(resolve(root,path)).isFile());
    const source=read(path);
    const ast=analyzeAST(path,source);
    const scope=analyzeScopes(path,source);
    assert.equal(typeof ast.parsed,'boolean');
    assert.equal(typeof scope.parsed,'boolean');
    if(ast.parsed)totalParsed++;
    astFunctions+=ast.functions.length;
    astFindings+=ast.findings.length;
    scopedBindings+=scope.bindings.length;
    measurements.push({
      file:path,bytes:Buffer.byteLength(source),astParsed:ast.parsed,
      scopeParsed:scope.parsed,astFunctions:ast.functions.length,
      astFindings:ast.findings.length,scopeBindings:scope.bindings.length,
      astParseError:ast.parsed?null:ast.findings.find(x=>x.rule==='AST000')?.message||'unspecified'
    });
  }
  assert.equal(Object.keys(before).length,5);
  assert.ok(totalParsed>=1,'No real source could be parsed — baseline fails');
  assert.deepEqual(Object.fromEntries(samples.map(p=>[p,digest(p)])),before);
  console.log('GENESIS REAL-SOURCE AST BASELINE '+JSON.stringify({
    measured:measurements.length,parsed:totalParsed,astFunctions,astFindings,scopedBindings,measurements
  }));
});

test('real-source control/dataflow remains explicitly limited',()=>{
  const before=Object.fromEntries(samples.map(p=>[p,digest(p)]));
  const measurements=[];
  for(const path of samples){
    const source=read(path);
    const cfg=analyzeControlFlow(path,source);
    const data=analyzeDataFlow(path,source);
    const correlation=correlateFlows(path,source);
    assert.equal(cfg.mode,'read-only');
    assert.equal(data.mode,'read-only');
    assert.equal(correlation.mode,'read-only');
    assert.equal(cfg.changesApplied,false);
    assert.equal(data.changesApplied,false);
    assert.equal(correlation.changesApplied,false);
    assert.ok(correlation.functions.every(f=>
      f.status==='manual-review-required'||f.status==='eligible-for-limited-report'));
    assert.ok(correlation.functions.every(f=>
      f.status!=='manual-review-required'||f.evidence.length===0));
    measurements.push({
      file:path,parsed:correlation.parsed,
      cfgGraphs:cfg.graphs.length,dataFunctions:data.functions.length,
      correlated:correlation.functions.length,
      limited:correlation.functions.filter(f=>f.status==='eligible-for-limited-report').length,
      manual:correlation.functions.filter(f=>f.status==='manual-review-required').length
    });
  }
  assert.deepEqual(Object.fromEntries(samples.map(p=>[p,digest(p)])),before);
  console.log('GENESIS REAL-SOURCE FLOW BASELINE '+JSON.stringify({measurements}));
});

test('cross-file import graph does not silently expand input files',()=>{
  const before=Object.fromEntries(samples.map(p=>[p,digest(p)]));
  const graph=inspectDependencyFiles(samples,{root});
  assert.equal(graph.mode,'read-only');
  assert.equal(graph.changesApplied,false);
  assert.equal(graph.files.length,samples.length);
  assert.ok(graph.edges.every(e=>samples.includes(e.from)));
  assert.ok(graph.edges.every(e=>e.status!=='resolved'||samples.includes(e.to)));
  assert.deepEqual(Object.fromEntries(samples.map(p=>[p,digest(p)])),before);
  console.log('GENESIS REAL-SOURCE DEPENDENCY BASELINE '+JSON.stringify({
    files:graph.files.length,edges:graph.summary.edges,
    resolved:graph.summary.resolved,unresolved:graph.summary.unresolved,
    cycles:graph.cycles.length,parseFailures:graph.files.filter(f=>!f.parsed).length
  }));
});
