/* NERYX Sprachmuster-Lernen 0.1.
   Leitet Labels aus vollständigen Zahlenfolgen ab und lernt kurze Wortmerkmale.
   Kein Sprachmodell, keine freie Semantik. Separater persistenter Speicher. */
(() => {
'use strict';
const KEY='neryx.learning.wordfeatures.v1';
const TYPES=['arithmetisch','geometrisch','quadratisch','wechselnd','kubisch','fibonacci'];
const stop=new Set('die der das den dem ein eine einer eines im in am an mit ohne und oder von bei auf fuer fur nach bis dann zu zum zur jede jeder jedes zahlen zahl folge werte wert soll sollen bitte hier weiter geht kommen kommt jeweils jedesmal jeden mal wir werden wird sind ist sich immer schrittweise weiter'.split(' '));
const norm=x=>String(x??'').toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const number=x=>/^-?\d+(?:\.\d+)?$/.test(x.trim())?Number(x.trim()):NaN;
const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
function tokens(s) {
 return [...new Set(norm(s).match(/[a-z0-9]+/g)||[])].filter(w=>w.length>=3&&!stop.has(w)).map(w=>w.length>=7?w.slice(0,6):w);
}
function fresh(){return {version:1,examples:[]}}
function read(){
 try{
  const v=JSON.parse(localStorage.getItem(KEY)||'null');
  if(v?.version!==1||!Array.isArray(v.examples))return fresh();
  return {version:1,examples:v.examples.filter(x=>x&&TYPES.includes(x.type)&&
    typeof x.phrase==='string'&&x.phrase.length<=140&&
    Array.isArray(x.tokens)&&x.tokens.every(t=>typeof t==='string'&&t.length<=30)&&
    typeof x.fingerprint==='string'&&x.fingerprint.length<=100).slice(-80)};
 }catch{return fresh()}
}
function save(v){try{localStorage.setItem(KEY,JSON.stringify(v));return true}catch{return false}}
function parse(source,known) {
 const parts=String(source??'').split('|');
 if(parts.length!==2)return null;
 const phrase=parts[0].trim(),text=parts[1].trim().replace(/[:.!?]\s*$/,'');
 const vals=text.split(/\s*[,;]\s*/).map(number);
 if(phrase.length<4||phrase.length>140||!tokens(phrase).length||
   vals.length<(known?5:4)||vals.length>30||
   vals.some(x=>!Number.isFinite(x)||Math.abs(x)>1e10))return null;
 return {phrase,vals};
}
function derive(vals){
 const lab=window.NERYXLearning;
 if(!lab?.candidates)return null;
 const head=vals.slice(0,-1),tail=vals.at(-1);
 const hypotheses=lab.candidates(head);
 const matched=hypotheses.filter(x=>near(x.next,tail));
 // Mehrere Modelle können dieselbe bekannte Zahl vorhersagen.
 // Wir nutzen vorsichtig das einfachste passende Modell (kein Eindeutigkeitsbeweis).
 return matched.length?matched[0].type:null;
}
function teach(input){
 const row=parse(input,true);
 if(!row)return 'Format: Beispiel lernen: Die Zahlen verdoppeln sich | 2, 4, 8, 16, 32';
 const type=derive(row.vals);
 if(!type)return 'Keine unterstützte Strategie sagt die bekannte nächste Zahl voraus. Nichts gespeichert.';
 const state=read(),fingerprint=row.vals.join(',');
 if(state.examples.some(x=>x.fingerprint===fingerprint))
   return 'Diese Zahlen wurden bereits zum Lernen benutzt; kein weiterer Lernschritt.';
 if(state.examples.length>=80)return 'Beispielspeicher voll (80 unterschiedliche Beispiele).';
 const features=tokens(row.phrase);
 state.examples.push({phrase:row.phrase,tokens:features,type,fingerprint});
 if(!save(state))return 'Beispiel erkannt, aber lokaler Speicher konnte nicht beschrieben werden.';
 return 'Beispiel gespeichert (einfachste passende Strategie): '+row.phrase+' → '+type+
  '. Merkmale: '+features.join(', ')+
  '. Jetzt '+state.examples.length+' unterschiedliche Trainingsbeispiele.';
}
function classify(phrase,state=read()){
 const features=tokens(phrase),total=state.examples.length;
 if(!features.length||total<2)return null;
 const examples=state.examples;
 const scores=Object.fromEntries(TYPES.map(k=>[k,0]));
 const support=Object.fromEntries(TYPES.map(k=>[k,0]));
 for(const e of examples){
  const common=features.filter(t=>e.tokens.includes(t)).length;
  if(!common)continue;
  const similarity=common/Math.max(features.length,e.tokens.length);
  scores[e.type]+=similarity;
  support[e.type]++;
 }
 const order=TYPES.map(type=>({type,score:scores[type],support:support[type]}))
  .sort((a,b)=>b.score-a.score);
 const [best,second]=order;
 if(best.support<2||best.score<0.6||best.score<=second.score+0.3)return null;
 return best;
}
function query(input){
 const row=parse(input,false);
 if(!row)return 'Format: Beispiel prüfen: Wir wollen Zahlen verdoppeln | 3, 6, 12, 24';
 const lab=window.NERYXLearning;
 if(!lab?.candidates)return 'Lernlabor nicht geladen.';
 const proposals=lab.candidates(row.vals);
 if(!proposals.length)return 'Keine bekannte Strategie passt zu diesen Zahlen.';
 const best=classify(row.phrase);
 const match=best&&proposals.find(x=>x.type===best.type);
 const lines=['NERYX · GELERNTE SPRACHMERKMALE',
  'Bekannte Strategien: '+proposals.map(x=>x.type+' → '+Number(x.next.toPrecision(12))).join(', ')];
 if(match)lines.push('Gelernte Vermutung: '+match.type+' → '+Number(match.next.toPrecision(12)),
  'Begründung: Wortmerkmale aus '+best.support+' Beispielen; keine garantierte Bedeutungsanalyse.');
 else lines.push('Keine ausreichend sichere Wortzuordnung. Welche Regel ist gemeint?',
  'Ein neues Beispiel mit bekannter nächster Zahl kann die Zuordnung verbessern.');
 return lines.join('\n');
}
function status(){
 const state=read();
 return 'NERYX · SPRACHLERNSTAND\nUnterschiedliche Trainingsbeispiele: '+state.examples.length+
 '\nGelernte Strategien: '+[...new Set(state.examples.map(x=>x.type))].join(', ')+
 '\nAchtung: Nur Oberflächenmerkmale wie gemeinsame Wortstämme, keine freie Semantik.';
}
function experiment(){
 const demo=[
  {phrase:'Die Zahlen werden verdoppelt',vals:[2,4,8,16,32]},
  {phrase:'Wir verdoppeln jede Zahl',vals:[3,6,12,24,48]},
  {phrase:'Die Zahlen werden addiert',vals:[1,4,7,10,13]},
  {phrase:'Wir addieren immer drei',vals:[5,8,11,14,17]}
 ];
 const sandbox=fresh();
 const old=classify('Zahlen schrittweise verdoppeln',sandbox);
 const training=demo.map(d=>({type:derive(d.vals),tokens:tokens(d.phrase),phrase:d.phrase,
  fingerprint:d.vals.join(',')}));
 if(training.some(x=>!x.type))return 'Experiment nicht auswertbar: fehlende eindeutige Strategie.';
 sandbox.examples=training;
 const holdouts=[
  {phrase:'Zahlen schrittweise verdoppeln',vals:[5,10,20,40],correct:'geometrisch'},
  {phrase:'Zahlen weiter addieren',vals:[10,13,16,19],correct:'arithmetisch'},
  {phrase:'Jede Zahl mit zwei multiplizieren',vals:[4,8,16,32],correct:'geometrisch'}
 ];
 const outcome=holdouts.map(x=>{
  const predicted=classify(x.phrase,sandbox),types=window.NERYXLearning?.candidates(x.vals)||[];
  return {phrase:x.phrase,expected:x.correct,predicted:types.some(t=>t.type===predicted?.type)?predicted.type:null};
 });
 return ['NERYX · SPRACH-LERNPRÜFUNG',
  'Trainingsbeispiele (isoliert): '+training.length,
  'Neue Prüfphrasen: '+outcome.length,
  'Vorher mit sicherer Zuordnung: '+(old?1:0)+'/3',
  'Nachher richtig zugeordnet: '+outcome.filter(x=>x.expected===x.predicted).length+'/3',
  ...outcome.map(x=>x.phrase+': '+(x.predicted||'unsicher')+' (erwartet '+x.expected+')'),
  'Die Prüfung verwendet vorgegebene Strategien und ähnliche Wortstämme.',
  'Unbekannte Synonyme ohne Wortähnlichkeit bleiben möglicherweise unerkannt.',
  'Deine gespeicherten Lernwerte wurden nicht verändert.'].join('\n');
}
window.NERYXWordLearning=Object.freeze({version:'0.1',teach,query,status,experiment,classify,derive});
})();