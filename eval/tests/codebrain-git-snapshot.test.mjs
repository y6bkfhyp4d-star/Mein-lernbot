import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectGitSnapshot,snapshotPasses,snapshotOutcome} from './codebrain-git-snapshot.mjs';
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

test('snapshot uses AST syntax results and blocks malformed JavaScript',async()=>{
 const f=fixture({path:'broken.mjs',source:'export const broken = ;'});
 let called=0;
 const data=await inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,git:f.git,ast:(file,source)=>{
  called++;
  assert.equal(file,'broken.mjs');
  assert.match(source,/broken/);
  return {parsed:false,findings:[{rule:'AST000',line:1}]};
 }});
 assert.equal(called,1);
 assert.equal(data.result.rows[0].reason,'ast-syntax-error');
 assert.equal(data.result.rows[0].findings[0].kind,'confirmed');
 assert.equal(data.result.blocking,true);
});
test('snapshot AST worker errors cannot be reported as successful checks',async()=>{
 const f=fixture();
 const data=await inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,git:f.git,ast:()=>{throw Error('worker unavailable');}});
 assert.equal(data.result.complete,false);
 assert.equal(data.result.rows[0].status,'error');
});

test('snapshot refuses green status when AST findings exceed the reporting cap',async()=>{
 const f=fixture();
 const data=await inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,git:f.git,ast:()=>({
  parsed:true,findings:Array.from({length:41},(_,i)=>({rule:'AST001',line:i+1}))
 })});
 assert.equal(data.result.rows[0].reason,'findings-truncated');
 assert.equal(data.result.complete,false);
 assert.equal(snapshotPasses(data.result),false);
});
test('snapshot accepts supported clean scans but rejects undisclosed analysis skips',()=>{
 const base={checked:1,blocking:false,complete:true,rows:[{status:'checked',reason:'ast'}]};
 assert.equal(snapshotPasses(base),true);
 assert.equal(snapshotPasses({...base,complete:false,rows:[...base.rows,{status:'skipped',reason:'unsupported-type'}]}),true);
 assert.equal(snapshotPasses({...base,rows:[...base.rows,{status:'skipped',reason:'size-or-encoding'}]}),false);
 assert.equal(snapshotPasses({...base,rows:[...base.rows,{status:'error',reason:'fetch-or-analyzer-error'}]}),false);
});

test('snapshot outcome distinguishes full, intentional partial and broken scans',()=>{
 const ok={checked:1,blocking:false,complete:true,rows:[{status:'checked',reason:'ast'}]};
 assert.equal(snapshotOutcome(ok),'COMPLETE');
 assert.equal(snapshotOutcome({...ok,complete:false,rows:[...ok.rows,{status:'skipped',reason:'unsupported-type'}]}),'PARTIAL_UNSUPPORTED');
 assert.equal(snapshotOutcome({...ok,complete:false,rows:[...ok.rows,{status:'skipped',reason:'findings-truncated'}]}),'INCOMPLETE');
 assert.equal(snapshotOutcome({...ok,complete:false,rows:[...ok.rows,{status:'error',reason:'fetch-or-analyzer-error'}]}),'INCOMPLETE');
});

test('snapshot result counters, completeness and statuses must agree before passing',()=>{
 const good={checked:1,blocking:false,complete:true,rows:[{status:'checked',reason:'ast'}]};
 assert.equal(snapshotPasses(good),true);
 assert.equal(snapshotPasses({...good,checked:2}),false);
 assert.equal(snapshotPasses({...good,complete:false}),false);
 assert.equal(snapshotPasses({...good,rows:[...good.rows,{status:'pending',reason:'unknown'}]}),false);
 assert.equal(snapshotPasses({...good,rows:[...good.rows,{status:'skipped',reason:'unsupported-type'}]}),false);
 assert.equal(snapshotPasses({...good,complete:false,rows:[...good.rows,{status:'skipped',reason:'unsupported-type'}]}),true);
 assert.equal(snapshotOutcome({...good,checked:2}),'INCOMPLETE');
 assert.equal(snapshotPasses(null),false);
});

test('C27 snapshot reads a supported 64KB JS file rather than silently skipping it',async()=>{
 const f=fixture({path:'large.test.mjs',source:'const x=1;\n'+'// safe data\n'.repeat(5000)});
 const data=await inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,git:f.git,
  ast:()=>({parsed:true,findings:[]})});
 assert.equal(data.result.rows[0].status,'checked');
 assert.equal(data.result.checked,1);
 assert.equal(snapshotOutcome(data.result),'COMPLETE');
});
test('C27 unsupported files are disclosed as partial, while over-limit files still fail closed',async()=>{
 const unsupported=fixture({path:'docs/readme.md'});
 const skipped=await inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,git:unsupported.git});
 assert.equal(skipped.result.rows[0].reason,'unsupported-type');
 assert.equal(snapshotOutcome(skipped.result),'INCOMPLETE');
 const large=fixture({path:'too-large.js',source:'// payload\n'.repeat(7200)});
 const result=await inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,git:large.git});
 assert.equal(result.result.rows[0].reason,'size-or-encoding');
 assert.equal(snapshotPasses(result.result),false);
});
