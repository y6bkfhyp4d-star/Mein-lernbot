/* GENESIS X 0.7: fail-closed verified experiment; never integrated in the app. */
(() => {
'use strict';
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function solve(task){
 if(!record(task)||!record(task.numeric)||!record(task.logic)||
    !Array.isArray(task.cases)||task.cases.length<1||task.cases.length>20||
    task.cases.some(c=>!record(c)||!finite(c.x)||!finite(c.b)))
  return {status:'invalid',stage:'input'};
 const chain=window.NERYXGenesisXChain;
 const router=window.NERYXGenesisXRouter;
 const verifier=window.NERYXGenesisXVerifier;
 if(!chain||typeof chain.solve!=='function'||!router||typeof router.solve!=='function'||
    !verifier||typeof verifier.verify!=='function')
  return {status:'unavailable',stage:'dependencies'};
 try{
  // Chain returns predictions; rerun the two deterministic, read-only classifiers to
  // obtain candidate ASTs. The verifier independently checks *the actual chain output*.
  const result=chain.solve(task);
  if(!record(result)||result.status!=='candidate')
   return {status:result?.status==='invalid'?'invalid':'unconfirmed',stage:'chain'};
  if(!Array.isArray(result.cases)||result.cases.length!==task.cases.length)
   return {status:'blocked',stage:'chain-shape'};
  const numeric=router.solve({...task.numeric,type:'numeric'});
  const logic=router.solve({...task.logic,type:'logic'});
  if(!record(numeric)||numeric.status!=='candidate'||!record(logic)||logic.status!=='candidate')
   return {status:'blocked',stage:'candidate-reconstruction'};
  const program=numeric.result?.selected?.program,rule=logic.result?.rule;
  const claims=[];
  for(let i=0;i<task.cases.length;i++){
   const actual=result.cases[i],input=task.cases[i];
   if(!record(actual)||actual.x!==input.x||actual.b!==input.b||
      !finite(actual.value)||typeof actual.decision!=='boolean')
    return {status:'blocked',stage:'chain-shape',caseIndex:i};
   claims.push({value:actual.value,decision:actual.decision});
  }
  const audit=verifier.verify({program,rule,cases:task.cases,claims});
  if(!record(audit))return {status:'blocked',stage:'audit'};
  if(audit.status!=='execution_matched'&&audit.status!=='reference_matched')
   return {status:'blocked',stage:'audit',reason:audit.status,
    ...(Number.isInteger(audit.caseIndex)?{caseIndex:audit.caseIndex}:{}),
    ...(typeof audit.stage==='string'?{faultStage:audit.stage}:{})};
  if(audit.checked!==task.cases.length||
     !Number.isInteger(audit.references)||audit.references<0||audit.references>task.cases.length||
     (audit.status==='reference_matched'&&audit.references!==task.cases.length))
   return {status:'blocked',stage:'audit-shape'};
  return {status:'execution_checked',cases:result.cases.map(c=>({
   x:c.x,b:c.b,value:c.value,decision:c.decision
  })),audit:{status:audit.status,checked:audit.checked,references:audit.references},
   note:'Recalculated against selected program and rules. Not proof of real-world correctness.'};
 }catch{return {status:'blocked',stage:'exception'};}
}
window.NERYXGenesisXVerifiedChain=Object.freeze({version:'0.7',solve});
})();
