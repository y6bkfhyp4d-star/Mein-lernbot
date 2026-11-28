// Static regression: candidate policy must run from trusted base context only.
// This does not replace live GitHub branch/ruleset negative tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync(new URL('../../.github/workflows/neryx-genesis-candidate-trusted.yml',import.meta.url),'utf8');
test('candidate guard runs from protected base without checking out PR code',()=>{
  assert.match(workflow,/pull_request_target:/);
  assert.match(workflow,/branches:\s*\[main\]/);
  assert.doesNotMatch(workflow,/^\s*pull_request:\s*$/m);
  assert.doesNotMatch(workflow,/actions\/checkout@|git checkout|git switch|git clone/);
  assert.match(workflow,/pull-requests:\s*read/);
  assert.match(workflow,/contents:\s*read/);
  assert.doesNotMatch(workflow,/contents:\s*write|pull-requests:\s*write|secrets\./);
  assert.match(workflow,/name:\s*genesis-candidate-paths-trusted/);
});
test('bot branch changes are constrained, including renames and pagination',()=>{
  assert.match(workflow,/if os\.environ\["HEAD_REF"\]\.startswith\("neryx\/auto\/"\):/);
  assert.match(workflow,/status in \("renamed", "copied"\) and not file\.get\("previous_filename"\)/);
  assert.match(workflow,/paths\.append\(previous\)/);
  assert.match(workflow,/if any\(not p\.startswith\(\("candidates\/", "eval\/candidates\/"\)\) for p in paths\):\s+raise RuntimeError\("Auto-candidate attempted disallowed path"\)/);
  assert.match(workflow,/files\?per_page=100&page=/);
  assert.match(workflow,/not 1 <= count <= 3000/);
  assert.match(workflow,/len\(seen\) != count or snapshot\(\) != count/);
  assert.match(workflow,/pr\["head"\]\["sha"\] != os\.environ\["EXPECTED_HEAD"\]/);
  assert.match(workflow,/pr\["base"\]\["sha"\] != os\.environ\["EXPECTED_BASE"\]/);
});
