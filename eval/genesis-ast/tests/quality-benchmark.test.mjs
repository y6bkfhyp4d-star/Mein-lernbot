// GENESIS X: pre-labelled, synthetic quality benchmark.
// This is NOT an independently assembled or secret holdout corpus.
// The analyzer never receives the expected labels, and source strings are not executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {correlateFlows} from '../flow-correlation.mjs';

const cases=[
  // "eligible" means only limited straight-line provenance, NEVER a safety verdict.
  {id:'P01',label:'eligible',source:'function identity(value){return value;}'},
  {id:'P02',label:'eligible',source:'function sum(a,b){return a+b;}'},
  {id:'P03',label:'eligible',source:'function constant(){return 7;}'},
  {id:'P04',label:'eligible',source:'function local(value){const result=value;return result;}'},
  {id:'P05',label:'eligible',source:'function arithmetic(value){let result=value+2;return result;}'},
  {id:'P06',label:'eligible',source:'function unary(value){return -value;}'},
  {id:'P07',label:'eligible',source:'function comparison(a,b){return a===b;}'},
  {id:'P08',label:'eligible',source:'function template(value){return `Result: ${value}`;}'},
  // Conservative manual review is required for context, effects and branches.
  {id:'N01',label:'review',source:'function receiver(){return this.value;}'},
  {id:'N02',label:'review',source:'function context(){return new.target;}'},
  {id:'N03',label:'review',source:'function defaulted(value=load()){return value;}'},
  {id:'N04',label:'review',source:'function destructured({value}){return value;}'},
  {id:'N05',label:'review',source:'function rest(...values){return values;}'},
  {id:'N06',label:'review',source:'function call(value){return transform(value);}'},
  {id:'N07',label:'review',source:'function construct(value){return new Date(value);}'},
  {id:'N08',label:'review',source:'function unknown(){return missingValue;}'},
  {id:'N09',label:'review',source:'function branch(x){if(x){return 1;}return 2;}'},
  {id:'N10',label:'review',source:'function loop(x){for(let i=0;i<x;i++){x=i;}return x;}'},
  {id:'N11',label:'review',source:'function whileLoop(x){while(x){x=0;}return x;}'},
  {id:'N12',label:'review',source:'function getter(obj){return obj.value;}'},
  {id:'N13',label:'review',source:'function computed(obj,key){return obj[key];}'},
  {id:'N14',label:'review',source:'function increment(x){return x++;}'},
  {id:'N15',label:'review',source:'function assignment(x){return (x=3);}'},
  {id:'N16',label:'review',source:'async function asyncValue(x){return await x;}'},
  {id:'N17',label:'review',source:'function mutable(x){return x+=2;}'}
];

test('quality benchmark: stable labels, coverage, read-only and measured confusion matrix',()=>{
  assert.equal(cases.length,25);
  assert.equal(new Set(cases.map(x=>x.id)).size,cases.length);
  const counts={TP:0,FP:0,TN:0,FN:0};
  const mistakes=[];
  for(const item of cases){
    const r=correlateFlows('benchmark.js',item.source);
    assert.equal(r.parsed,true,item.id);
    assert.equal(r.mode,'read-only',item.id);
    assert.equal(r.changesApplied,false,item.id);
    assert.equal(r.functions.length,1,item.id);
    const status=r.functions[0].status;
    assert.ok(['eligible-for-limited-report','manual-review-required'].includes(status),item.id);
    const eligible=status==='eligible-for-limited-report';
    if(item.label==='eligible')counts[eligible?'TP':'FN']++;
    else counts[eligible?'FP':'TN']++;
    if((item.label==='eligible')!==eligible)mistakes.push({id:item.id,expected:item.label,actual:status});
    if(!eligible)assert.deepEqual(r.functions[0].evidence,[],item.id);
  }
  const precision=counts.TP+counts.FP?counts.TP/(counts.TP+counts.FP):null;
  const recall=counts.TP+counts.FN?counts.TP/(counts.TP+counts.FN):null;
  const manualRecall=counts.TN+counts.FP?counts.TN/(counts.TN+counts.FP):null;
  console.log('GENESIS PHASE2 SYNTHETIC QUALITY '+JSON.stringify({
    sampleSize:cases.length,counts,precision,recall,manualRecall,mistakes,
    caveat:'Synthetic known cases; not independent holdout, no security or semantic proof'
  }));
  // Prevent falsely publishing contextual/side-effectful cases as limited provenance.
  assert.equal(counts.FP,0,'No pre-labelled manual-review case may receive evidence');
  assert.ok(counts.TP>=7,'Conservatism must not suppress all straightforward cases');
});
