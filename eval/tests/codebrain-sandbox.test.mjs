import test from 'node:test';
import assert from 'node:assert/strict';
import {createSandboxParsers} from '../../.github/scripts/neryx-sandbox.mjs';
import {tmpdir} from 'node:os';
test('candidate sandbox uses fixed restrictions and cleans up after success',()=>{
 const calls=[];
 const p=createSandboxParsers({stage:tmpdir(),invoke:(args,input,timeout,max)=>{calls.push({args,input,timeout,max});return Buffer.from('{"parsed":true,"line":null}');}});
 assert.deepEqual(p.pythonSyntax('x=1'),{parsed:true,line:null});
 assert.equal(calls.length,2);
 const a=calls[0].args;
 for(const flag of ['--network','none','--read-only','--cap-drop','ALL','--pull','never','--user','65534:65534'])assert.ok(a.includes(flag));
 assert.deepEqual(calls[1].args,['rm','-f',a[a.indexOf('--name')+1]]);
 assert.equal(calls[0].input,'x=1');
});
test('candidate sandbox rejects failures, invalid results and cleanup errors without fallback',()=>{
 for(const mode of ['run','invalid','cleanup']){
  let calls=0;
  const p=createSandboxParsers({stage:tmpdir(),invoke:args=>{calls++;if(mode==='run'&&args[0]==='run'||mode==='cleanup'&&args[0]==='rm')throw Error('synthetic');return Buffer.from(mode==='invalid'?'{"parsed":false,"line":0}':'{"parsed":true,"line":null}');}});
  assert.throws(()=>p.yamlSyntax('x: 1'),/Sandbox parser or cleanup failed/);
  assert.equal(calls,2);
 }
});
