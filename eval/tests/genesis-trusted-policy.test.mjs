// Static regression for the protected-base PR gate.
// A checkout of a *pinned base SHA* is safe; checkout of PR-head code is not.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync(new URL('../../.github/workflows/neryx-genesis-candidate-trusted.yml',import.meta.url),'utf8');
const policy=readFileSync(new URL('../../.github/scripts/genesis_trusted_gate.py',import.meta.url),'utf8');
test('candidate guard executes only trusted base code; no PR-head checkout',()=>{
  assert.match(workflow,/pull_request_target:/);
  assert.match(workflow,/branches:\s*\[main\]/);
  assert.doesNotMatch(workflow,/^\s*pull_request:\s*$/m);
  assert.match(workflow,/name:\s*genesis-candidate-paths-trusted/);
  assert.match(workflow,/pull-requests:\s*read/);
  assert.match(workflow,/contents:\s*read/);
  assert.doesNotMatch(workflow,/contents:\s*write|pull-requests:\s*write|secrets\./);
  assert.match(workflow,/uses:\s*actions\/checkout@[0-9a-f]{40}/);
  assert.match(workflow,/ref:\s*\$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
  assert.match(workflow,/persist-credentials:\s*false/);
  assert.doesNotMatch(workflow,/git checkout|git switch|git clone|github\.event\.pull_request\.head\.sha\s*\}\}\s*\n\s*persist-credentials/);
  assert.match(workflow,/python3 \.github\/scripts\/genesis_trusted_gate\.py/);
  assert.doesNotMatch(policy,/subprocess|os\.system|eval\(|exec\(/);
});
test('auto-candidate restrictions include renames and bounded API pagination',()=>{
  assert.match(policy,/head_ref\.startswith\("neryx\/auto\/"\)/);
  assert.match(policy,/previous_filename/);
  assert.match(policy,/candidates\//);
  assert.match(policy,/eval\/candidates\//);
  assert.match(policy,/if len\(batch\) < 100:/);
  assert.match(policy,/range\(1, 32\)/);
  assert.match(policy,/Too many results/);
  assert.match(policy,/auto-candidate-prohibited-path/);
});
test('ordinary sensitive PR requires current-head independent real-person approval',()=>{
  assert.match(policy,/sensitive\(p\)/);
  assert.match(policy,/user\.get\("type"\) == "User"/);
  assert.match(policy,/review\.get\("commit_id"\) == head_sha/);
  assert.match(policy,/login\.casefold\(\) != author\.casefold\(\)/);
  assert.match(policy,/author_association/);
  assert.match(policy,/REVIEW_FREE/);
  assert.match(policy,/review\["state"\] == "APPROVED"/);
  assert.match(policy,/sensitive-path-requires-independent-current-approval/);
});
