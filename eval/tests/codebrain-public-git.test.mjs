import test from 'node:test';
import assert from 'node:assert/strict';
import {publicGitPlan,verifyPublicGitIdentity} from './codebrain-public-git.mjs';
const context={repo:'Example/repo',number:97,head:'a'.repeat(40),base:'b'.repeat(40)};
test('public Git plan pins HTTPS host, refs and disables unsafe transport features',()=>{
 const p=publicGitPlan(context);
 assert.equal(p.url,'https://github.com/Example/repo.git');
 assert.deepEqual(p.fetch.slice(-3),[p.url,'refs/heads/main:refs/neryx/base','refs/pull/97/head:refs/neryx/head']);
 for(const x of ['protocol.allow=never','protocol.https.allow=always','http.followRedirects=false','http.sslVerify=true','credential.helper=','--depth=1','--no-tags','--no-recurse-submodules','fetch.fsckObjects=true'])assert.ok(p.fetch.includes(x));
 assert.ok(Object.isFrozen(p.fetch));
 assert.equal(p.verify.length,2);
});
test('public Git plan rejects malformed repository, refs and commit inputs',()=>{
 for(const repo of ['https://evil.example/a','owner/repo/extra','owner/../repo','-owner/repo','owner/repo.git','owner/repo?x','owner/repo\n'])assert.throws(()=>publicGitPlan({...context,repo}));
 for(const number of [0,-1,1.2,'97',1000001])assert.throws(()=>publicGitPlan({...context,number}));
 for(const head of ['HEAD','a'.repeat(39),'g'.repeat(40),null])assert.throws(()=>publicGitPlan({...context,head}));
});
test('public Git identity verification rejects drift and malformed output',()=>{
 const p=publicGitPlan(context);
 assert.deepEqual(verifyPublicGitIdentity(p,[context.base,context.head]),{base:context.base,head:context.head});
 for(const values of [[context.head,context.base],[context.base,'c'.repeat(40)],[context.base,context.head+'\n'],[context.base],null])assert.throws(()=>verifyPublicGitIdentity(p,values));
});
