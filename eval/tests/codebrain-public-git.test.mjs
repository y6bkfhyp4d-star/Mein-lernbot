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

import {inspectPublicGitCollector} from './codebrain-public-git.mjs';
test('offline scanner adapter requires parser injection and refuses context mismatch',async()=>{
 await assert.rejects(inspectPublicGitCollector(proofPlan,'',{repo:context.repo,number:context.number}),/Missing isolated parsers/);
 await assert.rejects(inspectPublicGitCollector(proofPlan,'',{repo:'Other/repo',number:context.number,parsers:{}}),/Mismatched scan context/);
});

import {admitPublicGitConnect} from './codebrain-public-git.mjs';
const connect=(target='github.com:443',headers='Host: github.com:443\r\n')=>Buffer.from('CONNECT '+target+' HTTP/1.1\r\n'+headers+'\r\n');
test('proxy admission permits only fixed GitHub HTTPS CONNECT target',()=>{
 assert.deepEqual(admitPublicGitConnect(connect()),{host:'github.com',port:443});
 assert.deepEqual(admitPublicGitConnect(connect('github.com:443','Host: github.com:443\r\nProxy-Connection: Keep-Alive\r\nUser-Agent: git/2.56\r\n')),{host:'github.com',port:443});
 for(const target of ['github.com:80','github.com.evil.invalid:443','127.0.0.1:443','[::1]:443','github.com.:443','github.com:0443','user@github.com:443','GITHUB.COM:443'])assert.throws(()=>admitPublicGitConnect(connect(target)));
});
test('proxy admission rejects ambiguous framing, credentials and unapproved headers',()=>{
 for(const headers of ['', 'Host: other.invalid:443\r\n','Host: github.com:443\r\nHost: github.com:443\r\n','Host: github.com:443\r\nProxy-Authorization: Basic abc\r\n','Host: github.com:443\r\nContent-Length: 0\r\n','Host: github.com:443\r\nTransfer-Encoding: chunked\r\n','Host: github.com:443\r\n folded\r\n'])assert.throws(()=>admitPublicGitConnect(connect('github.com:443',headers)));
 for(const raw of [Buffer.concat([connect(),Buffer.from('extra')]),Buffer.alloc(4097),Buffer.from('GET / HTTP/1.1\r\n\r\n'),Buffer.from('CONNECT github.com:443 HTTP/1.1\nHost: github.com:443\n\n')])assert.throws(()=>admitPublicGitConnect(raw));
});

import {createPublicGitRelay} from './codebrain-public-git.mjs';
import {createServer,createConnection} from 'node:net';
import {once} from 'node:events';
test('bounded relay accepts approved tunnel and rejects other destinations without upstream call',async()=>{
 let calls=0;
 const peer=createServer(socket=>socket.on('data',data=>socket.write(data)));
 peer.listen(0,'127.0.0.1');await once(peer,'listening');
 const relay=await createPublicGitRelay({connectUpstream:async()=>{
  calls++;
  const socket=createConnection(peer.address().port,'127.0.0.1');
  await once(socket,'connect');return socket;
 }});
 try{
  const denied=createConnection(relay.address.port,'127.0.0.1');
  await once(denied,'connect');
  denied.write(connect('other.invalid:443'));
  await once(denied,'close');
  assert.equal(calls,0);
  const client=createConnection(relay.address.port,'127.0.0.1');
  await once(client,'connect');
  try{
   client.write(connect());
   const [response]=await once(client,'data');
   assert.equal(response.toString(),'HTTP/1.1 200 Connection Established\r\n\r\n');
   client.write('synthetic payload');
   const [echo]=await once(client,'data');
   assert.equal(echo.toString(),'synthetic payload');
   assert.equal(calls,1);
  }finally{client.destroy();}
 }finally{
  await relay.close();
  await new Promise(resolve=>peer.close(resolve));
 }
});
