/* GENESIS X integration preview: review metadata only. NOT connected to NERYX. */
(() => {
'use strict';
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e6;
const fail=(status,reason)=>Object.freeze({status,reason,publishable:false});
function preview(task){
 if(!record(task)||!record(task.numeric)||!record(task.logic)||
    !Array.isArray(task.cases)||task.cases.length<1||task.cases.length>20||
    Array.from(task.cases,c=>!record(c)||!finite(c.x)||!finite(c.b)).some(Boolean))
  return fail('invalid','A bounded numeric/logic task with 1–20 cases is required.');
 const lab=window.NERYXGenesisXResearchLab;
 if(!lab||lab.version!=='1.0'||typeof lab.run!=='function')
  return fail('unavailable','GENESIS X research facade is missing or version mismatch.');
 let result;
 try{result=lab.run({mode:'checked',input:task});}
 catch{return fail('blocked','Research facade threw an exception.');}
 if(!record(result)||result.mode!=='checked'||result.publishable!==false||
    result.status!=='execution_checked'||!record(result.report)||
    !Array.isArray(result.report.cases)||result.report.cases.length!==task.cases.length||
    !record(result.report.audit)||
    !['execution_matched','reference_matched'].includes(result.report.audit.status)||
    result.report.audit.checked!==task.cases.length||
    !Number.isInteger(result.report.audit.references)||
    result.report.audit.references<0||result.report.audit.references>task.cases.length||
    (result.report.audit.status==='reference_matched'&&result.report.audit.references!==task.cases.length)||
    (result.report.audit.status==='execution_matched'&&result.report.audit.references===task.cases.length))
  return fail('blocked','Checked research response failed its preview contract.');
 for(let i=0;i<task.cases.length;i++){
  const c=result.report.cases[i],source=task.cases[i];
  if(!record(c)||c.x!==source.x||c.b!==source.b||
     typeof c.value!=='number'||!Number.isFinite(c.value)||
     typeof c.decision!=='boolean')
   return fail('blocked','Checked research case failed its preview contract.');
 }
 // Intentionally discard all individual values, decisions, rules and raw reports.
 return Object.freeze({
  status:'review_required',publishable:false,
  checkedCases:task.cases.length,
  referenceCases:result.report.audit.references,
  allReferencesMatched:result.report.audit.status==='reference_matched',
  note:'Internal execution consistency only. No user-facing answer or release authorization.'
 });
}
window.NERYXGenesisXIntegrationPreview=Object.freeze({version:'0.1-preview',preview});
})();
