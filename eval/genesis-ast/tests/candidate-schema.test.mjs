// Regression: strict candidate JSON contract and read-only pinned-blob retrieval.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const script=fileURLToPath(new URL('../../../.github/scripts/test_genesis_candidate_schema.py',import.meta.url));
test('candidate JSON schema: negative and pinned-source tests pass without execution',()=>{
  const result=spawnSync('python3',[script],{
    encoding:'utf8',timeout:15000,maxBuffer:250000,
    env:{PATH:process.env.PATH,HOME:process.env.HOME}
  });
  assert.equal(result.status,0,(result.stdout||'')+'\n'+(result.stderr||''));
  assert.match(result.stderr,/Ran 6 tests/);
  assert.match(result.stderr,/OK/);
});
