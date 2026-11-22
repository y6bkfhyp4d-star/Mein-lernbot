// INTENTIONALLY FAILING negative control for GitHub branch-protection testing.
// NEVER MERGE THIS TEST into main. Close PR and delete this branch afterward.
import test from 'node:test';
import assert from 'node:assert/strict';

test('NEGATIVE CONTROL: required CI must block this PR', () => {
  assert.fail('EXPECTED_FAILURE: GitHub ruleset must deny merging a PR with failing integration');
});
