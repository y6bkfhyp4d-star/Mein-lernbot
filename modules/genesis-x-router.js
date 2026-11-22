/* GENESIS X 0.4: isolated typed task router, never executes arbitrary code. */
(() => {
'use strict';
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function classify(task){
 if(!object(task)||!Array.isArray(task.training)||!Array.isArray(task.validation))
  return {status:'invalid',reason:'A task requires training and validation arrays.'};
 if(task.training.length<1||task.validation.length<1||
    task.training.length>40||task.validation.length>40)
  return {status:'invalid',reason:'Sample count outside bounded range.'};
 const rows=[...task.training,...task.validation];
 if(!rows.every(object))return {status:'invalid',reason:'All samples must be records.'};
 const numbers=rows.every(p=>own(p,'x')&&own(p,'y')&&
   typeof p.x==='number'&&Number.isFinite(p.x)&&
   typeof p.y==='number'&&Number.isFinite(p.y)&&
   !own(p,'a')&&!own(p,'b')&&!own(p,'expected'));
 const logic=rows.every(p=>own(p,'a')&&own(p,'b')&&own(p,'expected')&&
   typeof p.a==='number'&&Number.isFinite(p.a)&&
   typeof p.b==='number'&&Number.isFinite(p.b)&&
   typeof p.expected==='boolean'&&!own(p,'x')&&!own(p,'y'));
 if(numbers===logic)return {status:'invalid',reason:'Mixed or unsupported task schema.'};
 const inferred=numbers?'numeric':'logic';
 if(own(task,'type')&&task.type!==inferred)return {status:'invalid',reason:'Declared task type contradicts samples.'};
 return {status:'classified',type:inferred};
}
function solve(task){
 const decision=classify(task);
 if(decision.status!=='classified')return decision;
 const type=decision.type;
 const api=type==='numeric'?window.NERYXGenesisXTools:window.NERYXGenesisXLogic;
 const method=type==='numeric'?'compose':'learn';
 if(!api||api.version!==(type==='numeric'?'0.2':'0.3')||typeof api[method]!=='function')
  return {status:'unavailable',type,reason:'Required isolated capability was not loaded.'};
 const args=type==='numeric'?
  {training:task.training,holdout:task.validation,
   ...(own(task,'constants')?{constants:task.constants}:{}),
   ...(own(task,'maxSteps')?{maxSteps:task.maxSteps}:{})}:
  {training:task.training,validation:task.validation,
   ...(own(task,'constants')?{constants:task.constants}:{})};
 try {
  const result=api[method](args);
  if(!object(result)||!['candidate','unconfirmed','invalid'].includes(result.status))
   return {status:'unconfirmed',type,reason:'Capability returned no verifiable status.'};
  return {status:result.status,type,result};
 } catch {
  return {status:'unconfirmed',type,reason:'Capability failed safely.'};
 }
}
window.NERYXGenesisXRouter=Object.freeze({version:'0.4',classify,solve});
})();
