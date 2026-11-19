/* NERYX Lernkontrolle 1.0: isolierte Tests; keine Schreibzugriffe.
   Synthetische Trainings-/Prüftrennung sowie retrospektive Nutzerprüfung.
   Keine Aussage über freie Sprachintelligenz oder allgemeine Wahrheit. */
(() => {
'use strict';
const KEY='neryx.learning.wordfeatures.v1';
const STOP=new Set('die der das den dem ein eine einer eines im in am an mit ohne und oder von bei auf fuer fur nach bis dann zu zum zur jede jeder jedes zahlen zahl folge werte wert soll sollen bitte hier weiter geht kommen kommt jeweils jedesmal jeden mal wir werden wird sind ist sich immer schrittweise weiter'.split(' '));
const TYPES=['arithmetisch','geometrisch','quadratisch','wechselnd','kubisch','fibonacci'];
const norm=x=>String(x??'').toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const tokens=s=>[...new Set(norm(s).match(/[a-z0-9]+/g)||[])].filter(w=>w.length>=3&&!STOP.has(w)).map(w=>w.length>=7?w.slice(0,6):w);
function classify(phrase,training){
 const features=tokens(phrase);if(features.length===0||training.length<2)return null;
 const scores=Object.fromEntries(TYPES.map(x=>[x,0]));
 const counts=Object.fromEntries(TYPES.map(x=>[x,0]));
 for(const e of training){
  const features2=e.tokens||tokens(e.phrase);
  const common=features.filter(t=>features2.includes(t)).length;
  if(!common)continue;
  scores[e.type]+=common/Math.max(features.length,features2.length);
  counts[e.type]++;
 }
 const ranked=TYPES.map(type=>({type,score:scores[type],support:counts[type]})).sort((a,b)=>b.score-a.score);
 const [best,second]=ranked;
 if(best.support<2||best.score<0.6||best.score<=second.score+0.3)return null;
 return best.type;
}
function load(){
 try{
  const raw=localStorage.getItem(KEY);
  if(raw===null)return {examples:[],warning:'Noch kein Sprachlern-Speicher gefunden.'};
  const data=JSON.parse(raw);
  if(data?.version!==1||!Array.isArray(data.examples))return {examples:[],warning:'Sprachlern-Speicher hat ein unbekanntes Format.'};
  const examples=data.examples.filter(e=>e&&TYPES.includes(e.type)&&typeof e.phrase==='string'&&
   Array.isArray(e.tokens)&&typeof e.fingerprint==='string'&&e.tokens.every(t=>typeof t==='string'));
  return {examples,warning:''};
 }catch{return {examples:[],warning:'Sprachlern-Speicher nicht lesbar; nichts verändert.'}}
}
// Tests wurden vor der Auswertung festgelegt, keine Aufteilung nach deren Trefferquote.
const training=[
 {phrase:'Die Zahlen werden verdoppelt',type:'geometrisch',fingerprint:'2,4,8,16,32'},
 {phrase:'Wir verdoppeln jede Zahl',type:'geometrisch',fingerprint:'3,6,12,24,48'},
 {phrase:'Zahlen werden addiert',type:'arithmetisch',fingerprint:'1,4,7,10,13'},
 {phrase:'Wir addieren drei',type:'arithmetisch',fingerprint:'5,8,11,14,17'}
].map(e=>({...e,tokens:tokens(e.phrase)}));
const holdout=[
 {phrase:'Zahlen schrittweise verdoppeln',type:'geometrisch',seq:'5,10,20,40'},
 {phrase:'Zahlen weiter addieren',type:'arithmetisch',seq:'10,13,16,19'},
 {phrase:'Jede Zahl mit zwei multiplizieren',type:'geometrisch',seq:'4,8,16,32'},
 {phrase:'Wir addieren jeweils vier',type:'arithmetisch',seq:'8,12,16,20'}
];
function measure(tests,examples){
 let correct=0,answered=0;
 const results=tests.map(t=>{
  const predicted=classify(t.phrase,examples);
  if(predicted!==null)answered++;
  if(predicted===t.type)correct++;
  return {phrase:t.phrase,expected:t.type,predicted,correct:predicted===t.type};
 });
 return {correct,answered,total:tests.length,results};
}
function synthetic(){
 const overlap=holdout.filter(x=>training.some(t=>t.fingerprint===x.seq)).length;
 // Zahlensequenzen sind hier unabhängig, die Antwortlabels der Tests werden nie trainiert.
 const before=measure(holdout,[]),after=measure(holdout,training);
 const gain=after.correct-before.correct;
 return {before,after,overlap,gain,verified:overlap===0&&gain>0};
}
function retrospective(){
 const {examples,warning}=load(),valid=examples.filter(e=>e.phrase.trim()&&e.tokens.length>0);
 // Leave-one-out: die jeweilige Prüfphrase steht nie im aktuellen Trainingssatz.
 // Historisch stammen alle Labels jedoch bereits aus dem Nutzertraining.
 const unique=valid.filter((e,i)=>valid.findIndex(x=>x.fingerprint===e.fingerprint)===i);
 const outcome=unique.map(item=>{
  const rest=unique.filter(x=>x.fingerprint!==item.fingerprint);
  return {phrase:item.phrase,expected:item.type,predicted:classify(item.phrase,rest)};
 });
 const correct=outcome.filter(x=>x.expected===x.predicted).length;
 const answered=outcome.filter(x=>x.predicted!==null).length;
 return {total:unique.length,correct,answered,outcome,warning};
}
function status(){
 const s=synthetic(),p=retrospective(),num=window.NERYXLearningEvaluation?.run?.();
 const lines=['NERYX · LERNKONTROLLE 1.0',
  'A) ISOLIERTE SPRACHMUSTER-PRÜFUNG (synthetisch)',
  'Training: '+training.length+' Beispiele | Unbekannte Testphrasen: '+holdout.length,
  'Überlappende Zahlenfolgen: '+s.overlap,
  'Vorher richtig: '+s.before.correct+'/'+s.before.total+' (beantwortet '+s.before.answered+')',
  'Nachher richtig: '+s.after.correct+'/'+s.after.total+' (beantwortet '+s.after.answered+')',
  'Veränderung: '+(s.gain>=0?'+':'')+s.gain+' richtige Antworten',
  'Ergebnis: '+(s.verified?'Verbesserung auf dieser festgelegten Prüfgruppe':'Keine nachgewiesene Verbesserung auf dieser Prüfgruppe'),
  ...s.after.results.map(r=>'• '+r.phrase+': '+(r.predicted||'keine Zuordnung')+
   ' (erwartet '+r.expected+') '+(r.correct?'richtig':'nicht richtig')),
  '',
  'B) DEINE GESPEICHERTEN SPRACHBEISPIELE (retrospektiv)',
  'Unterschiedliche Beispiele: '+p.total,
  'Jeweils eines ausgeblendet und aus den übrigen vorhergesagt: '+p.correct+'/'+p.total,
  'Dabei überhaupt eine Zuordnung: '+p.answered+'/'+p.total,
  p.warning||'Achtung: Diese Beispiele waren bereits Teil deiner bisherigen Lernhistorie. Das ist KEIN unabhängiger Test auf völlig neue Daten.',
  '',
  'C) ZAHLENSTRATEGIEN – VORHER/NACHHER (isolierter Kontrollversuch)'];
 if(num?.error)lines.push(num.error);
 else if(num&&Number.isInteger(num.before)){
  lines.push('Unbekannte Aufgaben: '+num.heldout+' | Trainingsaufgaben: '+num.trainedOn,
   'Vorher: '+num.before+'/'+num.heldout+' | Nachher: '+num.after+'/'+num.heldout,
   'Veränderung: '+(num.improvement>=0?'+':'')+num.improvement,
   'Ohne Rückschritt insgesamt verbessert: '+(num.verifiedGain?'Ja':'Nein'));
 }else lines.push('Nicht verfügbar: Zahlen-Evaluationsmodul fehlt.');
 lines.push('',
  'Bedeutung: Teilaufgaben können sich verbessern, während andere schlechter werden. Eine allgemeine KI-Fähigkeit ist damit nicht bewiesen.',
  'Alle Prüfungen laufen in isolierten Berechnungen. Bestehende Fakten, Lernbeispiele und Gewichtungen wurden NICHT verändert.');
 return lines.join('\n');
}
window.NERYXLearningAudit=Object.freeze({version:'1.0',synthetic,retrospective,status});
})();