/* GENESIS X 0.8: bounded, read-only diagnosis and tested suggestions. */
(() => {
'use strict';
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const OPTIONS=Object.freeze([0,1,2,3,4,5,10]);
function valid(task){
 if(!obj(task)||!obj(task.numeric)||!obj(task.logic)||!Array.isArray(task.cases)||
   task.cases.length<1||task.cases.length>20)return false;
 const parts=[['numeric',30,2],['logic',40,2]];
 for(const [type,max,minValid] of parts){
  const block=task[type],required=type==='numeric'?3:4;
  if(!Array.isArray(block.training)||block.training.length<required||block.training.length>max||
     !Array.isArray(block.validation)||block.validation.length<minValid||block.validation.length>max)return false;
  for(const row of [...block.training,...block.validation]){
   if(!obj(row))return false;
   if(type==='numeric'&&!finite(row.x)||type==='numeric'&&!finite(row.y)||
      type==='logic'&&(!finite(row.a)||!finite(row.b)||typeof row.expected!=='boolean'))
    return false;
  }
 }
 if(task.cases.some(c=>!obj(c)||!finite(c.x)||!finite(c.b)))return false;
 if(own(task.numeric,'constants')&&
   (!Array.isArray(task.numeric.constants)||task.numeric.constants.length<1||
     task.numeric.constants.length>8||task.numeric.constants.some(c=>!finite(c)||Math.abs(c)>1000)))return false;
 if(own(task.numeric,'maxSteps')&&
   (!Number.isInteger(task.numeric.maxSteps)||task.numeric.maxSteps<1||task.numeric.maxSteps>3))return false;
 return true;
}
function diagnose(task){
 if(!valid(task))return {status:'invalid',reason:'Malformed or unbounded task.'};
 const solver=window.NERYXGenesisXVerifiedChain;
 if(!solver||solver.version!=='0.7'||typeof solver.solve!=='function')
  return {status:'unavailable',reason:'Verified chain dependency absent.'};
 let baseline;
 try{baseline=solver.solve(task);}catch{return {status:'blocked',reason:'Baseline threw.'};}
 if(!obj(baseline)||typeof baseline.status!=='string')
  return {status:'blocked',reason:'Malformed baseline result.'};
 if(baseline.status==='execution_checked')
  return {status:'no_change',diagnosis:'Existing computations agree with declared candidates; external correctness is not established.'};
 if(baseline.status==='blocked')
  return {status:'blocked',diagnosis:'Execution or audit inconsistency. No automatic repair suggested.',
   stage:typeof baseline.faultStage==='string'?baseline.faultStage:baseline.stage||'unknown'};
 if(baseline.status==='invalid')
  return {status:'needs_input',diagnosis:'Correct invalid or contradictory examples before retry.'};
 if(baseline.status!=='unconfirmed')
  return {status:'blocked',diagnosis:'Unexpected outcome; no improvement authorized.'};
 // A single predefined, safe adjustment: try a broader bounded numeric constant list.
 // No program code changes, model mutation, memory or self-installation.
 const existing=own(task.numeric,'constants')?task.numeric.constants:[0,1,2,3];
 const merged=[...new Set([...existing,...OPTIONS])];
 if(merged.length>8)
  return {status:'needs_input',diagnosis:'Constant search budget exhausted; supply independently checked examples.'};
 const attempt={...task,numeric:{...task.numeric,constants:merged}};
 let trial;
 try{trial=solver.solve(attempt);}catch{return {status:'unconfirmed',diagnosis:'Candidate trial failed; no change.'};}
 if(!obj(trial)||trial.status!=='execution_checked'||
    !obj(trial.audit)||trial.audit.checked!==task.cases.length)
  return {status:'unconfirmed',diagnosis:'Bounded adjustment did not produce an independently recalculated candidate.'};
 return {status:'proposal',diagnosis:'Broader numeric constant set passes supplied validation and execution audit.',
  suggestedConstants:merged,reviewRequired:true,
  limitation:'Developer-known examples are not independent ground truth. No changes were applied.'};
}
window.NERYXGenesisXDiagnostics=Object.freeze({version:'0.8',diagnose});
})();
