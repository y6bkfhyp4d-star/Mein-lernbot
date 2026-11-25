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

import {publicGitIPv4,resolvePublicGitUpstream} from './codebrain-public-git.mjs';
test('fixed upstream resolver requests only github.com and returns one numeric HTTPS endpoint',async()=>{
 let calls=0;
 const target=await resolvePublicGitUpstream(async host=>{
  calls++;assert.equal(host,'github.com');return ['8.8.8.8','9.9.9.9'];
 });
 assert.deepEqual(target,{host:'8.8.8.8',port:443,family:4});
 assert.ok(Object.isFrozen(target));assert.equal(calls,1);
});
test('fixed upstream rejects private, reserved, malformed and mixed DNS answers',async()=>{
 for(const address of ['0.0.0.0','10.0.0.1','127.0.0.1','169.254.169.254','172.16.0.1','192.168.0.1','100.64.0.1','192.0.2.1','198.18.0.1','198.51.100.1','203.0.113.1','224.0.0.1','255.255.255.255','::1','::ffff:127.0.0.1','012.1.1.1','1.2.3.256','github.com']){
  assert.equal(publicGitIPv4(address),false);
  await assert.rejects(resolvePublicGitUpstream(async()=>['8.8.8.8',address]));
 }
 for(const answer of [[],null,Array(17).fill('8.8.8.8')])await assert.rejects(resolvePublicGitUpstream(async()=>answer));
});


// Finite loopback-only resource tests: no external target or credentials.
test('relay enforces simultaneous and lifetime connection caps', {timeout:15000}, async()=>{
 const relay=await createPublicGitRelay({connectUpstream:async()=>{throw Error('No upstream expected');}});
 const clients=new Set();
 const open=async()=>{
  const s=createConnection(relay.address.port,'127.0.0.1');
  clients.add(s);
  s.on('error',()=>{});
  const closed=new Promise(resolve=>s.once('close',resolve));
  await new Promise((resolve,reject)=>{s.once('connect',resolve);s.once('error',reject);});
  return {s,closed};
 };
 try{
  const held=[];
  for(let i=0;i<4;i++)held.push(await open());
  const fifth=await open();
  await fifth.closed;
  assert.ok(held.every(x=>!x.s.destroyed));
  for(const x of held){x.s.end();await x.closed;}
  // The rejected fifth connection must not consume the lifetime allowance.
  // Approved framing followed by connector failure produces a clean close.
  for(let i=0;i<8;i++){
   const x=await open();x.s.write(connect());await x.closed;
  }
  const exhausted=await open();await exhausted.closed;
 }finally{
  for(const s of clients)s.destroy();
  await relay.close();
 }
});
test('relay does not invoke connector for oversized headers or incomplete framing', {timeout:12000},async()=>{
 let calls=0;
 const relay=await createPublicGitRelay({connectUpstream:async()=>{calls++;throw Error('Unexpected connector');}});
 try{
  for(const payload of [Buffer.alloc(4097,65),Buffer.from('CONNECT github.com:443 HTTP/1.1\r\n')]){
   const s=createConnection(relay.address.port,'127.0.0.1');
   s.on('error',()=>{});
   const closed=new Promise(resolve=>s.once('close',resolve));
   await once(s,'connect');
   s.write(payload);
   await closed;
  }
  assert.equal(calls,0);
 }finally{await relay.close();}
});
test('relay closes client on upstream failure without fallback', {timeout:10000},async()=>{
 let calls=0;
 const relay=await createPublicGitRelay({connectUpstream:async()=>{calls++;throw Error('Synthetic upstream failure');}});
 try{
  const s=createConnection(relay.address.port,'127.0.0.1');
  s.on('error',()=>{});
  const closed=new Promise(resolve=>s.once('close',resolve));
  let received=0;s.on('data',chunk=>{received+=chunk.length;});
  await once(s,'connect');s.write(connect());await closed;
  assert.equal(calls,1);assert.equal(received,0);
 }finally{await relay.close();}
});


import {PUBLIC_GIT_RELAY_LIMITS} from './codebrain-public-git.mjs';
test('relay limits cannot exceed production ceilings',async()=>{
 for(const [key,value] of Object.entries(PUBLIC_GIT_RELAY_LIMITS)){
  for(const invalid of [0,-1,value+1,NaN,1.5])await assert.rejects(createPublicGitRelay({connectUpstream:async()=>{},limits:{[key]:invalid}}),/Invalid relay limits/);
 }
 await assert.rejects(createPublicGitRelay({connectUpstream:async()=>{},limits:{unknown:1}}),/Invalid relay limits/);
});
test('relay enforces per-connection and aggregate byte caps in both directions', {timeout:10000},async()=>{
 const peers=new Set();
 let forwarded=0;
 const peer=createServer(s=>{
  peers.add(s);s.on('close',()=>peers.delete(s));s.on('error',()=>{});
  s.on('data',chunk=>{forwarded+=chunk.length;s.write(chunk);});
 });
 peer.listen(0,'127.0.0.1');await once(peer,'listening');
 const relay=await createPublicGitRelay({limits:{connectionBytes:64,totalBytes:96},connectUpstream:async()=>{
  const s=createConnection(peer.address().port,'127.0.0.1');await once(s,'connect');return s;
 }});
 const clients=[];
 async function tunnel(){
  const s=createConnection(relay.address.port,'127.0.0.1');clients.push(s);s.on('error',()=>{});
  const closed=new Promise(resolve=>s.once('close',resolve));
  await once(s,'connect');s.write(connect());
  const [header]=await once(s,'data');
  assert.equal(header.toString(),'HTTP/1.1 200 Connection Established\r\n\r\n');
  return {s,closed};
 }
 try{
  const a=await tunnel();
  a.s.write(Buffer.alloc(32,65));const [echo]=await once(a.s,'data');assert.equal(echo.length,32);
  a.s.write(Buffer.from('x'));await a.closed;assert.equal(forwarded,32);
  const b=await tunnel();
  b.s.write(Buffer.alloc(15,66));const [echo2]=await once(b.s,'data');assert.equal(echo2.length,15);
  b.s.write(Buffer.alloc(3,67));await b.closed;assert.equal(forwarded,47);
 }finally{
  for(const s of clients)s.destroy();
  await relay.close();
  for(const s of peers)s.destroy();
  await new Promise(resolve=>peer.close(resolve));
 }
});
test('relay absolute deadline closes active tunnel and upstream', {timeout:10000},async()=>{
 let peerClosed;
 const peer=createServer(s=>{s.on('error',()=>{});peerClosed=new Promise(resolve=>s.once('close',resolve));s.on('data',chunk=>s.write(chunk));});
 peer.listen(0,'127.0.0.1');await once(peer,'listening');
 const relay=await createPublicGitRelay({limits:{lifetimeMs:1200},connectUpstream:async()=>{
  const s=createConnection(peer.address().port,'127.0.0.1');await once(s,'connect');return s;
 }});
 const s=createConnection(relay.address.port,'127.0.0.1');s.on('error',()=>{});
 const closed=new Promise(resolve=>s.once('close',resolve));
 let ticker;
 try{
  await once(s,'connect');s.write(connect());await once(s,'data');
  s.on('data',()=>{});
  ticker=setInterval(()=>{if(!s.destroyed)s.write('x');},50);
  await closed;assert.ok(peerClosed);await peerClosed;
 }finally{
  clearInterval(ticker);s.destroy();await relay.close();await new Promise(resolve=>peer.close(resolve));
 }
});

 
// Public calibration corpus, not an independent or secret holdout.
// Score case/rule presence, not general vulnerability detection.
test('NERYX fixed calibration corpus reports per-rule precision and recall',async()=>{
 const {analyzeAST}=await import('../genesis-ast/analyzer.mjs');
 const rules=['AST001','AST002','AST003','AST004','AST005','AST007'];
 const cases=[
  ['eval-direct','eval(input);',['AST001']],
  ['eval-global','globalThis.eval(input);',['AST001']],
  ['eval-shadow','function f(eval){ eval(input); }',[],'fixture.cjs'],
  ['eval-text','const s="eval(input)";',[]],
  ['function-direct','Function(input);',['AST002']],
  ['function-new','new Function(input);',['AST002']],
  ['function-local','function f(Function){ Function(input); }',[]],
  ['html-write','node.innerHTML = input;',['AST003']],
  ['html-computed','node["innerHTML"] = input;',['AST003']],
  ['html-read','const x = node.innerHTML;',[]],
  ['html-safe','node.textContent = input;',[]],
  ['storage-direct','localStorage.clear();',['AST004']],
  ['storage-alias','const s=localStorage; s.clear();',['AST004']],
  ['storage-global','globalThis.localStorage.clear();',['AST004']],
  ['storage-shadow','function f(localStorage){ localStorage.clear(); }',[]],
  ['storage-safe','localStorage.removeItem("own-key");',[]],
  ['document-direct','document.write(input);',['AST005']],
  ['document-alias','const d=document; d.write(input);',['AST005']],
  ['document-shadow','function f(document){ document.write(input); }',[]],
  ['document-text','const s="document.write(input)";',[]],
  ['import-variable','import(name);',['AST007']],
  ['import-literal','import("./known.mjs");',[]],
  ['combined','eval(input); node.innerHTML=input; localStorage.clear();',['AST001','AST003','AST004']],
  ['plain','const value=42; export {value};',[]]
 ];
 const counts=Object.fromEntries(rules.map(rule=>[rule,{tp:0,fp:0,fn:0,tn:0}]));
 const misses=[];
 for(const [id,source,expected,file='fixture.mjs'] of cases){
  const result=analyzeAST(file,source);
  assert.equal(result.parsed,true,id);
  const actual=new Set(result.findings.map(f=>f.rule));
  for(const rule of rules){
   const want=expected.includes(rule),got=actual.has(rule);
   counts[rule][want?(got?'tp':'fn'):(got?'fp':'tn')]++;
   if(want!==got)misses.push({id,rule,type:want?'FN':'FP'});
  }
 }
 const metric=c=>({...c,precision:c.tp+c.fp?c.tp/(c.tp+c.fp):null,recall:c.tp+c.fn?c.tp/(c.tp+c.fn):null});
 const total={tp:0,fp:0,fn:0,tn:0};
 for(const c of Object.values(counts))for(const k of Object.keys(total))total[k]+=c[k];
 assert.equal(Object.values(total).reduce((a,b)=>a+b,0),cases.length*rules.length);
 console.log('NERYX_CALIBRATION '+JSON.stringify({schema:'neryx.calibration.v1',independent:false,scope:'CASE_RULE_PRESENCE',cases:cases.length,rules:Object.fromEntries(rules.map(r=>[r,metric(counts[r])])),micro:metric(total),misses}));
});
