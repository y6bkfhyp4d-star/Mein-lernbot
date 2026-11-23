import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectGitSnapshot} from './codebrain-git-snapshot.mjs';
const HEAD='a'.repeat(40), BASE='b'.repeat(40), MERGE='c'.repeat(40), BLOB='d'.repeat(40);
function fixture({status='M',path='safe.js',source='const ok = 1;',head=HEAD}={}){
 const calls=[];
 const git=args=>{
  calls.push(args);
  const cmd=args[0];
  if(cmd==='rev-parse'){
   if(args[1]==='HEAD')return Buffer.from(MERGE+'\n');
   if(args[1]==='HEAD^1')return Buffer.from(BASE+'\n');
   if(args[1]==='HEAD^2')return Buffer.from(head+'\n');
   if(args[1]==='--verify')return Buffer.from(BLOB+'\n');
  }
  if(cmd==='diff')return Buffer.from(status+'\0'+path+'\0');
  if(cmd==='cat-file'&&args[1]==='-s')return Buffer.from(Buffer.byteLength(source)+'\n');
  if(cmd==='cat-file'&&args[1]==='blob')return Buffer.from(source);
  throw Error('Unexpected git command');
 };
 return {git,calls};
}
test('offline snapshot reuses CodeBrain on local Git blobs without any GitHub API',async()=>{
 const f=fixture();
 const data=await inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,git:f.git});
 assert.equal(data.result.checked,1);
 assert.equal(data.result.complete,true);
 assert.equal(data.result.sha,HEAD);
 assert.equal(data.merge,MERGE);
 assert.ok(f.calls.some(x=>x[0]==='diff'));
 assert.ok(f.calls.some(x=>x[0]==='cat-file'));
});
test('snapshot fails closed if the checked-out PR head differs from event',async()=>{
 const f=fixture({head:'e'.repeat(40)});
 await assert.rejects(()=>inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,git:f.git}),/head mismatch/);
 assert.ok(!f.calls.some(x=>x[0]==='cat-file'));
});
test('deleted files are visibly skipped, not called checked',async()=>{
 const f=fixture({status:'D'});
 const data=await inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,git:f.git});
 assert.equal(data.result.complete,false);
 assert.equal(data.result.checked,0);
 assert.equal(data.result.rows[0].status,'skipped');
});
test('unsafe filenames stop snapshot parsing before reading blobs',async()=>{
 const f=fixture({path:'../unsafe.js'});
 await assert.rejects(()=>inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,git:f.git}),/Unsupported git diff entry/);
 assert.ok(!f.calls.some(x=>x[0]==='cat-file'));
});
