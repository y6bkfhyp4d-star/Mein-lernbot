import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectProposedPaths} from '../trusted-policy-model.mjs';
const check=(branch,paths)=>inspectProposedPaths({
  headRef:branch,files:paths.map(p=>typeof p==='string'?{filename:p}:p)
});
const cases=[
  ['allowed auto candidate','neryx/auto/test',['candidates/proposal.json'],'allow-limited'],
  ['allowed auto evaluator data','neryx/auto/test',['eval/candidates/a.json'],'allow-limited'],
  ['auto candidate attempts app.js','neryx/auto/test',['app.js'],'deny'],
  ['auto candidate attempts workflow','neryx/auto/test',['.github/workflows/check.yml'],'deny'],
  ['auto candidate attempts security gate','neryx/auto/test',['eval/genesis-ast/analyzer.mjs'],'deny'],
  ['auto candidate attempts production deployment','neryx/auto/test',['vercel.json'],'deny'],
  ['auto candidate attempts service worker','neryx/auto/test',['sw.js'],'deny'],
  ['auto candidate attempts test tampering','neryx/auto/test',['eval/tests/a.test.mjs'],'deny'],
  ['auto candidate attempts rename into allowlist','neryx/auto/test',[
    {filename:'candidates/allowed.json',previous_filename:'app.js'}],'deny'],
  ['auto candidate attempts rename out of allowlist','neryx/auto/test',[
    {filename:'app.js',previous_filename:'candidates/old.json'}],'deny'],
  ['ordinary PR sensitive workflow','fix/change',['.github/workflows/check.yml'],'manual-trust-review-required'],
  ['ordinary PR changing source','fix/change',['modules/orchestrator.js'],'manual-trust-review-required'],
  ['ordinary PR changing candidate data','fix/change',['candidates/idea.json'],'allow-limited'],
  ['ordinary PR changing docs','fix/change',['docs/help.md'],'allow-limited']
];
test('phase1 policy model: each attack/allowance has two identical outcomes',()=>{
  for(const [label,headRef,files,expected] of cases){
    for(let round=0;round<2;round++){
      const result=check(headRef,files);
      assert.equal(result.decision,expected,label+' round '+round);
      assert.equal(result.enforcedOnGitHub,false);
      assert.equal(result.mode,'simulation-only');
    }
  }
});
test('phase1 policy model: rejects path traversal, non-normal paths and empty inputs',()=>{
  for(const bad of ['../app.js','candidates/../app.js','/app.js','candidates\\x.js',
    'candidates//x.js','candidates/./x.js','candidates/a\0.js']){
    assert.throws(()=>check('neryx/auto/test',[bad]),bad);
  }
  assert.throws(()=>check('neryx/auto/test',[]));
  assert.throws(()=>check('', ['candidates/a.json']));
  assert.throws(()=>check('neryx/auto/test',[
    {filename:'candidates/safe.json',previous_filename:'../secret.js'}
  ]));
});
test('phase1 policy model: unknown actor cannot be inferred from auto-looking branch',()=>{
  const result=check('neryx/auto/unverified',['candidates/data.json']);
  assert.equal(result.autoCandidate,true);
  assert.match(result.limitations.join(' '),/do not prove proposal authorship/);
});
