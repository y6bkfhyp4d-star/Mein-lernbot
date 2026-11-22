// End-to-end CLI checks for the read-only external benchmark path.
// Uses OS temporary files; never executes fixture code or writes into the repository.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const cli=fileURLToPath(new URL('../evaluate-external.mjs',import.meta.url));
const repoFile=fileURLToPath(new URL('../package.json',import.meta.url));
const execute=file=>spawnSync(process.execPath,[cli,file],{encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
const withTemp=(action)=>{
  const dir=mkdtempSync(join(tmpdir(),'genesis-x-cli-'));
  try{return action(dir);}finally{rmSync(dir,{recursive:true,force:true});}
};
test('external CLI: reads independent path and emits reproducible SHA-256',()=>withTemp(dir=>{
  const file=join(dir,'corpus.json');
  const corpus={schema:1,cases:[
    {id:'good',expected:'eligible',source:'function identity(x){return x;}'},
    {id:'review',expected:'review',source:'function context(){return this.value;}'}
  ]};
  const raw=JSON.stringify(corpus);
  writeFileSync(file,raw,'utf8');
  const first=execute(file);
  const second=execute(file);
  assert.equal(first.status,0,first.stderr);
  assert.equal(second.status,0,second.stderr);
  const actual=JSON.parse(first.stdout);
  assert.deepEqual(actual,JSON.parse(second.stdout));
  assert.equal(actual.corpusSha256,createHash('sha256').update(raw).digest('hex'));
  assert.equal(actual.complete,true);
  assert.equal(actual.submitted,2);
  assert.equal(actual.evaluated,2);
  assert.equal(actual.excluded,0);
  assert.deepEqual(actual.confusion,{TP:1,FP:0,TN:1,FN:0});
  assert.equal(actual.accuracy,1);
  assert.ok(!first.stdout.includes('function identity'));
}));
test('external CLI: invalid parse is excluded and results in nonzero exit',()=>withTemp(dir=>{
  const file=join(dir,'bad.json');
  writeFileSync(file,JSON.stringify({schema:1,cases:[
    {id:'invalid',expected:'review',source:'function unfinished( {'}
  ]}));
  const result=execute(file);
  assert.equal(result.status,2,result.stderr);
  const report=JSON.parse(result.stdout);
  assert.equal(report.complete,false);
  assert.equal(report.evaluated,0);
  assert.equal(report.excluded,1);
  assert.equal(report.accuracy,null);
  assert.deepEqual(report.errors,[{id:'invalid',reason:'parse-error'}]);
}));
test('external CLI: refuses corpus inside repository',()=>{
  const result=execute(repoFile);
  assert.equal(result.status,2);
  assert.equal(result.stdout,'');
  assert.match(result.stderr,/outside the repository/);
});
test('external CLI: refuses relative corpus path',()=>{
  const result=execute('relative-input.json');
  assert.equal(result.status,2);
  assert.equal(result.stdout,'');
  assert.match(result.stderr,/absolute corpus path/);
});
test('external CLI: refuses malformed JSON',()=>withTemp(dir=>{
  const file=join(dir,'malformed.json');
  writeFileSync(file,'{bad json');
  const result=execute(file);
  assert.equal(result.status,2);
  assert.equal(result.stdout,'');
  assert.match(result.stderr,/external evaluation failed/);
}));

test('Claude audit B4: CLI reached through symlink emits a real report',()=>withTemp(dir=>{
  const wrapper=join(dir,'genesis-alias.mjs');
  const file=join(dir,'corpus.json');
  symlinkSync(cli,wrapper);
  writeFileSync(file,JSON.stringify({schema:1,cases:[
    {id:'ok',expected:'eligible',source:'function identity(x){return x;}'}
  ]}));
  const result=spawnSync(process.execPath,[wrapper,file],{
    encoding:'utf8',timeout:15000,maxBuffer:1024*1024
  });
  assert.equal(result.status,0,result.stderr);
  assert.notEqual(result.stdout.trim(),'');
  const report=JSON.parse(result.stdout);
  assert.equal(report.evaluated,1);
  assert.equal(report.complete,true);
  assert.deepEqual(report.confusion,{TP:1,FP:0,TN:0,FN:0});
}));
