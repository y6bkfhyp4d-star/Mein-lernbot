import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const files=['genesis-x.js','genesis-x-tools.js','genesis-x-logic.js','genesis-x-router.js',
'genesis-x-chain.js','genesis-x-verifier.js','genesis-x-verified-chain.js',
'genesis-x-diagnostics.js','genesis-x-research.js','genesis-x-research-lab.js','genesis-x-integration-preview.js'];
function lab(skip=[]){
 const window={},deny=()=>{throw Error('Forbidden external effect');};
 const ctx={window,fetch:deny,eval:deny,localStorage:{getItem:deny,setItem:deny},
 document:{getElementById:deny}};
 for(const file of files.filter(x=>!skip.includes(x)))
  runInNewContext(readFileSync(new URL('../../modules/'+file,import.meta.url),'utf8'),ctx,{timeout:1500});
 return window;
}
function task(){
 return {numeric:{training:[0,1,2].map(x=>({x,y:x+2})),validation:[4,7].map(x=>({x,y:x+2})),maxSteps:1},
 logic:{training:[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]].map(([a,b])=>({a,b,expected:a>b})),
 validation:[[8,2],[-2,0],[4,4]].map(([a,b])=>({a,b,expected:a>b}))},
 cases:[{x:3,b:4},{x:8,b:20}]};
}
test('PREVIEW: genuine checked engine yields review-only counts, never case predictions',()=>{
 const w=lab(),r=w.NERYXGenesisXIntegrationPreview.preview(task());
 assert.equal(r.status,'review_required');assert.equal(r.publishable,false);
 assert.equal(r.checkedCases,2);assert.equal(r.referenceCases,0);
 assert.equal(r.allReferencesMatched,false);assert.equal(Object.isFrozen(r),true);
 for(const field of ['cases','report','program','rule','predictions','answer','values','audit'])
  assert.equal(r[field],undefined,field+' must not escape the preview boundary');
 assert.equal(w.NERYXGenesisXIntegrationPreview.publish,undefined);
 assert.equal(w.NERYXGenesisXIntegrationPreview.install,undefined);
});
test('PREVIEW: correct externally supplied reference labels remain review-only',()=>{
 const w=lab(),t=task();
 t.cases[0].truth={value:5,decision:true};t.cases[1].truth={value:10,decision:false};
 const r=w.NERYXGenesisXIntegrationPreview.preview(t);
 assert.equal(r.status,'review_required');assert.equal(r.referenceCases,2);
 assert.equal(r.allReferencesMatched,true);assert.equal(r.publishable,false);
 assert.equal(r.cases,undefined);
});
test('PREVIEW: false external reference blocks result and never reveals cases',()=>{
 const w=lab(),t=task();t.cases[0].truth={value:999,decision:true};
 const r=w.NERYXGenesisXIntegrationPreview.preview(t);
 assert.equal(r.status,'blocked');assert.equal(r.publishable,false);
 assert.equal(r.cases,undefined);
});
test('PREVIEW: invalid, sparse, and malformed cases reject without throwing',()=>{
 const w=lab(),p=w.NERYXGenesisXIntegrationPreview;
 for(const t of [null,undefined,{},[],{...task(),cases:[]},
 {...task(),cases:[,{x:8,b:20}]},{...task(),cases:[{x:Infinity,b:4}]}]){
  assert.doesNotThrow(()=>assert.equal(p.preview(t).status,'invalid'));
 }
});
test('PREVIEW: missing facade is unavailable',()=>{
 const w=lab(['genesis-x-research-lab.js']);
 assert.equal(w.NERYXGenesisXIntegrationPreview.preview(task()).status,'unavailable');
});
test('PREVIEW: invented verified status from facade does not certify execution',()=>{
 const w=lab(),t=task();
 w.NERYXGenesisXResearchLab={version:'1.0',run:()=>({status:'execution_checked',
 mode:'checked',publishable:false,report:{cases:[],audit:{checked:2,references:0,status:'execution_matched'}}})};
 const r=w.NERYXGenesisXIntegrationPreview.preview(t);
 assert.equal(r.status,'blocked');assert.equal(r.publishable,false);
});
test('PREVIEW: fabricated extra or malformed claims are rejected',()=>{
 for(const variant of ['missing','wrongCount','wrongReference','invented']){
  const w=lab(),t=task();
  const cases=t.cases.map(c=>({x:c.x,b:c.b,value:c.x+2,decision:c.x+2>c.b}));
  if(variant==='missing')cases.pop();
  if(variant==='invented')cases[0].value=Infinity;
  const audit={status:variant==='wrongReference'?'reference_matched':'execution_matched',
    checked:variant==='wrongCount'?1:2,references:variant==='wrongReference'?0:0};
  w.NERYXGenesisXResearchLab={version:'1.0',run:()=>({status:'execution_checked',
  mode:'checked',publishable:false,report:{cases,audit}})};
  assert.equal(w.NERYXGenesisXIntegrationPreview.preview(t).status,'blocked',variant);
 }
});
test('PREVIEW: direct core access is explicitly outside the preview boundary',()=>{
 const w=lab();
 assert.equal(w.NERYXGenesisXChain.solve(task()).status,'candidate');
 assert.equal(w.NERYXGenesisXIntegrationPreview.preview(task()).status,'review_required');
});
