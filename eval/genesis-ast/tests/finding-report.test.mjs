import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createFindingReport} from '../finding-report.mjs';

const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
test('findings: real AST rule gets position, severity, evidence and hash',()=>{
  const source='const x=1;\neval(x);';
  const report=createFindingReport('modules/test.js',source,{gitSha:'a'.repeat(40)});
  assert.equal(report.parsed,true);
  assert.equal(report.mode,'read-only');
  assert.equal(report.changesApplied,false);
  assert.equal(report.source.sha256,sha(source));
  assert.equal(report.source.gitSha,'a'.repeat(40));
  const finding=report.findings.find(f=>f.ruleId==='AST001');
  assert.ok(finding);
  assert.equal(finding.file,'modules/test.js');
  assert.equal(finding.line,2);
  assert.equal(finding.column,1);
  assert.equal(finding.severity,'high');
  assert.equal(finding.verification,'manual-review-required');
  assert.equal(finding.evidence.sourceSha256,sha(source));
  assert.equal(finding.falsePositiveClass,'static-pattern-requires-context');
  assert.equal(report.summary.bySeverity.high,1);
});
test('findings: malformed source becomes explicit parser rule',()=>{
  const report=createFindingReport('bad.js','function broken( {');
  assert.equal(report.parsed,false);
  assert.equal(report.findings.length,1);
  assert.equal(report.findings[0].ruleId,'AST000');
  assert.equal(report.findings[0].falsePositiveClass,'parser-syntax-error');
});
test('findings: reports are deterministic, preserve input and do not execute source',()=>{
  globalThis.__findingProbe=0;
  const source='globalThis.__findingProbe=100; function f(){return 1;}';
  const first=createFindingReport('example.js',source);
  const second=createFindingReport('example.js',source);
  assert.deepEqual(first,second);
  assert.equal(globalThis.__findingProbe,0);
  assert.equal(first.source.gitSha,null);
  delete globalThis.__findingProbe;
});
test('findings: empty clean source cannot produce a false confirmed bug',()=>{
  const report=createFindingReport('empty.mjs','export const answer=42;');
  assert.equal(report.parsed,true);
  assert.equal(report.summary.total,0);
  assert.deepEqual(report.findings,[]);
});
test('findings: invalid path, oversized source or invented SHA rejected',()=>{
  for(const file of ['../app.js','/tmp/x.js','a\\b.js','a//b.js','file.txt'])
    assert.throws(()=>createFindingReport(file,''));
  assert.throws(()=>createFindingReport('a.js','',{gitSha:'not-a-commit'}));
  assert.throws(()=>createFindingReport('a.js','a'.repeat(2_000_001)));
});
test('findings: private-key signature flags potential false positive',()=>{
  const report=createFindingReport('sample.js',"const text='-----BEGIN PRIVATE KEY-----';");
  const finding=report.findings.find(f=>f.ruleId==='SEC001');
  assert.ok(finding);
  assert.equal(finding.severity,'critical');
  assert.equal(finding.falsePositiveClass,'signature-may-be-in-comment-or-string');
  assert.equal(finding.verification,'manual-review-required');
});

test('seed P22 regression: indirect eval is flagged without running JavaScript',()=>{
  globalThis.__indirectEvalProbe=0;
  const report=createFindingReport('indirect.js','(0,eval)("globalThis.__indirectEvalProbe=1");');
  assert.equal(report.findings.filter(f=>f.ruleId==='AST001').length,1);
  assert.equal(report.findings.find(f=>f.ruleId==='AST001').message,'Indirekter eval()-Aufruf');
  assert.equal(globalThis.__indirectEvalProbe,0);
  delete globalThis.__indirectEvalProbe;
});
test('indirect eval check does not flag unrelated comma-expression call',()=>{
  const report=createFindingReport('normal.js','(0,fn)(1);');
  assert.equal(report.findings.filter(f=>f.ruleId==='AST001').length,0);
});
