import {DEFAULT, KEYS, world, brain, step, rng, evaluate, normalize} from './model.js';
import {run42, portfolioTrial} from './portfolio.js';

const LEVELS=[0.8,1.8,3];
const avg=a=>a.reduce((s,v)=>s+v,0)/Math.max(1,a.length);
function cases(seed,n){return Array.from({length:n},(_,i)=>({seed:seed+i*97,noise:LEVELS[i%3],changing:i%4!==0}));}
function summarize(items,fn){let mae=0,detected=0,falseAlarms=0,delay=0,n=0,weak=0;for(const c of items){const t=fn(c);mae+=t.mae;detected+=Number(t.detected);falseAlarms+=t.falseAlarms;weak+=t.weakConfirmations||0;if(t.delay!==null){delay+=t.delay;n++;}}return{mae:mae/items.length,detected,changed:items.filter(x=>x.changing).length,falseAlarms,delay:n?delay/n:null,weakConfirmations:weak};}
function estimateNoise(b){const groups=new Map();for(const h of b.history){const a=groups.get(h.key)||[];a.push(h.measurement);groups.set(h.key,a);}const diffs=[];for(const a of groups.values())if(a.length>1)for(let i=1;i<a.length;i++)diffs.push(Math.abs(a[i]-a[0]));return Math.max(.2,avg(diffs)/1.128);}

// 4.3.1: Sicherheitsreparatur. Die bewährte 4.2-Entscheidungslogik bleibt
// absichtlich unverändert. Wir zeichnen fragliche Bestätigungen auf, ohne
// auf Grundlage von Test-Wahrheit die Entscheidung nachträglich zu verändern.
// Die Diagnostik verwendet ausschließlich vorliegende Messwerte.
export function guardedTrial(c,portfolio){
 const w=world(c.seed,c.noise,c.changing),b=brain(),r=rng(c.seed^0x5a71);
 for(let i=0;i<30;i++)step(b,w,r,'random',DEFAULT);
 const estimate=estimateNoise(b),bucket=estimate<1.3?0:estimate<2.45?1:2;
 const selected=normalize(portfolio[bucket]||DEFAULT);
 let weakConfirmations=0,checks=0,confirmed=0,rejected=0;
 const events=[];
 for(let i=30;i<90;i++){
  const before=b.pending?{...b.pending}:null;
  const result=step(b,w,r,'adaptive',selected);
  if(result.event==='Kontrollversuch')checks++;
  if(result.event==='Hypothese verworfen')rejected++;
  if(result.event==='Hypothese bestätigt'){
   confirmed++;
   if(before){
    const first=Math.abs(before.value-before.reference);
    const second=Math.abs(result.measurement-before.reference);
    const relative=second/Math.max(.001,first);
    if(relative<.55)weakConfirmations++;
    if(events.length<10)events.push({step:result.step,key:result.key,relativeConfirmation:Math.round(relative*100)/100});
   }
  }
 }
 const hits=b.alarms.filter(a=>c.changing&&a.at>w.changeAt&&w.affected.includes(a.key));
 return{mae:evaluate(b,w),detected:hits.length>0,falseAlarms:b.alarms.length-hits.length,delay:hits.length?Math.min(...hits.map(a=>a.at-w.changeAt)):null,estimate,bucket,weakConfirmations,checks,confirmed,rejected,events};
}
export function run431(seed=2027,previous=[]){
 const seeds=[seed,seed+11003,seed+22009],runs=[];
 for(const s of seeds){
  const prior=run42(s,previous),test=cases(s+1900000,36);
  const guard=summarize(test,c=>guardedTrial(c,prior.portfolio));
  runs.push({seed:s,phase41:prior.test.evolution,phase42:prior.test.portfolio,phase431:guard,
   byNoise:LEVELS.map(noise=>({noise,phase42:summarize(test.filter(c=>c.noise===noise),c=>portfolioTrial(c,prior.portfolio)),phase431:summarize(test.filter(c=>c.noise===noise),c=>guardedTrial(c,prior.portfolio))})),portfolio:prior.portfolio});
 }
 const aggregate=key=>{const a=runs.map(r=>r[key]);const d=a.filter(x=>x.delay!==null);return{mae:avg(a.map(x=>x.mae)),detected:a.reduce((s,x)=>s+x.detected,0),changed:a.reduce((s,x)=>s+x.changed,0),falseAlarms:a.reduce((s,x)=>s+x.falseAlarms,0),delay:d.length?avg(d.map(x=>x.delay)):null,weakConfirmations:a.reduce((s,x)=>s+(x.weakConfirmations||0),0)};};
 return{runs,aggregate:{phase41:aggregate('phase41'),phase42:aggregate('phase42'),phase431:aggregate('phase431')},seeds};
}
