/* GENESIS X 0.5: isolated, bounded numeric-to-logic chain. */
(() => {
'use strict';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e6;
const allowed=new Set(['add','subtract','multiply','divide','square','negate']);
function numeric(program,x){
 if(!Array.isArray(program)||program.length<1||program.length>3)return null;
 let v=x;
 for(const step of program){
  if(!record(step)||!allowed.has(step.op))return null;
  const unary=step.op==='square'||step.op==='negate';
  if(unary&&own(step,'c')||!unary&&!finite(step.c))return null;
  switch(step.op){
   case 'add':v+=step.c;break;
   case 'subtract':v-=step.c;break;
   case 'multiply':v*=step.c;break;
   case 'divide':if(step.c===0)return null;v/=step.c;break;
   case 'square':v*=v;break;
   case 'negate':v=-v;break;
  }
  if(!Number.isFinite(v)||Math.abs(v)>1e12)return null;
 }
 return v;
}
function boolean(rule,a,b,depth=0){
 if(!record(rule)||depth>3)return null;
 if(rule.kind==='atom'){
  if(!['a','b'].includes(rule.field)||!['gt','lt','eq'].includes(rule.op)||
     !['field','constant'].includes(rule.target))return null;
  let right;
  if(rule.target==='field'){
   if(!['a','b'].includes(rule.other))return null;
   right=rule.other==='a'?a:b;
  }else{
   if(!finite(rule.constant))return null;
   right=rule.constant;
  }
  const left=rule.field==='a'?a:b;
  return rule.op==='gt'?left>right:rule.op==='lt'?left<right:left===right;
 }
 if(rule.kind==='not'){
  const v=boolean(rule.child,a,b,depth+1);
  return v===null?null:!v;
 }
 if(rule.kind==='and'||rule.kind==='or'){
  const left=boolean(rule.left,a,b,depth+1),right=boolean(rule.right,a,b,depth+1);
  if(left===null||right===null)return null;
  return rule.kind==='and'?left&&right:left||right;
 }
 return null;
}
function solve(task){
 if(!record(task)||!record(task.numeric)||!record(task.logic)||
    !Array.isArray(task.cases)||task.cases.length<1||task.cases.length>20||
    task.cases.some(c=>!record(c)||!finite(c.x)||!finite(c.b)))
  return {status:'invalid',reason:'Chain requires numeric, logic and up to 20 bounded cases.'};
 const router=window.NERYXGenesisXRouter;
 if(!router||typeof router.solve!=='function')
  return {status:'unavailable',reason:'Typed router missing.'};
 let first,second;
 try{
  first=router.solve({...task.numeric,type:'numeric'});
  if(!record(first)||first.status!=='candidate')
   return {status:first?.status==='invalid'?'invalid':'unconfirmed',stage:'numeric'};
  second=router.solve({...task.logic,type:'logic'});
  if(!record(second)||second.status!=='candidate')
   return {status:second?.status==='invalid'?'invalid':'unconfirmed',stage:'logic'};
 }catch{return {status:'unconfirmed',reason:'The chain stopped safely.'};}
 const program=first.result?.selected?.program,rule=second.result?.rule;
 const out=[];
 for(const c of task.cases){
  const value=numeric(program,c.x);
  if(value===null)return {status:'unconfirmed',stage:'numeric-evaluation'};
  const decision=boolean(rule,value,c.b);
  if(decision===null)return {status:'unconfirmed',stage:'logic-evaluation'};
  out.push({x:c.x,b:c.b,value,decision});
 }
 return {status:'candidate',stages:['numeric','logic'],cases:out,
  explanation:'Numeric mapping and Boolean decision derived from separate supplied examples. Predictions are not independently verified.'};
}
window.NERYXGenesisXChain=Object.freeze({version:'0.5',solve});
})();
