// LernBot 7.0 · Phase 4.3.7 — rauschabhängige Hybridstrategie.
// Originaldateien 4.3.4 und 4.3.6 bleiben unverändert.
import {KEYS,DEFAULT,normalize,world,rng,brain,evaluate} from './model.js';
import {run42,portfolioTrial} from './portfolio.js';
import {priorityTrial} from './guard434.js';
import {adaptiveTrial} from './guard436.js';
const LEVELS=[0.8,1.8,3.0];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const avg=a=>a.reduce((s,x)=>s+x,0)/Math.max(1,a.length);
const median=a=>{const v=[...a].sort((x,y)=>x-y);return v.length?v[Math.floor(v.length/2)]:1.8;};
const gaussian=r=>Math.sqrt(-2*Math.log(Math.max(1e-12,r())))*Math.cos(2*Math.PI*r());
const cases=(seed,n)=>Array.from({length:n},(_,i)=>({seed:seed+i*97,noise:LEVELS[i%3],changing:i%4!==0}));
function stats(items,fn){
 let mae=0,detected=0,falseAlarms=0,delay=0,nd=0,checks=0,alarms=0,suspicions=0,rejected=0;
 const modeCounts=[0,0,0];
 for(const c of items){const t=fn(c);mae+=t.mae;detected+=Number(t.detected);falseAlarms+=t.falseAlarms;checks+=t.checks||0;alarms+=t.alarms||0;suspicions+=t.suspicions||0;rejected+=t.rejected||0;
  if(t.modeCounts)t.modeCounts.forEach((v,i)=>modeCounts[i]+=v);
  if(t.delay!==null){delay+=t.delay;nd++;}}
 return{mae:mae/items.length,detected,changed:items.filter(x=>x.changing).length,falseAlarms,delay:nd?delay/nd:null,checks,alarms,suspicions,rejected,modeCounts};
}
function estimatedNoise(pairs){
 const differences=[];
 for(const a of Object.values(pairs))for(let i=1;i<a.length;i++)differences.push(Math.abs(a[i]-a[i-1]));
 return clamp(median(differences)/0.954,0.5,4.8);
}
export function hybridTrial(c,portfolio,policy={}){
 const w=world(c.seed,c.noise,c.changing),r=rng(c.seed^0x5a71),b=brain();
 const pairs=Object.fromEntries(KEYS.map(k=>[k,[]]));
 const lastVisited=Object.fromEntries(KEYS.map(k=>[k,-99]));
 const cooldown=Object.fromEntries(KEYS.map(k=>[k,0]));
 const alarmed=new Set(),alarms=[];
 let checks=0,pending=null,modeCounts=[0,0,0],suspicions=0,rejected=0;
 const sensitivity=policy.sensitivity??1.2;
 const confirmation=policy.confirmation??0.6;
 const highNoiseBoost=policy.highNoiseBoost??0.7;
 const maxChecks=policy.maxChecks??14;
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
  modeCounts[bucket]++;
  const p=normalize(portfolio[bucket]||DEFAULT);
  // Do not multiply the threshold by a large safety factor as in 4.3.
  // High estimated noise uses a more sensitive threshold, without reading hidden noise.
  // The policy is trained on separate worlds; every check consumes a measurement.
  const factor=bucket===2?highNoiseBoost:bucket===1?policy.mediumBoost??1:1;
  const threshold=clamp(p.threshold*sensitivity*factor,1.25,5.2)*Math.max(0.65,sigma);
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
   suspicions++;
   pending={key,reference:q.mean,first:obs,sign:Math.sign(delta)};
  }
  // When a check is pending, preserve the original reference. Rejected checks
  // update the model conservatively, but not using the initial extreme outlier.
  if(freeze&&!confirmed)rejected++;
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
 return{mae:evaluate(b,w),detected:hits.length>0,falseAlarms:alarms.length-hits.length,delay:hits.length?Math.min(...hits.map(a=>a.at-w.changeAt)):null,checks,alarms:alarms.length,initialEstimate,modeCounts,suspicions,rejected};
}

// Each policy has a different threshold at high *estimated* noise.
const POLICIES=[
 {sensitivity:1.30,confirmation:0.60,mediumBoost:1.0,highNoiseBoost:0.85,maxChecks:12},
 {sensitivity:1.30,confirmation:0.70,mediumBoost:1.0,highNoiseBoost:0.9,maxChecks:12},
 {sensitivity:1.45,confirmation:0.65,mediumBoost:0.9,highNoiseBoost:0.82,maxChecks:14},
 {sensitivity:1.45,confirmation:0.80,mediumBoost:1.0,highNoiseBoost:0.88,maxChecks:14},
 {sensitivity:1.15,confirmation:0.70,mediumBoost:1.0,highNoiseBoost:0.95,maxChecks:12},
 {sensitivity:1.45,confirmation:0.85,mediumBoost:1.0,highNoiseBoost:0.95,maxChecks:10},
];
function objective(s){return s.mae+.65*s.falseAlarms+.85*(s.changed-s.detected)+.002*s.checks;}
export function run437(seed=2027,previous=[]){
 const seeds=[seed,seed+11003,seed+22009],runs=[];
 for(const s of seeds){
  const prior=run42(s,previous),train=cases(s+3800000,30),valid=cases(s+4700000,12),test=cases(s+7900000,36);
  const ranked=POLICIES.map(policy=>({policy,training:stats(train,c=>hybridTrial(c,prior.portfolio,policy))})).sort((a,b)=>objective(a.training)-objective(b.training));
  // Training determines winner; validation is only a diagnostic and never picks policies.
  const chosen=ranked[0].policy;
  const summary=group=>({baseline:stats(group,c=>portfolioTrial(c,prior.portfolio)),phase434:stats(group,c=>priorityTrial(c,prior.portfolio)),phase436:stats(group,c=>adaptiveTrial(c,prior.portfolio, {sensitivity:1.45,confirmation:.85,highNoiseBoost:.95,maxChecks:10})),hybrid:stats(group,c=>hybridTrial(c,prior.portfolio,chosen))});
  const testSummary=summary(test);
  runs.push({seed:s,policy:chosen,training:ranked[0].training,validation:summary(valid),...testSummary,
   byNoise:LEVELS.map(noise=>({noise,...summary(test.filter(c=>c.noise===noise))}))});
 }
 const aggregate=key=>{
  const a=runs.map(r=>r[key]);const d=a.filter(s=>s.delay!==null);
  return{mae:avg(a.map(s=>s.mae)),detected:a.reduce((n,s)=>n+s.detected,0),changed:a.reduce((n,s)=>n+s.changed,0),falseAlarms:a.reduce((n,s)=>n+s.falseAlarms,0),delay:d.length?avg(d.map(s=>s.delay)):null,checks:a.reduce((n,s)=>n+s.checks,0),modeCounts:[0,1,2].map(i=>a.reduce((n,s)=>n+s.modeCounts[i],0)),suspicions:a.reduce((n,s)=>n+s.suspicions,0),rejected:a.reduce((n,s)=>n+s.rejected,0)};
 };
 return{version:'4.3.7',seeds,runs,aggregate:{baseline:aggregate('baseline'),phase434:aggregate('phase434'),phase436:aggregate('phase436'),hybrid:aggregate('hybrid')},notes:[
 'Originalmodelle und ursprüngliche Simulationsbedingungen aus Phase 4.3.4 bleiben unverändert.',
 'In jeder Welt genau 90 Messungen einschließlich der Kontrollmessungen.',
 'Wechsel nach geschätztem, nicht nach wahrem Messrauschen.',
 'Strategieauswahl nur auf Trainingswelten; separate Validierung und neue Tests mit Offset +7900000.',
 'Erkennung und Falschalarme werden unabhängig voneinander ausgewertet.',
 'Reproduzierbare Browser-Simulation, keine echte autonom lernende KI oder Selbständerung des Programmcodes.'
 ]};
}
