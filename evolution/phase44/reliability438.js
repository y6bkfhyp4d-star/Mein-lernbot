// LernBot 7.0 Phase 4.3.8: quality-weighted verification, same original simulation.
import {KEYS, DEFAULT, normalize, world, rng, brain, evaluate} from './model.js';
import {run42, portfolioTrial} from './portfolio.js';
import {hybridTrial} from './guard437.js';
const LEVELS=[.8,1.8,3.0];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const avg=a=>a.reduce((s,v)=>s+v,0)/Math.max(a.length,1);
const median=a=>{const v=[...a].sort((x,y)=>x-y);return v.length?v[Math.floor(v.length/2)]:1.8};
const normal=r=>Math.sqrt(-2*Math.log(Math.max(1e-12,r())))*Math.cos(2*Math.PI*r());
const cases=(seed,n)=>Array.from({length:n},(_,i)=>({seed:seed+i*97,noise:LEVELS[i%3],changing:i%4!==0}));
function estimate(groups){const diffs=[];for(const a of Object.values(groups))for(let i=1;i<a.length;i++)diffs.push(Math.abs(a[i]-a[i-1]));return {sigma:clamp(median(diffs)/.954,.5,4.8),pairs:diffs.length};}
function stats(items,fn){let mae=0,detected=0,falseAlarms=0,delay=0,nd=0,checks=0,confirmed=0,rejected=0;for(const c of items){const t=fn(c);mae+=t.mae;detected+=Number(t.detected);falseAlarms+=t.falseAlarms;checks+=t.checks||0;confirmed+=t.confirmed||0;rejected+=t.rejected||0;if(t.delay!=null){delay+=t.delay;nd++;}}return {mae:mae/items.length,detected,changed:items.filter(c=>c.changing).length,falseAlarms,delay:nd?delay/nd:null,checks,confirmed,rejected};}

// Hidden world truth is accessed only to produce measurements and evaluate results.
// Key choice, alarm and noise thresholds depend solely on observable readings.
export function reliabilityTrial(c,portfolio,policy={}){
 const w=world(c.seed,c.noise,c.changing),r=rng(c.seed^0x5a71),b=brain();
 const groups=Object.fromEntries(KEYS.map(k=>[k,[]]));
 const visited=Object.fromEntries(KEYS.map(k=>[k,-99]));
 const cooldown=Object.fromEntries(KEYS.map(k=>[k,0]));
 const alarms=[],alarmed=new Set();let checks=0,rejected=0,confirmed=0,pending=null;
 // Coverage-controlled calibration: two observations per material/action combination.
 for(let i=0;i<30;i++){
  const k=KEYS[i%KEYS.length],q=b.rules[k],v=w.initial[k]+normal(r)*w.noise;
  groups[k].push(v);q.mean+=(v-q.mean)/(q.n+1);q.n++;visited[k]=i;b.count++;
 }
 let quality=estimate(groups);const initialSigma=quality.sigma;
 for(let i=30;i<90;i++){
  const sigma=quality.sigma,bucket=sigma<1.3?0:sigma<2.45?1:2;
  const p=normalize(portfolio[bucket]||DEFAULT);
  const uncertainty=quality.pairs<20?1.12:1;
  const factor=bucket===2?policy.highFactor??.91:bucket===1?policy.midFactor??1:1;
  const limit=clamp(p.threshold*(policy.sensitivity??1.35)*factor,1.5,5.5)*Math.max(.7,sigma)*uncertainty;
  let k;
  if(pending){k=pending.key;checks++;}
  else{
   let top=-Infinity;
   for(const candidate of KEYS){const q=b.rules[candidate],age=i-visited[candidate];const priority=.68/(1+q.n)+.025*Math.min(age,25)+r()*.015-(i<cooldown[candidate]?.75:0);if(priority>top){top=priority;k=candidate;}}
  }
  const q=b.rules[k];const truth=(w.changing&&i>=w.changeAt?w.final:w.initial)[k];const v=truth+normal(r)*w.noise;
  const reference=pending?pending.reference:q.mean,delta=v-reference;
  const wasPending=Boolean(pending);let confirmedNow=false;
  if(pending){
   const candidate=pending;pending=null;
   // Combine signed evidence rather than letting a single extreme outlier dominate.
   const first=(candidate.first-candidate.reference)/Math.max(.7,sigma);
   const second=(v-candidate.reference)/Math.max(.7,sigma);
   const sameDirection=Math.sign(first)===Math.sign(second);
   const combined=(first+second)/2;
   const needed=(policy.confirmation??.76)*limit/Math.max(.7,sigma);
   const singleFloor=(policy.singleFloor??.46)*limit/Math.max(.7,sigma);
   if(sameDirection&&Math.min(Math.abs(first),Math.abs(second))>=singleFloor&&Math.abs(combined)>=needed){
    if(!alarmed.has(k)){alarms.push({key:k,at:i+1});alarmed.add(k);confirmed++;}
    q.mean=(candidate.first+v)/2;q.n=Math.max(q.n,5);cooldown[k]=i+24;confirmedNow=true;
   }else rejected++;
  }else if(i>=cooldown[k]&&!alarmed.has(k)&&checks<(policy.maxChecks??12)&&Math.abs(delta)>=limit){
   pending={key:k,first:v,reference:q.mean};
  }
  if(!pending&&!confirmedNow){
   const rate=q.n<5?1/(q.n+1):p.rate;
   // Rejecting an outlier does not immediately replace the old baseline.
   const gain=wasPending?.25:1;
   q.mean+=rate*gain*clamp(v-q.mean,-2.25*Math.max(.7,sigma),2.25*Math.max(.7,sigma));q.n++;
  }
  visited[k]=i;
  if(!pending&&!wasPending&&!confirmedNow&&Math.abs(v-q.mean)<2.5*Math.max(.7,sigma)){
   groups[k].push(v);if(groups[k].length>5)groups[k].shift();
  }
  if((i-29)%15===0){const fresh=estimate(groups);quality={sigma:clamp(.8*quality.sigma+.2*fresh.sigma,.5,4.8),pairs:fresh.pairs};}
  b.count++;
 }
 const hits=alarms.filter(a=>c.changing&&a.at>w.changeAt&&w.affected.includes(a.key));
 return{mae:evaluate(b,w),detected:hits.length>0,falseAlarms:alarms.length-hits.length,delay:hits.length?Math.min(...hits.map(a=>a.at-w.changeAt)):null,checks,confirmed,rejected,initialSigma,alarmEvents:alarms};
}
const POLICIES=[
 {sensitivity:1.20,highFactor:.87,confirmation:.70,singleFloor:.40,maxChecks:12},
 {sensitivity:1.32,highFactor:.88,confirmation:.75,singleFloor:.45,maxChecks:12},
 {sensitivity:1.38,highFactor:.94,confirmation:.78,singleFloor:.52,maxChecks:12},
 {sensitivity:1.43,highFactor:.90,confirmation:.72,singleFloor:.47,maxChecks:14},
 {sensitivity:1.48,highFactor:.95,confirmation:.80,singleFloor:.55,maxChecks:10}
];
function objective(s){return s.mae+.5*s.falseAlarms+.95*(s.changed-s.detected)+.002*s.checks;}
export function run438(seed=2027,previous=[]){
 const seeds=[seed,seed+11003,seed+22009],runs=[];
 for(const s of seeds){
  const prior=run42(s,previous),train=cases(s+9300000,30),valid=cases(s+10300000,12),test=cases(s+11900000,36);
  const ranked=POLICIES.map(policy=>({policy,stats:stats(train,c=>reliabilityTrial(c,prior.portfolio,policy))})).sort((a,b)=>objective(a.stats)-objective(b.stats));
  const selected=ranked[0].policy;
  const summary=group=>({baseline:stats(group,c=>portfolioTrial(c,prior.portfolio)),hybrid:stats(group,c=>hybridTrial(c,prior.portfolio, {sensitivity:1.45,confirmation:.8,mediumBoost:1,highNoiseBoost:.88,maxChecks:14})),reliability:stats(group,c=>reliabilityTrial(c,prior.portfolio,selected))});
  runs.push({seed:s,policy:selected,train:ranked[0].stats,validation:summary(valid),...summary(test),byNoise:LEVELS.map(noise=>({noise,...summary(test.filter(c=>c.noise===noise))}))});
 }
 const aggregate=key=>{const a=runs.map(r=>r[key]);const d=a.filter(x=>x.delay!=null);return {mae:avg(a.map(x=>x.mae)),detected:a.reduce((s,x)=>s+x.detected,0),changed:a.reduce((s,x)=>s+x.changed,0),falseAlarms:a.reduce((s,x)=>s+x.falseAlarms,0),delay:d.length?avg(d.map(x=>x.delay)):null,checks:a.reduce((s,x)=>s+x.checks,0),confirmed:a.reduce((s,x)=>s+x.confirmed,0),rejected:a.reduce((s,x)=>s+x.rejected,0)};};
 return {version:'4.3.8',seeds,runs,aggregate:{baseline:aggregate('baseline'),hybrid:aggregate('hybrid'),reliability:aggregate('reliability')},notes:[
  'Originalmodelle model.js und portfolio.js aus Phase 4.3.4 bleiben unverändert.',
  'Je Welt 90 Messungen inkl. Kalibrierung und Kontrollmessungen.',
  'Prüfregeln nur auf Trainingswelten ausgewählt; Validation getrennt; Test mit Offset +11900000.',
  'Messentscheidung ohne Zugriff auf tatsächliche Rauschstärke, Veränderungszeit oder geänderte Schlüssel.',
  'Dies ist eine reproduzierbare Browser-Simulation, keine autonome Veränderung des Codes.'
 ]};
}
