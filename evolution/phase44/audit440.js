// Phase 4.4 – stabiler Audit, eine geänderte Eigenschaft zählt einzeln.
// Kein Detektor liest die verborgenen Felder der Welt zur Entscheidungsfindung.
import {world} from './model.js';
import {run42} from './portfolio.js';
import {blindTrial} from './blind440.js';
import {hybridTrial} from './guard437.js';
import {reliabilityTrial} from './reliability438.js';

const NOISE=[0.8,1.8,3.0];
const POLICY=[
 {sensitivity:1.20,highFactor:.87,confirmation:.70,singleFloor:.40,maxChecks:12},
 {sensitivity:1.32,highFactor:.88,confirmation:.75,singleFloor:.45,maxChecks:12},
 {sensitivity:1.38,highFactor:.94,confirmation:.78,singleFloor:.52,maxChecks:12},
 {sensitivity:1.43,highFactor:.90,confirmation:.72,singleFloor:.47,maxChecks:14},
 {sensitivity:1.48,highFactor:.95,confirmation:.80,singleFloor:.55,maxChecks:10}
];
const HYBRID={sensitivity:1.45,confirmation:.80,mediumBoost:1,highNoiseBoost:.88,maxChecks:14};
const cases=(seed,count)=>Array.from({length:count},(_,i)=>({seed:seed+i*101,noise:NOISE[i%3],changing:i%4!==0}));

// First true alarm for each changed property is one hit. Duplicate alerts, alerts
// before change, and alerts on unchanged properties count as false alarms.
export function scoreEvents(c,events){
 const w=world(c.seed,c.noise,c.changing), found=new Set(),hits=[];let falseAlarms=0;
 for(const a of events||[]){
  if(w.changing&&a.at>w.changeAt&&w.affected.includes(a.key)&&!found.has(a.key)){
   found.add(a.key);hits.push(a.at-w.changeAt);
  }else falseAlarms++;
 }
 return {keyHits:found.size,missedKeys:w.affected.length-found.size,worldHit:found.size>0?1:0,
   changedKeys:w.affected.length,falseAlarms,delay:hits.length?Math.min(...hits):null};
}
function inspect(c,fn){const out=fn(c),score=scoreEvents(c,out.alarmEvents);return {...score,mae:out.mae,checks:out.checks||0};}
function summarize(items,fn){
 const sum={worlds:0,changedWorlds:0,detectedWorlds:0,changedKeys:0,keyHits:0,missedKeys:0,
  falseAlarms:0,checks:0,mae:0,delay:null,delayCases:0};let delayTotal=0;
 for(const c of items){const v=inspect(c,fn);sum.worlds++;sum.changedWorlds+=Number(c.changing);
  sum.detectedWorlds+=v.worldHit;sum.changedKeys+=v.changedKeys;sum.keyHits+=v.keyHits;
  sum.missedKeys+=v.missedKeys;sum.falseAlarms+=v.falseAlarms;sum.checks+=v.checks;sum.mae+=v.mae;
  if(v.delay!==null){delayTotal+=v.delay;sum.delayCases++;}}
 sum.mae/=Math.max(1,sum.worlds);sum.delay=sum.delayCases?delayTotal/sum.delayCases:null;
 return sum;
}
const objective=s=>s.mae+.42*s.falseAlarms+.85*s.missedKeys+.003*s.checks;
const safe=(candidate,base)=>candidate.keyHits>=base.keyHits&&candidate.detectedWorlds>=base.detectedWorlds&&candidate.falseAlarms<=base.falseAlarms&&candidate.mae<=base.mae+.02&&objective(candidate)<objective(base);
function sumAcross(stats){const sum={worlds:0,changedWorlds:0,detectedWorlds:0,changedKeys:0,keyHits:0,missedKeys:0,falseAlarms:0,checks:0,mae:0,delay:null,delayCases:0};let dt=0;
 for(const s of stats){for(const k of Object.keys(sum)){if(k==='mae')sum.mae+=s.mae*s.worlds;else if(k==='delay'){}else sum[k]+=s[k];}if(s.delay!==null)dt+=s.delay*s.delayCases;}
 sum.mae/=sum.worlds;sum.delay=sum.delayCases?dt/sum.delayCases:null;return sum;}
export function run440Seed(seed=2027,oldArchive=[]){
 const prior=run42(seed,oldArchive),portfolio=prior.portfolio;
 const train=cases(seed+30300000,30),valid=cases(seed+40300000,24),test=cases(seed+50300000,36);
 const baseline=c=>blindTrial(c,portfolio),hybrid=c=>hybridTrial(c,portfolio,HYBRID);
 const baseTrain=summarize(train,baseline),baseValid=summarize(valid,baseline);
 const candidates=[{name:'Hybrid 4.3.7 (fixiert)',fn:hybrid,policy:HYBRID},...POLICY.map((policy,i)=>({name:`Zuverlässigkeitsregel ${i+1}`,policy,fn:c=>reliabilityTrial(c,portfolio,policy)}))];
 const ranked=candidates.map(x=>({...x,training:summarize(train,x.fn)})).sort((a,b)=>objective(a.training)-objective(b.training));
 // Validation may only select among strategies already safe on training.
 const trainSafe=ranked.filter(x=>safe(x.training,baseTrain));
 const validated=trainSafe.map(x=>({...x,validation:summarize(valid,x.fn)})).filter(x=>safe(x.validation,baseValid)).sort((a,b)=>objective(a.validation)-objective(b.validation));
 const accepted=validated[0]||null;
 const candidate=ranked[0];
 const selected=c=>accepted?accepted.fn(c):baseline(c);
 // The test is evaluated only once selection is frozen. All candidates share worlds,
 // but may take different observations due to their own action policies.
 const testResult={blind:summarize(test,baseline),hybrid:summarize(test,hybrid),bestExperimental:summarize(test,candidate.fn),selected:summarize(test,selected)};
 const byNoise=NOISE.map(noise=>{const group=test.filter(x=>x.noise===noise);return{noise,blind:summarize(group,baseline),selected:summarize(group,selected),hybrid:summarize(group,hybrid)};});
 return{seed,selectedName:accepted?.name||'Blind-Basis (sicherer Rückfall)',acceptedPolicy:accepted?.policy||null,
   candidateName:candidate.name,training:{blind:baseTrain,candidate:candidate.training},validation:{blind:baseValid,accepted:accepted?.validation||null},
   safeOnTraining:trainSafe.length,safeOnValidation:validated.length,test:testResult,byNoise,
   count:{training:train.length,validation:valid.length,test:test.length}};
}
export function join440(runs){
 const keys=['blind','hybrid','bestExperimental','selected'];
 return{version:'4.4',seeds:runs.map(r=>r.seed),runs,
  aggregate:Object.fromEntries(keys.map(k=>[k,sumAcross(runs.map(r=>r.test[k]))])),
  notes:[
   'Stabile Abschlussphase: Vorhandene Originalmodelle und Simulationswelten bleiben erhalten.',
   'Pro Welt genau 90 Messungen inkl. Kalibrierung und Kontrollen.',
   'Jede geänderte Welt besitzt drei betroffene Material/Aktion-Eigenschaften.',
   'Ein Treffer zählt nur für den richtigen Schlüssel NACH der Veränderung; jeder Schlüssel höchstens einmal.',
   'Doppelte, verfrühte und auf falsche Schlüssel bezogene Alarme zählen als Fehlalarme.',
   'Welt erkannt bedeutet mindestens ein richtiger Schlüssel; Eigenschaftentreffer werden zusätzlich getrennt gezählt.',
   'Auswahl auf 30 Trainings- und 24 Validierungswelten je Seed; 36 Testwelten erst nach Regelwahl.',
   'Detektorentscheidungen verwenden nur Messwerte bzw. daraus geschätztes Rauschen. Die Portfolio-Vorgeschichte wurde mit Simulationslabels trainiert.',
   'Die Weltwahrheit wird nur zur Messwertgenerierung und zur nachträglichen Erfolgskontrolle eingesetzt.',
   'Gleiche Welten, doch teils verschiedene Messfolgen durch unterschiedliche Wahl der nächsten Aktion.',
   'Verzögerung wird nur für erkannte Eigenschaften/Welten gemessen und ist allein kein Qualitätsbeweis.',
   'Die Seeds sind neu für diesen Audit, aber wiederholte Entwicklung am Simulationsmodell begrenzt Verallgemeinerung.',
   'Dies ist eine lokale Simulation, keine autonome Programmierung oder allgemeine KI.'
  ]};
}
