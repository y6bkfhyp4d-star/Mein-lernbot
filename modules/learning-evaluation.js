/* NERYX Lernprüfung 0.1 – getrennte Trainings-/Prüfaufgaben.
   Demonstriert Gewinne UND Verluste bei mehrdeutigen Zahlenfolgen.
   Ändert keine Nutzerdaten und keine produktiven Strategiegewichte. */
(() => {
'use strict';
const KEY='neryx.learning.evaluation.v1';
const MODELS=['arithmetisch','geometrisch','quadratisch','wechselnd','kubisch','fibonacci'];
const equal=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
function rng(seed){
 let state=(seed>>>0)||1;
 return ()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296};
}
function generator(seed,count,family){
 const random=rng(seed),cases=[];
 for(let i=0;i<count;i++){
  // Vier geometrisch erscheinende Eingaben; zwei widersprechende Fortsetzungsannahmen.
  const scale=1+Math.floor(random()*19),ratio=2+Math.floor(random()*3);
  const xs=[0,1,2,3].map(n=>scale*ratio**n);
  const hypotheticalCubic=scale*(4*ratio**3-6*ratio**2+4*ratio-1);
  const hypotheticalGeometric=scale*ratio**4;
  cases.push({xs,answer:family==='kubisch'?hypotheticalCubic:hypotheticalGeometric,family});
 }
 return cases;
}
function choose(xs,scores,lab){
 const results=lab.candidates(xs);
 const sorted=results.slice().sort((a,b)=>(scores[b.type]||0)-(scores[a.type]||0)||
   MODELS.indexOf(a.type)-MODELS.indexOf(b.type));
 return sorted[0]||null;
}
function score(cases,weights,lab){
 let correct=0;
 for(const item of cases)if(equal(choose(item.xs,weights,lab)?.next,item.answer))correct++;
 return {correct,total:cases.length};
}
function train(cases,weights,lab){
 const next={...weights};
 for(const item of cases){
  for(const hypothesis of lab.candidates(item.xs)){
   const old=next[hypothesis.type]||0;
   next[hypothesis.type]=Math.max(-20,Math.min(20,old+(equal(hypothesis.next,item.answer)?1:-1)));
  }
 }
 return next;
}
function run(seed=20261119){
 const lab=window.NERYXLearning;
 if(!lab?.candidates)return {error:'Das Lernlabor fehlt.'};
 seed=(Number.isFinite(seed)?seed:20261119)>>>0;
 const baseline=Object.fromEntries(MODELS.map(k=>[k,0]));
 // Nur kubisch interpretierte Beispiele im Training; andere Zahlen im Test.
 const training=generator(seed+1,12,'kubisch');
 const cubic=generator(seed+200,18,'kubisch');
 const geo=generator(seed+600,18,'geometrisch');
 const trained=train(training,baseline,lab);
 const bCubic=score(cubic,baseline,lab),aCubic=score(cubic,trained,lab);
 const bGeo=score(geo,baseline,lab),aGeo=score(geo,trained,lab);
 const bAll=bCubic.correct+bGeo.correct,aAll=aCubic.correct+aGeo.correct;
 const holdoutKeys=new Set([...cubic,...geo].map(c=>c.xs.join(',')));
 const overlaps=training.filter(c=>holdoutKeys.has(c.xs.join(','))).length;
 return {seed,trainedOn:training.length,heldout:cubic.length+geo.length,
  cubic:{before:bCubic.correct,after:aCubic.correct,total:cubic.length},
  geometric:{before:bGeo.correct,after:aGeo.correct,total:geo.length},
  before:bAll,after:aAll,improvement:aAll-bAll,
  trainingOverlap:overlaps,
  verifiedGain:aAll>bAll && aGeo.correct===bGeo.correct && overlaps===0};
}
function report(){
 const result=run();
 if(result.error)return result.error;
 // Speicherung nur des Ergebnisberichts, nie des Trainingsstands.
 try{localStorage.setItem(KEY,JSON.stringify(result))}catch{}
 return ['NERYX · VORHER-NACHHER-LERNPRÜFUNG',
  'Trainingsaufgaben: '+result.trainedOn,
  'Zurückgehaltene Prüfaufgaben: '+result.heldout,
  'Doppelte Eingaben zwischen Training und Prüfung: '+result.trainingOverlap,
  'Vor dem Lernen: '+result.before+'/'+result.heldout,
  'Nach dem Lernen: '+result.after+'/'+result.heldout,
  'Quadratische/Kubische Fortsetzungsannahme: '+result.cubic.before+' → '+result.cubic.after+' von '+result.cubic.total,
  'Geometrische Fortsetzungsannahme: '+result.geometric.before+' → '+result.geometric.after+' von '+result.geometric.total,
  'Nettoveränderung: '+(result.improvement>=0?'+':'')+result.improvement,
  'Verbesserung ohne Rückschritt nachgewiesen: '+(result.verifiedGain?'Ja':'Nein'),
  '',
  'Erklärung: Dieselben vier Zahlen können geometrisch oder als kubisches Polynom fortgesetzt werden.',
  'Das Training bevorzugt eine davon. Dadurch kann es bei der anderen schlechter werden.',
  'Nur künstlich erzeugte, getrennte Beispielaufgaben. Kein Beweis allgemeinen Lernens.',
  'Die produktiven Lerngewichte und persönlichen Fakten wurden NICHT verändert.'].join('\n');
}
window.NERYXLearningEvaluation=Object.freeze({version:'0.1',run,report});
})();