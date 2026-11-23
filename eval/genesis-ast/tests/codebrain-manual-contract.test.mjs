import test from 'node:test';
import assert from 'node:assert/strict';
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
 const files=Object.keys(sourceByPath).map((filename,i)=>({filename,status:'added',sha:String(i+1).repeat(40)}));
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
