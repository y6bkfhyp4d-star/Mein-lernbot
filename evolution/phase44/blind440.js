// Phase 4.3.9: frozen holdout audit. No evaluation policy reads hidden world noise.
import {KEYS,DEFAULT,normalize,world,rng,brain,evaluate} from './model.js';

const LEVELS=[0.8,1.8,3.0];
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const normal=r=>Math.sqrt(-2*Math.log(Math.max(1e-10,r())))*Math.cos(2*Math.PI*r());
const cases=(seed,n)=>Array.from({length:n},(_,i)=>({seed:seed+i*101,noise:LEVELS[i%3],changing:i%4!==0}));
const POLICIES=[
 {sensitivity:1.20,highFactor:.87,confirmation:.70,singleFloor:.40,maxChecks:12},
 {sensitivity:1.32,highFactor:.88,confirmation:.75,singleFloor:.45,maxChecks:12},
 {sensitivity:1.38,highFactor:.94,confirmation:.78,singleFloor:.52,maxChecks:12},
 {sensitivity:1.43,highFactor:.90,confirmation:.72,singleFloor:.47,maxChecks:14},
 {sensitivity:1.48,highFactor:.95,confirmation:.80,singleFloor:.55,maxChecks:10}
];

// Equivalent choice / update rules to the historic step(), except all thresholds
// use a noise estimate derived from observations, not w.noise.
function blindStep(b,w,r,mode,params,estimatedNoise){
 const p=normalize(params);let k;
 if(mode==='random'){k=KEYS[Math.floor(r()*KEYS.length)];}
 else if(b.pending){k=b.pending.key;}
 else {let best=-Infinity;for(const candidate of KEYS){const q=b.rules[candidate];const score=1/(1+q.n)+q.suspect*p.exploration+r()*.0001;if(score>best){best=score;k=candidate;}}}
 const q=b.rules[k];
 // World truth is used ONLY to generate the observation here.
 const truth=(w.changing&&b.count>=w.changeAt?w.final:w.initial)[k];
 const measured=truth+normal(r)*w.noise, prior=q.mean;
 const error=q.n?Math.abs(measured-prior):null;
 const sigma=Math.max(0.2,estimatedNoise);
 let event='';
 if(mode==='adaptive'){
  if(b.pending){const pending=b.pending;b.pending=null;
   const z1=(pending.value-pending.reference)/sigma,z2=(measured-pending.reference)/sigma;
   if(Math.sign(z1)===Math.sign(z2)&&Math.abs((z1+z2)/2)>p.threshold*p.confirmation){b.alarms.push({key:k,at:b.count+1});q.mean=(pending.value+measured)/2;q.n=2;event='bestätigt';}
   q.suspect=0;
  }else if(q.n>=4&&error>p.threshold*sigma){b.pending={key:k,value:measured,reference:prior};q.suspect=2;event='prüfen';}
 }
 if(event!=='bestätigt'){const rate=q.n<5?1/(q.n+1):mode==='adaptive'?p.rate:.17;q.mean+=rate*(measured-q.mean);q.n++;}
 q.suspect*=.85;b.count++;
 const h={key:k,measurement:measured};b.history.unshift(h);b.history=b.history.slice(0,45);
 return h;
}
function measuredNoise(history){const groups=new Map();for(const h of history){const a=groups.get(h.key)||[];a.push(h.measurement);groups.set(h.key,a);}const ds=[];for(const a of groups.values())for(let j=1;j<a.length;j++)ds.push(Math.abs(a[j]-a[0]));return clamp(ds.length?ds.reduce((s,x)=>s+x,0)/ds.length/1.128:1.8,0.35,4.8);}
export function blindTrial(c,portfolio){
 const w=world(c.seed,c.noise,c.changing),b=brain(),r=rng(c.seed^0x5a71);
 for(let i=0;i<30;i++)blindStep(b,w,r,'random',DEFAULT,1.8);
 const sigma=measuredNoise(b.history),bucket=sigma<1.3?0:sigma<2.45?1:2;
 for(let i=30;i<90;i++)blindStep(b,w,r,'adaptive',portfolio[bucket]||DEFAULT,sigma);
 const hits=b.alarms.filter(a=>c.changing&&a.at>w.changeAt&&w.affected.includes(a.key));
 return{mae:evaluate(b,w),detected:hits.length>0,falseAlarms:b.alarms.length-hits.length,delay:hits.length?Math.min(...hits.map(a=>a.at-w.changeAt)):null,checks:0,estimate:sigma,alarmEvents:b.alarms};
}
