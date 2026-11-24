import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const blobHash=source=>createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex');
import {inspect,render,astWorkerDefault} from '../../../.github/scripts/neryx-codebrain.mjs';

// Simulates GitHub REST responses, but uses the real isolated JS/Python/YAML parsers.
// This tests the manual code path without sending a real access token over the network.
const HEAD='a'.repeat(40);
const sourceByPath={
 'untrusted.mjs':'export const value=1; eval("globalThis.codeBrainNeverRun=42");',
 'config.yml':'name: test\njobs: {}\n',
 'helper.py':'def square(x):\n    return x * x\n',
 'data.json':'{"ok":true}'
};
function fakeApi(override={}){
 const files=Object.keys(sourceByPath).map(filename=>({filename,status:'added',sha:blobHash(override[filename]??sourceByPath[filename])}));
 const blobs=new Map(files.map(f=>[f.sha,override[f.filename]??sourceByPath[f.filename]]));
 let prReads=0;
 const seen=[];
 const request=async(url,opts)=>{
  seen.push({url,auth:opts?.headers?.Authorization});
  let body;
  if(url.endsWith('/pulls/97')){
   prReads++;
   body={state:'open',base:{ref:'main'},head:{sha:HEAD},changed_files:files.length};
  }else if(url.endsWith('/pulls/97/files?per_page=100')){
   body=files;
  }else if(url.includes('/git/blobs/')){
   const source=blobs.get(url.split('/').at(-1));
   if(source===undefined)throw Error('Unknown blob');
   body={encoding:'base64',size:Buffer.byteLength(source),content:Buffer.from(source).toString('base64')};
  }else throw Error('Unexpected URL');
  return {ok:true,json:async()=>body};
 };
 return {seen,request,get prReads(){return prReads}};
}
test('manual scanner fully integrates API, isolated AST, Python, YAML and JSON with no source execution',async()=>{
 globalThis.codeBrainNeverRun=0;
 const api=fakeApi();
 const result=await inspect({repo:'example/repo',number:97,token:'FAKE_TOKEN_DO_NOT_PRINT',request:api.request,ast:astWorkerDefault});
 assert.equal(result.complete,true);
 assert.equal(result.blocking,false);
 assert.equal(result.checked,4);
 assert.equal(api.prReads,2,'Scan must verify current PR head after analysis');
 assert.equal(result.rows.find(x=>x.file==='untrusted.mjs').reason,'ast');
 assert.ok(result.rows.find(x=>x.file==='untrusted.mjs').findings.some(f=>f.rule==='AST001'));
 assert.equal(result.rows.find(x=>x.file==='helper.py').reason,'python-ast-parse');
 assert.equal(result.rows.find(x=>x.file==='config.yml').reason,'yaml-ast-parse');
 assert.equal(result.rows.find(x=>x.file==='data.json').reason,'json-parse');
 assert.equal(globalThis.codeBrainNeverRun,0);
 assert.ok(api.seen.every(x=>x.auth==='Bearer FAKE_TOKEN_DO_NOT_PRINT'));
 const output=render(result);
 assert.doesNotMatch(output,/FAKE_TOKEN_DO_NOT_PRINT|codeBrainNeverRun/);
 delete globalThis.codeBrainNeverRun;
});
test('manual scanner confirms syntax failure from actual isolated AST worker, not a green verdict',async()=>{
 const api=fakeApi({'untrusted.mjs':'export const = ;'});
 const result=await inspect({repo:'example/repo',number:97,token:'FAKE_TOKEN_DO_NOT_PRINT',request:api.request,ast:astWorkerDefault});
 assert.equal(result.complete,true);
 assert.equal(result.blocking,true);
 assert.ok(result.rows[0].findings.some(f=>f.rule==='AST000'&&f.kind==='confirmed'));
 assert.match(render(result),/Prüfung nicht bestanden/);
});

test('C40 mixed real parser failures and corrupted transport cannot yield a clean report',async()=>{
 const api=fakeApi({'untrusted.mjs':'export const = ;','helper.py':'def invalid(:','data.json':'{"broken":'});
 const corruptHash=blobHash(sourceByPath['config.yml']);
 let workerCalls=0;
 const result=await inspect({repo:'example/repo',number:97,token:'FAKE_TOKEN_DO_NOT_PRINT',request:async(url,opts)=>{
  const response=await api.request(url,opts);
  if(!url.endsWith('/git/blobs/'+corruptHash))return response;
  const source=sourceByPath['config.yml'].replace('test','evil');
  return {ok:true,json:async()=>({sha:corruptHash,encoding:'base64',size:Buffer.byteLength(source),content:Buffer.from(source).toString('base64')})};
 },ast:(file,source)=>{workerCalls++;return astWorkerDefault(file,source);}});
 assert.equal(workerCalls,1);
 assert.equal(result.checked,3);
 assert.equal(result.complete,false);
 assert.equal(result.blocking,true);
 assert.equal(result.rows.find(x=>x.file==='config.yml').status,'error');
 for(const [file,rule] of [['untrusted.mjs','AST000'],['helper.py','PY000'],['data.json','JSON000']]){
  assert.ok(result.rows.find(x=>x.file===file).findings.some(f=>f.rule===rule&&f.kind==='confirmed'));
 }
 assert.match(render(result),/UNVOLLSTÄNDIG/);
 assert.match(render(result),/Prüfung nicht bestanden/);
 assert.doesNotMatch(render(result),/FAKE_TOKEN_DO_NOT_PRINT|name: evil/);
});
test('C40 real parser success does not override a changed PR head',async()=>{
 const api=fakeApi();let calls=0;
 await assert.rejects(()=>inspect({repo:'example/repo',number:97,token:'FAKE_TOKEN_DO_NOT_PRINT',request:async(url,opts)=>{
  const response=await api.request(url,opts);
  if(url.endsWith('/pulls/97')&&api.prReads===2){
   const data=await response.json();
   return {ok:true,json:async()=>({...data,head:{sha:'b'.repeat(40)}})};
  }
  return response;
 },ast:(file,source)=>{calls++;return astWorkerDefault(file,source);}}),/PR changed during review/);
 assert.equal(calls,1);
});
