/* GENESIS X opt-in research bridge. No production chat wiring, no answer API. */
(() => {
'use strict';
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const validNumber=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1000000;
const fail=status=>Object.freeze({status,publishable:false,reviewOnly:true});
function normalize(request){
 if(!record(request)||Object.keys(request).length!==3||
    request.version!==1||request.kind!=='research_check'||!record(request.task))
  return null;
 const t=request.task;
 if(Object.keys(t).length!==3||!Array.isArray(t.training)||
    !Array.isArray(t.validation)||!Array.isArray(t.probes)||
    t.training.length<3||t.training.length>15||
    t.validation.length<2||t.validation.length>10||
    t.probes.length<1||t.probes.length>6)return null;
 const seen=new Set(),rows=[];
 for(const row of [...t.training,...t.validation]){
  if(!record(row)||Object.keys(row).length!==2||!own(row,'x')||!own(row,'y')||
     !validNumber(row.x)||typeof row.y!=='number'||!Number.isFinite(row.y)||
     Math.abs(row.y)>1e12||seen.has(row.x))return null;
  seen.add(row.x);rows.push({x:row.x,y:row.y});
 }
 const probes=new Set();
 for(const x of t.probes){
  if(!validNumber(x)||seen.has(x)||probes.has(x))return null;
  probes.add(x);
 }
 return {
  training:rows.slice(0,t.training.length),
  validation:rows.slice(t.training.length),
  probes:[...t.probes]
 };
}
async function review(request){
 const task=normalize(request);
 if(!task)return fail('invalid');
 const api=window.NERYXGenesisXAmbiguityClient;
 if(!api||api.version!=='0.1-research'||typeof api.inspect!=='function')
  return fail('unavailable');
 try{
  const result=await api.inspect(task);
  if(!record(result)||result.publishable!==false||
     !['ambiguous','review_required','unconfirmed','invalid','unavailable','blocked'].includes(result.status))
   return fail('blocked');
  if(['ambiguous','review_required'].includes(result.status)){
   if(Object.keys(result).length!==5||!Number.isInteger(result.candidates)||
      result.candidates<1||result.candidates>342||
      !Number.isInteger(result.distinctProbeBehaviors)||
      result.distinctProbeBehaviors<1||
      result.distinctProbeBehaviors>result.candidates||
      !Number.isInteger(result.checkedProbes)||result.checkedProbes!==task.probes.length||
      (result.status==='ambiguous')!==(result.distinctProbeBehaviors>1))
    return fail('blocked');
   return Object.freeze({
    status:result.status,publishable:false,reviewOnly:true,
    competingPrograms:result.candidates,
    distinctBehaviors:result.distinctProbeBehaviors,
    testedProbes:result.checkedProbes
   });
  }
  if(Object.keys(result).length!==2)return fail('blocked');
  return fail(result.status);
 }catch{return fail('blocked');}
}
window.NERYXGenesisXResearchBridge=Object.freeze({
 version:'0.1-research',review
});
})();