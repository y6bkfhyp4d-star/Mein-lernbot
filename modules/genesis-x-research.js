/* GENESIS X 0.9 – isolated hypothesis/evaluation loop, no auto-adoption. */
(() => {
'use strict';
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e6;
const close=(a,b)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
function run({task,audit}={}){
 if(!object(task)||!object(task.numeric)||!object(task.logic)||
  !Array.isArray(task.numeric.training)||!Array.isArray(task.numeric.validation)||
  !Array.isArray(task.cases)||!Array.isArray(audit)||audit.length<3||audit.length>20)
  return {status:'invalid',reason:'Missing bounded task or independent audit samples.'};
 const excluded=new Set();
 for(const row of [...task.numeric.training,...task.numeric.validation,...task.cases]){
  if(!object(row)||!finite(row.x))return {status:'invalid',reason:'Invalid selection inputs.'};
  excluded.add(row.x);
 }
 const used=new Set(),cases=[];
 for(const a of audit){
  if(!object(a)||!finite(a.x)||!finite(a.b)||!object(a.truth)||
   !finite(a.truth.value)||typeof a.truth.decision!=='boolean'||
   excluded.has(a.x)||used.has(a.x))
   return {status:'invalid',reason:'Audit inputs must be bounded, unique and disjoint from selection data.'};
  used.add(a.x);
  cases.push({x:a.x,b:a.b,truth:{value:a.truth.value,decision:a.truth.decision}});
 }
 const diagnose=window.NERYXGenesisXDiagnostics;
 const verified=window.NERYXGenesisXVerifiedChain;
 if(!diagnose||typeof diagnose.diagnose!=='function'||!verified||typeof verified.solve!=='function')
  return {status:'unavailable',reason:'Required isolated experiment is missing.'};
 // No audit cases or truth are passed to hypothesis generation.
 let proposal;
 try{proposal=diagnose.diagnose(task);}
 catch{return {status:'blocked',reason:'Hypothesis generation failed.'};}
 if(!object(proposal)||typeof proposal.status!=='string')
  return {status:'blocked',reason:'Malformed proposal result.'};
 if(proposal.status==='no_change')
  return {status:'no_change',reason:'No unconfirmed baseline to improve.'};
 if(proposal.status!=='proposal'||proposal.reviewRequired!==true||
  !Array.isArray(proposal.suggestedConstants)||
  proposal.suggestedConstants.length<1||proposal.suggestedConstants.length>8||
  proposal.suggestedConstants.some(x=>!finite(x)||Math.abs(x)>1000))
  return {status:proposal.status==='invalid'?'invalid':'no_evidence',
   reason:'No permitted, verified hypothesis produced.'};
 // Compare both strategies against the *same* audit set. Full references are caller provided.
 const baseTask={...task,cases};
 const proposedTask={...baseTask,numeric:{...task.numeric,constants:[...proposal.suggestedConstants]}};
 let baseline,candidate;
 try{
  baseline=verified.solve(baseTask);
  candidate=verified.solve(proposedTask);
 }catch{return {status:'blocked',reason:'Evaluation failed.'};}
 if(!object(baseline)||!object(candidate))
  return {status:'blocked',reason:'Malformed evaluation.'};
 // Existing baseline may abstain. This is a *coverage gain*, not a measured accuracy gain.
 const oldGood=baseline.status==='execution_checked'&&baseline.audit?.status==='reference_matched'&&
  baseline.audit.checked===cases.length&&baseline.audit.references===cases.length;
 const newGood=candidate.status==='execution_checked'&&candidate.audit?.status==='reference_matched'&&
  candidate.audit.checked===cases.length&&candidate.audit.references===cases.length;
 if(baseline.status==='blocked'||baseline.status==='invalid'||
    !['execution_checked','unconfirmed','unavailable'].includes(baseline.status))
  return {status:'blocked',reason:'Unsafe baseline status; comparison withheld.'};
 const report={
  auditCount:cases.length,
  baseline:{status:baseline.status,referenceMatched:oldGood?cases.length:0},
  hypothesis:{status:candidate.status,referenceMatched:newGood?cases.length:0},
  change:{numericConstants:[...proposal.suggestedConstants]},
  reviewRequired:true,
  limitations:'Fixed caller-provided references, not a secret independent benchmark. No auto-promotion or general accuracy guarantee.'
 };
 if(!newGood)return {status:'rejected',...report,reason:'Hypothesis did not pass all independent audit references.'};
 if(oldGood)return {status:'no_improvement',...report,reason:'Baseline already passed all audit references.'};
 if(baseline.status!=='unconfirmed')
  return {status:'inconclusive',...report,reason:'Baseline did not produce a comparable reference-checked result.'};
 return {status:'coverage_gain_observed',...report,
  reason:'Baseline abstained; proposed strategy matched all supplied audit references. This measures coverage on these examples, not accuracy improvement.'};
}
window.NERYXGenesisXResearch=Object.freeze({version:'0.9',run});
})();
