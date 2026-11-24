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

import {validatePublicGitHandoff} from './codebrain-public-git.mjs';
import {createHash} from 'node:crypto';
const blob=Buffer.from('export const x = 1;');
const entry={path:'src/a.mjs',status:'added',mode:'100644',sha:createHash('sha1').update('blob '+blob.length+'\0').update(blob).digest('hex'),size:blob.length,content:blob.toString('base64')};
const packet={base:context.base,head:context.head,files:[entry]};
test('public Git handoff validates canonical blob bytes and pinned identities',()=>{
 const result=validatePublicGitHandoff(publicGitPlan(context),packet);
 assert.deepEqual(result,packet);
 assert.ok(Object.isFrozen(result.files[0]));
});
test('public Git handoff rejects corrupt bytes, unsafe modes, paths and duplicate entries',()=>{
 const p=publicGitPlan(context);
 for(const patch of [{content:'AAAA'},{sha:'c'.repeat(40)},{size:70001},{mode:'120000'},{mode:'160000'},{path:'../a'},{path:'.git/config'},{path:'a\\b'},{content:entry.content+'\n'},{status:'unknown'}])assert.throws(()=>validatePublicGitHandoff(p,{...packet,files:[{...entry,...patch}]}));
 for(const files of [[],[entry,entry],Array(31).fill(entry)])assert.throws(()=>validatePublicGitHandoff(p,{...packet,files}));
 assert.throws(()=>validatePublicGitHandoff(p,{...packet,head:context.base}));
});
test('public Git handoff distinguishes deletion from present blob',()=>{
 const p=publicGitPlan(context);
 const removed={path:'old.js',status:'removed',mode:null,sha:null,size:0,content:null};
 assert.deepEqual(validatePublicGitHandoff(p,{...packet,files:[removed]}).files,[removed]);
 assert.throws(()=>validatePublicGitHandoff(p,{...packet,files:[{...removed,content:''}]}));
});

import {verifyPublicGitTreeHandoff} from './codebrain-public-git.mjs';
function proofObject(type,raw){
 return {type,sha:createHash('sha1').update(type+' '+raw.length+'\0').update(raw).digest('hex'),content:raw.toString('base64')};
}
const empty=proofObject('tree',Buffer.alloc(0));
const leaf=proofObject('tree',Buffer.concat([Buffer.from('100644 a.mjs\0'),Buffer.from(entry.sha,'hex')]));
const parent=proofObject('tree',Buffer.concat([Buffer.from('40000 src\0'),Buffer.from(leaf.sha,'hex')]));
const baseCommit=proofObject('commit',Buffer.from('tree '+empty.sha+'\n\nbase\n'));
const headCommit=proofObject('commit',Buffer.from('tree '+parent.sha+'\n\nhead\n'));
const proofPlan=publicGitPlan({...context,base:baseCommit.sha,head:headCommit.sha});
const proofPacket={...packet,base:baseCommit.sha,head:headCommit.sha};
const proof=[empty,leaf,parent,baseCommit,headCommit];
test('raw Git tree proof binds nested blob to pinned commits',()=>{
 assert.deepEqual(verifyPublicGitTreeHandoff(proofPlan,proofPacket,proof),proofPacket);
});
test('raw Git tree proof rejects omitted trees, forged paths and extra proof objects',()=>{
 assert.throws(()=>verifyPublicGitTreeHandoff(proofPlan,proofPacket,proof.filter(x=>x!==leaf)));
 assert.throws(()=>verifyPublicGitTreeHandoff(proofPlan,{...proofPacket,files:[{...entry,path:'src/b.mjs'}]},proof));
 assert.throws(()=>verifyPublicGitTreeHandoff(proofPlan,proofPacket,[...proof,proofObject('tree',Buffer.from('extra'))]));
 assert.throws(()=>verifyPublicGitTreeHandoff(proofPlan,proofPacket,proof.map(x=>x===leaf?{...x,content:empty.content}:x)));
});
