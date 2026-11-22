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
 const router=window.NERYXGenesisXRouter;
 const verifier=window.NERYXGenesisXVerifier;
 if(!chain||chain.version!=='0.5'||typeof chain.solve!=='function'||
    !router||router.version!=='0.4'||typeof router.solve!=='function'||
    !verifier||verifier.version!=='0.6'||typeof verifier.verify!=='function')
  return {status:'unavailable',stage:'dependencies'};
 try{
  // The checked orchestrator selects once, independently of the untrusted chain output.
  const first=router.solve({...task.numeric,type:'numeric'});
  if(!record(first)||first.status!=='candidate')
   return {status:first?.status==='invalid'?'invalid':'unconfirmed',stage:'numeric'};
  const second=router.solve({...task.logic,type:'logic'});
  if(!record(second)||second.status!=='candidate')
   return {status:second?.status==='invalid'?'invalid':'unconfirmed',stage:'logic'};
  const program=JSON.parse(JSON.stringify(first.result?.selected?.program));
  const rule=JSON.parse(JSON.stringify(second.result?.rule));
  if(!Array.isArray(program)||!record(rule))
   return {status:'blocked',stage:'selection-shape'};
  const selected={program,rule};
  const result=chain.solve(task,JSON.parse(JSON.stringify(selected)));
  if(!record(result)||result.status!=='candidate')
   return {status:result?.status==='invalid'?'invalid':'unconfirmed',stage:'chain'};
  if(!Array.isArray(result.cases)||result.cases.length!==task.cases.length)
   return {status:'blocked',stage:'chain-shape'};
  if(!record(result.artifacts)||!Array.isArray(result.artifacts.program)||
     !record(result.artifacts.rule))
   return {status:'blocked',stage:'artifact-missing'};
  if(JSON.stringify(result.artifacts)!==JSON.stringify(selected))
   return {status:'blocked',stage:'artifact-provenance'};
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
