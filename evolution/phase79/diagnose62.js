import {episode,initialModel,learn,seriesSeeds,STAGES} from './rl62.js';
const avg=(arr,k)=>arr.reduce((s,r)=>s+r[k],0)/Math.max(1,arr.length);
function aggregate(rows){const reasons={};let proposals=0,accepted=0,rejected=0,equivalent=0,physical=0,offline=0,better=0,worse=0,equal=0,failBase=0,failAlt=0;
 for(const r of rows){const d=r.diagnostics;for(const [k,n] of Object.entries(d.reasons))reasons[k]=(reasons[k]||0)+n;
  proposals+=d.qProposals;accepted+=d.qAccepted;rejected+=d.qRejected;equivalent+=d.qEquivalent;physical+=d.qPhysical;
  for(const p of d.rollouts){offline++;if(p.delta<0)better++;else if(p.delta>0)worse++;else equal++;if(!p.base.success)failBase++;if(!p.alternative.success)failAlt++;}}
 return {worlds:rows.length,success:rows.filter(r=>r.success).length,steps:avg(rows,'penalty'),energy:avg(rows,'energyUsed'),rests:avg(rows,'rests'),
  proposals,accepted,rejected,equivalent,physical,accountingOK:proposals===accepted+rejected,offline,better,worse,equal,failBase,failAlt,reasons};}
function run(seeds,model,mode){return seeds.map(seed=>episode(seed,model,{mode}));}
function paired(base,other){let better=0,worse=0,equal=0,net=0;for(let i=0;i<base.length;i++){let d=other[i].penalty-base[i].penalty;net+=d;if(d<0)better++;else if(d>0)worse++;else equal++;}return {better,worse,equal,net};}
export function analyze62(seed=2027,count=100){
 const validation=seriesSeeds(seed,32,10600000),test=seriesSeeds(seed,count,11600000);
 const baseVal=run(validation,null,'base'),baseline=aggregate(baseVal);
 let model=initialModel(),done=0,winner=null;const checkpoints=[];
 for(const n of STAGES){if(n>done)model=learn(seed,n-done,model,240000,'hybrid');done=n;
  const snapshot=JSON.parse(JSON.stringify(model));const valRuns=run(validation,snapshot,'architecture62'),s=aggregate(valRuns);
  const admitted=n>0&&s.success>=baseline.success&&s.steps<=baseline.steps-.4;
  checkpoints.push({training:n,states:Object.keys(snapshot.q).length,updates:Object.values(snapshot.visits).reduce((a,v)=>a+v,0),...s,admitted});
  if(admitted&&(!winner||s.steps<winner.valid.steps))winner={training:n,model:snapshot,valid:s};
 }
 const baseRuns=run(test,null,'base'),experimentRuns=run(test,model,'architecture62');
 const activeRuns=winner?run(test,winner.model,'architecture62'):baseRuns;
 const experiments=experimentRuns.flatMap(r=>r.diagnostics.rollouts.map(p=>({...p,biome:r.biome}))).slice(0,18);
 const samples=experimentRuns.map((r,i)=>({seed:r.seed,biome:r.biome,base:baseRuns[i].penalty,experiment:r.penalty,
  decisions:r.diagnostics.verdicts.slice(0,3),rollouts:r.diagnostics.rollouts})).filter(w=>w.rollouts.length||w.experiment!==w.base).slice(0,12);
 return {seed,count,base:aggregate(baseRuns),experimental:aggregate(experimentRuns),active:aggregate(activeRuns),baselineValidation:baseline,
  checkpoints,selected:winner?.training??null,paired:paired(baseRuns,experimentRuns),experiments,samples,
  method:'Weltgenerator und Mission aus Phase 6.1, unverändertes Budget 180. Kontrollierte Exploration erfolgt während des Trainings durch vorhandene epsilon-Auswahl; keine Offline-Gegenprobe fließt in Q-Werte oder Live-Aktionswahl ein. Mehrschritt-Gegenproben starten von zwei getrennten Kopien derselben vollständigen Simulator-Welt und führen erst die Basis- bzw. Q-Alternative, dann denselben Basisplaner bis Missionsende aus. Der Planer sieht nur bereits beobachtete Weltzellen; der Simulator benötigt zur Ausführung die reale Welt. Die Probe ist rein retrospektiv und nur auf wenige vorgeschlagene echte Alternativen pro Welt begrenzt. 32 unabhängige Validierungswelten wählen Checkpoints, 100 getrennte Testwelten messen ausschließlich. Freigabe nur bei gleicher Erfolgszahl und mindestens 0,4 Aktionen Vorteil.'};
}
