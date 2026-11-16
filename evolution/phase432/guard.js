import {DEFAULT,KEYS,world,brain,step,rng,evaluate,normalize} from './model.js';
import {run42,portfolioTrial} from './portfolio.js';
const LEVELS=[0.8,1.8,3];
const avg=a=>a.reduce((s,v)=>s+v,0)/Math.max(1,a.length);
const cases=(seed,n)=>Array.from({length:n},(_,i)=>({seed:seed+i*97,noise:LEVELS[i%3],changing:i%4!==0}));
function estimateNoise(b){const groups=new Map();for(const h of b.history){const a=groups.get(h.key)||[];a.push(h.measurement);groups.set(h.key,a);}const diffs=[];for(const a of groups.values())if(a.length>1)for(let i=1;i<a.length;i++)diffs.push(Math.abs(a[i]-a[0]));return Math.max(.2,avg(diffs)/1.128);}
function summary(items){let mae=0,detected=0,falseAlarms=0,delay=0,n=0;for(const t of items){mae+=t.mae;detected+=+t.detected;falseAlarms+=t.falseAlarms;if(t.delay!==null){delay+=t.delay;n++;}}return{mae:mae/items.length,detected,changed:items.filter(t=>t.changing).length,falseAlarms,delay:n?delay/n:null};}
// Identical simulation and actions to Phase 4.2. The diagnostics never change the brain.
// Truth is consulted ONLY after simulation, for evaluation of hypothetical alarm filters.
export function diagnosticTrial(c,portfolio){
 const w=world(c.seed,c.noise,c.changing),b=brain(),r=rng(c.seed^0x5a71);
 for(let i=0;i<30;i++)step(b,w,r,'random',DEFAULT);
 const estimate=estimateNoise(b),bucket=estimate<1.3?0:estimate<2.45?1:2;
 const selected=normalize(portfolio[bucket]||DEFAULT),records=[];
 for(let i=30;i<90;i++){
  const pending=b.pending?{...b.pending}:null;
  const out=step(b,w,r,'adaptive',selected);
  if(out.event==='Hypothese bestätigt'&&pending){
   const first=Math.abs(pending.value-pending.reference);
   const second=Math.abs(out.measurement-pending.reference);
   records.push({key:out.key,at:out.step,ratio:second/Math.max(.001,first)});
  }
 }
 // Each alarm is tagged only here, after the complete run.
 for(const a of records){a.trueChange=Boolean(c.changing&&a.at>w.changeAt&&w.affected.includes(a.key));a.delay=a.at-w.changeAt;}
 const hits=records.filter(a=>a.trueChange);
 return {mae:evaluate(b,w),changing:c.changing,records,detected:hits.length>0,falseAlarms:records.length-hits.length,delay:hits.length?Math.min(...hits.map(a=>a.at-w.changeAt)):null};
}
function filtered(trials,ratio){return summary(trials.map(t=>{
 const kept=t.records.filter(a=>a.ratio>=ratio),hits=kept.filter(a=>a.trueChange);
 return{mae:t.mae,changing:t.changing,detected:hits.length>0,falseAlarms:kept.length-hits.length,delay:hits.length?Math.min(...hits.map(a=>a.delay)):null};
}));}
// Use only training worlds to select a diagnostic threshold; no test-world tuning.
const FILTERS=[0,0.3,0.45,0.55,0.7];
function analyze(trials){const baseline=filtered(trials,0);return FILTERS.map(r=>{
 const stats=filtered(trials,r);
 return{ratio:r,stats,preventedFalseAlarms:baseline.falseAlarms-stats.falseAlarms,lostDetected:baseline.detected-stats.detected};
});}
function choosePolicy(rows){return [...rows].sort((a,b)=>{
 const fa=a.stats.falseAlarms+.0,miss=a.stats.changed-a.stats.detected;
 const fb=b.stats.falseAlarms+.0,missb=b.stats.changed-b.stats.detected;
 return (miss*3+fa)-(missb*3+fb)||a.ratio-b.ratio;
})[0].ratio;}
export function run432(seed=2027,previous=[]){
 const seeds=[seed,seed+11003,seed+22009],runs=[];
 for(const s of seeds){
  const prior=run42(s,previous),portfolio=prior.portfolio;
  const training=cases(s+20000,30).map(c=>diagnosticTrial(c,portfolio));
  const validation=cases(s+720000,12).map(c=>diagnosticTrial(c,portfolio));
  const testCases=cases(s+1900000,36);
  const trials=testCases.map(c=>diagnosticTrial(c,portfolio));
  const selected=choosePolicy(analyze(training));
  const report=analyze(trials),best=report.find(x=>x.ratio===selected);
  const baseline=report[0].stats;
  const same=summary(testCases.map(c=>portfolioTrial(c,portfolio)).map((x,i)=>({...x,changing:testCases[i].changing})));
  runs.push({seed:s,phase41:prior.test.evolution,phase42:prior.test.portfolio,baseline,selected,training:analyze(training),validation:analyze(validation),test:report,chosen:best,checksMatch:Math.abs(same.mae-baseline.mae)<1e-9&&same.detected===baseline.detected&&same.falseAlarms===baseline.falseAlarms});
 }
 for(const run of runs)run.chosenStats=run.chosen.stats;
 const aggregate=key=>{const a=runs.map(r=>r[key]);const d=a.filter(x=>x.delay!==null);return{mae:avg(a.map(x=>x.mae)),detected:a.reduce((s,x)=>s+x.detected,0),changed:a.reduce((s,x)=>s+x.changed,0),falseAlarms:a.reduce((s,x)=>s+x.falseAlarms,0),delay:d.length?avg(d.map(x=>x.delay)):null};};
 return{seeds,runs,aggregate:{phase41:aggregate('phase41'),phase42:aggregate('phase42'),baseline:aggregate('baseline'),shadow:aggregate('chosenStats')},filters:FILTERS};
}
