import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const blobHash=source=>createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex');
import {analyzeAST} from '../analyzer.mjs';
import {inspect,render} from '../../../.github/scripts/neryx-codebrain.mjs';
const SHA='b'.repeat(40);
function mock(source){
 return async url=>{
  const data=url.endsWith('/pulls/97')?{state:'open',base:{ref:'main'},head:{sha:SHA},changed_files:1}:
   url.includes('/files?')?[{filename:'example.mjs',status:'added',sha:blobHash(source)}]:
   url.includes('/git/blobs/')?{encoding:'base64',size:Buffer.byteLength(source),content:Buffer.from(source).toString('base64')}:null;
  if(!data)throw Error('Unexpected URL');
  return {ok:true,json:async()=>data};
 };
}
test('CodeBrain invokes real Acorn AST without running analyzed code',async()=>{
 globalThis.neryxAstRunProbe=0;
 const source='export const x = 1; eval("globalThis.neryxAstRunProbe=42");';
 const r=await inspect({repo:'example/repo',number:97,token:'fake-key',request:mock(source),ast:analyzeAST});
 assert.equal(r.complete,true);
 assert.equal(r.rows[0].reason,'ast');
 assert.ok(r.rows[0].findings.some(f=>f.rule==='AST001'));
 assert.equal(globalThis.neryxAstRunProbe,0);
 assert.doesNotMatch(render(r),/fake-key|globalThis\.neryxAstRunProbe/);
 delete globalThis.neryxAstRunProbe;
});
test('real AST syntax failure is reported without raw source',async()=>{
 const r=await inspect({repo:'example/repo',number:97,token:'fake-key',request:mock('export const x = ;'),ast:analyzeAST});
 assert.equal(r.complete,true);
 assert.equal(r.rows[0].findings[0].rule,'AST000');
 assert.equal(r.rows[0].findings[0].kind,'confirmed');
 assert.match(render(r),/bestätigter Syntaxfehler/);
 assert.doesNotMatch(render(r),/export const x/);
});
