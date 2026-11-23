import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeSource,inspectFiles} from '../genesis/code-analyzer.mjs';

test('finds real executable risk with correct line and column',()=>{
  const findings=analyzeSource('sample.js','const a=1;\n eval("alert(1)");\n');
  const issue=findings.find(x=>x.rule==='JS001');
  assert.ok(issue);
  assert.equal(issue.line,2);
  assert.equal(issue.column,2);
  assert.equal(issue.severity,'high');
  assert.ok(issue.suggestion);
});
test('strings and comments are not mistaken for direct code',()=>{
  const findings=analyzeSource('sample.js','// eval("no");\nconst x = "eval(1)";\n/* localStorage.clear() */');
  assert.ok(!findings.some(x=>x.rule==='JS001'||x.rule==='JS004'));
});
test('can find probable private key header as data',()=>{
  const issues=analyzeSource('sample.js','const secret="-----BEGIN PRIVATE KEY-----";');
  assert.ok(issues.some(x=>x.rule==='SEC001'&&x.severity==='critical'));
});
test('does not execute scanned sources',()=>{
  globalThis.__genesisAnalyzerSafetyProbe = 0;
  analyzeSource('sample.js','globalThis.__genesisAnalyzerSafetyProbe = 999; eval("x");');
  assert.equal(globalThis.__genesisAnalyzerSafetyProbe,0);
  delete globalThis.__genesisAnalyzerSafetyProbe;
});
test('reports likely syntax issues without running code',()=>{
  assert.ok(analyzeSource('sample.js','function broken( {').some(x=>x.rule==='JS000'));
});
test('does not emit syntax false positive for ES module',()=>{
  assert.ok(!analyzeSource('sample.mjs','export const answer = 42;').some(x=>x.rule==='JS000'));
});
test('restricts path traversal and only reads requested files',()=>{
  assert.throws(()=>inspectFiles(['../missing.js'],{root:process.cwd()}));
  assert.throws(()=>inspectFiles(['docs/GENESIS_X_PHASE1_TRUSTED_CI_GATE.md']));
  const report=inspectFiles(['eval/genesis/code-analyzer.mjs']);
  assert.equal(report.mode,'read-only');
  assert.equal(report.changesApplied,false);
  assert.equal(report.files.length,1);
  assert.ok(report.findings.every(x=>Number.isInteger(x.line)&&Number.isInteger(x.column)));
});
