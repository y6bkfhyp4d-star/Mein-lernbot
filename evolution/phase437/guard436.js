// LernBot 7.0 Phase 4.3.6 — adaptive alarm verification.
// Original simulator and portfolio are imported unchanged from Phase 4.3.4.
import {KEYS,DEFAULT,normalize,world,rng,brain,evaluate} from './model.js';
import {run42,portfolioTrial} from './portfolio.js';
import {priorityTrial} from './guard434.js';

const LEVELS=[0.8,1.8,3.0];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const avg=a=>a.reduce((s,x)=>s+x,0)/Math.max(1,a.length);
const median=a=>{const v=[...a].sort((x,y)=>x-y);return v.length?v[Math.floor(v.length/2)]:1.8;};
const gaussian=r=>Math.sqrt(-2*Math.log(Math.max(1e-12,r())))*Math.cos(2*Math.PI*r());
const cases=(seed,n)=>Array.from({length:n},(_,i)=>({seed:seed+i*97,noise:LEVELS[i%3],changing:i%4!==0}));

function stats(items,fn){
 let mae=0,detected=0,falseAlarms=0,delay=0,nd=0,checks=0,alarms=0;
 for(const c of items){const t=fn(c);mae+=t.mae;detected+=Number(t.detected);falseAlarms+=t.falseAlarms;checks+=t.checks||0;alarms+=t.alarms||0;if(t.delay!==null){delay+=t.delay;nd++;}}
 return{mae:mae/items.length,detected,changed:items.filter(c=>c.changing).length,falseAlarms,delay:nd?delay/nd:null,checks,alarms};
}
function estimatedNoise(pairs){
 const differences=[];
 for(const a of Object.values(pairs))for(let i=1;i<a.length;i++)differences.push(Math.abs(a[i]-a[i-1]));
 // Median |difference of two independent normal draws| = 0.954 * sigma.
 return clamp(median(differences)/0.954,0.5,4.8);
}

// Same 90-observation limit as original. Only measurements, not simulator truth,
// influence key selection, noise estimate, thresholds, or alarm confirmation.
export function adaptiveTrial(c,portfolio,policy={}){
 const w=world(c.seed,c.noise,c.changing),r=rng(c.seed^0x5a71),b=brain();
 const pairs=Object.fromEntries(KEYS.map(k=>[k,[]]));
 const lastVisited=Object.fromEntries(KEYS.map(k=>[k,-99]));
 const cooldown=Object.fromEntries(KEYS.map(k=>[k,0]));
 const alarmed=new Set(),alarms=[];
 let checks=0,pending=null;
 const sensitivity=policy.sensitivity??1;
 const confirmation=policy.confirmation??0.55;
 const highNoiseBoost=policy.highNoiseBoost??1;
 const maxChecks=policy.maxChecks??16;
 // Balanced calibration: exactly two measurements per key, with all keys covered.
 // Calibration happens entirely before changeAt (minimum 40).
 for(let i=0;i<30;i++){
  const key=KEYS[i%KEYS.length],q=b.rules[key];
  const obs=w.initial[key]+gaussian(r)*w.noise;
  pairs[key].push(obs);q.mean+=(obs-q.mean)/(q.n+1);q.n++;
  lastVisited[key]=i;b.count++;
 }
 let sigma=estimatedNoise(pairs);
 const initialEstimate=sigma;
 for(let i=30;i<90;i++){
  const bucket=sigma<1.3?0:sigma<2.45?1:2;
  const p=normalize(portfolio[bucket]||DEFAULT);
  // Do not multiply the threshold by a large safety factor as in 4.3.
  const threshold=clamp(p.threshold*sensitivity*(bucket===2?highNoiseBoost:1),1.55,5.2)*Math.max(0.65,sigma);
  let key;
  if(pending){key=pending.key;checks++;}
  else{
   let top=-Infinity;
   for(const k of KEYS){
    const q=b.rules[k],age=i-lastVisited[k];
    // Aging ensures coverage; recently confirmed keys are temporarily de-prioritized.
    const priority=0.68/(1+q.n)+0.025*Math.min(age,25)+r()*0.015-(i<cooldown[k]?0.75:0);
    if(priority>top){top=priority;key=k;}
   }
  }
  const q=b.rules[key];
  const truth=(w.changing&&i>=w.changeAt?w.final:w.initial)[key];
  const obs=truth+gaussian(r)*w.noise;
  const reference=pending?pending.reference:q.mean;
  const delta=obs-reference;
  const freeze=Boolean(pending);
  let confirmed=false;
  if(pending){
   const cand=pending;
   pending=null;
   // Require the follow-up to point the same way. Compare pair-average to threshold.
   if(Math.sign(delta)===cand.sign&&Math.abs(delta)>=threshold*confirmation){
    const pairMean=(cand.first+obs)/2;
    if(Math.abs(pairMean-cand.reference)>=threshold*confirmation){
     if(!alarmed.has(key)){
      alarms.push({key,at:i+1});alarmed.add(key);
     }
     confirmed=true;
     q.mean=pairMean;q.n=Math.max(q.n,5);cooldown[key]=i+24;
    }
   }
  }else if(i>=cooldown[key]&&!alarmed.has(key)&&checks<maxChecks&&Math.abs(delta)>=threshold){
   pending={key,reference:q.mean,first:obs,sign:Math.sign(delta)};
  }
  // When a check is pending, preserve the original reference. Rejected checks
  // update the model conservatively, but not using the initial extreme outlier.
  if(!pending&&!confirmed){
   const rate=q.n<5?1/(q.n+1):p.rate;
   const safeDelta=clamp(obs-q.mean,-2.25*Math.max(0.7,sigma),2.25*Math.max(0.7,sigma));
   q.mean+=rate*safeDelta;q.n++;
  }
  lastVisited[key]=i;
  // Noise is estimated using consecutive measurements, but exclude strong
  // deviations likely caused by a world change.
  const series=pairs[key];
  if(!freeze&&!pending&&!confirmed&&Math.abs(obs-q.mean)<2.5*Math.max(.7,sigma)){
   series.push(obs);if(series.length>5)series.shift();
  }
  if((i-29)%15===0){const next=estimatedNoise(pairs);sigma=clamp(.8*sigma+.2*next,.5,4.8);}
  b.count++;
 }
 // One alarm per key; score only the first correct alarm per changed world.
 const hits=alarms.filter(a=>c.changing&&a.at>w.changeAt&&w.affected.includes(a.key));
 return{mae:evaluate(b,w),detected:hits.length>0,falseAlarms:alarms.length-hits.length,delay:hits.length?Math.min(...hits.map(a=>a.at-w.changeAt)):null,checks,alarms:alarms.length,initialEstimate};
}
// Policies are selected on training worlds only. The final test set is separate.
const POLICIES=[
 {sensitivity:1.15,confirmation:0.7,highNoiseBoost:0.9,maxChecks:10},
 {sensitivity:1.3,confirmation:0.7,highNoiseBoost:0.9,maxChecks:10},
 {sensitivity:1.45,confirmation:0.65,highNoiseBoost:0.9,maxChecks:10},
 {sensitivity:1.45,confirmation:0.85,highNoiseBoost:0.95,maxChecks:10},
 {sensitivity:1.65,confirmation:0.6,highNoiseBoost:0.9,maxChecks:10},
];
function objective(s){return s.mae+0.3*s.falseAlarms+0.44*(s.changed-s.detected)+0.002*s.checks;}
export function run436(seed=2027,previous=[]){
 const seeds=[seed,seed+11003,seed+22009],runs=[];
 for(const s of seeds){
  const prior=run42(s,previous);
  const train=cases(s+2800000,24);
  // New held-out test offset. Never used in selection. 
  const test=cases(s+5900000,36);
  const ranked=POLICIES.map(policy=>({policy,train:stats(train,c=>adaptiveTrial(c,prior.portfolio,policy))})).sort((a,b)=>objective(a.train)-objective(b.train));
  const selected=ranked[0];
  const baseline=stats(test,c=>portfolioTrial(c,prior.portfolio));
  const earlier=stats(test,c=>priorityTrial(c,prior.portfolio));
  const adaptive=stats(test,c=>adaptiveTrial(c,prior.portfolio,selected.policy));
  const byNoise=LEVELS.map(noise=>{
   const group=test.filter(c=>c.noise===noise);
   return{noise,baseline:stats(group,c=>portfolioTrial(c,prior.portfolio)),earlier:stats(group,c=>priorityTrial(c,prior.portfolio)),adaptive:stats(group,c=>adaptiveTrial(c,prior.portfolio,selected.policy))};
  });
  runs.push({seed:s,policy:selected.policy,training:selected.train,baseline,earlier,adaptive,byNoise});
 }
 const aggregate=key=>{
  const rows=runs.map(x=>x[key]);
  const delays=rows.filter(x=>x.delay!==null).map(x=>x.delay);
  return{mae:avg(rows.map(x=>x.mae)),detected:rows.reduce((s,x)=>s+x.detected,0),changed:rows.reduce((s,x)=>s+x.changed,0),falseAlarms:rows.reduce((s,x)=>s+x.falseAlarms,0),delay:delays.length?avg(delays):null,checks:rows.reduce((s,x)=>s+x.checks,0),alarms:rows.reduce((s,x)=>s+x.alarms,0)};
 };
 return{version:'4.3.6',seeds,runs,aggregate:{baseline:aggregate('baseline'),earlier:aggregate('earlier'),adaptive:aggregate('adaptive')},notes:['Originalmodelle model.js und portfolio.js aus Phase 4.3.4 unverändert','90 Messungen je Welt, einschließlich Kalibrierung und Kontrollmessungen','Auswahl der Strategie ausschließlich anhand getrennter Trainingswelten','Neue Testwelten mit Offset +5900000; bestehende Phase-4.3.4-Tests bleiben unverändert','Simulation, keine autonome Veränderung des Programmcodes']};
}
