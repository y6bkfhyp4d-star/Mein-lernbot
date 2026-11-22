/* GENESIS X 0.7: fail-closed verified experiment; never integrated in the app. */
(() => {
'use strict';
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function solve(task){
 if(!record(task)||!record(task.numeric)||!record(task.logic)||
    !Array.isArray(task.cases)||task.cases.length<1||task.cases.length>20||
    Array.from(task.cases,c=>!record(c)||!finite(c.x)||!finite(c.b)).some(Boolean))
  return {status:'invalid',stage:'input'};
 const chain=window.NERYXGenesisXChain;
 const verifier=window.NERYXGenesisXVerifier;
 if(!chain||chain.version!=='0.5'||typeof chain.solve!=='function'||
    !verifier||verifier.version!=='0.6'||typeof verifier.verify!=='function')
  return {status:'unavailable',stage:'dependencies'};
 try{
  // Verify the actual candidate artifacts captured by the chain, never re-select them.
  // The independent interpreter checks the claims against those exact artifacts.
  const result=chain.solve(task);
  if(!record(result)||result.status!=='candidate')
   return {status:result?.status==='invalid'?'invalid':'unconfirmed',stage:'chain'};
  if(!Array.isArray(result.cases)||result.cases.length!==task.cases.length)
   return {status:'blocked',stage:'chain-shape'};
  if(!record(result.artifacts)||!Array.isArray(result.artifacts.program)||
     !record(result.artifacts.rule))
   return {status:'blocked',stage:'artifact-missing'};
  const {program,rule}=result.artifacts;
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
