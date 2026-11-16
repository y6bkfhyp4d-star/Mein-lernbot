// Standalone reproducible simulator. All strategies share the same generated observations.
export function rng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
const normal=r=>Math.sqrt(-2*Math.log(Math.max(1e-9,r())))*Math.cos(2*Math.PI*r());
const mean=a=>a.reduce((s,x)=>s+x,0)/Math.max(1,a.length);
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
export function makeWorld(seed,noise,changing){const r=rng(seed);const base=17+r()*12;const shift=(r()<.5?-1:1)*(3.2+r()*3.2);const changeAt=37+Math.floor(r()*15);const observations=Array.from({length:90},(_,i)=>base+(changing&&i>=changeAt?shift:0)+normal(r)*noise);return{seed,noise,changing,changeAt,base,shift,observations};}
// Baseline: exponentially weighted prediction with residual-based alarms.
// An alarm is evaluated against ground truth ONLY after the run.
export function simulate(w,policy){let estimate=w.observations[0],error=0;let lastAlarm=-100,streak=0,alarms=[],checks=0,consecutive=0,firstHit=null;const residuals=[];const predictions=[];const budget=policy==='guarded'?8:policy==='aggressive'?90:0;
for(let t=1;t<90;t++){
 const y=w.observations[t];const residual=y-estimate;error+=Math.abs(residual);predictions.push(estimate);residuals.push(residual);
 const recent=residuals.slice(-14,-1);const noiseHat=clamp(mean(recent.map(x=>Math.abs(x)))*1.253,0.65,4.5);
 const z=Math.abs(residual)/noiseHat;
 if(policy==='baseline'){
   if(t>=12&&z>3.4&&t-lastAlarm>7){alarms.push(t);lastAlarm=t;}
 }else if(policy==='aggressive'){
   if(t>=12&&z>2.0&&t-lastAlarm>3){alarms.push(t);lastAlarm=t;}
   if(t>=12&&z>1.6&&checks<budget){checks++;estimate+=.25*residual;}
 }else{
   // Confirm persistent residuals, cap checks and suppress repeated alarms.
   if(t>=12&&z>2.1&&Math.sign(residual)===Math.sign(residuals.at(-2)||0))streak++;else streak=0;
   if(t>=12&&z>2.25&&checks<budget&&t-lastAlarm>8){checks++;consecutive++;}else consecutive=0;
   if(t>=12&&(streak>=2||z>3.7&&consecutive>=1)&&t-lastAlarm>15){alarms.push(t);lastAlarm=t;streak=0;consecutive=0;}
 }
 estimate+=0.13*residual;
}
// First valid alarm after true change; all other alarms are false positives.
const valid=w.changing?alarms.find(t=>t>=w.changeAt&&t<=w.changeAt+22):undefined;
firstHit=valid===undefined?null:valid;
return{mae:error/89,detected:firstHit!==null,falseAlarms:alarms.length-(firstHit!==null?1:0),delay:firstHit===null?null:firstHit-w.changeAt,checks,alarms};}
export function cases(seed,n){const levels=[.8,1.8,3];return Array.from({length:n},(_,i)=>{const s=(seed+i*97)>>>0;return makeWorld(s,levels[i%3],i%4!==0);});}
export function summarize(worlds,policy){const runs=worlds.map(w=>simulate(w,policy));const delays=runs.filter(x=>x.delay!==null).map(x=>x.delay);return{mae:mean(runs.map(x=>x.mae)),detected:runs.filter(x=>x.detected).length,changed:worlds.filter(x=>x.changing).length,falseAlarms:runs.reduce((s,x)=>s+x.falseAlarms,0),delay:delays.length?mean(delays):null,checks:runs.reduce((s,x)=>s+x.checks,0)};}
export function runAll(seeds,n){const rows=seeds.map(seed=>{const train=cases(seed+20000,36);const validation=cases(seed+720000,18);const test=cases(seed+1900000,n);return{seed,trainingWorlds:train.length,validationWorlds:validation.length,testWorlds:n,baseline:summarize(test,'baseline'),aggressive:summarize(test,'aggressive'),guarded:summarize(test,'guarded'),byNoise:[.8,1.8,3].map(noise=>({noise,baseline:summarize(test.filter(w=>w.noise===noise),'baseline'),aggressive:summarize(test.filter(w=>w.noise===noise),'aggressive'),guarded:summarize(test.filter(w=>w.noise===noise),'guarded')}))};});const all=seeds.flatMap(seed=>cases(seed+1900000,n));return{version:'4.3.5',kind:'eigenstaendige Simulation – kein exakter Nachbau von 4.2/4.3.4',seeds,worlds:all.length,overall:{baseline:summarize(all,'baseline'),aggressive:summarize(all,'aggressive'),guarded:summarize(all,'guarded')},runs:rows};}
