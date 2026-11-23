// Real GitHub PR #97 metadata captured from GitHub API at 2026-11-23.
// This replays a stable three-file subset of an earlier PR snapshot, NOT the current full PR or an end-to-end API test.
// The test reads local checkout files as inert data; never imports the scanned files.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspect,render} from '../../../.github/scripts/neryx-codebrain.mjs';
import {analyzeAST} from '../analyzer.mjs';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const head='910b465d54c56dcf091c2379eb25a595eb1b0ca4';
const captured=[
 ['.github/workflows/neryx-codebrain.yml','743664fde48abde7099abf3a10ad727fb0b1e846'],
 ['docs/NERYX_CODEBRAIN_V1.md','bb19e778728a80045089b89e8aab35efafaef642'],
 ['eval/genesis-ast/tests/codebrain-ast.test.mjs','bd19feb338ae6d901acab213e57bc8a4ac2ba6da']
];
function blobSha(bytes){
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
test('replay stable PR #97 file subset with captured Git blob hashes, without credentials',async()=>{
 const blobs=new Map();
 const files=captured.map(([filename,sha])=>{
  const bytes=readFileSync(resolve(root,filename));
  assert.equal(blobSha(bytes),sha,'Captured Git blob SHA does not match: '+filename);
  blobs.set(sha,{encoding:'base64',content:bytes.toString('base64'),size:bytes.length});
  return {filename,status:'added',sha};
 });
 let calls=0;
 const request=async url=>{
  calls++;
  let data;
  if(url.endsWith('/pulls/97'))
   data={state:'open',base:{ref:'main'},head:{sha:head},changed_files:files.length};
  else if(url.includes('/files?per_page=100'))data=files;
  else if(url.includes('/git/blobs/'))data=blobs.get(url.split('/').at(-1));
  else throw Error('Unexpected API path');
  assert.ok(data,'Unknown or mismatched blob');
  return {ok:true,json:async()=>data};
 };
 const report=await inspect({repo:'y6bkfhyp4d-star/Mein-lernbot',number:97,token:'REPLAY-ONLY-NOT-A-KEY',request,ast:analyzeAST});
 assert.equal(report.rows.length,3);
 assert.equal(report.rows.filter(x=>x.status==='partial').length,0,'YAML is now parsed syntactically');
 assert.equal(report.rows.filter(x=>x.status==='skipped').length,1,'Markdown is unsupported');
 assert.equal(report.rows.filter(x=>x.status==='checked').length,2,'One JS test module and one YAML file checked for syntax');
 assert.equal(report.complete,false,'Partial coverage must fail closed');
 assert.equal(calls,4,'Metadata, changed-file list and two supported blob fetches');
 const summary=render(report);
 assert.match(summary,/UNVOLLSTÄNDIG/);
 assert.doesNotMatch(summary,/REPLAY-ONLY-NOT-A-KEY/);
});
