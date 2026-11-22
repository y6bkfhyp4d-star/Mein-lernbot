/* Run GENESIS X on holdouts without revealing oracle answers to engine. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {holdout,auditCases} from './genesis-x-independent-oracle.mjs';

const files=['genesis-x.js','genesis-x-tools.js','genesis-x-logic.js',
 'genesis-x-router.js','genesis-x-chain.js','genesis-x-verifier.js',
 'genesis-x-verified-chain.js','genesis-x-diagnostics.js',
 'genesis-x-research.js','genesis-x-research-lab.js'];
const blocked=()=>{throw Error('External side effect prohibited')};
const window={};
const context={window,fetch:blocked,eval:blocked,
 localStorage:{setItem:blocked,getItem:blocked,removeItem:blocked},
 document:{getElementById:blocked}};
for(const name of files)
 runInNewContext(readFileSync(new URL('../modules/'+name,import.meta.url),'utf8'),context,{timeout:2000});
const task={
 numeric:{training:[0,1,2].map(x=>({x,y:x+2})),
 validation:[4,7].map(x=>({x,y:x+2})),maxSteps:1},
 logic:{training:[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]]
 .map(([a,b])=>({a,b,expected:a>b})),
 validation:[[8,2],[-2,0],[4,4]]
 .map(([a,b])=>({a,b,expected:a>b}))},
 // Holdout inputs only. No expected values, no `truth`, no oracle module in VM.
 cases:holdout.map(({x,b})=>({x,b}))
};
assert.ok(task.cases.every(c=>!Object.hasOwn(c,'truth')&&
 !Object.hasOwn(c,'expected')));
const facade=window.NERYXGenesisXResearchLab;
assert.equal(facade.version,'1.0');
const result=facade.run({mode:'checked',input:task});
if(result.status!=='execution_checked'||result.publishable!==false||
   !result.report||!Array.isArray(result.report.cases)||
   result.report.audit?.checked!==task.cases.length)
 throw Error('GENESIS X internal checked stage unavailable; no independent report');
const audit=auditCases(result.report.cases,task.cases);
const summary=Object.freeze({status:audit.status,publishable:false,
 checked:audit.checked,matched:audit.matched,mismatched:audit.mismatched,
 valueMatches:audit.valueMatches,decisionMatches:audit.decisionMatches,
 internalStatus:result.status,reportedReferences:result.report.audit?.references,
 // Explicitly not an independent hidden benchmark, just a deterministic fixture.
 benchmark:'public-deterministic-fixture-v1',independentSealed:false});
console.log('GENESIS_X_INDEPENDENT_REFERENCE_AUDIT '+JSON.stringify(summary));
if(audit.status!=='reference_matched')process.exitCode=1;
