/* NERYX Themenlernen 0.1 – lokal, branchenunabhängig, nutzerbestätigte Antworten.
   Bewahrt vorhandene Daten; kein Internet/Wahrheitsprüfer/LLM. */
(() => {
'use strict';
const KEY='neryx.learning.topics.v1', MAX=200;
const trim=x=>String(x??'').trim().slice(0,1000);
const fold=x=>trim(x).toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[?!.,:;]+$/,'').replace(/\s+/g,' ').trim();
const normalizeSubject=x=>fold(x).replace(/^(?:der|die|das|ein|eine|einen|einem|einer)\s+/,'');
const safeAnswer=x=>trim(x).replace(/[.!]\s*$/,'');
const types=[
 ['lebensraum',[
  /^wo (?:lebt|leben|wohnt|wohnen) (.+)$/,
  /^in welchem lebensraum (?:lebt|leben) (.+)$/,
  /^wo (?:kommt|kommen) (.+) vor$/]],
 ['definition',[
  /^was ist (.+)$/, /^was sind (.+)$/,
  /^was bedeutet (.+)$/, /^was versteht man unter (.+)$/,
  /^erklaere (.+)$/, /^definiere (.+)$/]],
 ['zweck',[
  /^wozu (?:dient|benutzt man|verwendet man) (.+)$/,
  /^was ist (.+) gut fuer$/,
  /^fuer was (?:braucht|verwendet|benutzt) man (.+)$/]],
 ['verfahren',[
  /^wie (?:funktioniert|verarbeitet|benutzt|verwendet) man (.+)$/,
  /^wie funktioniert (.+)$/, /^wie wird (.+) (?:verarbeitet|hergestellt|gemacht)$/]],
 ['farbe',[
  /^welche farbe hat (.+)$/, /^wie sieht (.+) aus$/]],
 ['herkunft',[
  /^woher (?:kommt|stammt) (.+)$/, /^woher kommen (.+)$/]],
 ['bestandteile',[
  /^woraus besteht (.+)$/, /^was ist in (.+) enthalten$/]],
 ['allgemein',[]],
 ['dauer',[
  /^wie lange (?:dauert|braucht) (.+)$/,
  /^wie lange muss (.+) (?:trocknen|ausharten)$/]]
];
function parse(q){
 const s=fold(q);if(!s||s.length>220||s.includes('\n'))return null;
 for(const [type,patterns] of types)for(const p of patterns){
  const m=s.match(p);
  if(m){
   const subject=normalizeSubject(m[1]);
   if(subject.length<2||subject.length>90||/^(?:ich|du|wir|sie|es|er|das)$/.test(subject))return null;
   return {type,subject,key:type+'|'+subject,question:trim(q)};
  }
 }
 if(/^(?:warum|weshalb|wieso|wann|wer|welche|welcher|welches|wie|wo|was|wodurch|womit|worauf|wofuer|wozu)\s+/.test(s)&&s.length<=180)
  return {type:'allgemein',subject:s,key:'allgemein|'+s,question:trim(q)};
 return null;
}
function initial(){return {version:1,records:[]}}
function load(){
 try{
  const data=JSON.parse(localStorage.getItem(KEY)||'null');
  if(data?.version!==1||!Array.isArray(data.records))return initial();
  return {version:1,records:data.records.filter(x=>
   x&&typeof x.key==='string'&&x.key.length<170&&
   typeof x.answer==='string'&&x.answer.length<=1000&&
   typeof x.subject==='string'&&x.subject.length<=100&&
   typeof x.type==='string'&&types.some(t=>t[0]===x.type)&&
   x.key===x.type+'|'+x.subject).slice(0,MAX)};
 }catch{return initial()}
}
function write(state){
 try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch{return false}
}
let pending=null;
function match(question){
 const key=parse(question);if(!key)return null;
 const rows=load().records.filter(r=>r.key===key.key);
 if(rows.length!==1||rows[0].conflict)return null;
 const r=rows[0];
 return 'NERYX · GELERNTES THEMENWISSEN\n'+r.answer+
 '\nQuelle: Deine bestätigte Angabe; von NERYX nicht unabhängig überprüft.';
}
function ask(question){
 const obj=parse(question);
 if(!obj)return null;
 const known=match(question);
 if(known)return known;
 pending={stage:'answer',item:obj};
 return 'Dazu kenne ich noch keine bestätigte Antwort.\n'+
  'Frage: '+obj.question+'\n'+
  'Wenn du es weißt, schreibe: Antwort: DEINE ERKLÄRUNG\n'+
  'Ich frage vor dem Speichern noch einmal nach. „Abbrechen“ beendet den Lernversuch.';
}
function pendingReply(input){
 if(!pending)return null;
 const s=trim(input);
 if(/^(?:abbrechen|stopp|stop)$/i.test(s)){pending=null;return 'Themenlernen abgebrochen; nichts gespeichert.';}
 if(pending.stage==='answer'){
  const match=s.match(/^(?:antwort|die antwort ist|richtig ist|korrekt ist)\s*:\s*(.+)$/is);
  if(!match)return null;
  const answer=safeAnswer(match[1]);
  if(answer.length<3||answer.length>900||/https?:\/\/|<script/i.test(answer))
   return 'Die Antwort ist ungültig oder zu lang. Es wurde nichts gespeichert.';
  pending={stage:'confirm',item:pending.item,answer};
  return 'Soll ich Folgendes als deine Angabe speichern?\n'+
   'Frage: '+pending.item.question+'\nAntwort: '+answer+
   '\nAntworte mit „Ja, speichern“ oder „Abbrechen“.\n'+
   'Ich kann die Richtigkeit nicht unabhängig prüfen.';
 }
 if(pending.stage==='confirm'){
  if(!/^(?:ja,?\s*speichern|speichern bestaetigen)$/i.test(fold(s)))return null;
  const data=load(),item=pending.item,answer=pending.answer;
  pending=null;
  const rows=data.records.filter(x=>x.key===item.key);
  if(rows.length>1||rows.some(x=>x.conflict))
   return 'Für dieses Thema liegen widersprüchliche Angaben vor. Kein automatisches Überschreiben.';
  if(rows.length===1){
   const old=rows[0];
   if(fold(old.answer)===fold(answer))return 'Diese Antwort war bereits gespeichert. Nichts verändert.';
   return 'Abweichende Angabe erkannt. Die bestehende Antwort wurde aus Sicherheitsgründen nicht überschrieben.\nVorhanden: '+old.answer+'\nNeu vorgeschlagen: '+answer;
  }
  if(data.records.length>=MAX)return 'Themenspeicher voll; nichts verändert.';
  data.records.push({key:item.key,type:item.type,subject:item.subject,answer,question:item.question,source:'user-confirmed'});
  if(!write(data))return 'Speicherfehler. Dein bisheriger Datenbestand wurde nicht verändert.';
  return 'Themenwissen gespeichert: '+item.subject+' · '+item.type+
   '\nDu kannst dazu später anders formulierte Fragen stellen.\nQuelle: Deine Bestätigung, keine unabhängige Prüfung.';
 }
 return null;
}
function beginTeaching(input){
 const m=String(input??'').match(/^(.+?)\s*(?:=>|→)\s*(.{3,900})$/s);
 if(!m)return 'Format: Themenwissen: Wo lebt ein Okapi? => Im Regenwald der Demokratischen Republik Kongo';
 const item=parse(m[1]);if(!item)return 'Diese Frage kann ich noch nicht sicher in Thema und Eigenschaft aufteilen. Es wurde nichts gespeichert.';
 const answer=safeAnswer(m[2]);if(!answer||/https?:\/\/|<script/i.test(answer))return 'Ungültige Antwort.';
 pending={stage:'confirm',item,answer};
 return 'Soll ich Folgendes als deine Angabe speichern?\nFrage: '+item.question+
  '\nAntwort: '+answer+'\nAntworte mit „Ja, speichern“ oder „Abbrechen“.';
}
function status(){
 const records=load().records;
 const groups=[...new Set(records.map(r=>r.type))];
 return ['NERYX · THEMENLERNSTAND','Gespeicherte bestätigte Einträge: '+records.length,
  'Themenfelder: '+(groups.join(', ')||'keine'),
  ...records.slice(-12).map((r,i)=>(i+1)+'. '+r.subject+' ('+r.type+'): '+r.answer),
  'Alle Angaben stammen von dir und sind nicht unabhängig geprüft.'].join('\n');
}
window.NERYXTopicLearning=Object.freeze({version:'0.1',parse,match,ask,pendingReply,beginTeaching,status});
})();