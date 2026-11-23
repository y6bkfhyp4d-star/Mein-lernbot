import test from 'node:test';
import assert from 'node:assert/strict';
import {inspect,render} from '../../.github/scripts/neryx-codebrain.mjs';

const SHA='a'.repeat(40);
function mock(files,contents={},changed=files.length){
 const pr={state:'open',base:{ref:'main'},head:{sha:SHA},changed_files:changed};
 const request=async url=>{
  let data;
  if(url.endsWith('/pulls/94'))data=pr;
  else if(url.includes('/files?'))data=files;
  else if(url.includes('/git/blobs/')){
   const content=contents[url.split('/').at(-1)]??'const value = 1;';
   data={encoding:'base64',size:Buffer.byteLength(content),content:Buffer.from(content).toString('base64')};
  }else throw Error('unexpected URL');
  return {ok:true,json:async()=>data};
 };
 return {repo:'example/repo',number:94,token:'secret-never-print',request};
}
const entry=(file,sha=SHA)=>({filename:file,status:'modified',sha});
test('flags are heuristic and never show source or token',async()=>{
 const opts=mock([entry('a.js')],{[SHA]:'eval("PRIVATE-INPUT-DO-NOT-LOG")'});
 const result=await inspect(opts);
 assert.equal(result.complete,true);
 assert.equal(result.rows[0].findings[0].rule,'JS001');
 const text=render(result);
 assert.doesNotMatch(text,/PRIVATE-INPUT|secret-never-print/);
 assert.match(text,/heuristisch|Heuristischer|Heuristik/i);
});
test('source is never evaluated',async()=>{
 globalThis.codeBrainProbe=0;
 const opts=mock([entry('a.js')],{[SHA]:'globalThis.codeBrainProbe=5;'});
 await inspect(opts);
 assert.equal(globalThis.codeBrainProbe,0);
 delete globalThis.codeBrainProbe;
});
test('unsupported files and dangerous names make coverage incomplete',async()=>{
 const opts=mock([entry('readme.md'),entry('../attack.js'),entry('bad\n::error::hi.js')]);
 const r=await inspect(opts);
 assert.equal(r.complete,false);
 assert.equal(r.checked,0);
 assert.doesNotMatch(render(r),/::error::hi/);
});
test('ES module syntax is not incorrectly confirmed as error by vm.Script',async()=>{
 const opts=mock([entry('module.mjs')],{[SHA]:'export const x = 1;'});
 const r=await inspect(opts);
 assert.equal(r.rows[0].findings.filter(f=>f.rule==='JS000').length,0);
});
test('analyzer errors cannot pass as a clean check',async()=>{
 const opts=mock([entry('a.js')]);
 const r=await inspect({...opts,analyze:()=>{throw Error('API-KEY-DO-NOT-PRINT')}});
 assert.equal(r.complete,false);
 assert.equal(r.rows[0].status,'error');
 assert.doesNotMatch(render(r),/API-KEY/);
});
test('truncated API list must fail closed',async()=>{
 const opts=mock([entry('a.js')],{},2);
 await assert.rejects(()=>inspect(opts),/Unvollständige/);
});
test('no Gemini dependency; network failures are not concealed',async()=>{
 const opts=mock([entry('a.js')]);
 const r=await inspect(opts);
 assert.equal(r.complete,true);
 await assert.rejects(()=>inspect({...opts,request:async()=>({ok:false,status:503})}),/GitHub HTTP 503/);
});

test('truncated findings fail closed rather than claim full coverage',async()=>{
 const opts=mock([entry('a.js')]);
 const r=await inspect({...opts,analyze:()=>Array.from({length:41},()=>({rule:'JS001',line:1}))});
 assert.equal(r.complete,false);
 assert.equal(r.rows[0].status,'skipped');
 assert.equal(r.rows[0].reason,'findings-truncated');
 assert.match(render(r),/UNVOLLSTÄNDIG/);
});
test('markdown injection in PR filenames cannot forge headings or links',async()=>{
 const opts=mock([entry('[approved](https:evil).js'),entry('**all green**.js')]);
 const r=await inspect(opts);
 const report=render(r);
 assert.doesNotMatch(report,/\[approved\]\(|\*\*all green\*\*/);
 assert.equal(r.complete,true);
});
test('empty PR file lists do not produce successful reviews',async()=>{
 const opts=mock([]);
 await assert.rejects(()=>inspect(opts),/Leere oder zu große/);
});
