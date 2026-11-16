import {KEYS,DEFAULT,normalize,world,rng,evaluate,brain,step} from './model.js';
import {run42,portfolioTrial} from './portfolio.js';
const LEVELS=[.8,1.8,3];
const avg=a=>a.reduce((s,x)=>s+x,0)/Math.max(1,a.length);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const cases=(seed,n)=>Array.from({length:n},(_,i)=>({seed:seed+i*97,noise:LEVELS[i%3],changing:i%4!==0}));
function summary(items,fn){let mae=0,detected=0,falseAlarms=0,delay=0,n=0,checks=0;for(const c of items){const t=fn(c);mae+=t.mae;detected+=+t.detected;falseAlarms+=t.falseAlarms;checks+=t.checks||0;if(t.delay!==null){delay+=t.delay;n++;}}return{mae:mae/items.length,detected,changed:items.filter(x=>x.changing).length,falseAlarms,delay:n?delay/n:null,checks};}
// Estimate measurement noise only from consecutive observations of the same key.
function estimateNoise(history){const groups=new Map();for(const h of history){const a=groups.get(h.key)||[];a.push(h.measurement);groups.set(h.key,a);}const differences=[];for(const a of groups.values())for(let i=1;i<a.length;i++)differences.push(Math.abs(a[i]-a[i-1]));return clamp(differences.length?avg(differences)/1.128:1.8,.45,4.5);}
// This trial has exactly 90 observations. It never uses hidden world data to choose actions.
export function priorityTrial(c,portfolio,policy={}){
 const w=world(c.seed,c.noise,c.changing),b=brain(),r=rng(c.seed^0x5a71);
 for(let i=0;i<30;i++)step(b,w,r,'random',DEFAULT);
 let sigma=estimateNoise(b.history),pending=null,checks=0;
 const alarms=[],cooldown=Object.fromEntries(KEYS.map(k=>[k,0]));
 const ratio=policy.ratio??.58,required=policy.required??2,limitBoost=policy.limitBoost??1;
 for(let i=30;i<90;i++){
  const bucket=sigma<1.3?0:sigma<2.45?1:2;
  const p=normalize(portfolio[bucket]||DEFAULT);
  let key;
  if(pending){key=pending.key;checks++;}
  else {let best=-Infinity;for(const k of KEYS){const q=b.rules[k],priority=1/(1+q.n)+r()*.0001;if(priority>best){best=priority;key=k;}}}
  const q=b.rules[key];
  // Hidden truth is read only to synthesize the observation, not to select actions.
  const truth=(w.changing&&i>=w.changeAt?w.final:w.initial)[key];
  const u=Math.max(1e-12,r()),v=r();
  const measurement=truth+Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)*w.noise;
  const reference=pending?pending.reference:q.mean;
  const delta=measurement-reference;
  const threshold=Math.max(1.7,p.threshold)*Math.max(.75,sigma)*limitBoost;
  let confirmed=false;
  if(pending){
   const same=Math.sign(delta)===pending.sign;
   if(same&&Math.abs(delta)>=threshold*ratio){pending.values.push(measurement);}
   else pending=null;
   if(pending&&pending.values.length>=required){
    const mean=avg(pending.values);
    if(Math.abs(mean-pending.reference)>=threshold*ratio){
     alarms.push({key,at:i+1});q.mean=mean;q.n=Math.max(q.n,5);cooldown[key]=i+20;confirmed=true;
    }
    pending=null;
   }
  }else if(i>=cooldown[key]&&q.n>=3&&Math.abs(delta)>=threshold){
   pending={key,reference:q.mean,sign:Math.sign(delta),values:[measurement]};
  }
  if(!pending&&!confirmed){const rate=q.n<5?1/(q.n+1):p.rate;q.mean+=rate*clamp(measurement-q.mean,-3*Math.max(.75,sigma),3*Math.max(.75,sigma));q.n++;}
  b.history.unshift({key,measurement});b.history.length=Math.min(45,b.history.length);
  if((i-29)%12===0)sigma=.7*sigma+.3*estimateNoise(b.history);
  b.count++;
 }
 const hits=alarms.filter(a=>c.changing&&a.at>w.changeAt&&w.affected.includes(a.key));
 return{mae:evaluate(b,w),detected:hits.length>0,falseAlarms:alarms.length-hits.length,delay:hits.length?Math.min(...hits.map(a=>a.at-w.changeAt)):null,checks};
}
const POLICIES=[{ratio:.45,required:2,limitBoost:.85},{ratio:.58,required:2,limitBoost:1},{ratio:.7,required:2,limitBoost:1.1},{ratio:.55,required:3,limitBoost:.9}];
const objective=s=>s.mae+.12*s.falseAlarms+.24*(s.changed-s.detected);
export function run434(seed=2027,previous=[]){
 const seeds=[seed,seed+11003,seed+22009],runs=[];
 for(const s of seeds){
  const prior=run42(s,previous),train=cases(s+2800000,24),test=cases(s+3900000,36);
  const ranked=POLICIES.map(policy=>({policy,train:summary(train,c=>priorityTrial(c,prior.portfolio,policy))})).sort((a,b)=>objective(a.train)-objective(b.train));
  const policy=ranked[0].policy;
  const baseline=summary(test,c=>portfolioTrial(c,prior.portfolio));
  const active=summary(test,c=>priorityTrial(c,prior.portfolio,policy));
  const byNoise=LEVELS.map(noise=>{const group=test.filter(c=>c.noise===noise);return{noise,baseline:summary(group,c=>portfolioTrial(c,prior.portfolio)),active:summary(group,c=>priorityTrial(c,prior.portfolio,policy))};});
  runs.push({seed:s,policy,training:ranked[0].train,baseline,active,byNoise});
 }
 const aggregate=key=>({mae:avg(runs.map(x=>x[key].mae)),detected:runs.reduce((n,x)=>n+x[key].detected,0),changed:runs.reduce((n,x)=>n+x[key].changed,0),falseAlarms:runs.reduce((n,x)=>n+x[key].falseAlarms,0),delay:avg(runs.map(x=>x[key].delay).filter(x=>x!==null)),checks:runs.reduce((n,x)=>n+x[key].checks,0)});
 return{runs,seeds,aggregate:{baseline:aggregate('baseline'),active:aggregate('active')}};
}
