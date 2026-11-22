import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateFindingHoldout,evaluateFindingHoldout} from '../evaluate-finding-holdout.mjs';

const cli=fileURLToPath(new URL('../evaluate-finding-holdout.mjs',import.meta.url));
const sha=s=>createHash('sha256').update(s).digest('hex');
const corpus={schema:1,purpose:'AST-rule-detection',cases:[
  {id:'danger',expected:'AST001',source:'eval(userInput)'},
  {id:'safe',expected:null,source:'const x=1;'}
]};
const raw=JSON.stringify(corpus),pin=sha(raw);
const evaluate=(input=corpus,opts={})=>evaluateFindingHoldout(input,{
  expectedSha256:pin,actualSha256:pin,minPositive:1,minNegative:1,...opts
});
const temp=fn=>{
  const dir=mkdtempSync(join(tmpdir(),'genesis-holdout-'));
  try{return fn(dir);}finally{rmSync(dir,{recursive:true,force:true});}
};
test('external finding holdout: strict rule metrics, complete and passing',()=>{
  const r=evaluate();
  assert.deepEqual(r.counts,{TP:1,FP:0,TN:1,FN:0});
  assert.equal(r.recall,1);
  assert.equal(r.falsePositiveRate,0);
  assert.equal(r.pass,true);
  assert.equal(r.complete,true);
  assert.equal(r.corpusSha256,pin);
});
test('external finding holdout: reject tampered or missing SHA pins',()=>{
  assert.throws(()=>evaluate(corpus,{expectedSha256:'a'.repeat(64)}));
  assert.throws(()=>evaluate(corpus,{expectedSha256:undefined,actualSha256:'bad'}));
});
test('external finding holdout: detects missed rule, false positive, and rejects thresholds',()=>{
  const altered={...corpus,cases:[
    {id:'a',expected:'AST002',source:'const x=1;'},
    {id:'b',expected:null,source:'eval(1);'}
  ]};
  const r=evaluate(altered);
  assert.deepEqual(r.counts,{TP:0,FP:1,TN:0,FN:1});
  assert.equal(r.pass,false);
  assert.deepEqual(r.missed.map(x=>x.id),['a']);
  assert.deepEqual(r.unexpected.map(x=>x.id),['b']);
  assert.throws(()=>evaluate(corpus,{minRecall:1.1}));
});
test('external finding holdout: invalid schema, bad labels or duplicates rejected',()=>{
  for(const value of [
    {...corpus,schema:2},
    {...corpus,cases:[corpus.cases[0],corpus.cases[0]]},
    {...corpus,cases:[{...corpus.cases[0],expected:'eligible'},corpus.cases[1]]},
    {...corpus,cases:[{...corpus.cases[0],extra:1},corpus.cases[1]]},
    {...corpus,cases:[corpus.cases[0]]}
  ])assert.throws(()=>validateFindingHoldout(value));
});
test('external finding holdout: minimum sample sizes fail closed',()=>{
  const r=evaluate(corpus,{minPositive:29,minNegative:59});
  assert.equal(r.sampleSizeMet,false);
  assert.equal(r.pass,false);
});
test('external finding holdout CLI: pinned small corpus does not falsely pass default sample minimum',()=>temp(dir=>{
  const file=join(dir,'holdout.json');
  writeFileSync(file,raw);
  const call=(hash)=>spawnSync(process.execPath,[cli,file,'--expect-sha256',hash],{
    encoding:'utf8',timeout:12000,maxBuffer:1024*1024
  });
  const first=call(pin),second=call(pin);
  assert.equal(first.status,2,first.stderr);
  assert.equal(first.stdout,second.stdout);
  const report=JSON.parse(first.stdout);
  assert.equal(report.sampleSizeMet,false);
  assert.equal(report.pass,false);
  const rejected=call('0'.repeat(64));
  assert.equal(rejected.status,2);
  assert.equal(rejected.stdout,'');
  assert.match(rejected.stderr,/mismatched sealed SHA-256/);
}));
test('external finding holdout: never executes the supplied code',()=>{
  globalThis.__holdoutProbe=0;
  const input={schema:1,purpose:'AST-rule-detection',cases:[
    {id:'a',expected:'AST001',source:'eval(globalThis.__holdoutProbe=99);'},
    {id:'b',expected:null,source:'const x=1;'}
  ]};
  evaluate(input);
  assert.equal(globalThis.__holdoutProbe,0);
  delete globalThis.__holdoutProbe;
});

test('external holdout: records exact local analyzer fingerprints and pinned runtime versions',()=>{
  const a=evaluate(),b=evaluate();
  assert.deepEqual(a.evaluator,b.evaluator);
  assert.equal(a.evaluator.nodeVersion,process.version);
  assert.equal(a.evaluator.pinnedAcornVersion,'8.15.0');
  for(const file of ['analyzer.mjs','finding-report.mjs',
    'evaluate-finding-holdout.mjs','package.json']){
    const bytes=readFileSync(new URL('../'+file,import.meta.url));
    assert.equal(a.evaluator.componentSha256[file],sha(bytes));
  }
});
