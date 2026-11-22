import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {compareGitFindings} from '../git-finding-diff.mjs';

const git=(root,...args)=>execFileSync('git',args,{
  cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']
}).trim();
const hash=x=>createHash('sha256').update(x).digest('hex');
function fixture(run){
  const root=mkdtempSync(join(tmpdir(),'genesis-git-diff-'));
  try{
    git(root,'init','--quiet');
    git(root,'config','user.name','GENESIS test');
    git(root,'config','user.email','test@example.invalid');
    mkdirSync(join(root,'modules'));
    const file=join(root,'modules','sample.js');
    const first='eval(1);\nconst x=1;\n';
    writeFileSync(file,first);
    git(root,'add','--','modules/sample.js');
    git(root,'commit','-qm','base');
    const baseSha=git(root,'rev-parse','HEAD');
    const second='\neval(1);\nconst x=1;\ndocument.write(2);\n';
    writeFileSync(file,second);
    git(root,'add','--','modules/sample.js');
    git(root,'commit','-qm','head');
    const headSha=git(root,'rev-parse','HEAD');
    return run({root,file,first,second,baseSha,headSha});
  }finally{rmSync(root,{recursive:true,force:true});}
}
test('git finding diff: reads committed blobs and preserves working tree',()=>fixture(x=>{
  const dirty='// not committed\n';
  writeFileSync(x.file,dirty);
  const beforeStatus=git(x.root,'status','--porcelain');
  const first=compareGitFindings({
    root:x.root,baseSha:x.baseSha,headSha:x.headSha,files:['modules/sample.js']
  });
  const second=compareGitFindings({
    root:x.root,baseSha:x.baseSha,headSha:x.headSha,files:['modules/sample.js']
  });
  assert.deepEqual(first,second);
  assert.equal(first.mode,'read-only');
  assert.equal(first.changesApplied,false);
  assert.equal(first.summary.unchanged,1);
  assert.equal(first.summary.added,1);
  assert.equal(first.summary.removed,0);
  assert.equal(first.files[0].base.sha256,hash(x.first));
  assert.equal(first.files[0].head.sha256,hash(x.second));
  assert.equal(first.files[0].unchanged[0].before.line,1);
  assert.equal(first.files[0].unchanged[0].after.line,2);
  assert.equal(readFileSync(x.file,'utf8'),dirty);
  assert.equal(git(x.root,'status','--porcelain'),beforeStatus);
}));
test('git finding diff: reverses changes without inventing unchanged issues',()=>fixture(x=>{
  const report=compareGitFindings({
    root:x.root,baseSha:x.headSha,headSha:x.baseSha,files:['modules/sample.js']
  });
  assert.equal(report.summary.removed,1);
  assert.equal(report.summary.added,0);
  assert.equal(report.summary.unchanged,1);
}));
test('git finding diff: rejects invalid sha, unsafe paths and missing blobs',()=>fixture(x=>{
  const make=(overrides={})=>compareGitFindings({
    root:x.root,baseSha:x.baseSha,headSha:x.headSha,
    files:['modules/sample.js'],...overrides
  });
  for(const sha of ['HEAD','x'.repeat(40),'a'.repeat(39)])
    assert.throws(()=>make({baseSha:sha}));
  for(const file of ['../escape.js','/etc/hosts','a\\b.js','modules/../sample.js','x.txt'])
    assert.throws(()=>make({files:[file]}));
  assert.throws(()=>make({files:['missing.js']}));
  assert.throws(()=>make({files:['modules/sample.js','modules/sample.js']}));
}));
test('git finding diff: does not evaluate committed JavaScript',()=>fixture(x=>{
  globalThis.__genesisGitProbe=0;
  const result=compareGitFindings({
    root:x.root,baseSha:x.baseSha,headSha:x.headSha,files:['modules/sample.js']
  });
  assert.equal(result.repository.files,1);
  assert.equal(globalThis.__genesisGitProbe,0);
  delete globalThis.__genesisGitProbe;
}));
