import {KEYS,DEFAULT,normalize,world,rng,brain,step,evaluate} from './model.js';
import {run42,portfolioTrial} from './portfolio.js';
const LEVELS=[.8,1.8,3];
const avg=a=>a.reduce((s,x)=>s+x,0)/Math.max(1,a.length);
const cases=(seed,n)=>Array.from({length:n},(_,i)=>({seed:seed+i*97,noise:LEVELS[i%3],changing:i%4!==0}));
function estimateNoise(b){const groups=new Map();for(const h of b.history){const a=groups.get(h.key)||[];a.push(h.measurement);groups.set(h.key,a);}const d=[];for(const a of groups.values())if(a.length>1)for(let i=1;i<a.length;i++)d.push(Math.abs(a[i]-a[0]));return Math.max(.2,avg(d)/1.128);}
const gaussian=r=>Math.sqrt(-2*Math.log(Math.max(1e-12,r())))*Math.cos(2*Math.PI*r());
function summary(items,fn){let mae=0,detected=0,falseAlarms=0,delay=0,n=0,checks=0;for(const c of items){const t=fn(c);mae+=t.mae;detected+=Number(t.detected);falseAlarms+=t.falseAlarms;checks+=t.checks||0;if(t.delay!==null){delay+=t.delay;n++;}}return{mae:mae/items.length,detected,changed:items.filter(c=>c.changing).length,falseAlarms,delay:n?delay/n:null,checks};}
// This is a true online experiment: every additional confirmation consumes one of the 90 measurements.
// All decisions use measurements, the chosen portfolio and its noise estimate, never hidden world truth.
export function activeTrial(c,portfolio,ratio=.45){
 const w=world(c.seed,c.noise,c.changing),b=brain(),r=rng(c.seed^0x5a71);
 for(let i=0;i<30;i++)step(b,w,r,'random',DEFAULT);
 const estimate=estimateNoise(b),bucket=estimate<1.3?0:estimate<2.45?1:2;
 const p=normalize(portfolio[bucket]||DEFAULT);let checks=0,accepted=0,rejected=0;
 // Use original 4.2 exploration, hypothesis and learning logic. Only intercept a pending confirmation.
 // When the second observation is weak, use one extra *actual* measurement before accepting the alarm.
 for(let i=30;i<90;i++){
  if(b.pending&&!b.pending.extra&&ratio>0){
   const pending=b.pending,k=pending.key,q=b.rules[k],ref=pending.reference;
   // The 4.2 step itself draws one measurement and resolves the original hypothesis.
   const before=b.alarms.length;
   const out=step(b,w,r,'adaptive',p);
   if(b.alarms.length>before){
    const first=Math.abs(pending.value-ref),second=Math.abs(out.measurement-ref);
    if(second/Math.max(.001,first)<ratio){
     // Provisional alarm: freeze the old reference, draw a real confirmation on next step.
     // This overwrites the provisional model update and reserves the next observation.
     b.alarms.pop();q.mean=ref;q.n=Math.max(4,q.n);b.pending={key:k,reference:ref,first:pending.value,second:out.measurement,sign:Math.sign(pending.value-ref),extra:true};
    }else accepted++;
   }
   continue;
  }
  if(b.pending?.extra){
   const pending=b.pending,k=pending.key,q=b.rules[k],truth=(w.changing&&b.count>=w.changeAt?w.final:w.initial)[k];
   const measurement=truth+gaussian(r)*w.noise;checks++;
   const d=measurement-pending.reference;
   const consistent=Math.sign(d)===pending.sign&&Math.abs(d)>=Math.abs(pending.first-pending.reference)*ratio;
   if(consistent){b.alarms.push({key:k,at:b.count+1});q.mean=(pending.first+pending.second+measurement)/3;q.n=3;accepted++;}
   else{q.mean=pending.reference;rejected++;}
   b.pending=null;b.count++;
   b.history.unshift({step:b.count,key:k,measurement,prior:pending.reference,error:Math.abs(d),event:consistent?'Zusatzprüfung bestätigt':'Zusatzprüfung verworfen'});b.history=b.history.slice(0,45);
   continue;
  }
  step(b,w,r,'adaptive',p);
 }
 const hits=b.alarms.filter(a=>c.changing&&a.at>w.changeAt&&w.affected.includes(a.key));
 return{mae:evaluate(b,w),detected:hits.length>0,falseAlarms:b.alarms.length-hits.length,delay:hits.length?Math.min(...hits.map(a=>a.at-w.changeAt)):null,checks,accepted,rejected};
}
const RATIOS=[0,.3,.45,.55];
function objective(s){return s.mae+.15*s.falseAlarms+.35*(s.changed-s.detected);}
export function run433(seed=2027,previous=[]){
 const seeds=[seed,seed+11003,seed+22009],runs=[];
 for(const s of seeds){
  const prior=run42(s,previous),portfolio=prior.portfolio;
  // Separate new policy-selection and validation sets from the 4.2 portfolio-training sets.
  const train=cases(s+2800000,36),valid=cases(s+3200000,18),test=cases(s+3600000,36);
  const training=RATIOS.map(r=>({ratio:r,stats:summary(train,c=>activeTrial(c,portfolio,r))}));
  const baseline=training[0].stats;
  // Safeguard: on policy-training data, allow no more than one additional missed change.
  const eligible=training.filter(x=>x.stats.detected>=baseline.detected-1);
  const chosen=[...eligible].sort((a,b)=>objective(a.stats)-objective(b.stats)||a.ratio-b.ratio)[0];
  const validation=RATIOS.map(r=>({ratio:r,stats:summary(valid,c=>activeTrial(c,portfolio,r))}));
  const old=summary(test,c=>portfolioTrial(c,portfolio));
  const active=summary(test,c=>activeTrial(c,portfolio,chosen.ratio));
  const base=summary(test,c=>activeTrial(c,portfolio,0));
  runs.push({seed:s,selected:chosen.ratio,training,validation,old,base,active,byNoise:LEVELS.map(noise=>({noise,old:summary(test.filter(c=>c.noise===noise),c=>portfolioTrial(c,portfolio)),active:summary(test.filter(c=>c.noise===noise),c=>activeTrial(c,portfolio,chosen.ratio))}))});
 }
 const aggregate=k=>{const a=runs.map(x=>x[k]),d=a.filter(x=>x.delay!==null);return{mae:avg(a.map(x=>x.mae)),detected:a.reduce((s,x)=>s+x.detected,0),changed:a.reduce((s,x)=>s+x.changed,0),falseAlarms:a.reduce((s,x)=>s+x.falseAlarms,0),delay:d.length?avg(d.map(x=>x.delay)):null,checks:a.reduce((s,x)=>s+x.checks,0)};};
 return{seeds,runs,aggregate:{old:aggregate('old'),base:aggregate('base'),active:aggregate('active')}};
}
