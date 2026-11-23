import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(fileURLToPath(new URL(path,root)),'utf8');

test('manual CodeBrain workflow stays read-only, default-branch gated, secret-free',()=>{
 const text=read('.github/workflows/neryx-codebrain.yml');
 assert.match(text,/^\s*workflow_dispatch:/m);
 assert.doesNotMatch(text,/^\s*pull_request_target:/m);
 assert.match(text,/^\s*contents: read$/m);
 assert.match(text,/^\s*pull-requests: read$/m);
 assert.doesNotMatch(text,/^\s*(?:contents|pull-requests|actions): write$/m);
 assert.doesNotMatch(text,/secrets\s*\./);
 assert.match(text,/github\.ref == 'refs\/heads\/main'/);
 assert.match(text,/^\s+ref: main$/m);
 assert.match(text,/persist-credentials: false/);
 assert.match(text,/npm ci --ignore-scripts/);
 assert.doesNotMatch(text,/npm (?:install|ci)(?![^\n]*--ignore-scripts)/);
 assert.doesNotMatch(text,/pull_request_target|sudo |curl .*\|.*sh|eval\s+/);
 assert.match(text,/timeout-minutes:/);
});
test('public smoke workflow has no token permissions, secrets, or privileged trigger',()=>{
 const text=read('.github/workflows/neryx-codebrain-public-smoke.yml');
 assert.match(text,/permissions: \{\}/);
 assert.match(text,/^\s*pull_request:/m);
 assert.doesNotMatch(text,/^\s*pull_request_target:/m);
 assert.doesNotMatch(text,/secrets\s*\.|github\.token|GH_TOKEN|GITHUB_TOKEN/);
 assert.doesNotMatch(text,/npm install|npm ci/);
 assert.match(text,/persist-credentials: false/);
 assert.match(text,/timeout-minutes:/);
 assert.match(text,/CODEBRAIN_LIVE_PUBLIC: '1'/);
});
test('Python and YAML parser helpers do not run or deserialize analyzed source',()=>{
 const py=read('.github/scripts/neryx-python-syntax.py');
 const rb=read('.github/scripts/neryx-yaml-syntax.rb');
 assert.match(py,/ast\.parse\(/);
 assert.doesNotMatch(py,/\b(?:eval|exec|compile)\s*\(/);
 assert.match(rb,/Psych\.parse_stream\(/);
 assert.doesNotMatch(rb,/\b(?:unsafe_load|load_file|eval|system|exec|spawn)\s*\(/);
});
