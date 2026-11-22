// A prelabelled developer seed for AST finding detection, not a blind holdout.
// Evaluates matching rule IDs, not the limited eligible/review provenance metric.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createFindingReport} from '../finding-report.mjs';

const raw=readFileSync(new URL('../seed-findings-v1.json',import.meta.url));
const seed=JSON.parse(raw.toString('utf8'));
const sha=createHash('sha256').update(raw).digest('hex');
test('prelabelled seed: fixed rule detection, recall and false positives',()=>{
  assert.equal(seed.schema,1);
  assert.equal(seed.cases.length,42);
  assert.equal(new Set(seed.cases.map(c=>c.id)).size,seed.cases.length);
  const c={TP:0,FP:0,TN:0,FN:0},missed=[],unexpected=[];
  for(const item of seed.cases){
    assert.equal(typeof item.source,'string');
    const report=createFindingReport('seed.js',item.source);
    const detected=new Set(report.findings.map(f=>f.ruleId));
    if(item.expected===null){
      if(detected.size){c.FP++;unexpected.push({id:item.id,rules:[...detected].sort()});}
      else c.TN++;
    }else{
      assert.match(item.expected,/^(?:AST\d{3}|SEC\d{3})$/);
      if(detected.has(item.expected))c.TP++;
      else {c.FN++;missed.push({id:item.id,expected:item.expected,rules:[...detected].sort()});}
    }
  }
  const positives=c.TP+c.FN,negatives=c.TN+c.FP;
  const recall=c.TP/positives,fpRate=c.FP/negatives;
  console.log('GENESIS FINDING SEED '+JSON.stringify({
    sha256:sha,cases:seed.cases.length,positives,negatives,
    counts:c,recall,falsePositiveRate:fpRate,missed,unexpected,
    caveat:'Developer-authored prelabelled rule corpus; not independent blind holdout'
  }));
  assert.ok(recall>=seed.thresholds.minRecall,'seed detection recall below threshold');
  assert.ok(fpRate<=seed.thresholds.maxFalsePositiveRate,'seed false-positive rate above threshold');
});
