/* GENESIS X 0.2: isolated declarative composer, no arbitrary code execution. */
(() => {
'use strict';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const close=(a,b)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
const operations=Object.freeze(['add','subtract','multiply','divide','square','negate']);
const MAX_STEPS=3,MAX_CANDIDATES=5000;
function apply(op,a,b){
 switch(op){
  case 'add':return a+b;
  case 'subtract':return a-b;
  case 'multiply':return a*b;
  case 'divide':return b===0?NaN:a/b;
  case 'square':return a*a;
  case 'negate':return -a;
  default:return NaN;
 }
}
function pairs(data,min){
 if(!Array.isArray(data)||data.length<min||data.length>30)return null;
 const xs=new Set(),out=[];
 for(const p of data){
  if(!p||!finite(p.x)||!finite(p.y)||Math.abs(p.x)>1e6||Math.abs(p.y)>1e12||xs.has(p.x))return null;
  xs.add(p.x);out.push({x:p.x,y:p.y});
 }
 return out;
}
function run(program,x){
 let v=x;
 for(const step of program){
  v=apply(step.op,v,step.c);
  if(!finite(v)||Math.abs(v)>1e12)return NaN;
 }
 return v;
}
function compose(request){
 const {training,holdout,constants=[0,1,2,3],maxSteps=2}=request&&typeof request==='object'&&!Array.isArray(request)?request:{};
 const learn=pairs(training,3),verify=pairs(holdout,2);
 if(!learn||!verify||verify.some(p=>learn.some(q=>q.x===p.x))||
 !Array.isArray(constants)||constants.length>8||constants.length<1||
 constants.some(c=>!finite(c)||Math.abs(c)>1000)||
 !Number.isInteger(maxSteps)||maxSteps<1||maxSteps>MAX_STEPS)
  return {status:'invalid',reason:'Ungueltige Daten, ueberlappende x-Werte oder ueberschrittene Grenzen.'};
 const unique=[...new Set(constants)];let evaluated=0,first=null;
 function consider(program){
  if(evaluated>=MAX_CANDIDATES)return true;
  evaluated++;
  if(!learn.every(p=>close(run(program,p.x),p.y)))return false;
  const passed=verify.filter(p=>close(run(program,p.x),p.y)).length;
  if(passed===verify.length){
   first={program:program.map(s=>({...s})),passed,total:verify.length};
   return true;
  }
  return false;
 }
 function walk(program,depth){
  if(program.length&&consider(program))return true;
  if(program.length===depth||evaluated>=MAX_CANDIDATES)return false;
  for(const op of operations){
   const options=op==='square'||op==='negate'?[null]:unique;
   for(const c of options)
    if(walk([...program,{op,...(c===null?{}:{c})}],depth))return true;
  }
  return false;
 }
 for(let depth=1;depth<=maxSteps&&!first&&evaluated<MAX_CANDIDATES;depth++)walk([],depth);
 return {status:first?'candidate':'unconfirmed',selected:first,
  trainingCount:learn.length,holdoutCount:verify.length,evaluated,
  limitReached:evaluated>=MAX_CANDIDATES,
  message:first?'Nur an bereitgestellten Pruefdaten bestaetigt; keine allgemeine Gueltigkeit.':
   'Kein gepruefter Ablauf gefunden; nichts aktiviert.'};
}
window.NERYXGenesisXTools=Object.freeze({version:'0.2',operations,compose});
})();