// Runs offline tests for the protected-base Python policy in the regular AST CI.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('../../../.github/scripts/test_genesis_trusted_gate.py',import.meta.url));
test('trusted-base GitHub policy: Python negative tests execute offline and pass',()=>{
  const result=spawnSync('python3',[script],{encoding:'utf8',timeout:15000,maxBuffer:200000,
    env:{PATH:process.env.PATH,HOME:process.env.HOME}});
  assert.equal(result.status,0,(result.stdout||'')+'\n'+(result.stderr||''));
  assert.match(result.stderr,/Ran 5 tests/);
  assert.match(result.stderr,/OK/);
});
