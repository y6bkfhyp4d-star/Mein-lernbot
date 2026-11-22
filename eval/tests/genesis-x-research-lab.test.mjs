import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const files=['genesis-x.js','genesis-x-tools.js','genesis-x-logic.js',
 'genesis-x-router.js','genesis-x-chain.js','genesis-x-verifier.js',
 'genesis-x-verified-chain.js','genesis-x-diagnostics.js',
 'genesis-x-research.js','genesis-x-research-lab.js'];
function lab(skipped=[]){
 const window={};
 const forbid=()=>{throw Error('No external side effects permitted');};
 const context={window,fetch:forbid,eval:forbid,
 localStorage:{getItem:forbid,setItem:forbid},document:{getElementById:forbid}};
 for(const f of files.filter(name=>!skipped.includes(name))){
  runInNewContext(readFileSync(new URL('../../modules/'+f,import.meta.url),'utf8'),context,{timeout:1500});
 }
 return window;
}
const numeric={training:[{x:0,y:2},{x:1,y:3},{x:2,y:4}],
 validation:[{x:4,y:6},{x:7,y:9}]};
const logic={training:[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]].map(([a,b])=>({a,b,expected:a>b})),
 validation:[[8,2],[-2,0],[4,4]].map(([a,b])=>({a,b,expected:a>b}))};
const task={numeric,logic,cases:[{x:3,b:4},{x:0,b:5}]};
const audit={program:[{op:'add',c:2}],
 rule:{kind:'atom',field:'a',op:'gt',target:'field',other:'b'},
 cases:task.cases,claims:[{value:5,decision:true},{value:2,decision:false}]};
test('all nine research stages register in the facade',()=>{
 const x=lab().NERYXGenesisXResearchLab;
 assert.equal(x.version,'1.0');assert.equal(x.modes.length,9);
 assert.equal(x.capabilities().filter(c=>c.available).length,9);
});
test('strategy, numeric, and logic research modes route correctly',()=>{
 const x=lab().NERYXGenesisXResearchLab;
 assert.equal(x.run({mode:'strategy',input:{training:[
  {x:0,y:1},{x:1,y:4},{x:2,y:9},{x:3,y:16}],
  holdout:[{x:4,y:25},{x:5,y:36}]}}).status,'candidate');
 assert.equal(x.run({mode:'numeric',input:{...numeric,holdout:numeric.validation}}).status,'candidate');
 assert.equal(x.run({mode:'logic',input:logic}).status,'candidate');
});
test('router, chain, verifier and checked chain work through same interface',()=>{
 const x=lab().NERYXGenesisXResearchLab;
 assert.equal(x.run({mode:'routing',input:{...numeric,type:'numeric'}}).status,'candidate');
 const chain=x.run({mode:'chain',input:task});
 assert.equal(chain.status,'exploration_only');
 assert.equal(chain.candidateStatus,'candidate');
 assert.equal(chain.publishable,false);
 assert.equal(chain.report,undefined);
 assert.equal(x.run({mode:'audit',input:audit}).status,'execution_matched');
 assert.equal(x.run({mode:'checked',input:task}).status,'execution_checked');
});
test('diagnosis returns no change for verified experimental task',()=>{
 const x=lab().NERYXGenesisXResearchLab;
 assert.equal(x.run({mode:'diagnosis',input:task}).status,'no_change');
});
test('research mode reports no change when no improvement is needed',()=>{
 const x=lab().NERYXGenesisXResearchLab;
 const result=x.run({mode:'research',input:{task,audit:[
  {x:10,b:8,truth:{value:12,decision:true}},
  {x:11,b:19,truth:{value:13,decision:false}},
  {x:12,b:7,truth:{value:14,decision:true}}
 ]}});
 assert.equal(result.status,'no_change');
});
test('unknown mode and malformed input fail closed',()=>{
 const x=lab().NERYXGenesisXResearchLab;
 for(const arg of [{mode:'execute',input:{}},{mode:'numeric'},{mode:'logic',input:null},null,{}])
  assert.equal(x.run(arg).status,'invalid');
});
test('missing module and wrong version are unavailable',()=>{
 const w=lab(['genesis-x-logic.js']);
 assert.equal(w.NERYXGenesisXResearchLab.run({mode:'logic',input:logic}).status,'unavailable');
 w.NERYXGenesisXTools={version:'wrong',compose(){return {status:'candidate'}}};
 assert.equal(w.NERYXGenesisXResearchLab.run({mode:'numeric',input:numeric}).status,'unavailable');
});
test('fabricated status and thrown errors are blocked',()=>{
 const w=lab(),x=w.NERYXGenesisXResearchLab;
 w.NERYXGenesisXTools={version:'0.2',compose(){return {status:'perfect'}}};
 assert.equal(x.run({mode:'numeric',input:numeric}).status,'blocked');
 w.NERYXGenesisXTools={version:'0.2',compose(){throw Error('boom')}};
 assert.equal(x.run({mode:'numeric',input:numeric}).status,'blocked');
});
test('facade is frozen and has no install, storage, network or eval API',()=>{
 const x=lab().NERYXGenesisXResearchLab;
 assert.equal(Object.isFrozen(x),true);assert.equal(Object.isFrozen(x.modes),true);
 assert.equal(x.install,undefined);assert.equal(x.save,undefined);
 assert.equal(x.executeCode,undefined);
});
