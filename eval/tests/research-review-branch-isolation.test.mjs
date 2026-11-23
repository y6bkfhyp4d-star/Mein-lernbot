// Execute a real Git publisher against disposable local bare remotes; never GitHub.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('research publisher rejects unsafe writes in isolated Git sandbox', () => {
  const filename=fileURLToPath(new URL('../../.github/scripts/test_research_review_branch_isolated.py',import.meta.url));
  const result=spawnSync('python3',[filename],{
    encoding:'utf8',timeout:120000,maxBuffer:300000,
    env:{PATH:process.env.PATH,HOME:process.env.HOME}
  });
  assert.equal(result.status,0,(result.stdout||'')+'\n'+(result.stderr||''));
  assert.match(result.stderr,/Ran 5 tests/);
  assert.match(result.stderr,/OK/);
});