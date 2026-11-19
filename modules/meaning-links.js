/* NERYX Bedeutungsbrücke 1.1 – explizit bestätigte, eng begrenzte
   Formulierungsbeziehungen. Keine automatische Synonymerkennung. */
(() => {
'use strict';
const KEY='neryx.learning.meanings.v1';
const norm=s=>String(s??'').toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/\s+/g,' ').trim();
const stop=new Set('die der das den dem ein eine einer eines im in am an mit ohne und oder von bei auf fuer fur nach bis dann zu zum zur jede jeder jedes zahlen zahl folge werte wert soll sollen bitte hier weiter geht kommen kommt jeweils jedesmal jeden mal wir werden wird sind ist sich immer schrittweise weiter'.split(' '));
const tokens=s=>[...new Set(norm(s).match(/[a-z0-9]+/g)||[])].filter(w=>w.length>=3&&!stop.has(w)).map(w=>w.length>=7?w.slice(0,6):w);
const valid=s=>s.length>=4&&s.length<=70&&/^[a-z0-9 äöüß-]+$/i.test(s)&&tokens(s).length>0&&!/\b(?:nicht|kein|ohne)\b/.test(norm(s));
const fresh=()=>({version:1,links:[]});
function read(){
 try{
  const data=JSON.parse(localStorage.getItem(KEY)||'null');
  if(data?.version!==1||!Array.isArray(data.links))return fresh();
  return {version:1,links:data.links.filter(x=>typeof x?.from==='string'&&typeof x?.to==='string'&&valid(x.from)&&valid(x.to)).slice(0,50)};
 }catch{return fresh()}
}
let pending=null;
function propose(input){
 const parts=String(input??'').split(/\s*=\s*/);
 if(parts.length!==2)return 'Format: Bedeutung lernen: mit zwei multiplizieren = verdoppeln';
 const from=norm(parts[0]),to=norm(parts[1]);
 if(!valid(from)||!valid(to)||from===to)return 'Zuordnung ungültig. Bitte zwei verschiedene positive Formulierungen ohne Verneinung angeben.';
 const state=read();
 if(state.links.some(x=>x.from===from&&x.to===to))return 'Diese Verbindung ist bereits gespeichert.';
 if(state.links.some(x=>x.from===from&&x.to!==to))return 'Für diese Formulierung existiert bereits eine andere Zuordnung. Nichts überschrieben.';
 pending={from,to};
 return 'Soll ich diese von dir angegebene Bedeutungsbeziehung speichern?\n„'+from+'“ = „'+to+'“\nJa, Bedeutung speichern / Bedeutung abbrechen\nNERYX kann die Gleichbedeutung nicht selbst überprüfen.';
}
function reply(input){
 if(!pending)return null;
 const s=norm(input);
 if(s==='bedeutung abbrechen'){pending=null;return 'Bedeutungsverknüpfung abgebrochen. Nichts gespeichert.';}
 if(s!=='ja, bedeutung speichern'&&s!=='ja bedeutung speichern')return null;
 const item=pending;pending=null;
 const state=read();
 if(state.links.some(x=>x.from===item.from))return 'Es existiert schon eine Verknüpfung. Nichts überschrieben.';
 if(state.links.length>=50)return 'Bedeutungsspeicher voll. Nichts verändert.';
 state.links.push(item);
 try{localStorage.setItem(KEY,JSON.stringify(state));return 'Bestätigte Bedeutung gespeichert: '+item.from+' = '+item.to+
  '\nNur konkrete Formulierungen; keine automatische Schlussfolgerung über beliebige Synonyme.'}
 catch{return 'Speicherfehler. Bestehende Daten wurden nicht verändert.'}
}
function expandTokens(phrase,base){
 const source=' '+norm(phrase)+' ',extended=new Set(base);
 for(const {from,to} of read().links){
  const at=source.indexOf(' '+from+' ');
  if(at<0)continue;
  const before=source.slice(Math.max(0,at-12),at);
  if(/\b(?:nicht|kein|ohne)\s*$/.test(before))continue;
  for(const word of tokens(to))extended.add(word);
 }
 return [...extended];
}
function status(){
 const state=read();
 return ['NERYX · BESTÄTIGTE BEDEUTUNGEN','Verbindungen: '+state.links.length,
  ...state.links.map((x,i)=>(i+1)+'. '+x.from+' = '+x.to),
  'Diese Verbindungen stammen von dir. Sie gelten nicht als unabhängig geprüfte Synonyme.'].join('\n');
}
window.NERYXMeanings=Object.freeze({version:'1.1',propose,reply,expandTokens,status});
})();