import {KEYS,DEFAULT,normalize,world,rng,evaluate,brain,step} from './model.js';
import {run42,portfolioTrial} from './portfolio.js';

const LEVELS=[0.8,1.8,3];
const avg=a=>a.reduce((s,v)=>s+v,0)/Math.max(1,a.length);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const gaussian=r=>Math.sqrt(-2*Math.log(Math.max(1e-12,r())))*Math.cos(2*Math.PI*r());
function cases(seed,n){return Array.from({length:n},(_,i)=>({seed:seed+i*97,noise:LEVELS[i%3],changing:i%4!==0}));}
function summarize(items,fn){let mae=0,detected=0,falseAlarms=0,delay=0,n=0;for(const c of items){const t=fn(c);mae+=t.mae;detected+=Number(t.detected);falseAlarms+=t.falseAlarms;if(t.delay!==null){delay+=t.delay;n++;}}return{mae:mae/items.length,detected,changed:items.filter(x=>x.changing).length,falseAlarms,delay:n?delay/n:null};}
function median(values){if(!values.length)return 1.8;const a=[...values].sort((x,y)=>x-y);return a[Math.floor(a.length/2)];}
function noiseEstimate(samples){const deviations=[];for(const values of Object.values(samples)){if(values.length>=2){for(let i=1;i<values.length;i++)deviations.push(Math.abs(values[i]-values[i-1]));}}return clamp(median(deviations)/0.954,0.35,4.5);}
// Phase 4.3 measures the same observable signals as 4.2 but never reads hidden
// truth, the true noise parameter, change time, or affected keys to choose actions.
// The simulator reads those hidden values only to generate observations and score.
export function guardedTrial(c,portfolio,options={}){
 const w=world(c.seed,c.noise,c.changing),r=rng(c.seed^0x5a71),b=brain(),samples=Object.fromEntries(KEYS.map(k=>[k,[]]));
 // Exactly 90 observations: 30 calibration, 60 active; each confirmation consumes one.
 for(let i=0;i<30;i++){const k=KEYS[Math.floor(r()*KEYS.length)];const truth=w.initial[k];const value=truth+gaussian(r)*w.noise;samples[k].push(value);const q=b.rules[k];q.mean+= (value-q.mean)/(q.n+1);q.n++;b.count++;}
 let estimate=noiseEstimate(samples),switches=0,alarms=[],suspects=new Map(),lastBucket=-1;
 const cooldown=Object.fromEntries(KEYS.map(k=>[k,0]));
 const streaks=Object.fromEntries(KEYS.map(k=>[k,0]));
 for(let i=30;i<90;i++){
  const bucket=estimate<1.3?0:estimate<2.45?1:2;
  if(lastBucket>=0&&bucket!==lastBucket)switches++;
  lastBucket=bucket;
  const base=normalize(portfolio[bucket]||DEFAULT);
  // Increased threshold and confirmations under high estimated noise.
  const threshold=Math.max(4.5,base.threshold)*(bucket===2?1.65:bucket===1?1.5:1.4);
  const required=3;
  let key;
  if(suspects.size){key=[...suspects.entries()].sort((a,b)=>b[1].severity-a[1].severity)[0][0];}
  else {let best=-Infinity;for(const k of KEYS){const q=b.rules[k];const priority=1/(1+q.n)+r()*.08+streaks[k]*.01;if(priority>best){best=priority;key=k;}}}
  const q=b.rules[key],truth=(w.changing&&i>=w.changeAt?w.final:w.initial)[key],value=truth+gaussian(r)*w.noise;
  const reference=suspects.has(key)?suspects.get(key).reference:q.mean;
  const deviation=value-reference;
  const sigma=Math.max(1.8,estimate);
  const limit=threshold*sigma;
  const suspect=suspects.get(key);
  if(suspect){
   if(Math.sign(deviation)===suspect.sign&&Math.abs(deviation)>limit*.68){
    suspect.values.push(value);suspect.severity=Math.abs(deviation)/sigma;
    if(suspect.values.length>=required){
     // Only declare a change if the average confirmation remains strong.
     const confirmed=avg(suspect.values);
     if(Math.abs(confirmed-reference)>limit*.85){alarms.push({key,at:i+1});q.mean=confirmed;q.n=5;cooldown[key]=i+25;}
     suspects.delete(key);streaks[key]=0;
    }
   }else{suspects.delete(key);streaks[key]=0;}
  }else if(i>=cooldown[key]&&q.n>=3&&Math.abs(deviation)>limit){
   suspects.set(key,{reference,sign:Math.sign(deviation),values:[value],severity:Math.abs(deviation)/sigma});
   streaks[key]++;
  }
  if(!suspects.has(key)){
   const rate=q.n<5?1/(q.n+1):base.rate;
   // Do not let one extreme measurement destroy the baseline.
   q.mean+=rate*clamp(value-q.mean,-3*sigma,3*sigma);q.n++;
  }
  samples[key].push(value);if(samples[key].length>8)samples[key].shift();
  if((i-29)%8===0){const fresh=noiseEstimate(samples);estimate=.65*estimate+.35*fresh;}
  b.count++;
 }
 const hits=alarms.filter(a=>c.changing&&a.at>w.changeAt&&w.affected.includes(a.key));
 return{mae:evaluate(b,w),detected:hits.length>0,falseAlarms:alarms.length-hits.length,delay:hits.length?Math.min(...hits.map(a=>a.at-w.changeAt)):null,switches,estimate};
}
export function run43(seed=2027,previous=[]){
 const seeds=[seed,seed+11003,seed+22009],runs=[];
 for(const s of seeds){
  const prior=run42(s,previous),test=cases(s+1900000,36),guard=summarize(test,c=>guardedTrial(c,prior.portfolio));
  runs.push({seed:s,phase41:prior.test.evolution,phase42:prior.test.portfolio,phase43:guard,byNoise:LEVELS.map(noise=>({noise,phase42:summarize(test.filter(c=>c.noise===noise),c=>portfolioTrial(c,prior.portfolio)),phase43:summarize(test.filter(c=>c.noise===noise),c=>guardedTrial(c,prior.portfolio))})),portfolio:prior.portfolio});
 }
 const aggregate=key=>{const a=runs.map(r=>r[key]);return{mae:avg(a.map(x=>x.mae)),detected:a.reduce((s,x)=>s+x.detected,0),changed:a.reduce((s,x)=>s+x.changed,0),falseAlarms:a.reduce((s,x)=>s+x.falseAlarms,0),delay:avg(a.filter(x=>x.delay!==null).map(x=>x.delay))};};
 return{runs,aggregate:{phase41:aggregate('phase41'),phase42:aggregate('phase42'),phase43:aggregate('phase43')},seeds};
}
