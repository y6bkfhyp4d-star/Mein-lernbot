import {episode,initialModel,learn,seriesSeeds,STAGES} from './rl61.js';
const avg=(arr,k)=>arr.reduce((s,r)=>s+r[k],0)/Math.max(1,arr.length);
function aggregate(rows){const reasons={};let proposals=0,accepted=0,rejected=0,equivalent=0,physical=0;for(const r of rows){for(const [k,n] of Object.entries(r.diagnostics.reasons||{}))reasons[k]=(reasons[k]||0)+n;proposals+=r.diagnostics.qProposals||0;accepted+=r.diagnostics.qAccepted||0;rejected+=r.diagnostics.qRejected||0;equivalent+=r.diagnostics.qEquivalent||0;physical+=r.diagnostics.qPhysical||0;}
return{worlds:rows.length,success:rows.filter(x=>x.success).length,steps:avg(rows,'penalty'),energy:avg(rows,'energyUsed'),rests:avg(rows,'rests'),overrides:rows.reduce((s,r)=>s+r.overrides,0),proposals,accepted,rejected,equivalent,physical,accountingOK:proposals===accepted+rejected,reasons};}
function run(seeds,model,mode){return seeds.map(s=>episode(s,model,{mode}));}
function paired(a,b){let faster=0,slower=0,equal=0;for(let i=0;i<a.length;i++){const d=b[i].penalty-a[i].penalty;if(d<0)faster++;else if(d>0)slower++;else equal++;}return {faster,slower,equal,net:b.reduce((s,r,i)=>s+r.penalty-a[i].penalty,0)};}
export function analyze60(seed=2027,testCount=100){
 const valid=seriesSeeds(seed,32,10600000),test=seriesSeeds(seed,testCount,11600000);
 const baselineVal=run(valid,null,'base'),baseline=aggregate(baselineVal);
 let model=initialModel(),count=0,checkpoint=null;const checkpoints=[];
 for(const stage of STAGES){if(stage>count)model=learn(seed,stage-count,model,240000,'hybrid');count=stage;
  const snapshot=JSON.parse(JSON.stringify(model));const rv=run(valid,snapshot,'architecture');const stats=aggregate(rv);
  const admitted=stage>0&&stats.success>=baseline.success&&stats.steps<=baseline.steps-0.4;
  checkpoints.push({stage,states:Object.keys(snapshot.q).length,updates:Object.values(snapshot.visits).reduce((a,v)=>a+v,0),...stats,admitted});
  if(admitted&&(!checkpoint||stats.steps<checkpoint.validation.steps))checkpoint={stage,model:snapshot,validation:stats};
 }
 const raw=JSON.parse(JSON.stringify(model));const baseRuns=run(test,null,'base');const previewRuns=run(test,initialModel(),'preview');const architectureRuns=run(test,raw,'architecture');const hybridRuns=run(test,raw,'hybrid');
 const activeRuns=checkpoint?run(test,checkpoint.model,'architecture'):baseRuns;
 const samples=architectureRuns.map((r,i)=>({seed:r.seed,biome:r.biome,base:baseRuns[i].penalty,preview:previewRuns[i].penalty,hybrid:hybridRuns[i].penalty,architecture:r.penalty,success:r.success,overrides:r.overrides,verdicts:r.diagnostics.verdicts,counterfactuals:r.diagnostics.counterfactuals}));
 const significant=samples.filter(s=>s.verdicts.length>0||s.architecture!==s.base).sort((a,b)=>Math.abs(b.architecture-b.base)-Math.abs(a.architecture-a.base)).slice(0,8);
 return {seed,testCount,validationBase:baseline,checkpoints,selected:checkpoint?.stage??null,base:aggregate(baseRuns),preview:aggregate(previewRuns),hybrid:aggregate(hybridRuns),architecture:aggregate(architectureRuns),active:aggregate(activeRuns),paired:{architecture:paired(baseRuns,architectureRuns),hybrid:paired(baseRuns,hybridRuns),preview:paired(baseRuns,previewRuns)},samples:significant,checkpoint250:checkpoints.find(c=>c.stage===250),method:'Unveränderter Phase-6.0-Weltgenerator und dieselbe 180-Aktionen-Mission. Korrekte Q-Zähler: Vorschlag = angenommen + abgelehnt. Angenommen wird in physisch gleiche und tatsächlich abweichende Aktionen unterteilt. Gegenproben erfolgen auf geklonten Weltzuständen und nur offline; die Entscheidung hat keinen Zugriff auf ihre Ergebnisse. Planer, Q-Empfehlung und Entscheider sind getrennt. Die Q-Tabelle wurde mit Trainingswelten aus dem bisherigen Hybrid-Verfahren trainiert. Das neue Entscheidungssystem prüft Q-Abstand, Erfahrungszahl, Energie, Missionsaktionen und Konflikte mit der Vorschau. 32 Validierungswelten wählen ausschließlich nach Erfolgen und mindestens 0,4 Aktionen Vorteil aus; 100 getrennte Testwelten werden erst danach ausgewertet. Ergebnis für nicht freigegebenen Kandidaten wird dennoch ausgewiesen. Keine versteckten Kartenfelder als Entscheidungseingabe. Abweichungen sind kein Beweis für verbesserte Intelligenz.'};
}
