/* GENESIS X 0.6: isolated execution verifier; no general-truth claim. */
(() => {
'use strict';
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const num=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e6;
const near=(a,b)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
function calculate(program,input){
 if(!Array.isArray(program)||program.length<1||program.length>3)return null;
 let x=input;
 for(const s of program){
  if(!obj(s))return null;
  if(s.op==='square'||s.op==='negate'){
   if(own(s,'c'))return null;
   x=s.op==='square'?x*x:-x;
  }else{
   if(!num(s.c))return null;
   switch(s.op){
    case 'add':x=x+s.c;break;
    case 'subtract':x=x-s.c;break;
    case 'multiply':x=x*s.c;break;
    case 'divide':if(s.c===0)return null;x=x/s.c;break;
    default:return null;
   }
  }
  if(!Number.isFinite(x)||Math.abs(x)>1e12)return null;
 }
 return x;
}
function decide(r,a,b,depth=0){
 if(!obj(r)||depth>3)return null;
 if(r.kind==='atom'){
  if(!['a','b'].includes(r.field)||!['gt','lt','eq'].includes(r.op))return null;
  const left=r.field==='a'?a:b;
  let right;
  if(r.target==='constant'){
   if(!num(r.constant))return null;
   right=r.constant;
  }else if(r.target==='field'){
   if(!['a','b'].includes(r.other))return null;
   right=r.other==='a'?a:b;
  }else return null;
  return r.op==='gt'?left>right:r.op==='lt'?left<right:left===right;
 }
 if(r.kind==='not'){
  const v=decide(r.child,a,b,depth+1);
  return v===null?null:!v;
 }
 if(r.kind==='and'||r.kind==='or'){
  const l=decide(r.left,a,b,depth+1),v=decide(r.right,a,b,depth+1);
  if(l===null||v===null)return null;
  return r.kind==='and'?(l&&v):(l||v);
 }
 return null;
}
function verify(request){
 const {program,rule,cases,claims}=obj(request)?request:{};
 if(!Array.isArray(cases)||cases.length<1||cases.length>20||
    !Array.isArray(claims)||claims.length!==cases.length||
    Array.from(cases,c=>!obj(c)||!num(c.x)||!num(c.b)).some(Boolean)||
    Array.from(claims,c=>!obj(c)||!own(c,'value')||!own(c,'decision')||
     typeof c.value!=='number'||!Number.isFinite(c.value)||typeof c.decision!=='boolean'))
  return {status:'invalid',reason:'Invalid cases or claims.'};
 const checked=[];
 for(let i=0;i<cases.length;i++){
  const input=cases[i],claimed=claims[i],value=calculate(program,input.x);
  if(value===null)return {status:'invalid',stage:'numeric',caseIndex:i};
  const decision=decide(rule,value,input.b);
  if(decision===null)return {status:'invalid',stage:'logic',caseIndex:i};
  const matching=near(value,claimed.value)&&decision===claimed.decision;
  if(!matching){
   const stage=!near(value,claimed.value)?'numeric':'logic';
   return {status:'mismatch',stage,caseIndex:i,expected:{value,decision},
    received:{value:claimed.value,decision:claimed.decision}};
  }
  const haveTruth=own(input,'truth');
  if(haveTruth&&(!obj(input.truth)||!num(input.truth.value)||typeof input.truth.decision!=='boolean'))
   return {status:'invalid',stage:'reference',caseIndex:i};
  if(haveTruth&&(!near(value,input.truth.value)||decision!==input.truth.decision))
   return {status:'reference_mismatch',stage:!near(value,input.truth.value)?'numeric':'logic',
    caseIndex:i};
  checked.push({caseIndex:i,executionMatched:true,referenceChecked:haveTruth});
 }
 return {status:checked.every(c=>c.referenceChecked)?'reference_matched':'execution_matched',
  checked:checked.length,references:checked.filter(c=>c.referenceChecked).length,
  note:'Matching claims only verifies the declared computation. Reference data are supplied by caller, not independently trusted.'};
}
window.NERYXGenesisXVerifier=Object.freeze({version:'0.6',verify});
})();
