/* NERYX Bedeutungstest 1.1 – feste unbenutzte Prüfphrasen,
   getrennte synthetische Trainingsdaten, ohne Speicherzugriffe. */
(() => {
'use strict';
const stop=new Set('die der das den dem ein eine einer eines im in am an mit ohne und oder von bei auf fuer fur nach bis dann zu zum zur jede jeder jedes zahlen zahl folge werte wert soll sollen bitte hier weiter geht kommen kommt jeweils jedesmal jeden mal wir werden wird sind ist sich immer schrittweise weiter'.split(' '));
const types=['geometrisch','arithmetisch'];
const norm=x=>String(x).toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss');
const tok=x=>[...new Set(norm(x).match(/[a-z0-9]+/g)||[])].filter(w=>w.length>=3&&!stop.has(w)).map(w=>w.length>=7?w.slice(0,6):w);
const training=[
 ['Die Zahlen werden verdoppelt','geometrisch'],['Wir verdoppeln jede Zahl','geometrisch'],
 ['Verdoppeln im nächsten Schritt','geometrisch'],['Jede Zahl verdoppeln','geometrisch'],
 ['Wir addieren drei','arithmetisch'],['Die Zahlen werden addiert','arithmetisch'],
 ['Immer drei addieren','arithmetisch'],['Addiere Schritt für Schritt','arithmetisch']
].map(([phrase,type])=>({phrase,type,tokens:tok(phrase)}));
const holdout=[
 ['Zahlen schrittweise verdoppeln','geometrisch'],['Die Folge verdoppeln','geometrisch'],
 ['Bitte jeden Wert verdoppeln','geometrisch'],['Wir wollen jetzt verdoppeln','geometrisch'],
 ['Mit zwei multiplizieren','geometrisch'],['Jede Zahl mit zwei multiplizieren','geometrisch'],
 ['Immer mit zwei multiplizieren','geometrisch'],['Wir multiplizieren mit zwei','geometrisch'],
 ['Werte mal zwei nehmen','geometrisch'],['Die Zahlen jeweils mal zwei nehmen','geometrisch'],
 ['Mit drei multiplizieren','geometrisch'],['Nicht mit zwei multiplizieren','geometrisch'],
 ['Zahlen weiter addieren','arithmetisch'],['Addiere jeweils drei','arithmetisch'],
 ['Hier drei addieren','arithmetisch'],['Wir addieren der Reihe nach','arithmetisch'],
 ['Plus drei','arithmetisch'],['Jeweils plus drei','arithmetisch'],
 ['Jetzt plus drei','arithmetisch'],['Nimm jeweils plus drei','arithmetisch'],
 ['Wir ziehen drei ab','arithmetisch'],['Nicht plus drei','arithmetisch'],
 ['Wir addieren erneut','arithmetisch'],['Bitte addieren','arithmetisch']
].map(([phrase,type])=>({phrase,type}));
const mappings=[
 {from:'mit zwei multiplizieren',to:'verdoppeln'},
 {from:'plus drei',to:'addieren'}
];
function features(phrase,links){
 const source=' '+norm(phrase)+' ',result=new Set(tok(phrase));
 for(const {from,to} of links){
  const at=source.indexOf(' '+from+' ');
  if(at<0)continue;
  if(/\b(?:nicht|kein|ohne)\s*$/.test(source.slice(Math.max(0,at-12),at)))continue;
  for(const t of tok(to))result.add(t);
 }
 return [...result];
}
function classify(phrase,links){
 const ft=features(phrase,links),score={geometrisch:0,arithmetisch:0},support={geometrisch:0,arithmetisch:0};
 for(const e of training){
  const common=ft.filter(t=>e.tokens.includes(t)).length;
  if(!common)continue;
  score[e.type]+=common/Math.max(ft.length,e.tokens.length);
  support[e.type]++;
 }
 const ordered=types.map(type=>({type,score:score[type],support:support[type]})).sort((a,b)=>b.score-a.score);
 const [best,second]=ordered;
 return best.support>=2&&best.score>=0.6&&best.score>second.score+0.3?best.type:null;
}
function measure(links){
 let correct=0,answered=0,falsePositive=0;
 const rows=holdout.map(x=>{
  const predicted=classify(x.phrase,links),ok=predicted===x.type;
  if(ok)correct++;
  if(predicted)answered++;
  if(predicted&&predicted!==x.type)falsePositive++;
  return {...x,predicted,ok};
 });
 return {total:rows.length,correct,answered,falsePositive,rows};
}
function run(){
 const before=measure([]),after=measure(mappings),changed=after.rows.filter((r,i)=>r.predicted!==before.rows[i].predicted);
 return {training:training.length,holdout:holdout.length,before,after,changed};
}
function report(){
 const r=run();
 return ['NERYX · BEDEUTUNGS-LEISTUNGSTEST 1.1',
  'Synthetische Trainingsphrasen: '+r.training,
  'Getrennte festgelegte Prüfphrasen: '+r.holdout,
  'Vor bestätigten Bedeutungsbrücken: '+r.before.correct+'/'+r.holdout+
   ' (beantwortet '+r.before.answered+', Fehlzuordnungen '+r.before.falsePositive+')',
  'Nach zwei simulierten Bestätigungen: '+r.after.correct+'/'+r.holdout+
   ' (beantwortet '+r.after.answered+', Fehlzuordnungen '+r.after.falsePositive+')',
  'Veränderung: '+(r.after.correct-r.before.correct>=0?'+':'')+(r.after.correct-r.before.correct),
  'Veränderte Prüfphrasen: '+r.changed.length,
  ...r.changed.map(x=>'• '+x.phrase+': '+(x.predicted||'unsicher')+' (erwartet '+x.type+')'),
  'Achtung: Diese Brücken wurden für diesen festen Demonstrationstest vorgegeben. Dies ist KEIN unabhängiger Nachweis neuer Bedeutungen.',
  'Bei Verneinungen, Zahlenänderungen und unbekannten Wendungen darf NERYX weiterhin unsicher bleiben.',
  'Deine echten Bedeutungsbeziehungen, Fakten und Trainingsbeispiele wurden nicht verändert.'
 ].join('\n');
}
window.NERYXMeaningBenchmark=Object.freeze({version:'1.1',run,report});
})();