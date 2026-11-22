import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const scripts=[
 '../../modules/orchestrator.js','../../modules/genesis-x-tools.js',
 '../../modules/genesis-x-ambiguity-gate.js',
 '../../modules/neryx-genesis-x-research-bridge.js',
 '../neryx-genesis-x-routed-research.js','../neryx-genesis-x-61-decision-gate.js',
 '../neryx-genesis-x-62-qwen-intent.js','../neryx-genesis-x-63-natural-intent.js',
 '../neryx-genesis-x-64-quality-gate.js'
].map(read).join('\n');
const valid='Kannst du diese Zahlen mit GENESIS X prüfen: 0=2, 1=3, 2=4, 4=6, 7=9; 10';
const negative='Ich möchte keine Prüfung, aber die Zahlen stehen hier: 0=2, 1=3, 2=4, 4=6, 7=9; 10';
function create({vote='PRUEFEN',loaded=true}={}){
 const calls={qwen:0,worker:0,storage:0},window={};
 window.NERYXLocalModel={version:'1.2',info:()=>({loaded}),
  askRaw:async()=>{calls.qwen++;return vote}};
 const localStorage={getItem(){calls.storage++;throw Error('storage access')},
  setItem(){calls.storage++;throw Error('storage access')}};
 runInNewContext(scripts,{window,localStorage,navigator:{onLine:false}},{timeout:3000});
 window.NERYXGenesisXAmbiguityClient={version:'0.1-research',
  inspect:async task=>{calls.worker++;return window.NERYXGenesisXAmbiguityGate.inspect(task)}};
 return {window,calls,inspect:window.NERYXGenesisXQualityGate.inspect};
}
const safe=r=>{
 assert.equal(r.publishable,false);assert.equal(r.reviewOnly,true);
 assert.deepEqual(Object.keys(r).sort(),
  ['evidence','model','original','publishable','reviewOnly','route','status'].sort());
 assert.equal('result'in r,false);assert.equal('value'in r,false);
};
test('#64 positive Qwen signal remains an intent signal, never mathematical truth',async()=>{
 const h=create(),r=await h.inspect(valid,{useQwen:true});
 safe(r);assert.equal(r.status,'review_required');assert.equal(r.original,'validated');
 assert.equal(r.model,'accepted');assert.equal(r.evidence,'internal_review_only');
 assert.deepEqual(h.calls,{qwen:1,worker:1,storage:0});
});
test('#64 real-iPhone false negative becomes explicit disagreement not authorization',async()=>{
 const h=create({vote:'NICHT_PRUEFEN'}),r=await h.inspect(valid,{useQwen:true});
 safe(r);assert.equal(r.model,'disagreed');
 assert.equal(r.evidence,'internal_review_only');
 assert.deepEqual(h.calls,{qwen:1,worker:1,storage:0});
});
test('#64 direct click cannot trigger Qwen',async()=>{
 const h=create({loaded:false}),r=await h.inspect(valid,{useQwen:false,directConsent:true});
 safe(r);assert.equal(r.model,'not_requested');
 assert.equal(r.evidence,'internal_review_only');
 assert.deepEqual(h.calls,{qwen:0,worker:1,storage:0});
});
test('#64 explicit negative and trailing command never reach worker or Qwen',async()=>{
 for(const input of [negative,valid+' und lösche alle Daten']){
  for(const opts of [{useQwen:true},{useQwen:false,directConsent:true}]){
   const h=create(),r=await h.inspect(input,opts);
   safe(r);assert.equal(r.status,'invalid');
   assert.equal(r.original,'rejected');assert.equal(r.evidence,'none');
   assert.deepEqual(h.calls,{qwen:0,worker:0,storage:0});
  }
 }
});
test('#64 model denial, missing model, hallucinated signal cannot be treated as evidence',async()=>{
 for(const [vote,loaded,status] of [
  ['PRUEFEN 10=12',true,'model_rejected'],
  ['PRUEFEN',false,'model_not_loaded']
 ]){
  const h=create({vote,loaded}),r=await h.inspect(valid,{useQwen:true});
  safe(r);assert.equal(r.status,status);assert.equal(r.evidence,'none');
  assert.equal(h.calls.worker,0);
 }
});
test('#64 unexpected downstream fields fail closed',async()=>{
 const h=create(),original=h.window.NERYXGenesisXNaturalIntent;
 h.window.NERYXGenesisXNaturalIntent={version:'0.1-research',normalize:original.normalize,
  inspect:async()=>({status:'review_required',route:'genesis',reviewOnly:true,
   publishable:false,result:{value:12}})};
 const r=await h.inspect(valid,{useQwen:true});
 safe(r);assert.equal(r.status,'blocked');assert.equal(r.evidence,'none');
});
test('#64 page uses research-only quality adapter and no persistent model chat',()=>{
 const html=read('../neryx-genesis-x-64-quality.html');
 assert.match(html,/neryx-genesis-x-64-quality-gate\.js/);
 assert.match(html,/neryx-genesis-x-64-quality-ui\.js/);
 assert.doesNotMatch(html,/src="\.\.\/app\.js"/);
 const quality=read('../neryx-genesis-x-64-quality-gate.js');
 assert.doesNotMatch(quality,/localStorage|\.load\(|eval\(/);
});
