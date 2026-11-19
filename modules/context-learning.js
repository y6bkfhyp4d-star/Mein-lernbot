/* NERYX Kontextlernen 0.1: Kontext -> Strategie aus bestätigten Beispielen.
   Keine neue Regelgenerierung, kein AGI-Beweis. Separater Speicherschlüssel. */
(() => {
'use strict';
const KEY='neryx.learning.context.v1',TYPES=['arithmetisch','geometrisch','quadratisch','wechselnd','kubisch','fibonacci'];
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const close=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
const round=x=>String(Number(x.toPrecision(12)));
const normalize=x=>String(x??'').toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').trim().replace(/\s+/g,' ');
const cue=x=>{
 const s=normalize(x);
 return s.length>=3&&s.length<=60&&/^[a-z][a-z0-9 -]*$/.test(s)?s:null;
};
function newState(){return {version:1,rules:{},observations:0}}
function load(){
 try{
  const raw=JSON.parse(localStorage.getItem(KEY)||'null'),state=newState();
  if(raw?.version!==1||!raw.rules||typeof raw.rules!=='object'||Array.isArray(raw.rules))return state;
  for(const [k,v] of Object.entries(raw.rules).slice(0,80)){
   if(!cue(k)||k!==cue(k)||!v||typeof v!=='object')continue;
   const scores={};
   for(const type of TYPES){
    const count=v[type];
    if(Number.isInteger(count)&&count>=0&&count<=20)scores[type]=count;
   }
   state.rules[k]=scores;
  }
  state.observations=Number.isInteger(raw.observations)?Math.max(0,Math.min(1000,raw.observations)):0;
  return state;
 }catch{return newState()}
}
function save(state){
 try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch{return false}
}
function counters(state,label){return {...Object.fromEntries(TYPES.map(t=>[t,0])),...state.rules[label]}}
function selected(state,label){
 const values=counters(state,label),ordered=TYPES.slice().sort((a,b)=>values[b]-values[a]);
 const top=values[ordered[0]];
 if(top<2||top===values[ordered[1]])return null;
 return ordered[0];
}
function learn(label,type){
 const k=cue(label),kind=normalize(type);
 if(!k||!TYPES.includes(kind))return 'Format: Kontext lernen: HINWEIS = geometrisch (oder kubisch, quadratisch, arithmetisch, wechselnd, fibonacci)';
 const data=load();
 if(!data.rules[k]&&Object.keys(data.rules).length>=80)return 'Kontextspeicher ist voll (80 verschiedene Hinweise).';
 const scores=counters(data,k);
 if(scores[kind]>=20)return 'Maximale Beispielanzahl für diese Strategie erreicht.';
 scores[kind]++;
 data.rules[k]=scores;
 data.observations=Math.min(1000,data.observations+1);
 if(!save(data))return 'Kontext konnte nicht gespeichert werden.';
 return 'Kontextbeispiel gespeichert: "'+k+'" → '+kind+
  '. Beispiele für diese Zuordnung: '+scores[kind]+
  '. Ab zwei übereinstimmenden Beispielen ohne Gleichstand verwendet NERYX diese Präferenz.';
}
function parse(input){
 const text=String(input??'').trim().replace(/:\s*$/,'');
 const match=text.match(/^(.+?)\s*\|\s*(?:hinweis|kontext)\s*:\s*(.+)$/i);
 if(!match)return null;
 const nums=match[1].split(',').map(s=>/^-?\d+(?:\.\d+)?$/.test(s.trim())?Number(s.trim()):NaN);
 const label=cue(match[2]);
 if(nums.length<4||nums.length>30||nums.some(x=>!finite(x)||Math.abs(x)>1e10)||!label)return null;
 return {nums,label};
}
function solve(input,state=load()){
 const data=parse(input);
 if(!data)return 'Format: Muster prüfen: 2, 4, 8, 16 | Hinweis: verdoppeln';
 const lab=window.NERYXLearning;
 if(!lab?.candidates)return 'Lernlabor nicht geladen.';
 const options=lab.candidates(data.nums);
 if(!options.length)return 'Keine der unterstützten Strategien passt zu diesen Zahlen.';
 const distinct=options.filter((x,i)=>options.findIndex(y=>close(x.next,y.next))===i);
 const lines=['NERYX · KONTEXTPRÜFUNG','Hinweis: '+data.label,
  'Passende Hypothesen: '+options.map(x=>x.type+' → '+round(x.next)).join(', ')];
 // Selbst bei einer einzigen sichtbaren Vorhersage bleiben weitere Regeln mathematisch möglich.
 if(distinct.length===1){
  lines.push('Gemeinsame Vorhersage der geprüften Strategien: '+round(distinct[0].next),
   'Die Fortsetzung ist mathematisch nicht eindeutig bewiesen.');
  return lines.join('\n');
 }
 const best=selected(state,data.label);
 const chosen=options.find(x=>x.type===best);
 if(!chosen){
  lines.push('Welche Regel ist gemeint? Beispielsweise '+options.map(x=>x.type).join(' oder ')+'.',
   'Kontext noch nicht hinreichend gelernt oder die gelernte Regel passt hier nicht.',
   'Trainiere eine Zuordnung mit: Kontext lernen: '+data.label+' = '+options[0].type);
 }else{
  lines.push('Kontextbasierte Vermutung: '+chosen.type+' → '+round(chosen.next),
   'Die Entscheidung beruht auf gespeicherten Beispielen, nicht auf mathematischer Eindeutigkeit.');
 }
 return lines.join('\n');
}
function status(){
 const state=load();
 return ['NERYX · KONTEXTLERNSTAND','Gespeicherte Beispiele: '+state.observations,
  'Unterschiedliche Hinweise: '+Object.keys(state.rules).length,
  ...Object.entries(state.rules).slice(0,15).map(([k,v])=>
   k+': '+TYPES.filter(type=>v[type]).map(type=>type+' '+v[type]).join(', ')),
  'Dies sind Zuordnungen von Hinweisen zu vorhandenen Strategien; keine neu erfundenen Algorithmen.'].join('\n');
}
// Reproduzierbarer Vergleich mit absichtlich zurückgehaltenen Zahlenpaaren und Kontexten.
// Lerngewichte entstehen ausschließlich in einer isolierten virtuellen Kopie.
function experiment(){
 const lab=window.NERYXLearning;
 if(!lab?.candidates)return 'Lernlabor nicht geladen.';
 const training=[['vervielfachen','geometrisch'],['vervielfachen','geometrisch'],
  ['interpolation','kubisch'],['interpolation','kubisch']];
 const before=newState(),after=newState();
 for(const [key,type] of training){
  const count=counters(after,key);count[type]++;after.rules[key]=count;
 }
 const tasks=[];
 for(const scale of [2,3,5,7,11,13]){
  const xs=[scale,scale*2,scale*4,scale*8];
  for(const [label,type] of [['vervielfachen','geometrisch'],['interpolation','kubisch']]){
   const solution=lab.candidates(xs).find(x=>x.type===type);
   const predicted=(state)=>{
    const chosen=selected(state,label);
    return chosen&&lab.candidates(xs).find(x=>x.type===chosen);
   };
   tasks.push({xs,label,type,truth:solution?.next,before:predicted(before)?.next,after:predicted(after)?.next});
  }
 }
 const pre=tasks.filter(x=>close(x.truth,x.before)).length;
 const post=tasks.filter(x=>close(x.truth,x.after)).length;
 const note='Achtung: Der Hinweis (nicht die Zahlen) verrät hier die gewünschte Regel. Das Experiment testet nur eine erlernte Zuordnung, kein freies Denken.';
 return ['NERYX · KONTEXT-LERNPRÜFUNG',
  'Bestätigte Übungszuordnungen: '+training.length,
  'Ungesehene Zahlenaufgaben: '+tasks.length,
  'Vorher richtig: '+pre+'/'+tasks.length,
  'Nachher richtig: '+post+'/'+tasks.length,
  'Korrekt nach Regeln: geometrisch '+tasks.filter(x=>x.type==='geometrisch'&&close(x.truth,x.after)).length+'/6, kubisch '+tasks.filter(x=>x.type==='kubisch'&&close(x.truth,x.after)).length+'/6',
  'Produktiver Kontextspeicher nicht verändert.',
  note].join('\n');
}
window.NERYXContextLearning=Object.freeze({version:'0.1',learn,solve,status,experiment,parse,selected});
})();