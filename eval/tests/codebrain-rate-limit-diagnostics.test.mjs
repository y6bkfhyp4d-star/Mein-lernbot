import test from 'node:test';
import assert from 'node:assert/strict';
import {githubRateLimitDiagnostic,formatGithubRateLimitDiagnostic} from './codebrain-rate-limit-diagnostics.mjs';
const response=(status,headers)=>({status,headers:new Headers(headers)});
test('primary GitHub rate exhaustion is identified using zero remaining',()=>{
 const d=githubRateLimitDiagnostic(response(403,{'x-ratelimit-remaining':'0','x-ratelimit-limit':'60','x-ratelimit-reset':'1795460000','x-ratelimit-resource':'core'}));
 assert.equal(d.kind,'primary-limit-exhausted');
 assert.equal(d.remaining,0);
 assert.equal(d.resource,'core');
 assert.match(formatGithubRateLimitDiagnostic(d),/kind=primary-limit-exhausted/);
});
test('positive remaining does not get mislabeled primary limit exhaustion',()=>{
 const d=githubRateLimitDiagnostic(response(429,{'x-ratelimit-remaining':'45','retry-after':'120'}));
 assert.equal(d.kind,'secondary-or-policy-limit');
 assert.equal(d.retryAfter,120);
});
test('missing, malformed or malicious headers do not echo untrusted data',()=>{
 const d=githubRateLimitDiagnostic(response(403,{'x-ratelimit-limit':'secret-ghp_fake','x-ratelimit-resource':'::error::FAKE_TOKEN','retry-after':'9999999999999'}));
 const output=formatGithubRateLimitDiagnostic(d);
 assert.equal(d.kind,'undetermined');
 assert.doesNotMatch(output,/secret|ghp_fake|FAKE_TOKEN|::error::/);
 assert.match(output,/resource=unknown/);
});
test('non-403 and non-429 responses produce no diagnostic',()=>{
 assert.equal(githubRateLimitDiagnostic(response(200,{})),null);
 assert.equal(githubRateLimitDiagnostic(response(500,{})),null);
});
