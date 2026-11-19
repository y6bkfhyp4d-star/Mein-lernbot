/* NERYX Auto-Lernen 0.1 – Zahlenfolge aus normaler Frage prüfen.
   Eigener lokaler Speicher; Fakten, Programmcode und Modellgewichte bleiben unangetastet. */
(() => {
'use strict';
const KEY='neryx.learning.auto.v1',TYPES=['arithmetisch','geometrisch','quadratisch','wechselnd','kubisch','fibonacci'];
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const same=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
const fmt=n=>String(Number(n.toPrecision(12)));
const fresh=()=>({scores:Object.fromEntries(TYPES.map(k=>[k,0])),trained:0,recent:[]});
function load(){
 try{
  const raw=JSON.parse(localStorage.getItem(KEY)||'null'),data=fresh();
  if(raw?.version!==1||!raw.scores||typeof raw.scores!=='object')return data;
  for(const k of TYPES)if(Number.isInteger(raw.scores[k])&&Math.abs(raw.scores[k])<=20)
   data.scores[k]=raw.scores[k];
  data.trained=Number.isInteger(raw.trained)?Math.max(0,Math.min(1000,raw.trained)):0;
  data.recent=Array.isArray(raw.recent)?raw.recent.filter(x=>typeof x==='string'&&x.length<25).slice(-30):[];
  return data;
 }catch{return fresh()}
}
function save(data){
 try{localStorage.setItem(KEY,JSON.stringify({version:1,...data}));return true}
 catch{return false}
}
function fingerprint(xs){
 let h=2166136261;
 for(const char of xs.join(','))h=Math.imul(h^charCode(char),16777619);
 return (h>>>0).toString(36);
}
function charCode(char){return char.charCodeAt(0)}
function parse(question){
 const q=String(question??'').trim();
 if(q.length>350||q.includes('\n'))return null;
 const normalized=q.toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe')
  .replace(/ü/g,'ue').replace(/ß/g,'ss');
 const match=normalized.match(/^(?:was kommt(?: als naechstes)?|welche zahl kommt(?: als naechstes)?|wie geht (?:die )?folge weiter|setze (?:die )?folge fort|naechste zahl|zahlenfolge)\s*[:?]?\s*(.+?)\s*\??$/);
 if(!match)return null;
 const parts=match[1].trim().replace(/[?.!]$/,'').split(/\s*[,;]\s*/);
 if(parts.length<5||parts.length>30||parts.some(x=>! /^-?\d+(?:\.\d+)?$/.test(x.trim())))return null;
 const xs=parts.map(Number);
 return xs.every(finite)&&xs.every(x=>Math.abs(x)<=1e10)?xs:null;
}
function solve(question){
 const xs=parse(question);
 if(!xs)return null;
 const lab=window.NERYXLearning;
 if(!lab?.candidates||!lab?.ranked)return 'Auto-Lernen: Lernlabor nicht geladen.';
 const state=load(),prefix=xs.slice(0,-1),known=xs.at(-1);
 const prior=lab.candidates(prefix),correct=prior.filter(x=>same(x.next,known));
 const wrong=prior.filter(x=>!same(x.next,known));
 const code=fingerprint(xs),enough=correct.length>0&&wrong.length>0,already=state.recent.includes(code);
 let learned=false,saveError=false;
 if(enough&&!already){
  for(const item of prior){
   const value=state.scores[item.type]||0;
   state.scores[item.type]=Math.max(-20,Math.min(20,value+(same(item.next,known)?1:-1)));
  }
  state.trained++;
  state.recent.push(code);
  state.recent=state.recent.slice(-30);
  learned=save(state);
  if(!learned)saveError=true;
 }
 const next=lab.ranked(xs,saveError?load().scores:state.scores);
 return ['NERYX · AUTOMATISCHER LERNVERSUCH',
  'Zurückgehaltene bekannte Zahl: '+fmt(known),
  'Passende Strategien: '+(correct.length?correct.map(x=>x.type).join(', '):'keine'),
  'Abweichende Strategien: '+(wrong.length?wrong.map(x=>x.type).join(', '):'keine'),
  learned?'Strategiegewichte durch Gegenprobe aktualisiert.':
   already?'Diese Folge wurde bereits für einen Lernschritt verwendet.':
   saveError?'Gegenprobe erkannt, aber nicht gespeichert.':
   'Keine eindeutige Unterscheidung der Strategien möglich – nichts gelernt.',
  'Mögliche nächste Zahl: '+(next.length?fmt(next[0].next):'nicht bestimmbar'),
  'Bevorzugte Strategie: '+(next[0]?.type||'keine'),
  'Hinweis: Die letzte Zahl stammt aus deiner Eingabe. Das ist ein interner Selbsttest, keine unabhängige Wahrheitsprüfung.'].join('\n');
}
function status(){
 const s=load();
 return ['NERYX · AUTO-LERNSTAND','Automatische Lernschritte: '+s.trained,
  ...TYPES.map(k=>k+': '+s.scores[k]),
  'Nur Gewichtungen bereits programmierter mathematischer Strategien werden gelernt.',
  'Der normale NERYX-Wissensspeicher bleibt unangetastet.'].join('\n');
}
window.NERYXAutoLearn=Object.freeze({version:'0.1',parse,solve,status});
})();