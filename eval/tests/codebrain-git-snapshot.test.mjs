import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectGitSnapshot,snapshotPasses,snapshotOutcome,snapshotMatchesFiles} from './codebrain-git-snapshot.mjs';
const HEAD='a'.repeat(40), BASE='b'.repeat(40), MERGE='c'.repeat(40);
function fixture({status='M',path='safe.js',source='const ok = 1;',head=HEAD}={}){
 const calls=[];
 const BLOB=createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex');
 const git=args=>{
  calls.push(args);
  const cmd=args[0];
  if(cmd==='rev-parse'){
   if(args[1]==='HEAD')return Buffer.from(MERGE+'\n');
   if(args[1]==='HEAD^1')return Buffer.from(BASE+'\n');
   if(args[1]==='HEAD^2')return Buffer.from(head+'\n');
   if(args[1]==='--verify')return Buffer.from(BLOB+'\n');
  }
  if(cmd==='rev-list')return Buffer.from([MERGE,BASE,head].join(' ')+'\n');
  if(cmd==='diff')return Buffer.from(status+'\0'+path+'\0');
  if(cmd==='cat-file'&&args[1]==='-s')return Buffer.from(Buffer.byteLength(source)+'\n');
  if(cmd==='cat-file'&&args[1]==='blob')return Buffer.from(source);
  throw Error('Unexpected git command');
 };
 return {git,calls};
}
test('offline snapshot reuses CodeBrain on local Git blobs without any GitHub API',async()=>{
 const f=fixture();
 const data=await inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,expectedBase:BASE,git:f.git});
 assert.equal(data.result.checked,1);
 assert.equal(data.result.complete,true);
 assert.equal(data.result.sha,HEAD);
 assert.equal(data.merge,MERGE);
 assert.ok(f.calls.some(x=>x[0]==='diff'));
 assert.ok(f.calls.some(x=>x[0]==='cat-file'));
});
test('snapshot fails closed if the checked-out PR head differs from event',async()=>{
 const f=fixture({head:'e'.repeat(40)});
 await assert.rejects(()=>inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,expectedBase:BASE,git:f.git}),/head or base mismatch/);
 assert.ok(!f.calls.some(x=>x[0]==='cat-file'));
});
test('deleted files are visibly skipped, not called checked',async()=>{
 const f=fixture({status:'D'});
 const data=await inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,expectedBase:BASE,git:f.git});
 assert.equal(data.result.complete,false);
 assert.equal(data.result.checked,0);
 assert.equal(data.result.rows[0].status,'skipped');
});
test('unsafe filenames stop snapshot parsing before reading blobs',async()=>{
 const f=fixture({path:'../unsafe.js'});
 await assert.rejects(()=>inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,expectedBase:BASE,git:f.git}),/Unsupported git diff entry/);
 assert.ok(!f.calls.some(x=>x[0]==='cat-file'));
});

test('snapshot uses AST syntax results and blocks malformed JavaScript',async()=>{
 const f=fixture({path:'broken.mjs',source:'export const broken = ;'});
 let called=0;
 const data=await inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,expectedBase:BASE,git:f.git,ast:(file,source)=>{
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
 const data=await inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,expectedBase:BASE,git:f.git,ast:()=>{throw Error('worker unavailable');}});
 assert.equal(data.result.complete,false);
 assert.equal(data.result.rows[0].status,'error');
});

test('snapshot refuses green status when AST findings exceed the reporting cap',async()=>{
 const f=fixture();
 const data=await inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,expectedBase:BASE,git:f.git,ast:()=>({
  parsed:true,findings:Array.from({length:41},(_,i)=>({rule:'AST001',line:i+1}))
 })});
 assert.equal(data.result.rows[0].reason,'findings-truncated');
 assert.equal(data.result.complete,false);
 assert.equal(snapshotPasses(data.result),false);
});
test('snapshot accepts supported clean scans but rejects undisclosed analysis skips',()=>{
 const base={checked:1,blocking:false,complete:true,rows:[{file:'safe.js',status:'checked',reason:'ast',findings:[]}]};
 assert.equal(snapshotPasses(base),true);
 assert.equal(snapshotPasses({...base,complete:false,rows:[...base.rows,{file:'docs/notes.md',status:'skipped',reason:'unsupported-type',findings:[]}]}),true);
 assert.equal(snapshotPasses({...base,rows:[...base.rows,{status:'skipped',reason:'size-or-encoding'}]}),false);
 assert.equal(snapshotPasses({...base,rows:[...base.rows,{status:'error',reason:'fetch-or-analyzer-error'}]}),false);
});

test('snapshot outcome distinguishes full, intentional partial and broken scans',()=>{
 const ok={checked:1,blocking:false,complete:true,rows:[{file:'safe.js',status:'checked',reason:'ast',findings:[]}]};
 assert.equal(snapshotOutcome(ok),'COMPLETE');
 assert.equal(snapshotOutcome({...ok,complete:false,rows:[...ok.rows,{file:'docs/notes.md',status:'skipped',reason:'unsupported-type',findings:[]}]}),'PARTIAL_UNSUPPORTED');
 assert.equal(snapshotOutcome({...ok,complete:false,rows:[...ok.rows,{status:'skipped',reason:'findings-truncated'}]}),'INCOMPLETE');
 assert.equal(snapshotOutcome({...ok,complete:false,rows:[...ok.rows,{status:'error',reason:'fetch-or-analyzer-error'}]}),'INCOMPLETE');
});

test('snapshot result counters, completeness and statuses must agree before passing',()=>{
 const good={checked:1,blocking:false,complete:true,rows:[{file:'safe.js',status:'checked',reason:'ast',findings:[]}]};
 assert.equal(snapshotPasses(good),true);
 assert.equal(snapshotPasses({...good,checked:2}),false);
 assert.equal(snapshotPasses({...good,complete:false}),false);
 assert.equal(snapshotPasses({...good,rows:[...good.rows,{status:'pending',reason:'unknown'}]}),false);
 assert.equal(snapshotPasses({...good,rows:[...good.rows,{file:'docs/notes.md',status:'skipped',reason:'unsupported-type',findings:[]}]}),false);
 assert.equal(snapshotPasses({...good,complete:false,rows:[...good.rows,{file:'docs/notes.md',status:'skipped',reason:'unsupported-type',findings:[]}]}),true);
 assert.equal(snapshotOutcome({...good,checked:2}),'INCOMPLETE');
 assert.equal(snapshotPasses(null),false);
});

test('C27 snapshot reads a supported 64KB JS file rather than silently skipping it',async()=>{
 const f=fixture({path:'large.test.mjs',source:'const x=1;\n'+'// safe data\n'.repeat(5000)});
 const data=await inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,expectedBase:BASE,git:f.git,
  ast:()=>({parsed:true,findings:[]})});
 assert.equal(data.result.rows[0].status,'checked');
 assert.equal(data.result.checked,1);
 assert.equal(snapshotOutcome(data.result),'COMPLETE');
});
test('C27 unsupported files are disclosed as partial, while over-limit files still fail closed',async()=>{
 const unsupported=fixture({path:'docs/readme.md'});
 const skipped=await inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,expectedBase:BASE,git:unsupported.git});
 assert.equal(skipped.result.rows[0].reason,'unsupported-type');
 assert.equal(snapshotOutcome(skipped.result),'INCOMPLETE');
 const large=fixture({path:'too-large.js',source:'// payload\n'.repeat(7200)});
 const result=await inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,expectedBase:BASE,git:large.git});
 assert.equal(result.result.rows[0].reason,'size-or-encoding');
 assert.equal(snapshotPasses(result.result),false);
});

test('C33 falsely claiming a supported source is unsupported cannot pass offline gate',()=>{
 const base={checked:1,blocking:false,complete:false,rows:[
  {file:'safe.mjs',status:'checked',reason:'ast',findings:[]},
  {file:'eval/analyzer.mjs',status:'skipped',reason:'unsupported-type',findings:[]}
 ]};
 assert.equal(snapshotPasses(base),false);
 assert.equal(snapshotOutcome(base),'INCOMPLETE');
 for(const file of ['script.js','check.cjs','data.json','config.yaml','config.yml','tool.py']){
  assert.equal(snapshotPasses({...base,rows:[base.rows[0],{file,status:'skipped',reason:'unsupported-type',findings:[]}]}),false,file);
 }
});
test('C33 genuinely unsupported paths remain transparent partial coverage',()=>{
 const checked={file:'eval/a.js',status:'checked',reason:'ast',findings:[]};
 for(const path of ['docs/README.md','.github/scripts/helper.rb','assets/logo.svg']){
  const r={checked:1,blocking:false,complete:false,rows:[
   checked,{file:path,status:'skipped',reason:'unsupported-type',findings:[]}
  ]};
  assert.equal(snapshotPasses(r),true,path);
  assert.equal(snapshotOutcome(r),'PARTIAL_UNSUPPORTED',path);
 }
});
test('C33 malformed or unsafe unsupported paths never certify partial coverage',()=>{
 const checked={file:'safe.js',status:'checked',reason:'ast',findings:[]};
 for(const path of ['../hidden.md','/absolute.md','docs\\hidden.md','',null]){
  const r={checked:1,blocking:false,complete:false,rows:[checked,
   {file:path,status:'skipped',reason:'unsupported-type',findings:[]}]};
  assert.equal(snapshotPasses(r),false,String(path));
 }
});

 test('C34 result integrity rejects duplicate paths and inconsistent findings',()=>{
 const row={file:'safe.js',status:'checked',reason:'ast',findings:[]};
 const good={checked:1,blocking:false,complete:true,rows:[row]};
 assert.equal(snapshotPasses(good),true);
 assert.equal(snapshotPasses({...good,checked:2,rows:[row,{...row}]}),false);
 for(const file of ['', '../unsafe.js',null])assert.equal(snapshotPasses({...good,rows:[{...row,file}]}),false);
 const confirmed={rule:'AST000',line:1,label:'Syntax',kind:'confirmed'};
 const heuristic={...confirmed,rule:'AST001',kind:'heuristic'};
 assert.equal(snapshotPasses({...good,rows:[{...row,findings:[heuristic]}]}),true);
 assert.equal(snapshotPasses({...good,rows:[{...row,findings:[confirmed]}]}),false);
 for(const findings of [null,[null],[{...heuristic,line:0}],[{...heuristic,kind:'unknown'}],Array(41).fill(heuristic)])assert.equal(snapshotPasses({...good,rows:[{...row,findings}]}),false);
 assert.equal(snapshotPasses({...good,complete:false,rows:[row,{file:'docs/a.md',status:'skipped',reason:'unsupported-type',findings:[heuristic]}]}),false);
 });

test('C35 every Git change must have exactly one correctly classified result row',()=>{
 const files=[{filename:'a.js',status:'modified'},{filename:'b.md',status:'added'},{filename:'c.js',status:'removed'}];
 const rows=[{file:'a.js',status:'checked',reason:'ast'},{file:'b.md',status:'skipped',reason:'unsupported-type'},{file:'c.js',status:'skipped',reason:'not-added-or-modified'}];
 assert.equal(snapshotMatchesFiles({rows},files),true);
 assert.equal(snapshotMatchesFiles({rows:[...rows].reverse()},files),true);
 for(const bad of [rows.slice(0,2),[rows[0],rows[0],rows[2]],[...rows,{file:'extra.js'}],[{...rows[0],file:'other.js'},...rows.slice(1)],[{...rows[0],status:'skipped',reason:'not-added-or-modified'},...rows.slice(1)],[...rows.slice(0,2),{...rows[2],status:'checked',reason:'ast'}]])assert.equal(snapshotMatchesFiles({rows:bad},files),false);
 assert.equal(snapshotMatchesFiles({rows},[files[0],files[0],files[2]]),false);
});
test('C35 unsupported Git status and duplicate or invalid UTF8 paths fail before blob reads',async()=>{
 for(const diff of [Buffer.from('T\0safe.js\0'),Buffer.from('M\0safe.js\0M\0safe.js\0'),Buffer.from([77,0,255,0])]){
  const f=fixture();
  await assert.rejects(()=>inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,expectedBase:BASE,git:args=>args[0]==='diff'?diff:f.git(args)}),/Unsupported git diff entry|Invalid git diff encoding/);
  assert.ok(!f.calls.some(x=>x[0]==='cat-file'));
 }
});

test('C36 correct blob bytes reach the analyzer, corrupted bytes never do',async()=>{
 for(const source of ['', 'const x=1;', '// Grüße 🌍\n']){
  const f=fixture({source});
  let calls=0;
  const data=await inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,expectedBase:BASE,git:f.git,ast:(file,actual)=>{
   calls++;assert.equal(actual,source);return {parsed:true,findings:[]};
  }});
  assert.equal(calls,1);
  assert.equal(snapshotPasses(data.result),true);
 }
 const f=fixture({source:'const x=1;'});
 for(const wrong of ['const x=2;','short']){
  let calls=0;
  const data=await inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,expectedBase:BASE,git:args=>args[0]==='cat-file'&&args[1]==='blob'?Buffer.from(wrong):f.git(args),ast:()=>{calls++;return {parsed:true,findings:[]};}});
  assert.equal(calls,0);
  assert.equal(data.result.rows[0].status,'error');
  assert.equal(snapshotPasses(data.result),false);
 }
});

test('snapshot rejects wrong base, missing base and extra merge parents before reading blobs',async()=>{
 for(const [expectedBase,extra] of [['d'.repeat(40),false],[undefined,false],[BASE,true]]){
  const f=fixture();
  await assert.rejects(()=>inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,expectedBase,git:args=>args[0]==='rev-list'&&extra?Buffer.from([MERGE,BASE,HEAD,'d'.repeat(40)].join(' ')+'\n'):f.git(args)}),/Invalid snapshot context|Invalid merge parent inventory|head or base mismatch/);
  assert.ok(!f.calls.some(x=>x[0]==='cat-file'));
 }
});
test('snapshot rejects a changed HEAD even after successful analysis',async()=>{
 const f=fixture();let reads=0;
 await assert.rejects(()=>inspectGitSnapshot({repo:'example/repo',number:97,expectedHead:HEAD,expectedBase:BASE,git:args=>args[0]==='rev-parse'&&args[1]==='HEAD'&&++reads===2?Buffer.from('d'.repeat(40)+'\n'):f.git(args)}),/HEAD changed/);
});
