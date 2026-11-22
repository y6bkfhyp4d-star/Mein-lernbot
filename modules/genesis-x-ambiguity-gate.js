/* GENESIS X 1.0 experimental ambiguity gate. Worker-only. Never an answer API. */
(() => {
'use strict';
const constants=[0,1,2,3],ops=['add','subtract','multiply','divide','square','negate'];
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e6;
const close=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&
 Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
const fail=status=>({status,publishable:false});
function apply(program,x){
 let y=x;
 for(const step of program){
  const c=step.c;
  switch(step.op){
   case 'add': y+=c; break;
   case 'subtract': y-=c; break;
   case 'multiply': y*=c; break;
   case 'divide': y=c===0?NaN:y/c; break;
   case 'square': y=y*y; break;
   case 'negate': y=-y; break;
   default:return NaN;
  }
  if(!Number.isFinite(y)||Math.abs(y)>1e12)return NaN;
 }
 return y;
}
const pool=(()=>{
 const steps=ops.flatMap(op=>['square','negate'].includes(op)?[{op}]:
  constants.map(c=>({op,c})));
 return Object.freeze(steps.flatMap(a=>[[a],...steps.map(b=>[a,b])]));
})();
function inspect(task){
 if(!isObj(task)||Object.keys(task).some(k=>!['training','validation','probes'].includes(k))||
    !Array.isArray(task.training)||task.training.length<3||task.training.length>15||
    !Array.isArray(task.validation)||task.validation.length<2||task.validation.length>10||
    !Array.isArray(task.probes)||task.probes.length<1||task.probes.length>6)
  return fail('invalid');
 const samples=[...task.training,...task.validation],seen=new Set();
 for(const p of samples){
  if(!isObj(p)||Object.keys(p).length!==2||!Object.hasOwn(p,'x')||
     !Object.hasOwn(p,'y')||!finite(p.x)||!Number.isFinite(p.y)||Math.abs(p.y)>1e12||
     seen.has(p.x))return fail('invalid');
  seen.add(p.x);
 }
 const probes=new Set();
 for(const x of task.probes){
  if(!finite(x)||seen.has(x)||probes.has(x))return fail('invalid');
  probes.add(x);
 }
 // Run existing bounded composer on same task, but never export its selected program.
 const engine=window.NERYXGenesisXTools;
 if(!engine||engine.version!=='0.2'||typeof engine.compose!=='function')return fail('unavailable');
 const selected=engine.compose({
  training:task.training,holdout:task.validation,
  constants:[...constants],maxSteps:2
 });
 if(!isObj(selected)||!['candidate','unconfirmed','invalid'].includes(selected.status))
  return fail('blocked');
 if(selected.status==='invalid')return fail('invalid');
 if(selected.status!=='candidate')return fail('unconfirmed');
 let matches=0,groups=[];
 for(const program of pool){
  if(!samples.every(({x,y})=>close(apply(program,x),y)))continue;
  matches++;
  const values=task.probes.map(x=>apply(program,x));
  if(values.some(v=>!Number.isFinite(v)))return fail('blocked');
  if(!groups.some(vs=>vs.every((v,i)=>close(v,values[i]))))groups.push(values);
 }
 if(!matches||!groups.length)return fail('blocked');
 // Internal output is only nonpublishable metadata; no candidate rule or predicted value.
 return {status:groups.length>1?'ambiguous':'review_required',
  publishable:false,candidates:matches,distinctProbeBehaviors:groups.length,
  checkedProbes:task.probes.length};
}
window.NERYXGenesisXAmbiguityGate=Object.freeze({version:'0.1-research',inspect});
})();
