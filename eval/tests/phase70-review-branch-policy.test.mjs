// Regression guard: phase 7.0 research must never write directly to main.
// This is a static defense-in-depth check, NOT a GitHub permission boundary.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync(new URL('../../.github/workflows/lernbot-phase70.yml',import.meta.url),'utf8');

test('Phase 70 scheduled research writes only to dedicated review branch',()=>{
  assert.match(workflow,/REPORT_BRANCH:\s*neryx\/research-phase70/);
  assert.match(workflow,/git push origin "HEAD:refs\/heads\/\$REPORT_BRANCH"/);
  assert.doesNotMatch(workflow,/git push(?:\s+origin)?\s+(?:HEAD:refs\/heads\/)?main(?:\s|$)/m);
  assert.doesNotMatch(workflow,/\bforce-with-lease\b|git push --force/);
  assert.doesNotMatch(workflow,/\bgh pr merge\b|\bgh pr create\b|\bvercel deploy\b/);
});

test('Phase 70 uses reviewed main Python before switching to the untrusted review branch',()=>{
  const mainCheckout=workflow.indexOf('ref: main');
  const runEngine=workflow.indexOf('run: python evolution/phase70/engine.py');
  const branchSwitch=workflow.indexOf('git switch -C "$REPORT_BRANCH"');
  assert.ok(mainCheckout>=0 && runEngine>mainCheckout && branchSwitch>runEngine);
  assert.match(workflow,/git show "refs\/remotes\/origin\/\$REPORT_BRANCH:evolution\/phase70\/knowledge\.json"/);
  assert.match(workflow,/python -m json\.tool/);
  assert.match(workflow,/git add -- evolution\/phase70\/knowledge\.json/);
  assert.match(workflow,/git merge --no-edit refs\/remotes\/origin\/main/);
});
