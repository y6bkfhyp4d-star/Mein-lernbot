/* GENESIS X public multi-step challenges and external ambiguity gate.
   Do not pass oracle candidate outputs to the engine. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {execute,detectAmbiguity} from './genesis-x-multistep-oracle.mjs';

const block=()=>{throw Error('External side effects blocked')},window={};
runInNewContext(readFileSync(new URL('../modules/genesis-x-tools.js',import.meta.url),'utf8'),
 {window,fetch:block,eval:block,localStorage:{getItem:block,setItem:block},
 document:{getElementById:block}},{timeout:2000});
const engine=window.NERYXGenesisXTools;
assert.equal(engine.version,'0.2');

const cases=[
 {name:'square-then-add',transform:x=>x*x+2,
  training:[-3,-1,0],validation:[1,3],probes:[-6,4,7.5]},
 {name:'triple-then-add',transform:x=>3*x+2,
  training:[-4,-1,0],validation:[2,5],probes:[-7,4,9.5]}
];
const results=[];
for(const scenario of cases){
 const input={training:scenario.training.map(x=>({x,y:scenario.transform(x)})),
  holdout:scenario.validation.map(x=>({x,y:scenario.transform(x)})),
  constants:[0,1,2,3],maxSteps:2};
 const engineResult=engine.compose(input);
 assert.equal(engineResult.status,'candidate',scenario.name);
 assert.ok(Array.isArray(engineResult.selected?.program),scenario.name);
 const chosen=engineResult.selected.program;
 assert.equal(chosen.length,2,'multi-step challenge must require two steps');
 let matched=0;
 for(const x of scenario.probes){
  assert.ok(!scenario.training.includes(x)&&!scenario.validation.includes(x));
  assert.equal(execute(chosen,x),scenario.transform(x),scenario.name+' unseen probe');
  matched++;
 }
 const samples=[...input.training,...input.holdout];
 const gate=detectAmbiguity(samples,scenario.probes);
 assert.equal(gate.status,'probe_consistent',
  'nonambiguous multi-step scenario must not be flagged ambiguous');
 results.push({scenario:scenario.name,engineStatus:engineResult.status,
  steps:chosen.length,unseenMatched:matched,gate:gate.status,publishable:false});
}

// This training set is deliberately clustered. Different two-step programs
// fit within the engine's 1e-8 tolerance, yet diverge for a distant input.
const cluster=[0,1e-10,2e-10,3e-10,4e-10];
const crowded={training:cluster.slice(0,3).map(x=>({x,y:2+x})),
 holdout:cluster.slice(3).map(x=>({x,y:2+x})),
 constants:[0,1,2,3],maxSteps:2};
const raw=engine.compose(crowded);
assert.equal(raw.status,'candidate','engine currently selects first matching rule');
const ambiguity=detectAmbiguity([...crowded.training,...crowded.holdout],[10,-10]);
assert.equal(ambiguity.status,'ambiguous');
assert.ok(ambiguity.distinctProbeBehaviors>=2);
assert.ok(ambiguity.candidates>=2);
results.push({scenario:'clustered-ambiguous',engineStatus:raw.status,
 gate:ambiguity.status,candidates:ambiguity.candidates,
 distinctProbeBehaviors:ambiguity.distinctProbeBehaviors,
 published:false,publishable:false});
const report=Object.freeze({status:'pass',publishable:false,
 independentlySealed:false,benchmark:'public-multistep-ambiguity-v1',
 twoStepFamilies:2,unseenProbesMatched:6,ambiguousCohorts:1,
 candidatePublicationBlocked:true,results});
console.log('GENESIS_X_MULTISTEP_AMBIGUITY_AUDIT '+JSON.stringify(report));
