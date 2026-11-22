/* Run original GENESIS X 0.2 in isolated VM. No production or data writes. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {positive,unsupported,oneStep} from './genesis-x-rule-challenges.mjs';

const window={};
const block=()=>{throw Error('Side effects forbidden')};
const context={window,fetch:block,eval:block,document:{getElementById:block},
 localStorage:{getItem:block,setItem:block,removeItem:block}};
runInNewContext(readFileSync(new URL('../modules/genesis-x-tools.js',import.meta.url),'utf8'),
 context,{timeout:2000});
const api=window.NERYXGenesisXTools;
assert.equal(api.version,'0.2');
const results=[];
for(const item of positive){
 const request={training:item.training.map(v=>({...v})),
  holdout:item.validation.map(v=>({...v})),maxSteps:1};
 const result=api.compose(request);
 assert.equal(result.status,'candidate',item.name+' must find a candidate');
 assert.ok(result.selected&&Array.isArray(result.selected.program));
 const program=result.selected.program;
 let matches=0;
 for(const probe of item.probes){
  assert.ok(!request.training.some(p=>p.x===probe.x));
  assert.ok(!request.holdout.some(p=>p.x===probe.x));
  assert.equal(oneStep(program,probe.x),probe.expected,
   item.name+' held-out independent prediction must match');
  matches++;
 }
 results.push({name:item.name,status:'candidate_checked',
  hiddenProbes:matches,publishable:false});
}
for(const item of unsupported){
 const result=api.compose({training:item.training.map(v=>({...v})),
  holdout:item.validation.map(v=>({...v})),maxSteps:1});
 assert.equal(result.status,'unconfirmed',
  item.name+' must abstain instead of manufacturing a candidate');
 assert.equal(result.selected,null,item.name+' must select no rule');
 results.push({name:item.name,status:'abstained',publishable:false});
}
const aggregate={status:'pass',publishable:false,
 testedFamilies:results.length,positiveFamilies:positive.length,
 abstentions:unsupported.length,hiddenProbes:positive.reduce((n,s)=>n+s.probes.length,0),
 benchmark:'public-one-step-rule-challenge',independentSealed:false,results};
console.log('GENESIS_X_RULE_DISCRIMINATION '+JSON.stringify(aggregate));
