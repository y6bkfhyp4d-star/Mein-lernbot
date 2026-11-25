import test from 'node:test';
import assert from 'node:assert/strict';
import {createSandboxParsers,validateSandboxStage} from '../../.github/scripts/neryx-sandbox.mjs';
import {tmpdir} from 'node:os';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync,linkSync} from 'node:fs';
import {join} from 'node:path';
function stageFor(t){
 const stage=mkdtempSync(join(tmpdir(),'neryx-stage-'));
 t.after(()=>rmSync(stage,{recursive:true,force:true}));
 mkdirSync(join(stage,'node_modules/acorn/dist'),{recursive:true});
 for(const file of ['neryx-python-syntax.py','neryx-yaml-syntax.rb','analyzer.mjs','codebrain-worker.mjs','node_modules/acorn/package.json','node_modules/acorn/dist/acorn.mjs','node_modules/acorn/dist/acorn.js'])writeFileSync(join(stage,file),'synthetic',{mode:0o644});
 return stage;
}
test('candidate sandbox uses fixed restrictions and cleans up after success',t=>{
 const calls=[];
 const p=createSandboxParsers({stage:stageFor(t),invoke:(args,input,timeout,max)=>{calls.push({args,input,timeout,max});return Buffer.from('{"parsed":true,"line":null}');}});
 assert.deepEqual(p.pythonSyntax('x=1'),{parsed:true,line:null});
 assert.equal(calls.length,2);
 const a=calls[0].args;
 for(const flag of ['--network','none','--read-only','--cap-drop','ALL','--pull','never','--user','65534:65534'])assert.ok(a.includes(flag));
 assert.deepEqual(calls[1].args,['rm','-f',a[a.indexOf('--name')+1]]);
 assert.equal(calls[0].input,'x=1');
});
test('candidate sandbox rejects failures, invalid results and cleanup errors without fallback',t=>{
 for(const mode of ['run','invalid','cleanup']){
  let calls=0;
  const p=createSandboxParsers({stage:stageFor(t),invoke:args=>{calls++;if(mode==='run'&&args[0]==='run'||mode==='cleanup'&&args[0]==='rm')throw Error('synthetic');return Buffer.from(mode==='invalid'?'{"parsed":false,"line":0}':'{"parsed":true,"line":null}');}});
  assert.throws(()=>p.yamlSyntax('x: 1'),/Sandbox parser or cleanup failed/);
  assert.equal(calls,2);
 }
});

test('stage rejects extra files, symlinks, hardlinks and missing required files',t=>{
 const stage=stageFor(t);
 assert.equal(validateSandboxStage(stage),stage);
 const extra=join(stage,'unexpected.txt');
 writeFileSync(extra,'synthetic');
 assert.throws(()=>validateSandboxStage(stage),/Invalid sandbox stage/);
 rmSync(extra);
 const optional=join(stage,'node_modules/acorn/README.md');
 symlinkSync(join(stage,'analyzer.mjs'),optional);
 assert.throws(()=>validateSandboxStage(stage),/Invalid sandbox stage/);
 rmSync(optional);
 linkSync(join(stage,'analyzer.mjs'),optional);
 assert.throws(()=>validateSandboxStage(stage),/Invalid sandbox stage/);
 rmSync(optional);
 rmSync(join(stage,'analyzer.mjs'));
 assert.throws(()=>validateSandboxStage(stage),/Invalid sandbox stage/);
});
test('stage is checked again before each container invocation',t=>{
 const stage=stageFor(t);
 const calls=[];
 const p=createSandboxParsers({stage,invoke:args=>{calls.push(args[0]);return Buffer.from('{"parsed":true,"line":null}');}});
 writeFileSync(join(stage,'unexpected.txt'),'synthetic');
 assert.throws(()=>p.pythonSyntax('x=1'),/Sandbox parser or cleanup failed/);
 assert.deepEqual(calls,['rm']);
});
