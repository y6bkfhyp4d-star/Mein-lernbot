/* Adversarial public holdout audit for existing checked GENESIS X engine. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {adversarialSuites} from './genesis-x-adversarial-fixtures.mjs';
import {auditCases,reference} from './genesis-x-independent-oracle.mjs';
const scripts=['genesis-x.js','genesis-x-tools.js','genesis-x-logic.js',
 'genesis-x-router.js','genesis-x-chain.js','genesis-x-verifier.js',
 'genesis-x-verified-chain.js','genesis-x-diagnostics.js',
 'genesis-x-research.js','genesis-x-research-lab.js'];
const disallow=()=>{throw Error('No external side effects')};
const window={},context={window,fetch:disallow,eval:disallow,
 localStorage:{getItem:disallow,setItem:disallow,removeItem:disallow},
 document:{getElementById:disallow}};
for(const script of scripts)
 runInNewContext(readFileSync(new URL('../modules/'+script,import.meta.url),'utf8'),context,{timeout:2000});
const facade=window.NERYXGenesisXResearchLab;
assert.equal(facade.version,'1.0');
const logic={
 training:[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]].map(([a,b])=>({a,b,expected:a>b})),
 validation:[[8,2],[-2,0],[4,4]].map(([a,b])=>({a,b,expected:a>b}))
};
const totals={checked:0,matched:0,mismatched:0,valueMatches:0,decisionMatches:0};
const suiteSummaries=[];
let challengeFailures=0;
for(const suite of adversarialSuites){
 const cases=suite.cases.map(({x,b})=>({x,b}));
 assert.ok(cases.every(row=>Object.keys(row).sort().join(',')==='b,x'));
 const task={numeric:{training:suite.numericTraining.map(p=>({...p})),
  validation:suite.numericValidation.map(p=>({...p})),maxSteps:1},
  logic,cases};
 const result=facade.run({mode:'checked',input:task});
 if(result.status!=='execution_checked'||result.publishable!==false||
    !result.report||!Array.isArray(result.report.cases)){
  challengeFailures++;
  suiteSummaries.push({suite:suite.name,status:'blocked',publishable:false});
  continue;
 }
 const audit=auditCases(result.report.cases,cases);
 const row={suite:suite.name,checked:audit.checked,
  matched:audit.matched,mismatched:audit.mismatched,
  valueMatches:audit.valueMatches,decisionMatches:audit.decisionMatches,
  status:audit.status,publishable:false};
 suiteSummaries.push(row);
 if(audit.status!=='reference_matched')challengeFailures++;
 for(const k of Object.keys(totals))totals[k]+=audit[k]||0;

 // Adversarial counterexamples against a plausible but wrong near-fit output.
 const subtlyWrong=result.report.cases.map(c=>({...c}));
 subtlyWrong[0].value+=0.25;
 const changedValue=auditCases(subtlyWrong,cases);
 assert.equal(changedValue.status,'reference_mismatch');
 assert.equal(changedValue.publishable,false);
 const falseDecision=result.report.cases.map(c=>({...c}));
 falseDecision[1].decision=!falseDecision[1].decision;
 const changedDecision=auditCases(falseDecision,cases);
 assert.equal(changedDecision.status,'reference_mismatch');
 assert.equal(changedDecision.publishable,false);

 // Metamorphic pairs provide a second consistency check on known specs;
 // their expected values stay outside the research VM.
 for(const sample of cases){
  const answer=reference(sample.x,sample.b);
  assert.equal(typeof answer.decision,'boolean');
 }
}
const aggregate={status:challengeFailures===0?'reference_matched':'reference_mismatch',
 publishable:false,independentSealed:false,benchmark:'public-adversarial-v1',
 cohorts:adversarialSuites.length,...totals,challengeFailures,suites:suiteSummaries};
console.log('GENESIS_X_ADVERSARIAL_HOLDOUT '+JSON.stringify(aggregate));
if(challengeFailures||totals.checked!==30||totals.matched!==30)process.exitCode=1;
