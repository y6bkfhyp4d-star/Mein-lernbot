/* GENESIS X CORE 0.1: isoliertes Strategielabor, keine Speicherung/Codeausführung. */
(() => {
'use strict';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const close=(a,b)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
function points(items,min,max){
 if(!Array.isArray(items)||items.length<min||items.length>max)return null;
 const seen=new Set(),out=[];
 for(const p of items){
  if(!p||!finite(p.x)||!finite(p.y)||Math.abs(p.x)>1e6||Math.abs(p.y)>1e12||seen.has(p.x))return null;
  seen.add(p.x);out.push({x:p.x,y:p.y});
 }
 return out;
}
function linear(training){
 const [a,b]=training;
 const slope=(b.y-a.y)/(b.x-a.x),offset=a.y-slope*a.x;
 if(!finite(slope)||!finite(offset))return null;
 const predict=x=>slope*x+offset;
 return training.every(p=>close(predict(p.x),p.y))?{name:'linear',parameters:{slope,offset},predict}:null;
}
function quadratic(training){
 if(training.length<3)return null;
 const [a,b,c]=training,den=(a.x-b.x)*(a.x-c.x)*(b.x-c.x);
 if(!finite(den)||Math.abs(den)<1e-12)return null;
 const aa=(c.x*(b.y-a.y)+b.x*(a.y-c.y)+a.x*(c.y-b.y))/den;
 const bb=(c.x*c.x*(a.y-b.y)+b.x*b.x*(c.y-a.y)+a.x*a.x*(b.y-c.y))/den;
 const cc=(b.x*c.x*(b.x-c.x)*a.y+c.x*a.x*(c.x-a.x)*b.y+a.x*b.x*(a.x-b.x)*c.y)/den;
 if(![aa,bb,cc].every(finite))return null;
 const predict=x=>(aa*x+bb)*x+cc;
 return training.every(p=>close(predict(p.x),p.y))?{name:'quadratisch',parameters:{a:aa,b:bb,c:cc},predict}:null;
}
function compare(request){
 const {training,holdout}=request&&typeof request==='object'&&!Array.isArray(request)?request:{};
 const learn=points(training,3,20),test=points(holdout,2,30);
 if(!learn||!test||test.some(p=>learn.some(q=>q.x===p.x)))
  return {status:'invalid',reason:'Nur endliche, eindeutige Werte und getrennte Trainings-/Prüfwerte erlaubt.'};
 const proposals=[linear(learn),quadratic(learn)].filter(Boolean);
 const results=proposals.map(candidate=>{
  const predictions=test.map(p=>candidate.predict(p.x));
  const passed=predictions.filter((v,i)=>finite(v)&&close(v,test[i].y)).length;
  return {name:candidate.name,parameters:candidate.parameters,passed,total:test.length};
 });
 const valid=results.filter(x=>x.passed===x.total);
 const winner=valid.sort((a,b)=>(a.name==='linear'?-1:1)-(b.name==='linear'?-1:1))[0];
 return {
  status:winner?'candidate':'unconfirmed',
  trainingCount:learn.length,holdoutCount:test.length,
  proposals:results,
  selected:winner?.name??null,
  message:winner
   ?'Nur auf bereitgestellten, zurückgehaltenen Zahlen geprüft; keine neue Denkfähigkeit oder Allgemeingültigkeit bewiesen.'
   :'Keine getestete Strategie erfüllt sämtliche zurückgehaltenen Aufgaben. Nichts wird aktiviert.'
 };
}
function demo(){
 return compare({
  training:[{x:0,y:1},{x:1,y:4},{x:2,y:9},{x:3,y:16}],
  holdout:[{x:4,y:25},{x:7,y:64},{x:-2,y:1}]
 });
}
window.NERYXGenesisX=Object.freeze({version:'0.1',compare,demo});
})();
