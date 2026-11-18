/* NERYX Lernlabor 0.1 – Feedback-gestützte Auswahl vorhandener Strategien.
   Unabhängiger localStorage-Bereich; keine Änderungen an Fakten, Chatregeln oder Gewichten von KI-Modellen. */
(() => {
'use strict';
const KEY='neryx.learning.strategies.v1';
const MODEL=['arithmetisch','geometrisch','quadratisch','wechselnd','kubisch','fibonacci'];
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const equal=(a,b)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
const pretty=n=>String(Number(n.toPrecision(12)));
const valid=xs=>Array.isArray(xs)&&xs.length>=4&&xs.length<=30&&xs.every(finite);
const diff=xs=>xs.slice(1).map((n,i)=>n-xs[i]);
const constant=xs=>xs.length>0&&xs.every(x=>equal(x,xs[0]));
const defaultScores=()=>Object.fromEntries(MODEL.map(x=>[x,0]));
function load() {
 try {
  const state=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!state||state.version!==1||!state.scores||typeof state.scores!=='object')throw Error('invalid');
  const scores=defaultScores();
  for(const k of MODEL){
   const n=state.scores[k];
   if(Number.isInteger(n)&&n>=-20&&n<=20)scores[k]=n;
  }
  return {scores,feedback:Number.isInteger(state.feedback)&&state.feedback>=0?Math.min(state.feedback,200):0};
 }catch{return {scores:defaultScores(),feedback:0}}
}
function save(state){
 try{localStorage.setItem(KEY,JSON.stringify({version:1,scores:state.scores,feedback:state.feedback}));return true}
 catch{return false}
}
function candidates(xs) {
 if(!valid(xs))return [];
 const output=[],add=(type,next)=>{
  if(finite(next)&&Math.abs(next)<=1e12&&
   !output.some(x=>x.type===type))output.push({type,next});
 };
 const d1=diff(xs);
 if(constant(d1))add('arithmetisch',xs.at(-1)+d1[0]);
 if(xs.every(n=>n!==0)){
  const ratios=xs.slice(1).map((n,i)=>n/xs[i]);
  if(constant(ratios))add('geometrisch',xs.at(-1)*ratios[0]);
 }
 const d2=diff(d1);
 if(constant(d2))add('quadratisch',xs.at(-1)+d1.at(-1)+d2[0]);
 if(xs.length>=6){
  const a=xs.filter((_,i)=>i%2===0),b=xs.filter((_,i)=>i%2===1);
  if(constant(diff(a))&&constant(diff(b))){
   const sub=xs.length%2?b:a;
   add('wechselnd',sub.at(-1)+(sub[1]-sub[0]));
  }
 }
 const d3=diff(d2);
 if(xs.length>=4&&constant(d3))add('kubisch',xs.at(-1)+d1.at(-1)+d2.at(-1)+d3[0]);
 if(xs.length>=5&&xs.slice(2).every((n,i)=>equal(n,xs[i]+xs[i+1])))
   add('fibonacci',xs.at(-1)+xs.at(-2));
 return output;
}
function ranked(xs,scores=load().scores) {
 const rows=candidates(xs);
 return rows.sort((a,b)=>(scores[b.type]||0)-(scores[a.type]||0)||MODEL.indexOf(a.type)-MODEL.indexOf(b.type));
}
let pending=null;
function proposal(input) {
 const source=String(input??'').trim().replace(/:\s*$/,'');
 const cells=source.split(',').map(x=>x.trim());
 const xs=cells.map(x=>/^-?\d+(?:\.\d+)?$/.test(x)?Number(x):NaN);
 if(!valid(xs))return 'Format: Lernversuch: 2, 4, 8, 16 (mindestens vier Zahlen)';
 const options=ranked(xs);
 if(!options.length){pending=null;return 'Keine passende Strategie gefunden. Der Versuch wurde nicht gespeichert.'}
 pending={xs:xs.slice(),options:options.map(x=>({...x}))};
 const state=load();
 return ['NERYX LERNLABOR · STRATEGIENVERGLEICH',
  'Vorschläge für die nächste Zahl:',...options.map((x,i)=>
   `${i+1}. ${x.type}: ${pretty(x.next)} · Erfahrung ${state.scores[x.type]||0}`),
  'Beste aktuelle Vermutung: '+pretty(options[0].next),
  'Sag mir die richtige Zahl mit: Lernfeedback: ZAHL',
  'Es wurde noch nichts gelernt; mehrere Fortsetzungen können möglich sein.'].join('\n');
}
function feedback(input){
 if(!pending)return 'Zuerst „Lernversuch: 2, 4, 8, 16“ ausführen.';
 const raw=String(input??'').trim(),number=/^-?\d+(?:\.\d+)?$/.test(raw)?Number(raw):NaN;
 if(!finite(number))return 'Format: Lernfeedback: 32';
 const {xs,options}=pending;pending=null;
 const matched=options.filter(x=>equal(x.next,number));
 if(!matched.length)return 'Feedback nicht übernommen: Keine geprüfte Strategie sagt diesen Wert voraus. Es wurden keine Daten geändert.';
 const state=load(),before=ranked(xs,state.scores)[0];
 for(const x of options){
  const score=state.scores[x.type]||0;
  state.scores[x.type]=Math.max(-20,Math.min(20,score+(equal(x.next,number)?2:-2)));
 }
 state.feedback=Math.min(200,state.feedback+1);
 if(!save(state))return 'Feedback geprüft, aber nicht gespeichert (lokaler Speicher nicht beschreibbar).';
 const after=ranked(xs,state.scores)[0];
 return [`Lernfeedback übernommen: ${pretty(number)}`,
  `Passende Hypothesen: ${matched.map(x=>x.type).join(', ')}`,
  `Vorher favorisiert: ${before.type} (${pretty(before.next)})`,
  `Jetzt favorisiert: ${after.type} (${pretty(after.next)})`,
  `Gespeicherte Rückmeldungen: ${state.feedback}`,
  'Nur die Strategie-Gewichtung wurde geändert; keine Fakten oder Programmdateien.'].join('\n');
}
function status(){
 const s=load();
 return ['NERYX LERNLABOR · ERFAHRUNG',
   `Gespeicherte Rückmeldungen: ${s.feedback}`,
   ...MODEL.map(x=>`${x}: ${s.scores[x]}`),
   'Das sind erlernte Präferenzen für vorprogrammierte Strategien, keine neuen Denkalgorithmen.'].join('\n');
}
// A repeatable, independent held-out example. Never saves or rewards itself.
function evaluate(){
 const s=load(),cases=[
  {xs:[3,6,12,24],next:48,group:'geometrisch'},
  {xs:[2,5,10,17],next:26,group:'quadratisch'},
  {xs:[5,10,15,20],next:25,group:'arithmetisch'},
  {xs:[1,4,2,5,3,6],next:4,group:'wechselnd'}
 ];
 const items=cases.map(c=>({group:c.group,correct:equal(ranked(c.xs,s.scores)[0]?.next,c.next)}));
 return ['NERYX LERNLABOR · VERGLEICH',
  `Richtige Lösungen auf vier nicht trainierten Beispielen: ${items.filter(x=>x.correct).length}/4`,
  ...items.map(x=>`${x.group}: ${x.correct?'richtig':'falsch'}`),
  'Achtung: Kleine, fest definierte Demonstration – kein unabhängiger Generalisierungstest.'].join('\n');
}
window.NERYXLearning=Object.freeze({version:'0.1',candidates,ranked,proposal,feedback,status,evaluate});
})();
