// LernBot Phase 4.3.8 R2 — validation-gated defensive deployment.
// Truth/noise in the underlying 4.2 reference is used by the historical
// detector (model.js); this limitation is stated in the report.
import {run42,portfolioTrial} from './portfolio.js';
import {reliabilityTrial} from './reliability438.js';
import {hybridTrial} from './guard437.js';
const LEVELS=[0.8,1.8,3.0];
const POLICIES=[
  {sensitivity:1.20,highFactor:.87,confirmation:.70,singleFloor:.40,maxChecks:12},
  {sensitivity:1.32,highFactor:.88,confirmation:.75,singleFloor:.45,maxChecks:12},
  {sensitivity:1.38,highFactor:.94,confirmation:.78,singleFloor:.52,maxChecks:12},
  {sensitivity:1.43,highFactor:.90,confirmation:.72,singleFloor:.47,maxChecks:14},
  {sensitivity:1.48,highFactor:.95,confirmation:.80,singleFloor:.55,maxChecks:10}
];
const avg=xs=>xs.length?xs.reduce((s,x)=>s+x,0)/xs.length:null;
const cases=(seed,count)=>Array.from({length:count},(_,i)=>({seed:seed+i*97,noise:LEVELS[i%3],changing:i%4!==0}));
function summary(cases,fn){
 let mae=0,detected=0,fa=0,checks=0,delayTotal=0,delayCount=0,confirmed=0,rejected=0;
 for(const c of cases){const x=fn(c);mae+=x.mae;detected+=Number(x.detected);fa+=x.falseAlarms;checks+=x.checks||0;confirmed+=x.confirmed||0;rejected+=x.rejected||0;if(x.delay!=null){delayTotal+=x.delay;delayCount++;}}
 return {mae:mae/cases.length,detected,changed:cases.filter(c=>c.changing).length,falseAlarms:fa,delay:delayCount?delayTotal/delayCount:null,checks,confirmed,rejected};
}
const fitness=s=>s.mae+0.60*s.falseAlarms+1.00*(s.changed-s.detected)+0.002*s.checks;
function passes(candidate,baseline,slack=0){
 return candidate.detected>baseline.detected && candidate.falseAlarms<=baseline.falseAlarms+slack && candidate.mae<=baseline.mae+0.02;
}
export function run438Seed(seed=2027,previous=[]){
 // Historical portfolio training unchanged. Every stage has disjoint world seeds.
 const prior=run42(seed,previous);
 const train=cases(seed+9300000,30),valid=cases(seed+10300000,24),test=cases(seed+15900000,36);
 const base=c=>portfolioTrial(c,prior.portfolio);
 const baseTrain=summary(train,base),baseValid=summary(valid,base);
 const candidates=POLICIES.map(policy=>({policy,training:summary(train,c=>reliabilityTrial(c,prior.portfolio,policy))})).sort((a,b)=>fitness(a.training)-fitness(b.training));
 // Training-only shortlist (at most three). Validation is used for selection,
 // and is never added to reported held-out test performance.
 const shortlisted=candidates.slice(0,3).map(({policy,training})=>({policy,training,validation:summary(valid,c=>reliabilityTrial(c,prior.portfolio,policy))}));
 const eligible=shortlisted.filter(x=>passes(x.training,baseTrain,1)&&passes(x.validation,baseValid,0));
 eligible.sort((a,b)=>fitness(a.validation)-fitness(b.validation));
 const winning=eligible.length&&fitness(eligible[0].validation)<fitness(baseValid)?eligible[0]:null;
 const selected=winning?{mode:'Zuverlässigkeitsprüfung',policy:winning.policy}:{mode:'Bewährte Basis 4.2',policy:null};
 const enhanced=c=>winning?reliabilityTrial(c,prior.portfolio,winning.policy):base(c);
 const originalHybrid=c=>hybridTrial(c,prior.portfolio,{sensitivity:1.45,confirmation:.8,mediumBoost:1,highNoiseBoost:.88,maxChecks:14});
 const safest=shortlisted[0];
 const result={
   seed,selected,selectedWhy:winning?'Regel erfüllte die Sicherheitskriterien auf Trainings- UND Validierungswelten.':'Keine neue Regel erfüllte die Sicherheitskriterien auf getrennten Trainings- und Validierungswelten.',
   training:{base:baseTrain,best:safest.training},validation:{base:baseValid,best:safest.validation},
   test:{base:summary(test,base),experimental:summary(test,c=>reliabilityTrial(c,prior.portfolio,safest.policy)),hybrid:summary(test,originalHybrid),selected:summary(test,enhanced)},
   byNoise:LEVELS.map(noise=>{const scoped=test.filter(c=>c.noise===noise);return{noise,base:summary(scoped,base),selected:summary(scoped,enhanced)};}),
   trainCount:train.length,validationCount:valid.length,testCount:test.length,
   shortlistedCount:shortlisted.length,eligibleCount:eligible.length,
 };
 return result;
}
function aggregate(runs,key){
 const xs=runs.map(x=>x.test[key]); const delays=xs.filter(x=>x.delay!=null).map(x=>x.delay);
 return {mae:avg(xs.map(x=>x.mae)),detected:xs.reduce((n,x)=>n+x.detected,0),changed:xs.reduce((n,x)=>n+x.changed,0),falseAlarms:xs.reduce((n,x)=>n+x.falseAlarms,0),delay:avg(delays),checks:xs.reduce((n,x)=>n+x.checks,0)};
}
export function join438(runs){return {version:'4.3.8 R2',seeds:runs.map(r=>r.seed),runs,aggregate:{base:aggregate(runs,'base'),hybrid:aggregate(runs,'hybrid'),experimental:aggregate(runs,'experimental'),selected:aggregate(runs,'selected')},notes:[
 '90 Messungen je Welt inklusive Kalibrierung und Kontrollmessungen.',
 'Pro Durchlauf getrennt: 30 Trainingswelten, 24 Validierungswelten, 36 bisher nicht für die Regelauswahl verwendete Testwelten.',
 'Die Prüfregel wird ausschließlich anhand von Training und Validierung aktiviert; Testdaten bestimmen nie die Regel.',
 '4.2 bleibt eine historische Referenz: Die Originalfunktion step() verwendet intern das tatsächliche Simulationsrauschen. Ihr Vergleich ist daher kein vollständig fairer Blindvergleich zu neuen Detektoren.',
 'Die 4.3.7 Vergleichsregel ist fest und nicht identisch mit früher trainierten 4.3.7 Läufen.',
 'Erkannt bedeutet: mindestens ein relevanter Wechsel pro veränderter Welt (nicht alle drei geänderten Eigenschaften).',
 'Nur simuliertes Lernen, keine selbstständige Änderung des Quellcodes.'
 ]};}
export function run438(seed=2027,previous=[]){return join438([seed,seed+11003,seed+22009].map(s=>run438Seed(s,previous)));}
