// Phase 4.3.9: frozen holdout audit. No evaluation policy reads hidden world noise.
import {KEYS,DEFAULT,normalize,world,rng,brain,evaluate} from './model.js';
import {run42,portfolioTrial} from './portfolio.js';
import {reliabilityTrial} from './reliability438.js';
import {hybridTrial} from './guard437.js';

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
 return{mae:evaluate(b,w),detected:hits.length>0,falseAlarms:b.alarms.length-hits.length,delay:hits.length?Math.min(...hits.map(a=>a.at-w.changeAt)):null,checks:0,estimate:sigma};
}
function summary(items,fn){let error=0,detected=0,fa=0,checks=0,delaySum=0,delays=0;for(const c of items){const t=fn(c);error+=t.mae;detected+=Number(t.detected);fa+=t.falseAlarms;checks+=t.checks||0;if(t.delay!=null){delaySum+=t.delay;delays++;}}return{mae:error/items.length,detected,changed:items.filter(x=>x.changing).length,falseAlarms:fa,delay:delays?delaySum/delays:null,checks,delayCases:delays,worlds:items.length};}
const fitness=s=>s.mae+0.45*s.falseAlarms+1.0*(s.changed-s.detected)+.002*s.checks;
const passes=(candidate,base)=>candidate.detected>=base.detected&&candidate.falseAlarms<=base.falseAlarms&&candidate.mae<=base.mae+.02&&fitness(candidate)<fitness(base);
export function run439Seed(seed=2027,previous=[]){
 const prior=run42(seed,previous);
 const train=cases(seed+16900000,30),valid=cases(seed+17900000,24),test=cases(seed+22900000,36);
 const blind=c=>blindTrial(c,prior.portfolio),historical=c=>portfolioTrial(c,prior.portfolio);
 const baseTrain=summary(train,blind),baseValid=summary(valid,blind);
 const ranked=POLICIES.map(policy=>({policy,training:summary(train,c=>reliabilityTrial(c,prior.portfolio,policy))})).sort((a,b)=>fitness(a.training)-fitness(b.training));
 const shortlist=ranked.slice(0,3).map(x=>({...x,validation:summary(valid,c=>reliabilityTrial(c,prior.portfolio,x.policy))}));
 const eligible=shortlist.filter(x=>passes(x.training,baseTrain)&&passes(x.validation,baseValid)).sort((a,b)=>fitness(a.validation)-fitness(b.validation));
 const winner=eligible[0]||null;
 // Keep final held-out set sealed until all selections have been decided.
 const chosen=c=>winner?reliabilityTrial(c,prior.portfolio,winner.policy):blind(c);
 const rawExperiment=c=>reliabilityTrial(c,prior.portfolio,shortlist[0].policy);
 const hybrid=c=>hybridTrial(c,prior.portfolio,{sensitivity:1.45,confirmation:.8,mediumBoost:1,highNoiseBoost:.88,maxChecks:14});
 const testSummary={blind:summary(test,blind),selected:summary(test,chosen),experiment:summary(test,rawExperiment),hybrid:summary(test,hybrid),historical:summary(test,historical)};
 return{
  seed,selected:winner?'Experimentelle Regel':'Blind-Basis (Rückfall)',winningPolicy:winner?.policy||null,
  eligible:eligible.length,shortlisted:shortlist.length,training:{blind:baseTrain,best:shortlist[0].training},validation:{blind:baseValid,best:shortlist[0].validation},test:testSummary,
  byNoise:LEVELS.map(noise=>{const group=test.filter(x=>x.noise===noise);return{noise,blind:summary(group,blind),selected:summary(group,chosen),historical:summary(group,historical)};}),
  counts:{training:train.length,validation:valid.length,test:test.length}
 };
}
function aggregate(runs,k){const a=runs.map(x=>x.test[k]),n=a.reduce((s,x)=>s+x.worlds,0),d=a.reduce((s,x)=>s+x.delay*x.delayCases||s,0),dn=a.reduce((s,x)=>s+x.delayCases,0);return{mae:a.reduce((s,x)=>s+x.mae*x.worlds,0)/n,detected:a.reduce((s,x)=>s+x.detected,0),changed:a.reduce((s,x)=>s+x.changed,0),falseAlarms:a.reduce((s,x)=>s+x.falseAlarms,0),delay:dn?d/dn:null,checks:a.reduce((s,x)=>s+x.checks,0),worlds:n};}
export function join439(runs){return{version:'4.3.9',seeds:runs.map(r=>r.seed),runs,aggregate:Object.fromEntries(['blind','selected','experiment','hybrid','historical'].map(k=>[k,aggregate(runs,k)])),methodology:[
 'Jede Welt: 90 Messschritte inklusive Kontrollen; gleiche Welten je Strategie, aber verschiedene Messfolgen möglich.',
 'Für die Detektorentscheidung nutzt die neue Blind-Basis ausschließlich geschätztes Rauschen aus frühen Messungen.',
 'Trainieren: 30 Welten, Validieren: 24 Welten, Testen: 36 neue Welten je Seed. Tests werden nicht für die Strategiewahl genutzt.',
 'Historische 4.2-Spalte nur zur Orientierung: ihre Alarmregel liest echtes Simulationsrauschen und ist kein fairer Blindvergleich.',
 'Portfolio-Parameter aus früherem 4.2-Training verwenden simulierte Rauschlabels; die Detektorprüfung selbst bleibt blind.',
 'Erkennung = mindestens ein zutreffender Alarm pro veränderter Welt, nicht alle drei geänderten Eigenschaften.',
 'Verzögerung nur für erkannte Veränderungen, daher bei niedriger Erkennung nicht allein aussagekräftig.',
 'Seeds sind neue Bereiche, aber das Modell und seine Regeln wurden zuvor bereits vielfach entwickelt und betrachtet.',
 'Reproduzierbare Simulation ohne Internet und ohne eigenständige Änderung von Programmcode.'
 ]};}
