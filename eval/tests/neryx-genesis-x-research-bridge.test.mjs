import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const makeTask=()=>({
 training:[0,1,2].map(x=>({x,y:x+2})),
 validation:[4,7].map(x=>({x,y:x+2})),
 probes:[10,-10]
});
function load(inspect){
 const window={NERYXGenesisXAmbiguityClient:{version:'0.1-research',inspect}};
 const forbidden=()=>{throw Error('Side effect prohibited')};
 const ctx={window,fetch:forbidden,localStorage:{setItem:forbidden,getItem:forbidden},
  document:{getElementById:forbidden}};
 runInNewContext(readFileSync(new URL('../../modules/neryx-genesis-x-research-bridge.js',import.meta.url),'utf8'),
  ctx,{timeout:1500});
 return window.NERYXGenesisXResearchBridge;
}
const request=task=>({version:1,kind:'research_check',task});
const fail=status=>({status,publishable:false});
test('valid research requests are copied, validated and returned review-only',async()=>{
 let received;
 const bridge=load(async task=>{
  received=task;
  return {status:'ambiguous',publishable:false,candidates:21,
   distinctProbeBehaviors:8,checkedProbes:2};
 });
 const input=makeTask();
 const out=await bridge.review(request(input));
 assert.equal(out.status,'ambiguous');
 assert.equal(out.publishable,false);
 assert.equal(out.reviewOnly,true);
 assert.equal(out.competingPrograms,21);
 assert.equal(out.distinctBehaviors,8);
 assert.equal(out.program,undefined);
 assert.equal(out.predictions,undefined);
 assert.deepEqual(JSON.parse(JSON.stringify(received)),input);
 assert.notEqual(received,input);
 assert.equal(Object.isFrozen(out),true);
});
test('internal review_required remains nonpublishable and never proves correctness',async()=>{
 const bridge=load(async()=>({
  status:'review_required',publishable:false,candidates:2,
  distinctProbeBehaviors:1,checkedProbes:2
 }));
 const out=await bridge.review(request(makeTask()));
 assert.equal(out.status,'review_required');
 assert.equal(out.publishable,false);
 assert.equal(out.reviewOnly,true);
 assert.equal(out.correct,undefined);
});
test('invalid request schemas are rejected before touching worker',async()=>{
 let invoked=0;
 const bridge=load(async()=>{invoked++;return fail('blocked');});
 const basic=makeTask();
 const malformed=[
  null,{},request(null),
  {...request(basic),version:2},
  {...request(basic),kind:'chat_answer'},
  {...request(basic),extra:1},
  request({...basic,training:[...basic.training,{x:0,y:2}]}),
  request({...basic,probes:[0]}),
  request({...basic,probes:[NaN]}),
  request({...basic,probes:[10,10]}),
  request({...basic,training:[{x:0,y:2,answer:'unsafe'},...basic.training.slice(1)]}),
  request({...basic,validation:basic.validation.map((r,i)=>i?{...r}:{...r,y:Infinity})}),
  request({...basic,probes:Array(2)})
 ];
 for(const input of malformed){
  const out=await bridge.review(input);
  assert.equal(out.status,'invalid');
  assert.equal(out.publishable,false);
  assert.equal(out.reviewOnly,true);
 }
 assert.equal(invoked,0);
});
test('missing client, bad data, extra claims and exceptions fail closed',async()=>{
 for(const worker of [
  ()=>({status:'review_required',publishable:true,candidates:1,distinctProbeBehaviors:1,checkedProbes:2}),
  ()=>({status:'approved',publishable:false}),
  ()=>({status:'ambiguous',publishable:false,candidates:1,distinctProbeBehaviors:1,checkedProbes:2}),
  ()=>({status:'review_required',publishable:false,candidates:1,distinctProbeBehaviors:1,checkedProbes:1}),
  ()=>({status:'blocked',publishable:false,answer:5}),
  ()=>{throw Error('broken');}
 ]){
  const out=await load(worker).review(request(makeTask()));
  assert.equal(out.status,'blocked');
  assert.equal(out.publishable,false);
  assert.equal(out.reviewOnly,true);
 }
 const unavailable=load(null);
 assert.equal((await unavailable.review(request(makeTask()))).status,'unavailable');
});
test('bridge exports only typed review API, no chat or storage integration',()=>{
 const bridge=load(()=>fail('blocked'));
 assert.equal(bridge.version,'0.1-research');
 assert.deepEqual(Object.keys(bridge),['version','review']);
 for(const name of ['send','save','publish','appendMessage','writeChat','executeCode'])
  assert.equal(bridge[name],undefined);
 assert.equal(Object.isFrozen(bridge),true);
});
